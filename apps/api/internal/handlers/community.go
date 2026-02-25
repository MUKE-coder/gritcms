package handlers

import (
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/models"
)

// CommunityHandler handles all community endpoints.
type CommunityHandler struct {
	db *gorm.DB
}

// NewCommunityHandler creates a new CommunityHandler.
func NewCommunityHandler(db *gorm.DB) *CommunityHandler {
	return &CommunityHandler{db: db}
}

// ===================== SPACES =====================

func (h *CommunityHandler) ListSpaces(c *gin.Context) {
	var spaces []models.Space
	if err := h.db.Order("sort_order ASC, created_at ASC").Find(&spaces).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list spaces"})
		return
	}
	for i := range spaces {
		h.db.Model(&models.CommunityMember{}).Where("space_id = ?", spaces[i].ID).Count(&spaces[i].MemberCount)
		h.db.Model(&models.Thread{}).Where("space_id = ?", spaces[i].ID).Count(&spaces[i].ThreadCount)
	}
	c.JSON(http.StatusOK, gin.H{"data": spaces})
}

func (h *CommunityHandler) GetSpace(c *gin.Context) {
	id := c.Param("id")
	var space models.Space
	if err := h.db.First(&space, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Space not found"})
		return
	}
	h.db.Model(&models.CommunityMember{}).Where("space_id = ?", space.ID).Count(&space.MemberCount)
	h.db.Model(&models.Thread{}).Where("space_id = ?", space.ID).Count(&space.ThreadCount)
	c.JSON(http.StatusOK, gin.H{"data": space})
}

func (h *CommunityHandler) CreateSpace(c *gin.Context) {
	var space models.Space
	if err := c.ShouldBindJSON(&space); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	space.TenantID = 1
	if space.Slug == "" {
		space.Slug = generateSpaceSlug(space.Name)
	}
	if err := h.db.Create(&space).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create space"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": space})
}

func (h *CommunityHandler) UpdateSpace(c *gin.Context) {
	id := c.Param("id")
	var space models.Space
	if err := h.db.First(&space, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Space not found"})
		return
	}
	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(input)
	h.db.Model(&space).Updates(input)
	h.db.First(&space, id)
	c.JSON(http.StatusOK, gin.H{"data": space})
}

func (h *CommunityHandler) DeleteSpace(c *gin.Context) {
	id := c.Param("id")
	h.db.Delete(&models.Space{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Space deleted"})
}

func (h *CommunityHandler) ReorderSpaces(c *gin.Context) {
	var input struct {
		IDs []uint `json:"ids"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	for i, id := range input.IDs {
		h.db.Model(&models.Space{}).Where("id = ?", id).Update("sort_order", i)
	}
	c.JSON(http.StatusOK, gin.H{"message": "Spaces reordered"})
}

// ===================== MEMBERS =====================

func (h *CommunityHandler) ListMembers(c *gin.Context) {
	spaceID := c.Param("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * pageSize

	q := h.db.Model(&models.CommunityMember{}).Where("space_id = ?", spaceID)
	var total int64
	q.Count(&total)

	var members []models.CommunityMember
	q.Preload("Contact").Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&members)

	c.JSON(http.StatusOK, gin.H{
		"data": members,
		"meta": gin.H{"total": total, "page": page, "page_size": pageSize, "pages": int(math.Ceil(float64(total) / float64(pageSize)))},
	})
}

func (h *CommunityHandler) AddMember(c *gin.Context) {
	spaceID, _ := strconv.Atoi(c.Param("id"))
	var input struct {
		ContactID uint   `json:"contact_id" binding:"required"`
		Role      string `json:"role"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	role := input.Role
	if role == "" {
		role = models.MemberRoleMember
	}
	member := models.CommunityMember{
		TenantID:  1,
		SpaceID:   uint(spaceID),
		ContactID: input.ContactID,
		Role:      role,
		JoinedAt:  time.Now(),
	}
	if err := h.db.Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add member"})
		return
	}
	h.db.Preload("Contact").First(&member, member.ID)
	c.JSON(http.StatusCreated, gin.H{"data": member})
}

func (h *CommunityHandler) RemoveMember(c *gin.Context) {
	memberID := c.Param("memberId")
	h.db.Delete(&models.CommunityMember{}, memberID)
	c.JSON(http.StatusOK, gin.H{"message": "Member removed"})
}

func (h *CommunityHandler) UpdateMemberRole(c *gin.Context) {
	memberID := c.Param("memberId")
	var input struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.db.Model(&models.CommunityMember{}).Where("id = ?", memberID).Update("role", input.Role)
	c.JSON(http.StatusOK, gin.H{"message": "Role updated"})
}

// ===================== THREADS =====================

func (h *CommunityHandler) ListThreads(c *gin.Context) {
	spaceID := c.Param("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	sort := c.DefaultQuery("sort", "recent")
	threadType := c.Query("type")

	if page < 1 {
		page = 1
	}
	offset := (page - 1) * pageSize

	q := h.db.Model(&models.Thread{}).Where("space_id = ?", spaceID)
	if threadType != "" {
		q = q.Where("type = ?", threadType)
	}

	var total int64
	q.Count(&total)

	orderBy := "last_activity_at DESC"
	if sort == "popular" {
		orderBy = "like_count DESC"
	} else if sort == "newest" {
		orderBy = "created_at DESC"
	}

	// Pinned threads first
	var threads []models.Thread
	q.Preload("Author").Order("CASE WHEN status = 'pinned' THEN 0 ELSE 1 END, " + orderBy).
		Offset(offset).Limit(pageSize).Find(&threads)

	c.JSON(http.StatusOK, gin.H{
		"data": threads,
		"meta": gin.H{"total": total, "page": page, "page_size": pageSize, "pages": int(math.Ceil(float64(total) / float64(pageSize)))},
	})
}

func (h *CommunityHandler) GetThread(c *gin.Context) {
	threadID := c.Param("threadId")
	var thread models.Thread
	if err := h.db.Preload("Author").Preload("Replies", func(db *gorm.DB) *gorm.DB {
		return db.Where("parent_id IS NULL").Order("created_at ASC")
	}).Preload("Replies.Author").Preload("Replies.Children", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at ASC")
	}).Preload("Replies.Children.Author").First(&thread, threadID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Thread not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": thread})
}

func (h *CommunityHandler) CreateThread(c *gin.Context) {
	spaceID, _ := strconv.Atoi(c.Param("id"))
	var thread models.Thread
	if err := c.ShouldBindJSON(&thread); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	thread.TenantID = 1
	thread.SpaceID = uint(spaceID)
	thread.LastActivityAt = time.Now()
	if thread.Type == "" {
		thread.Type = models.ThreadTypeDiscussion
	}
	if thread.Status == "" {
		thread.Status = models.ThreadStatusOpen
	}
	if err := h.db.Create(&thread).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create thread"})
		return
	}
	h.db.Preload("Author").First(&thread, thread.ID)
	c.JSON(http.StatusCreated, gin.H{"data": thread})
}

func (h *CommunityHandler) UpdateThread(c *gin.Context) {
	threadID := c.Param("threadId")
	var thread models.Thread
	if err := h.db.First(&thread, threadID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Thread not found"})
		return
	}
	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(input)
	h.db.Model(&thread).Updates(input)
	h.db.Preload("Author").First(&thread, threadID)
	c.JSON(http.StatusOK, gin.H{"data": thread})
}

func (h *CommunityHandler) DeleteThread(c *gin.Context) {
	threadID := c.Param("threadId")
	h.db.Delete(&models.Thread{}, threadID)
	c.JSON(http.StatusOK, gin.H{"message": "Thread deleted"})
}

func (h *CommunityHandler) PinThread(c *gin.Context) {
	threadID := c.Param("threadId")
	var thread models.Thread
	if err := h.db.First(&thread, threadID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Thread not found"})
		return
	}
	if thread.Status == models.ThreadStatusPinned {
		thread.Status = models.ThreadStatusOpen
	} else {
		thread.Status = models.ThreadStatusPinned
	}
	h.db.Save(&thread)
	c.JSON(http.StatusOK, gin.H{"data": thread})
}

func (h *CommunityHandler) CloseThread(c *gin.Context) {
	threadID := c.Param("threadId")
	var thread models.Thread
	if err := h.db.First(&thread, threadID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Thread not found"})
		return
	}
	if thread.Status == models.ThreadStatusClosed {
		thread.Status = models.ThreadStatusOpen
	} else {
		thread.Status = models.ThreadStatusClosed
	}
	h.db.Save(&thread)
	c.JSON(http.StatusOK, gin.H{"data": thread})
}

// ===================== REPLIES =====================

func (h *CommunityHandler) CreateReply(c *gin.Context) {
	threadID, _ := strconv.Atoi(c.Param("threadId"))
	var reply models.Reply
	if err := c.ShouldBindJSON(&reply); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	reply.TenantID = 1
	reply.ThreadID = uint(threadID)
	if err := h.db.Create(&reply).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create reply"})
		return
	}
	// Update thread reply count and last activity
	h.db.Model(&models.Thread{}).Where("id = ?", threadID).Updates(map[string]interface{}{
		"reply_count":      gorm.Expr("reply_count + 1"),
		"last_activity_at": time.Now(),
	})
	h.db.Preload("Author").First(&reply, reply.ID)
	c.JSON(http.StatusCreated, gin.H{"data": reply})
}

func (h *CommunityHandler) UpdateReply(c *gin.Context) {
	replyID := c.Param("replyId")
	var reply models.Reply
	if err := h.db.First(&reply, replyID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reply not found"})
		return
	}
	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(input)
	h.db.Model(&reply).Updates(input)
	h.db.Preload("Author").First(&reply, replyID)
	c.JSON(http.StatusOK, gin.H{"data": reply})
}

func (h *CommunityHandler) DeleteReply(c *gin.Context) {
	replyID := c.Param("replyId")
	var reply models.Reply
	if err := h.db.First(&reply, replyID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reply not found"})
		return
	}
	h.db.Delete(&reply)
	// Decrement thread reply count
	h.db.Model(&models.Thread{}).Where("id = ?", reply.ThreadID).UpdateColumn("reply_count", gorm.Expr("GREATEST(reply_count - 1, 0)"))
	c.JSON(http.StatusOK, gin.H{"message": "Reply deleted"})
}

// ===================== REACTIONS =====================

func (h *CommunityHandler) ToggleReaction(c *gin.Context) {
	var input struct {
		ReactableType string `json:"reactable_type" binding:"required"` // thread, reply
		ReactableID   uint   `json:"reactable_id" binding:"required"`
		ContactID     uint   `json:"contact_id" binding:"required"`
		Type          string `json:"type"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Type == "" {
		input.Type = "like"
	}

	var existing models.Reaction
	result := h.db.Where("reactable_type = ? AND reactable_id = ? AND contact_id = ? AND type = ?",
		input.ReactableType, input.ReactableID, input.ContactID, input.Type).First(&existing)

	if result.Error == nil {
		// Remove reaction
		h.db.Delete(&existing)
		// Decrement like count
		if input.ReactableType == "thread" {
			h.db.Model(&models.Thread{}).Where("id = ?", input.ReactableID).UpdateColumn("like_count", gorm.Expr("GREATEST(like_count - 1, 0)"))
		} else {
			h.db.Model(&models.Reply{}).Where("id = ?", input.ReactableID).UpdateColumn("like_count", gorm.Expr("GREATEST(like_count - 1, 0)"))
		}
		c.JSON(http.StatusOK, gin.H{"action": "removed"})
		return
	}

	// Add reaction
	reaction := models.Reaction{
		TenantID:      1,
		ReactableType: input.ReactableType,
		ReactableID:   input.ReactableID,
		ContactID:     input.ContactID,
		Type:          input.Type,
	}
	h.db.Create(&reaction)
	if input.ReactableType == "thread" {
		h.db.Model(&models.Thread{}).Where("id = ?", input.ReactableID).UpdateColumn("like_count", gorm.Expr("like_count + 1"))
	} else {
		h.db.Model(&models.Reply{}).Where("id = ?", input.ReactableID).UpdateColumn("like_count", gorm.Expr("like_count + 1"))
	}
	c.JSON(http.StatusCreated, gin.H{"action": "added", "data": reaction})
}

// ===================== EVENTS =====================

func (h *CommunityHandler) ListEvents(c *gin.Context) {
	spaceID := c.Query("space_id")
	status := c.Query("status")

	q := h.db.Model(&models.CommunityEvent{})
	if spaceID != "" {
		q = q.Where("space_id = ?", spaceID)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}

	var events []models.CommunityEvent
	if err := q.Order("start_at ASC").Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list events"})
		return
	}
	for i := range events {
		h.db.Model(&models.EventAttendee{}).Where("event_id = ?", events[i].ID).Count(&events[i].AttendeeCount)
	}
	c.JSON(http.StatusOK, gin.H{"data": events})
}

func (h *CommunityHandler) GetEvent(c *gin.Context) {
	eventID := c.Param("eventId")
	var event models.CommunityEvent
	if err := h.db.Preload("Attendees.Contact").First(&event, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}
	h.db.Model(&models.EventAttendee{}).Where("event_id = ?", event.ID).Count(&event.AttendeeCount)
	c.JSON(http.StatusOK, gin.H{"data": event})
}

func (h *CommunityHandler) CreateEvent(c *gin.Context) {
	var event models.CommunityEvent
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	event.TenantID = 1
	if err := h.db.Create(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": event})
}

func (h *CommunityHandler) UpdateEvent(c *gin.Context) {
	eventID := c.Param("eventId")
	var event models.CommunityEvent
	if err := h.db.First(&event, eventID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}
	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(input)
	h.db.Model(&event).Updates(input)
	h.db.First(&event, eventID)
	c.JSON(http.StatusOK, gin.H{"data": event})
}

func (h *CommunityHandler) DeleteEvent(c *gin.Context) {
	eventID := c.Param("eventId")
	h.db.Delete(&models.CommunityEvent{}, eventID)
	c.JSON(http.StatusOK, gin.H{"message": "Event deleted"})
}

func (h *CommunityHandler) RegisterForEvent(c *gin.Context) {
	eventID, _ := strconv.Atoi(c.Param("eventId"))
	var input struct {
		ContactID uint `json:"contact_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	attendee := models.EventAttendee{
		TenantID:  1,
		EventID:   uint(eventID),
		ContactID: input.ContactID,
		Status:    "registered",
	}
	if err := h.db.Create(&attendee).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": attendee})
}

func (h *CommunityHandler) CancelRegistration(c *gin.Context) {
	attendeeID := c.Param("attendeeId")
	h.db.Model(&models.EventAttendee{}).Where("id = ?", attendeeID).Update("status", "cancelled")
	c.JSON(http.StatusOK, gin.H{"message": "Registration cancelled"})
}

// ===================== PUBLIC ENDPOINTS =====================

func (h *CommunityHandler) ListPublicSpaces(c *gin.Context) {
	var spaces []models.Space
	h.db.Where("type = 'public'").Order("sort_order ASC").Find(&spaces)
	for i := range spaces {
		h.db.Model(&models.CommunityMember{}).Where("space_id = ?", spaces[i].ID).Count(&spaces[i].MemberCount)
		h.db.Model(&models.Thread{}).Where("space_id = ?", spaces[i].ID).Count(&spaces[i].ThreadCount)
	}
	c.JSON(http.StatusOK, gin.H{"data": spaces})
}

func (h *CommunityHandler) GetPublicSpace(c *gin.Context) {
	slug := c.Param("slug")
	var space models.Space
	if err := h.db.Where("slug = ? AND type = 'public'", slug).First(&space).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Space not found"})
		return
	}
	h.db.Model(&models.CommunityMember{}).Where("space_id = ?", space.ID).Count(&space.MemberCount)
	h.db.Model(&models.Thread{}).Where("space_id = ?", space.ID).Count(&space.ThreadCount)
	c.JSON(http.StatusOK, gin.H{"data": space})
}

// ===================== HELPERS =====================

func generateSpaceSlug(name string) string {
	slug := strings.ToLower(name)
	slug = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == ' ' {
			return r
		}
		return -1
	}, slug)
	slug = strings.ReplaceAll(slug, " ", "-")
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}
	return strings.Trim(slug, "-")
}
