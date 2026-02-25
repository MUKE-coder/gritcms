package handlers

import (
	"fmt"
	"math"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/jobs"
	"gritcms/apps/api/internal/models"
	"gritcms/apps/api/internal/storage"
)

// MediaHandler handles shared media library operations.
type MediaHandler struct {
	DB      *gorm.DB
	Storage *storage.Storage
	Jobs    *jobs.Client
}

// NewMediaHandler creates a new MediaHandler.
func NewMediaHandler(db *gorm.DB, s *storage.Storage, j *jobs.Client) *MediaHandler {
	return &MediaHandler{DB: db, Storage: s, Jobs: j}
}

// Upload handles media file upload via multipart form.
func (h *MediaHandler) Upload(c *gin.Context) {
	if h.Storage == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{"code": "STORAGE_UNAVAILABLE", "message": "File storage is not configured"},
		})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "INVALID_FILE", "message": "No file provided"},
		})
		return
	}
	defer file.Close()

	if header.Size > MaxUploadSize {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "FILE_TOO_LARGE", "message": fmt.Sprintf("File size exceeds maximum of %d MB", MaxUploadSize/(1<<20))},
		})
		return
	}

	mimeType := header.Header.Get("Content-Type")
	if !AllowedMimeTypes[mimeType] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "INVALID_FILE_TYPE", "message": "File type not allowed"},
		})
		return
	}

	folder := c.DefaultPostForm("folder", "/")
	altText := c.PostForm("alt_text")

	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), strings.TrimSuffix(filepath.Base(header.Filename), ext), ext)
	key := fmt.Sprintf("media/%s/%s", time.Now().Format("2006/01"), filename)

	if err := h.Storage.Upload(c.Request.Context(), key, file, mimeType); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "UPLOAD_FAILED", "message": "Failed to upload file"},
		})
		return
	}

	userID, _ := c.Get("user_id")
	tenantID, _ := c.Get("tenant_id")

	asset := models.MediaAsset{
		TenantID:     tenantID.(uint),
		Filename:     filename,
		OriginalName: header.Filename,
		MimeType:     mimeType,
		Size:         header.Size,
		Path:         key,
		URL:          h.Storage.GetURL(key),
		AltText:      altText,
		Folder:       folder,
		UserID:       userID.(uint),
	}

	if err := h.DB.Create(&asset).Error; err != nil {
		_ = h.Storage.Delete(c.Request.Context(), key)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to save media asset"},
		})
		return
	}

	// Enqueue thumbnail generation for images
	if h.Jobs != nil && storage.IsImageMimeType(mimeType) {
		_ = h.Jobs.EnqueueProcessImage(asset.ID, key, mimeType)
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    asset,
		"message": "Media uploaded successfully",
	})
}

// List returns a paginated list of media assets with filtering.
func (h *MediaHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "24"))
	search := c.Query("search")
	mimeFilter := c.Query("type") // image, video, document, or full mime type
	folder := c.Query("folder")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 24
	}

	tenantID, _ := c.Get("tenant_id")
	query := h.DB.Model(&models.MediaAsset{}).Where("tenant_id = ?", tenantID)

	if search != "" {
		query = query.Where("original_name ILIKE ? OR alt_text ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	switch mimeFilter {
	case "image":
		query = query.Where("mime_type LIKE ?", "image/%")
	case "video":
		query = query.Where("mime_type LIKE ?", "video/%")
	case "document":
		query = query.Where("mime_type NOT LIKE ? AND mime_type NOT LIKE ?", "image/%", "video/%")
	case "":
		// no filter
	default:
		query = query.Where("mime_type = ?", mimeFilter)
	}

	if folder != "" {
		query = query.Where("folder = ?", folder)
	}

	var total int64
	query.Count(&total)

	var assets []models.MediaAsset
	offset := (page - 1) * pageSize
	query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&assets)

	pages := int(math.Ceil(float64(total) / float64(pageSize)))

	c.JSON(http.StatusOK, gin.H{
		"data": assets,
		"meta": gin.H{
			"total":     total,
			"page":      page,
			"page_size": pageSize,
			"pages":     pages,
		},
	})
}

// GetByID returns a single media asset.
func (h *MediaHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid media ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var asset models.MediaAsset
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&asset, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Media asset not found"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": asset,
	})
}

// Update updates media asset metadata (alt text, folder).
func (h *MediaHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid media ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var asset models.MediaAsset
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&asset, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Media asset not found"},
		})
		return
	}

	var req struct {
		AltText *string `json:"alt_text"`
		Folder  *string `json:"folder"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	updates := map[string]interface{}{}
	if req.AltText != nil {
		updates["alt_text"] = *req.AltText
	}
	if req.Folder != nil {
		updates["folder"] = *req.Folder
	}

	if len(updates) > 0 {
		h.DB.Model(&asset).Updates(updates)
	}

	h.DB.First(&asset, asset.ID)

	c.JSON(http.StatusOK, gin.H{
		"data":    asset,
		"message": "Media asset updated successfully",
	})
}

// Delete removes a media asset and its stored file.
func (h *MediaHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid media ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var asset models.MediaAsset
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&asset, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Media asset not found"},
		})
		return
	}

	if h.Storage != nil {
		_ = h.Storage.Delete(c.Request.Context(), asset.Path)
		if asset.ThumbnailURL != "" {
			thumbKey := strings.Replace(asset.Path, "media/", "thumbnails/", 1)
			_ = h.Storage.Delete(c.Request.Context(), thumbKey)
		}
	}

	h.DB.Delete(&asset)

	c.JSON(http.StatusOK, gin.H{
		"message": "Media asset deleted successfully",
	})
}
