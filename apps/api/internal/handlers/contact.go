package handlers

import (
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/events"
	"gritcms/apps/api/internal/models"
)

// ContactHandler handles contact CRUD operations.
type ContactHandler struct {
	DB *gorm.DB
}

// NewContactHandler creates a new ContactHandler.
func NewContactHandler(db *gorm.DB) *ContactHandler {
	return &ContactHandler{DB: db}
}

// List returns a paginated list of contacts with search, filter, and sort.
func (h *ContactHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")
	tagFilter := c.Query("tag")
	sourceFilter := c.Query("source")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	allowedSorts := map[string]bool{
		"id": true, "created_at": true, "updated_at": true,
		"email": true, "first_name": true, "last_name": true,
		"last_activity_at": true, "source": true,
	}
	if !allowedSorts[sortBy] {
		sortBy = "created_at"
	}
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	tenantID, _ := c.Get("tenant_id")
	query := h.DB.Model(&models.Contact{}).Where("tenant_id = ?", tenantID)

	if search != "" {
		query = query.Where(
			"email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%",
		)
	}

	if sourceFilter != "" {
		query = query.Where("source = ?", sourceFilter)
	}

	if tagFilter != "" {
		query = query.Where(
			"id IN (SELECT contact_id FROM contact_tags ct JOIN tags t ON ct.tag_id = t.id WHERE t.name = ?)",
			tagFilter,
		)
	}

	var total int64
	query.Count(&total)

	var contacts []models.Contact
	offset := (page - 1) * pageSize
	query.Preload("Tags").
		Order(sortBy + " " + sortOrder).
		Offset(offset).
		Limit(pageSize).
		Find(&contacts)

	pages := int(math.Ceil(float64(total) / float64(pageSize)))

	c.JSON(http.StatusOK, gin.H{
		"data": contacts,
		"meta": gin.H{
			"total":     total,
			"page":      page,
			"page_size": pageSize,
			"pages":     pages,
		},
	})
}

// GetByID returns a single contact with all relationships.
func (h *ContactHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid contact ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var contact models.Contact
	if err := h.DB.Preload("Tags").Preload("Activities", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at DESC").Limit(50)
	}).Where("tenant_id = ?", tenantID).First(&contact, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Contact not found"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    contact,
		"message": "Contact retrieved successfully",
	})
}

// Create creates a new contact or returns existing one (upsert by email).
func (h *ContactHandler) Create(c *gin.Context) {
	var req struct {
		Email        string         `json:"email" binding:"required,email"`
		FirstName    string         `json:"first_name"`
		LastName     string         `json:"last_name"`
		Phone        string         `json:"phone"`
		Source       string         `json:"source"`
		Tags         []string       `json:"tags"`
		CustomFields datatypes.JSON `json:"custom_fields"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	tenantIDUint := tenantID.(uint)

	// Upsert: find existing contact by email within tenant, or create new
	var contact models.Contact
	result := h.DB.Where("tenant_id = ? AND email = ?", tenantIDUint, req.Email).First(&contact)

	isNew := result.Error != nil
	if isNew {
		contact = models.Contact{
			TenantID:     tenantIDUint,
			Email:        req.Email,
			FirstName:    req.FirstName,
			LastName:     req.LastName,
			Phone:        req.Phone,
			Source:       req.Source,
			CustomFields: req.CustomFields,
			IPAddress:    c.ClientIP(),
		}
		now := time.Now()
		contact.LastActivityAt = &now

		if err := h.DB.Create(&contact).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to create contact"},
			})
			return
		}
	} else {
		// Update existing contact fields if provided
		updates := map[string]interface{}{}
		if req.FirstName != "" {
			updates["first_name"] = req.FirstName
		}
		if req.LastName != "" {
			updates["last_name"] = req.LastName
		}
		if req.Phone != "" {
			updates["phone"] = req.Phone
		}
		if req.CustomFields != nil {
			updates["custom_fields"] = req.CustomFields
		}
		now := time.Now()
		updates["last_activity_at"] = &now

		if len(updates) > 0 {
			h.DB.Model(&contact).Updates(updates)
		}
	}

	// Handle tags
	if len(req.Tags) > 0 {
		var tags []models.Tag
		for _, tagName := range req.Tags {
			var tag models.Tag
			h.DB.Where("tenant_id = ? AND name = ?", tenantIDUint, tagName).FirstOrCreate(&tag, models.Tag{
				TenantID: tenantIDUint,
				Name:     tagName,
			})
			tags = append(tags, tag)
		}
		h.DB.Model(&contact).Association("Tags").Replace(tags)
	}

	// Reload with tags
	h.DB.Preload("Tags").First(&contact, contact.ID)

	if isNew {
		events.Emit(events.ContactCreated, contact)
		c.JSON(http.StatusCreated, gin.H{
			"data":    contact,
			"message": "Contact created successfully",
		})
	} else {
		events.Emit(events.ContactUpdated, contact)
		c.JSON(http.StatusOK, gin.H{
			"data":    contact,
			"message": "Contact updated successfully",
		})
	}
}

// Update updates an existing contact.
func (h *ContactHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid contact ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var contact models.Contact
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&contact, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Contact not found"},
		})
		return
	}

	var req struct {
		Email        *string        `json:"email"`
		FirstName    *string        `json:"first_name"`
		LastName     *string        `json:"last_name"`
		Phone        *string        `json:"phone"`
		AvatarURL    *string        `json:"avatar_url"`
		Source       *string        `json:"source"`
		Tags         []string       `json:"tags"`
		CustomFields datatypes.JSON `json:"custom_fields"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	updates := map[string]interface{}{}
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.FirstName != nil {
		updates["first_name"] = *req.FirstName
	}
	if req.LastName != nil {
		updates["last_name"] = *req.LastName
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.AvatarURL != nil {
		updates["avatar_url"] = *req.AvatarURL
	}
	if req.Source != nil {
		updates["source"] = *req.Source
	}
	if req.CustomFields != nil {
		updates["custom_fields"] = req.CustomFields
	}

	if len(updates) > 0 {
		h.DB.Model(&contact).Updates(updates)
	}

	// Handle tags
	if req.Tags != nil {
		tenantIDUint := tenantID.(uint)
		var tags []models.Tag
		for _, tagName := range req.Tags {
			var tag models.Tag
			h.DB.Where("tenant_id = ? AND name = ?", tenantIDUint, tagName).FirstOrCreate(&tag, models.Tag{
				TenantID: tenantIDUint,
				Name:     tagName,
			})
			tags = append(tags, tag)
		}
		h.DB.Model(&contact).Association("Tags").Replace(tags)
	}

	h.DB.Preload("Tags").First(&contact, contact.ID)

	events.Emit(events.ContactUpdated, contact)

	c.JSON(http.StatusOK, gin.H{
		"data":    contact,
		"message": "Contact updated successfully",
	})
}

// Delete soft-deletes a contact.
func (h *ContactHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid contact ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var contact models.Contact
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&contact, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Contact not found"},
		})
		return
	}

	h.DB.Delete(&contact)

	events.Emit(events.ContactDeleted, contact)

	c.JSON(http.StatusOK, gin.H{
		"message": "Contact deleted successfully",
	})
}

// ListTags returns all tags for the current tenant.
func (h *ContactHandler) ListTags(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")
	var tags []models.Tag
	h.DB.Where("tenant_id = ?", tenantID).Order("name ASC").Find(&tags)

	c.JSON(http.StatusOK, gin.H{
		"data": tags,
	})
}

// CreateTag creates a new tag.
func (h *ContactHandler) CreateTag(c *gin.Context) {
	var req struct {
		Name  string `json:"name" binding:"required"`
		Color string `json:"color"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	tenantIDUint := tenantID.(uint)

	tag := models.Tag{
		TenantID: tenantIDUint,
		Name:     req.Name,
		Color:    req.Color,
	}

	if tag.Color == "" {
		tag.Color = "#6366f1"
	}

	if err := h.DB.Create(&tag).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{"code": "DUPLICATE", "message": "A tag with this name already exists"},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    tag,
		"message": "Tag created successfully",
	})
}

// DeleteTag deletes a tag and removes it from all contacts.
func (h *ContactHandler) DeleteTag(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid tag ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var tag models.Tag
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&tag, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Tag not found"},
		})
		return
	}

	// Remove from all contacts first
	h.DB.Model(&tag).Association("Contacts").Clear()
	h.DB.Delete(&tag)

	c.JSON(http.StatusOK, gin.H{
		"message": "Tag deleted successfully",
	})
}

// GetActivities returns the activity timeline for a contact.
func (h *ContactHandler) GetActivities(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid contact ID"},
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	moduleFilter := c.Query("module")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	tenantID, _ := c.Get("tenant_id")
	query := h.DB.Model(&models.ContactActivity{}).
		Where("tenant_id = ? AND contact_id = ?", tenantID, id)

	if moduleFilter != "" {
		query = query.Where("module = ?", moduleFilter)
	}

	var total int64
	query.Count(&total)

	var activities []models.ContactActivity
	offset := (page - 1) * pageSize
	query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&activities)

	pages := int(math.Ceil(float64(total) / float64(pageSize)))

	c.JSON(http.StatusOK, gin.H{
		"data": activities,
		"meta": gin.H{
			"total":     total,
			"page":      page,
			"page_size": pageSize,
			"pages":     pages,
		},
	})
}
