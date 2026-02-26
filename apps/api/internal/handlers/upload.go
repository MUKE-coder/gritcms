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

// AllowedMimeTypes defines which file types can be uploaded.
var AllowedMimeTypes = map[string]bool{
	"image/jpeg":      true,
	"image/png":       true,
	"image/gif":       true,
	"image/webp":      true,
	"video/mp4":       true,
	"video/webm":      true,
	"video/quicktime": true,
	"application/pdf": true,
	"text/plain":      true,
	"text/csv":        true,
	"application/json": true,
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
}

// MaxUploadSize is the maximum file size (50 MB).
const MaxUploadSize = 50 << 20

// UploadHandler handles file upload endpoints.
type UploadHandler struct {
	DB      *gorm.DB
	Storage *storage.Storage
	Jobs    *jobs.Client
}

// Create handles file upload via multipart form.
func (h *UploadHandler) Create(c *gin.Context) {
	if h.Storage == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{
				"code":    "STORAGE_UNAVAILABLE",
				"message": "File storage is not configured",
			},
		})
		return
	}

	// Explicitly parse multipart form
	if err := c.Request.ParseMultipartForm(MaxUploadSize); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": fmt.Sprintf("Cannot parse form (Content-Type: %s): %v", c.ContentType(), err),
			},
		})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "INVALID_FILE",
				"message": fmt.Sprintf("No file in field 'file' (Content-Type: %s): %v", c.ContentType(), err),
			},
		})
		return
	}
	defer file.Close()

	// Validate file size
	if header.Size > MaxUploadSize {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "FILE_TOO_LARGE",
				"message": fmt.Sprintf("File size exceeds maximum of %d MB", MaxUploadSize/(1<<20)),
			},
		})
		return
	}

	// Validate MIME type
	mimeType := header.Header.Get("Content-Type")
	if !AllowedMimeTypes[mimeType] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "INVALID_FILE_TYPE",
				"message": "File type not allowed",
			},
		})
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), strings.TrimSuffix(filepath.Base(header.Filename), ext), ext)
	key := fmt.Sprintf("uploads/%s/%s", time.Now().Format("2006/01"), filename)

	// Upload to storage
	if err := h.Storage.Upload(c.Request.Context(), key, file, mimeType); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "UPLOAD_FAILED",
				"message": "Failed to upload file",
			},
		})
		return
	}

	userID, _ := c.Get("user_id")

	upload := models.Upload{
		Filename:     filename,
		OriginalName: header.Filename,
		MimeType:     mimeType,
		Size:         header.Size,
		Path:         key,
		URL:          h.Storage.GetURL(key),
		UserID:       userID.(uint),
	}

	if err := h.DB.Create(&upload).Error; err != nil {
		// Clean up uploaded file on DB error
		_ = h.Storage.Delete(c.Request.Context(), key)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to save upload record",
			},
		})
		return
	}

	// Enqueue image processing job if it's an image
	if h.Jobs != nil && storage.IsImageMimeType(mimeType) {
		_ = h.Jobs.EnqueueProcessImage(upload.ID, key, mimeType)
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    upload,
		"message": "File uploaded successfully",
	})
}

// List returns a paginated list of uploads.
func (h *UploadHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := h.DB.Model(&models.Upload{})

	// Filter by MIME type
	if mimeType := c.Query("mime_type"); mimeType != "" {
		query = query.Where("mime_type LIKE ?", mimeType+"%")
	}

	var total int64
	query.Count(&total)

	var uploads []models.Upload
	offset := (page - 1) * pageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&uploads).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch uploads",
			},
		})
		return
	}

	pages := int(math.Ceil(float64(total) / float64(pageSize)))

	c.JSON(http.StatusOK, gin.H{
		"data": uploads,
		"meta": gin.H{
			"total":     total,
			"page":      page,
			"page_size": pageSize,
			"pages":     pages,
		},
	})
}

// GetByID returns a single upload by ID.
func (h *UploadHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	var upload models.Upload
	if err := h.DB.First(&upload, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Upload not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": upload,
	})
}

// Presign generates a presigned PUT URL for direct browser-to-storage upload.
func (h *UploadHandler) Presign(c *gin.Context) {
	if h.Storage == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{"code": "STORAGE_UNAVAILABLE", "message": "File storage is not configured"},
		})
		return
	}

	var req struct {
		Filename    string `json:"filename" binding:"required"`
		ContentType string `json:"content_type" binding:"required"`
		FileSize    int64  `json:"file_size" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	if !AllowedMimeTypes[req.ContentType] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "INVALID_FILE_TYPE", "message": "File type not allowed"},
		})
		return
	}

	if req.FileSize > MaxUploadSize {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "FILE_TOO_LARGE", "message": fmt.Sprintf("File size exceeds maximum of %d MB", MaxUploadSize/(1<<20))},
		})
		return
	}

	ext := filepath.Ext(req.Filename)
	filename := fmt.Sprintf("%d-%s%s", time.Now().UnixNano(), strings.TrimSuffix(filepath.Base(req.Filename), ext), ext)
	key := fmt.Sprintf("uploads/%s/%s", time.Now().Format("2006/01"), filename)

	presignedURL, err := h.Storage.PresignPutURL(c.Request.Context(), key, req.ContentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "PRESIGN_FAILED", "message": "Failed to generate upload URL"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"presigned_url": presignedURL,
			"key":           key,
			"public_url":    h.Storage.GetURL(key),
		},
	})
}

// CompleteUpload records a file that was uploaded directly to storage via presigned URL.
func (h *UploadHandler) CompleteUpload(c *gin.Context) {
	var req struct {
		Key         string `json:"key" binding:"required"`
		Filename    string `json:"filename" binding:"required"`
		ContentType string `json:"content_type" binding:"required"`
		Size        int64  `json:"size" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	userID, _ := c.Get("user_id")

	upload := models.Upload{
		Filename:     filepath.Base(req.Key),
		OriginalName: req.Filename,
		MimeType:     req.ContentType,
		Size:         req.Size,
		Path:         req.Key,
		URL:          h.Storage.GetURL(req.Key),
		UserID:       userID.(uint),
	}

	if err := h.DB.Create(&upload).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to save upload record"},
		})
		return
	}

	// Enqueue image processing job if it's an image
	if h.Jobs != nil && storage.IsImageMimeType(req.ContentType) {
		_ = h.Jobs.EnqueueProcessImage(upload.ID, req.Key, req.ContentType)
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    upload,
		"message": "Upload recorded successfully",
	})
}

// Delete removes an upload and its stored file.
func (h *UploadHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	var upload models.Upload
	if err := h.DB.First(&upload, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Upload not found",
			},
		})
		return
	}

	// Delete from storage
	if h.Storage != nil {
		_ = h.Storage.Delete(c.Request.Context(), upload.Path)
		// Also delete thumbnail if it exists
		if upload.ThumbnailURL != "" {
			thumbKey := strings.Replace(upload.Path, "uploads/", "thumbnails/", 1)
			_ = h.Storage.Delete(c.Request.Context(), thumbKey)
		}
	}

	if err := h.DB.Delete(&upload).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to delete upload",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Upload deleted successfully",
	})
}
