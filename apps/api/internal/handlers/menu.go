package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/models"
)

// MenuHandler handles menu and menu item CRUD operations.
type MenuHandler struct {
	DB *gorm.DB
}

// NewMenuHandler creates a new MenuHandler.
func NewMenuHandler(db *gorm.DB) *MenuHandler {
	return &MenuHandler{DB: db}
}

// List returns all menus for the current tenant.
func (h *MenuHandler) List(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")
	var menus []models.Menu
	h.DB.Where("tenant_id = ?", tenantID).
		Preload("Items", func(db *gorm.DB) *gorm.DB {
			return db.Where("parent_id IS NULL").Order("sort_order ASC")
		}).
		Preload("Items.Children", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		Preload("Items.Page", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, title, slug")
		}).
		Preload("Items.Children.Page", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, title, slug")
		}).
		Order("name ASC").
		Find(&menus)

	c.JSON(http.StatusOK, gin.H{"data": menus})
}

// GetByID returns a single menu with all items.
func (h *MenuHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid menu ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var menu models.Menu
	if err := h.DB.
		Preload("Items", func(db *gorm.DB) *gorm.DB {
			return db.Where("parent_id IS NULL").Order("sort_order ASC")
		}).
		Preload("Items.Children", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		Preload("Items.Page", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, title, slug")
		}).
		Preload("Items.Children.Page", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, title, slug")
		}).
		Where("tenant_id = ?", tenantID).First(&menu, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Menu not found"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": menu})
}

// GetByLocation returns a menu by location (public, for header/footer rendering).
func (h *MenuHandler) GetByLocation(c *gin.Context) {
	location := c.Param("location")

	var menu models.Menu
	if err := h.DB.
		Preload("Items", func(db *gorm.DB) *gorm.DB {
			return db.Where("parent_id IS NULL").Order("sort_order ASC")
		}).
		Preload("Items.Children", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		Preload("Items.Page", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, title, slug")
		}).
		Preload("Items.Children.Page", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, title, slug")
		}).
		Where("location = ?", location).First(&menu).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Menu not found for location: " + location},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": menu})
}

// Create creates a new menu.
func (h *MenuHandler) Create(c *gin.Context) {
	var req struct {
		Name     string `json:"name" binding:"required"`
		Slug     string `json:"slug"`
		Location string `json:"location" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	tenantIDUint := tenantID.(uint)

	menu := models.Menu{
		TenantID: tenantIDUint,
		Name:     req.Name,
		Slug:     req.Slug,
		Location: req.Location,
	}

	if err := h.DB.Create(&menu).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{"code": "DUPLICATE", "message": "Menu with this slug already exists"},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    menu,
		"message": "Menu created successfully",
	})
}

// Update updates a menu's name and location.
func (h *MenuHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid menu ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var menu models.Menu
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&menu, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Menu not found"},
		})
		return
	}

	var req struct {
		Name     *string `json:"name"`
		Location *string `json:"location"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Location != nil {
		updates["location"] = *req.Location
	}

	h.DB.Model(&menu).Updates(updates)
	h.DB.First(&menu, menu.ID)

	c.JSON(http.StatusOK, gin.H{
		"data":    menu,
		"message": "Menu updated successfully",
	})
}

// Delete deletes a menu and all its items.
func (h *MenuHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid menu ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var menu models.Menu
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&menu, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Menu not found"},
		})
		return
	}

	// Delete all menu items first
	h.DB.Where("menu_id = ?", menu.ID).Delete(&models.MenuItem{})
	h.DB.Delete(&menu)

	c.JSON(http.StatusOK, gin.H{
		"message": "Menu deleted successfully",
	})
}

// --- Menu Item endpoints ---

// CreateMenuItem adds an item to a menu.
func (h *MenuHandler) CreateMenuItem(c *gin.Context) {
	menuID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid menu ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	tenantIDUint := tenantID.(uint)

	// Verify menu exists
	var menu models.Menu
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&menu, menuID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Menu not found"},
		})
		return
	}

	var req struct {
		Label     string `json:"label" binding:"required"`
		URL       string `json:"url"`
		PageID    *uint  `json:"page_id"`
		Target    string `json:"target"`
		SortOrder int    `json:"sort_order"`
		ParentID  *uint  `json:"parent_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	item := models.MenuItem{
		TenantID:  tenantIDUint,
		MenuID:    uint(menuID),
		Label:     req.Label,
		URL:       req.URL,
		PageID:    req.PageID,
		Target:    req.Target,
		SortOrder: req.SortOrder,
		ParentID:  req.ParentID,
	}

	if item.Target == "" {
		item.Target = "_self"
	}

	if err := h.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to create menu item"},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    item,
		"message": "Menu item created successfully",
	})
}

// UpdateMenuItem updates a menu item.
func (h *MenuHandler) UpdateMenuItem(c *gin.Context) {
	itemID, err := strconv.ParseUint(c.Param("itemId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid menu item ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var item models.MenuItem
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&item, itemID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Menu item not found"},
		})
		return
	}

	var req struct {
		Label     *string `json:"label"`
		URL       *string `json:"url"`
		PageID    *uint   `json:"page_id"`
		Target    *string `json:"target"`
		SortOrder *int    `json:"sort_order"`
		ParentID  *uint   `json:"parent_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	updates := map[string]interface{}{}
	if req.Label != nil {
		updates["label"] = *req.Label
	}
	if req.URL != nil {
		updates["url"] = *req.URL
	}
	if req.PageID != nil {
		updates["page_id"] = *req.PageID
	}
	if req.Target != nil {
		updates["target"] = *req.Target
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}
	if req.ParentID != nil {
		updates["parent_id"] = *req.ParentID
	}

	h.DB.Model(&item).Updates(updates)
	h.DB.First(&item, item.ID)

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "Menu item updated successfully",
	})
}

// DeleteMenuItem removes a menu item.
func (h *MenuHandler) DeleteMenuItem(c *gin.Context) {
	itemID, err := strconv.ParseUint(c.Param("itemId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid menu item ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var item models.MenuItem
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&item, itemID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Menu item not found"},
		})
		return
	}

	// Delete children first
	h.DB.Where("parent_id = ?", item.ID).Delete(&models.MenuItem{})
	h.DB.Delete(&item)

	c.JSON(http.StatusOK, gin.H{
		"message": "Menu item deleted successfully",
	})
}

// ReorderMenuItems reorders items within a menu.
func (h *MenuHandler) ReorderMenuItems(c *gin.Context) {
	menuID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid menu ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")

	// Verify menu exists
	var menu models.Menu
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&menu, menuID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Menu not found"},
		})
		return
	}

	var req struct {
		Items []struct {
			ID        uint  `json:"id"`
			SortOrder int   `json:"sort_order"`
			ParentID  *uint `json:"parent_id"`
		} `json:"items" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	for _, item := range req.Items {
		updates := map[string]interface{}{
			"sort_order": item.SortOrder,
		}
		if item.ParentID != nil {
			updates["parent_id"] = *item.ParentID
		} else {
			updates["parent_id"] = nil
		}
		h.DB.Model(&models.MenuItem{}).Where("id = ? AND menu_id = ?", item.ID, menuID).Updates(updates)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Menu items reordered successfully",
	})
}
