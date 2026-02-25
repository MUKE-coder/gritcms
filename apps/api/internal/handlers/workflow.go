package handlers

import (
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/models"
)

type WorkflowHandler struct {
	DB *gorm.DB
}

func NewWorkflowHandler(db *gorm.DB) *WorkflowHandler {
	return &WorkflowHandler{DB: db}
}

// ---------- Workflows CRUD ----------

func (h *WorkflowHandler) ListWorkflows(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize := 20
	if page < 1 {
		page = 1
	}

	var total int64
	q := h.DB.Model(&models.Workflow{})

	if s := c.Query("search"); s != "" {
		q = q.Where("name ILIKE ?", "%"+s+"%")
	}
	if st := c.Query("status"); st != "" {
		q = q.Where("status = ?", st)
	}

	q.Count(&total)

	var workflows []models.Workflow
	q.Preload("Actions", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).
		Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&workflows)

	c.JSON(http.StatusOK, gin.H{
		"data": workflows,
		"meta": gin.H{
			"total": total, "page": page, "page_size": pageSize,
			"pages": int(math.Ceil(float64(total) / float64(pageSize))),
		},
	})
}

func (h *WorkflowHandler) GetWorkflow(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var workflow models.Workflow
	if err := h.DB.Preload("Actions", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).First(&workflow, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workflow not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": workflow})
}

func (h *WorkflowHandler) CreateWorkflow(c *gin.Context) {
	var body models.Workflow
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	if body.Status == "" {
		body.Status = models.WorkflowStatusDraft
	}
	if err := h.DB.Create(&body).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workflow"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *WorkflowHandler) UpdateWorkflow(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var workflow models.Workflow
	if err := h.DB.First(&workflow, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workflow not found"})
		return
	}
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(body)
	h.DB.Model(&workflow).Updates(body)
	h.DB.Preload("Actions", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).First(&workflow, id)
	c.JSON(http.StatusOK, gin.H{"data": workflow})
}

func (h *WorkflowHandler) DeleteWorkflow(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.DB.Delete(&models.Workflow{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete workflow"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Workflow deleted"})
}

// ---------- Actions ----------

func (h *WorkflowHandler) CreateAction(c *gin.Context) {
	workflowID, _ := strconv.Atoi(c.Param("id"))
	var body models.WorkflowAction
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	body.WorkflowID = uint(workflowID)

	// Auto sort_order
	var maxOrder int
	h.DB.Model(&models.WorkflowAction{}).Where("workflow_id = ?", workflowID).
		Select("COALESCE(MAX(sort_order), -1)").Scan(&maxOrder)
	body.SortOrder = maxOrder + 1

	if err := h.DB.Create(&body).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create action"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *WorkflowHandler) UpdateAction(c *gin.Context) {
	actionID, _ := strconv.Atoi(c.Param("actionId"))
	var action models.WorkflowAction
	if err := h.DB.First(&action, actionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Action not found"})
		return
	}
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(body)
	h.DB.Model(&action).Updates(body)
	h.DB.First(&action, actionID)
	c.JSON(http.StatusOK, gin.H{"data": action})
}

func (h *WorkflowHandler) DeleteAction(c *gin.Context) {
	actionID, _ := strconv.Atoi(c.Param("actionId"))
	if err := h.DB.Delete(&models.WorkflowAction{}, actionID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete action"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Action deleted"})
}

func (h *WorkflowHandler) ReorderActions(c *gin.Context) {
	var body struct {
		Order []uint `json:"order"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	for i, id := range body.Order {
		h.DB.Model(&models.WorkflowAction{}).Where("id = ?", id).Update("sort_order", i)
	}
	c.JSON(http.StatusOK, gin.H{"message": "Actions reordered"})
}

// ---------- Executions ----------

func (h *WorkflowHandler) ListExecutions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize := 20
	if page < 1 {
		page = 1
	}

	var total int64
	q := h.DB.Model(&models.WorkflowExecution{})

	if wid := c.Query("workflow_id"); wid != "" {
		q = q.Where("workflow_id = ?", wid)
	}
	if st := c.Query("status"); st != "" {
		q = q.Where("status = ?", st)
	}

	q.Count(&total)

	var executions []models.WorkflowExecution
	q.Preload("Workflow").Preload("Contact").
		Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&executions)

	c.JSON(http.StatusOK, gin.H{
		"data": executions,
		"meta": gin.H{
			"total": total, "page": page, "page_size": pageSize,
			"pages": int(math.Ceil(float64(total) / float64(pageSize))),
		},
	})
}

func (h *WorkflowHandler) GetExecution(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("execId"))
	var exec models.WorkflowExecution
	if err := h.DB.Preload("Workflow.Actions", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Preload("Contact").First(&exec, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Execution not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": exec})
}

// TriggerWorkflow manually triggers a workflow for a contact
func (h *WorkflowHandler) TriggerWorkflow(c *gin.Context) {
	workflowID, _ := strconv.Atoi(c.Param("id"))
	var body struct {
		ContactID uint `json:"contact_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var workflow models.Workflow
	if err := h.DB.First(&workflow, workflowID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workflow not found"})
		return
	}

	now := time.Now()
	exec := models.WorkflowExecution{
		TenantID:     1,
		WorkflowID:   uint(workflowID),
		ContactID:    body.ContactID,
		TriggerEvent: "manual",
		Status:       models.ExecutionRunning,
		StartedAt:    now,
	}
	h.DB.Create(&exec)

	// Increment execution count
	h.DB.Model(&workflow).UpdateColumn("execution_count", gorm.Expr("execution_count + 1"))

	c.JSON(http.StatusCreated, gin.H{"data": exec})
}
