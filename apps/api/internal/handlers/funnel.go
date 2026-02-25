package handlers

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/events"
	"gritcms/apps/api/internal/models"
)

type FunnelHandler struct {
	DB *gorm.DB
}

func NewFunnelHandler(db *gorm.DB) *FunnelHandler {
	return &FunnelHandler{DB: db}
}

// ---------- Funnels CRUD ----------

func (h *FunnelHandler) ListFunnels(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize := 20
	if page < 1 {
		page = 1
	}

	var total int64
	q := h.DB.Model(&models.Funnel{})

	if s := c.Query("search"); s != "" {
		q = q.Where("name ILIKE ?", "%"+s+"%")
	}
	if st := c.Query("status"); st != "" {
		q = q.Where("status = ?", st)
	}

	q.Count(&total)

	var funnels []models.Funnel
	q.Preload("Steps", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).
		Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&funnels)

	// Attach visit & conversion counts
	for i := range funnels {
		h.DB.Model(&models.FunnelVisit{}).Where("funnel_id = ?", funnels[i].ID).Count(&funnels[i].VisitCount)
		h.DB.Model(&models.FunnelConversion{}).Where("funnel_id = ?", funnels[i].ID).Count(&funnels[i].ConvCount)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": funnels,
		"meta": gin.H{
			"total": total, "page": page, "page_size": pageSize,
			"pages": int(math.Ceil(float64(total) / float64(pageSize))),
		},
	})
}

func (h *FunnelHandler) GetFunnel(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var funnel models.Funnel
	if err := h.DB.Preload("Steps", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).First(&funnel, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Funnel not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": funnel})
}

func (h *FunnelHandler) CreateFunnel(c *gin.Context) {
	var body models.Funnel
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	body.Slug = generateFunnelSlug(h.DB, body.Name)
	if body.Status == "" {
		body.Status = models.FunnelStatusDraft
	}
	if err := h.DB.Create(&body).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create funnel"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *FunnelHandler) UpdateFunnel(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var funnel models.Funnel
	if err := h.DB.First(&funnel, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Funnel not found"})
		return
	}
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(body)
	h.DB.Model(&funnel).Updates(body)
	h.DB.Preload("Steps", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).First(&funnel, id)
	c.JSON(http.StatusOK, gin.H{"data": funnel})
}

func (h *FunnelHandler) DeleteFunnel(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.DB.Delete(&models.Funnel{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete funnel"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Funnel deleted"})
}

// ---------- Funnel Steps ----------

func (h *FunnelHandler) CreateStep(c *gin.Context) {
	funnelID, _ := strconv.Atoi(c.Param("id"))
	var body models.FunnelStep
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	body.FunnelID = uint(funnelID)
	if body.Slug == "" {
		body.Slug = generateSlug(body.Name)
	}

	// Auto sort_order
	var maxOrder int
	h.DB.Model(&models.FunnelStep{}).Where("funnel_id = ?", funnelID).
		Select("COALESCE(MAX(sort_order), -1)").Scan(&maxOrder)
	body.SortOrder = maxOrder + 1

	if err := h.DB.Create(&body).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create step"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *FunnelHandler) UpdateStep(c *gin.Context) {
	stepID, _ := strconv.Atoi(c.Param("stepId"))
	var step models.FunnelStep
	if err := h.DB.First(&step, stepID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Step not found"})
		return
	}
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(body)
	h.DB.Model(&step).Updates(body)
	h.DB.First(&step, stepID)
	c.JSON(http.StatusOK, gin.H{"data": step})
}

func (h *FunnelHandler) DeleteStep(c *gin.Context) {
	stepID, _ := strconv.Atoi(c.Param("stepId"))
	if err := h.DB.Delete(&models.FunnelStep{}, stepID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete step"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Step deleted"})
}

func (h *FunnelHandler) ReorderSteps(c *gin.Context) {
	var body struct {
		Order []uint `json:"order"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	for i, id := range body.Order {
		h.DB.Model(&models.FunnelStep{}).Where("id = ?", id).Update("sort_order", i)
	}
	c.JSON(http.StatusOK, gin.H{"message": "Steps reordered"})
}

// ---------- Funnel Analytics ----------

func (h *FunnelHandler) FunnelAnalytics(c *gin.Context) {
	funnelID, _ := strconv.Atoi(c.Param("id"))

	var funnel models.Funnel
	if err := h.DB.Preload("Steps", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).First(&funnel, funnelID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Funnel not found"})
		return
	}

	type StepStats struct {
		StepID      uint    `json:"step_id"`
		StepName    string  `json:"step_name"`
		StepType    string  `json:"step_type"`
		Visits      int64   `json:"visits"`
		Conversions int64   `json:"conversions"`
		Rate        float64 `json:"conversion_rate"`
	}

	var stats []StepStats
	for _, step := range funnel.Steps {
		var visits, conversions int64
		h.DB.Model(&models.FunnelVisit{}).Where("step_id = ?", step.ID).Count(&visits)
		h.DB.Model(&models.FunnelConversion{}).Where("step_id = ?", step.ID).Count(&conversions)
		rate := float64(0)
		if visits > 0 {
			rate = float64(conversions) / float64(visits) * 100
		}
		stats = append(stats, StepStats{
			StepID: step.ID, StepName: step.Name, StepType: step.Type,
			Visits: visits, Conversions: conversions, Rate: math.Round(rate*100) / 100,
		})
	}

	var totalVisits, totalConversions int64
	h.DB.Model(&models.FunnelVisit{}).Where("funnel_id = ?", funnelID).Count(&totalVisits)
	h.DB.Model(&models.FunnelConversion{}).Where("funnel_id = ?", funnelID).Count(&totalConversions)

	var totalValue int64
	h.DB.Model(&models.FunnelConversion{}).Where("funnel_id = ?", funnelID).
		Select("COALESCE(SUM(value), 0)").Scan(&totalValue)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"total_visits":      totalVisits,
			"total_conversions": totalConversions,
			"total_value":       totalValue,
			"overall_rate":      safeRate(totalConversions, totalVisits),
			"steps":             stats,
		},
	})
}

// ---------- Public Funnel Routes ----------

func (h *FunnelHandler) GetPublicFunnel(c *gin.Context) {
	slug := c.Param("slug")
	var funnel models.Funnel
	if err := h.DB.Where("slug = ? AND status = ?", slug, models.FunnelStatusActive).
		Preload("Steps", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).First(&funnel).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Funnel not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": funnel})
}

func (h *FunnelHandler) GetPublicStep(c *gin.Context) {
	funnelSlug := c.Param("slug")
	stepSlug := c.Param("stepSlug")

	var funnel models.Funnel
	if err := h.DB.Where("slug = ? AND status = ?", funnelSlug, models.FunnelStatusActive).First(&funnel).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Funnel not found"})
		return
	}

	var step models.FunnelStep
	if err := h.DB.Where("funnel_id = ? AND slug = ?", funnel.ID, stepSlug).First(&step).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Step not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": step, "funnel": funnel})
}

func (h *FunnelHandler) TrackVisit(c *gin.Context) {
	var body models.FunnelVisit
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	body.VisitedAt = time.Now()
	body.IPAddress = c.ClientIP()
	body.UserAgent = c.Request.UserAgent()
	h.DB.Create(&body)

	events.Emit(events.FunnelVisited, map[string]interface{}{
		"funnel_id": body.FunnelID, "step_id": body.StepID,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Visit tracked"})
}

func (h *FunnelHandler) TrackConversion(c *gin.Context) {
	var body models.FunnelConversion
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	body.ConvertedAt = time.Now()
	h.DB.Create(&body)

	events.Emit(events.FunnelConverted, map[string]interface{}{
		"funnel_id": body.FunnelID, "step_id": body.StepID, "type": body.Type,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Conversion tracked"})
}

// ---------- Helpers ----------

func generateFunnelSlug(db *gorm.DB, name string) string {
	base := generateSlug(name)
	slug := base
	i := 1
	for {
		var count int64
		db.Model(&models.Funnel{}).Where("slug = ?", slug).Count(&count)
		if count == 0 {
			return slug
		}
		slug = fmt.Sprintf("%s-%d", base, i)
		i++
	}
}

func safeRate(conversions, visits int64) float64 {
	if visits == 0 {
		return 0
	}
	return math.Round(float64(conversions)/float64(visits)*10000) / 100
}

