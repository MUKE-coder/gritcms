package handlers

import (
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/events"
	"gritcms/apps/api/internal/models"
)

// PageHandler handles page CRUD operations.
type PageHandler struct {
	DB *gorm.DB
}

// NewPageHandler creates a new PageHandler.
func NewPageHandler(db *gorm.DB) *PageHandler {
	return &PageHandler{DB: db}
}

// List returns a paginated list of pages with search, filter, and sort.
func (h *PageHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")
	status := c.Query("status")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")
	parentID := c.Query("parent_id")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	allowedSorts := map[string]bool{
		"id": true, "title": true, "slug": true, "status": true,
		"sort_order": true, "published_at": true, "created_at": true, "updated_at": true,
	}
	if !allowedSorts[sortBy] {
		sortBy = "created_at"
	}
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	tenantID, _ := c.Get("tenant_id")
	query := h.DB.Model(&models.Page{}).Where("tenant_id = ?", tenantID)

	if search != "" {
		query = query.Where("title ILIKE ? OR slug ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if parentID != "" {
		if parentID == "null" || parentID == "0" {
			query = query.Where("parent_id IS NULL")
		} else {
			pid, err := strconv.ParseUint(parentID, 10, 32)
			if err == nil {
				query = query.Where("parent_id = ?", pid)
			}
		}
	}

	var total int64
	query.Count(&total)

	var pages []models.Page
	offset := (page - 1) * pageSize
	query.Preload("Author", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, first_name, last_name, avatar")
	}).Order(sortBy + " " + sortOrder).
		Offset(offset).Limit(pageSize).Find(&pages)

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	c.JSON(http.StatusOK, gin.H{
		"data": pages,
		"meta": gin.H{
			"total":     total,
			"page":      page,
			"page_size": pageSize,
			"pages":     totalPages,
		},
	})
}

// GetByID returns a single page with all relationships.
func (h *PageHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid page ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var pg models.Page
	if err := h.DB.Preload("Author", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, first_name, last_name, avatar")
	}).Preload("Children").Where("tenant_id = ?", tenantID).First(&pg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Page not found"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": pg})
}

// GetBySlug returns a published page by slug (public).
func (h *PageHandler) GetBySlug(c *gin.Context) {
	slug := c.Param("slug")

	var pg models.Page
	if err := h.DB.Preload("Author", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, first_name, last_name, avatar")
	}).Where("slug = ? AND status = ?", slug, models.PageStatusPublished).First(&pg).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Page not found"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": pg})
}

// Create creates a new page.
func (h *PageHandler) Create(c *gin.Context) {
	var req struct {
		Title           string         `json:"title" binding:"required"`
		Slug            string         `json:"slug"`
		Content         datatypes.JSON `json:"content"`
		Excerpt         string         `json:"excerpt"`
		Status          string         `json:"status"`
		Template        string         `json:"template"`
		MetaTitle       string         `json:"meta_title"`
		MetaDescription string         `json:"meta_description"`
		OGImage         string         `json:"og_image"`
		SortOrder       int            `json:"sort_order"`
		ParentID        *uint          `json:"parent_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	tenantIDUint := tenantID.(uint)
	userID, _ := c.Get("user_id")
	userIDUint := userID.(uint)

	pg := models.Page{
		TenantID:        tenantIDUint,
		Title:           req.Title,
		Content:         req.Content,
		Excerpt:         req.Excerpt,
		Status:          req.Status,
		Template:        req.Template,
		MetaTitle:       req.MetaTitle,
		MetaDescription: req.MetaDescription,
		OGImage:         req.OGImage,
		SortOrder:       req.SortOrder,
		ParentID:        req.ParentID,
		AuthorID:        userIDUint,
	}

	if req.Slug != "" {
		pg.Slug = strings.ToLower(strings.TrimSpace(req.Slug))
	}

	if pg.Status == models.PageStatusPublished {
		now := time.Now()
		pg.PublishedAt = &now
	}

	if err := h.DB.Create(&pg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to create page"},
		})
		return
	}

	h.DB.Preload("Author", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, first_name, last_name, avatar")
	}).First(&pg, pg.ID)

	if pg.Status == models.PageStatusPublished {
		events.Emit(events.PagePublished, pg)
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    pg,
		"message": "Page created successfully",
	})
}

// Update updates an existing page.
func (h *PageHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid page ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var pg models.Page
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&pg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Page not found"},
		})
		return
	}

	var req struct {
		Title           *string        `json:"title"`
		Slug            *string        `json:"slug"`
		Content         datatypes.JSON `json:"content"`
		Excerpt         *string        `json:"excerpt"`
		Status          *string        `json:"status"`
		Template        *string        `json:"template"`
		MetaTitle       *string        `json:"meta_title"`
		MetaDescription *string        `json:"meta_description"`
		OGImage         *string        `json:"og_image"`
		SortOrder       *int           `json:"sort_order"`
		ParentID        *uint          `json:"parent_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	updates := map[string]interface{}{}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Slug != nil {
		updates["slug"] = strings.ToLower(strings.TrimSpace(*req.Slug))
	}
	if req.Content != nil {
		updates["content"] = req.Content
	}
	if req.Excerpt != nil {
		updates["excerpt"] = *req.Excerpt
	}
	if req.Template != nil {
		updates["template"] = *req.Template
	}
	if req.MetaTitle != nil {
		updates["meta_title"] = *req.MetaTitle
	}
	if req.MetaDescription != nil {
		updates["meta_description"] = *req.MetaDescription
	}
	if req.OGImage != nil {
		updates["og_image"] = *req.OGImage
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}
	if req.ParentID != nil {
		updates["parent_id"] = *req.ParentID
	}

	// Handle status transitions
	wasPublished := pg.Status == models.PageStatusPublished
	if req.Status != nil {
		updates["status"] = *req.Status
		if *req.Status == models.PageStatusPublished && !wasPublished {
			now := time.Now()
			updates["published_at"] = &now
		} else if *req.Status != models.PageStatusPublished && wasPublished {
			updates["published_at"] = nil
		}
	}

	h.DB.Model(&pg).Updates(updates)
	h.DB.Preload("Author", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, first_name, last_name, avatar")
	}).First(&pg, pg.ID)

	if req.Status != nil && *req.Status == models.PageStatusPublished && !wasPublished {
		events.Emit(events.PagePublished, pg)
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    pg,
		"message": "Page updated successfully",
	})
}

// Delete soft-deletes a page.
func (h *PageHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid page ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var pg models.Page
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&pg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Page not found"},
		})
		return
	}

	h.DB.Delete(&pg)

	c.JSON(http.StatusOK, gin.H{
		"message": "Page deleted successfully",
	})
}

// ListHierarchy returns all pages in a parent-child tree structure.
func (h *PageHandler) ListHierarchy(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")
	var pages []models.Page
	h.DB.Where("tenant_id = ? AND parent_id IS NULL", tenantID).
		Preload("Children").
		Order("sort_order ASC, title ASC").
		Find(&pages)

	c.JSON(http.StatusOK, gin.H{"data": pages})
}
