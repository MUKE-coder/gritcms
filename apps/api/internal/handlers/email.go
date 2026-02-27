package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/events"
	"gritcms/apps/api/internal/models"
)

type EmailHandler struct {
	DB *gorm.DB
}

func NewEmailHandler(db *gorm.DB) *EmailHandler {
	return &EmailHandler{DB: db}
}

// ===== Email Lists =====

func (h *EmailHandler) ListEmailLists(c *gin.Context) {
	var lists []models.EmailList
	q := h.DB.Order("created_at DESC")

	if err := q.Find(&lists).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch email lists"})
		return
	}

	// Add subscriber counts
	for i := range lists {
		var count int64
		h.DB.Model(&models.EmailSubscription{}).Where("email_list_id = ? AND status = ?", lists[i].ID, models.SubStatusActive).Count(&count)
		lists[i].SubscriberCount = count
	}

	c.JSON(http.StatusOK, gin.H{"data": lists})
}

func (h *EmailHandler) GetEmailList(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var list models.EmailList
	if err := h.DB.First(&list, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Email list not found"})
		return
	}
	var count int64
	h.DB.Model(&models.EmailSubscription{}).Where("email_list_id = ? AND status = ?", list.ID, models.SubStatusActive).Count(&count)
	list.SubscriberCount = count

	c.JSON(http.StatusOK, gin.H{"data": list})
}

func (h *EmailHandler) CreateEmailList(c *gin.Context) {
	var body models.EmailList
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	if err := h.DB.Create(&body).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create email list"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *EmailHandler) UpdateEmailList(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var list models.EmailList
	if err := h.DB.First(&list, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Email list not found"})
		return
	}
	if err := c.ShouldBindJSON(&list); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.DB.Save(&list)
	c.JSON(http.StatusOK, gin.H{"data": list})
}

func (h *EmailHandler) DeleteEmailList(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	h.DB.Delete(&models.EmailList{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Email list deleted"})
}

// ===== Subscriptions =====

func (h *EmailHandler) ListSubscribers(c *gin.Context) {
	listID, _ := strconv.Atoi(c.Param("id"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")

	q := h.DB.Where("email_list_id = ?", listID).Preload("Contact")
	if status != "" {
		q = q.Where("status = ?", status)
	}

	var total int64
	q.Model(&models.EmailSubscription{}).Count(&total)

	var subs []models.EmailSubscription
	q.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&subs)

	c.JSON(http.StatusOK, gin.H{
		"data": subs,
		"meta": gin.H{"total": total, "page": page, "page_size": pageSize, "pages": int(math.Ceil(float64(total) / float64(pageSize)))},
	})
}

func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// GetPublicList returns basic info about an email list (public endpoint).
func (h *EmailHandler) GetPublicList(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var list models.EmailList
	if err := h.DB.Select("id, name, description").First(&list, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "List not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"id": list.ID, "name": list.Name, "description": list.Description}})
}

// Subscribe adds a contact to an email list (public endpoint).
func (h *EmailHandler) Subscribe(c *gin.Context) {
	var body struct {
		Email     string `json:"email" binding:"required"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		ListID    uint   `json:"list_id" binding:"required"`
		Source    string `json:"source"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and list_id are required"})
		return
	}

	// Get or create contact
	var contact models.Contact
	result := h.DB.Where("email = ? AND tenant_id = ?", body.Email, 1).First(&contact)
	if result.Error == gorm.ErrRecordNotFound {
		contact = models.Contact{
			TenantID:  1,
			Email:     body.Email,
			FirstName: body.FirstName,
			LastName:  body.LastName,
			Source:    body.Source,
			IPAddress: c.ClientIP(),
		}
		h.DB.Create(&contact)
	}

	// Check if already subscribed
	var existing models.EmailSubscription
	if err := h.DB.Where("contact_id = ? AND email_list_id = ?", contact.ID, body.ListID).First(&existing).Error; err == nil {
		if existing.Status == models.SubStatusActive {
			c.JSON(http.StatusOK, gin.H{"message": "Already subscribed"})
			return
		}
		// Re-subscribe
		now := time.Now()
		existing.Status = models.SubStatusActive
		existing.SubscribedAt = &now
		existing.UnsubscribedAt = nil
		h.DB.Save(&existing)
		events.Emit(events.EmailSubscribed, existing)
		c.JSON(http.StatusOK, gin.H{"message": "Subscribed successfully"})
		return
	}

	// Check if list requires double opt-in
	var list models.EmailList
	h.DB.First(&list, body.ListID)

	now := time.Now()
	sub := models.EmailSubscription{
		TenantID:    1,
		ContactID:   contact.ID,
		EmailListID: body.ListID,
		Source:       body.Source,
		IPAddress:    c.ClientIP(),
		SubscribedAt: &now,
	}

	if list.DoubleOptin {
		sub.Status = models.SubStatusPending
		sub.ConfirmToken = generateToken()
	} else {
		sub.Status = models.SubStatusActive
	}

	h.DB.Create(&sub)

	if sub.Status == models.SubStatusActive {
		events.Emit(events.EmailSubscribed, sub)
	}

	msg := "Subscribed successfully"
	if list.DoubleOptin {
		msg = "Please check your email to confirm your subscription"
	}
	c.JSON(http.StatusCreated, gin.H{"message": msg, "confirm_required": list.DoubleOptin})
}

// ConfirmSubscription handles double opt-in confirmation.
func (h *EmailHandler) ConfirmSubscription(c *gin.Context) {
	token := c.Param("token")
	var sub models.EmailSubscription
	if err := h.DB.Where("confirm_token = ? AND status = ?", token, models.SubStatusPending).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid or expired confirmation token"})
		return
	}
	now := time.Now()
	sub.Status = models.SubStatusActive
	sub.SubscribedAt = &now
	sub.ConfirmToken = ""
	h.DB.Save(&sub)

	events.Emit(events.EmailSubscribed, sub)
	c.JSON(http.StatusOK, gin.H{"message": "Subscription confirmed"})
}

// Unsubscribe removes a contact from an email list (public endpoint).
func (h *EmailHandler) Unsubscribe(c *gin.Context) {
	var body struct {
		Email  string `json:"email"`
		ListID uint   `json:"list_id"`
		Token  string `json:"token"` // alternative: unsubscribe via token
	}
	c.ShouldBindJSON(&body)

	var sub models.EmailSubscription

	if body.Token != "" {
		if err := h.DB.Where("confirm_token = ?", body.Token).First(&sub).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid unsubscribe link"})
			return
		}
	} else if body.Email != "" && body.ListID > 0 {
		var contact models.Contact
		if err := h.DB.Where("email = ?", body.Email).First(&contact).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Contact not found"})
			return
		}
		if err := h.DB.Where("contact_id = ? AND email_list_id = ?", contact.ID, body.ListID).First(&sub).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
			return
		}
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Provide email+list_id or token"})
		return
	}

	now := time.Now()
	sub.Status = models.SubStatusUnsubscribed
	sub.UnsubscribedAt = &now
	h.DB.Save(&sub)

	events.Emit(events.EmailUnsubscribed, sub)
	c.JSON(http.StatusOK, gin.H{"message": "Unsubscribed successfully"})
}

// AdminAddSubscriber allows admins to manually add a subscriber.
func (h *EmailHandler) AdminAddSubscriber(c *gin.Context) {
	listID, _ := strconv.Atoi(c.Param("id"))
	var body struct {
		ContactID uint `json:"contact_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	sub := models.EmailSubscription{
		TenantID:     1,
		ContactID:    body.ContactID,
		EmailListID:  uint(listID),
		Status:       models.SubStatusActive,
		Source:       "manual",
		SubscribedAt: &now,
	}
	if err := h.DB.Create(&sub).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add subscriber"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": sub})
}

// AdminRemoveSubscriber removes a subscriber from a list.
func (h *EmailHandler) AdminRemoveSubscriber(c *gin.Context) {
	listID, _ := strconv.Atoi(c.Param("id"))
	subID, _ := strconv.Atoi(c.Param("subId"))
	h.DB.Where("id = ? AND email_list_id = ?", subID, listID).Delete(&models.EmailSubscription{})
	c.JSON(http.StatusOK, gin.H{"message": "Subscriber removed"})
}

// ===== Email Templates =====

func (h *EmailHandler) ListTemplates(c *gin.Context) {
	templateType := c.Query("type")
	q := h.DB.Order("created_at DESC")
	if templateType != "" {
		q = q.Where("type = ?", templateType)
	}
	var templates []models.EmailTemplate
	q.Find(&templates)
	c.JSON(http.StatusOK, gin.H{"data": templates})
}

func (h *EmailHandler) GetTemplate(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var tmpl models.EmailTemplate
	if err := h.DB.First(&tmpl, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Template not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": tmpl})
}

func (h *EmailHandler) CreateTemplate(c *gin.Context) {
	var body models.EmailTemplate
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	h.DB.Create(&body)
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *EmailHandler) UpdateTemplate(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var tmpl models.EmailTemplate
	if err := h.DB.First(&tmpl, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Template not found"})
		return
	}
	if err := c.ShouldBindJSON(&tmpl); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.DB.Save(&tmpl)
	c.JSON(http.StatusOK, gin.H{"data": tmpl})
}

func (h *EmailHandler) DeleteTemplate(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	h.DB.Delete(&models.EmailTemplate{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Template deleted"})
}

func (h *EmailHandler) PreviewTemplate(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var tmpl models.EmailTemplate
	if err := h.DB.First(&tmpl, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Template not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"subject":      tmpl.Subject,
		"html_content": tmpl.HTMLContent,
		"text_content": tmpl.TextContent,
	})
}

// ===== Email Campaigns =====

func (h *EmailHandler) ListCampaigns(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")

	q := h.DB.Preload("Template").Order("created_at DESC")
	if status != "" {
		q = q.Where("status = ?", status)
	}

	var total int64
	q.Model(&models.EmailCampaign{}).Count(&total)

	var campaigns []models.EmailCampaign
	q.Offset((page - 1) * pageSize).Limit(pageSize).Find(&campaigns)

	c.JSON(http.StatusOK, gin.H{
		"data": campaigns,
		"meta": gin.H{"total": total, "page": page, "page_size": pageSize, "pages": int(math.Ceil(float64(total) / float64(pageSize)))},
	})
}

func (h *EmailHandler) GetCampaign(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var campaign models.EmailCampaign
	if err := h.DB.Preload("Template").First(&campaign, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": campaign})
}

func (h *EmailHandler) CreateCampaign(c *gin.Context) {
	var body models.EmailCampaign
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	body.Status = models.CampaignStatusDraft
	body.Stats = datatypes.JSON([]byte(`{"sent":0,"delivered":0,"opened":0,"clicked":0,"bounced":0,"unsubscribed":0}`))
	h.DB.Create(&body)
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *EmailHandler) UpdateCampaign(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var campaign models.EmailCampaign
	if err := h.DB.First(&campaign, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if campaign.Status == models.CampaignStatusSent || campaign.Status == models.CampaignStatusSending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot edit a sent or sending campaign"})
		return
	}
	if err := c.ShouldBindJSON(&campaign); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.DB.Save(&campaign)
	c.JSON(http.StatusOK, gin.H{"data": campaign})
}

func (h *EmailHandler) DeleteCampaign(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var campaign models.EmailCampaign
	if err := h.DB.First(&campaign, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	if campaign.Status == models.CampaignStatusSending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete a campaign that is currently sending"})
		return
	}
	h.DB.Delete(&campaign)
	c.JSON(http.StatusOK, gin.H{"message": "Campaign deleted"})
}

// ScheduleCampaign sets a campaign to be sent at a specific time or immediately.
func (h *EmailHandler) ScheduleCampaign(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var campaign models.EmailCampaign
	if err := h.DB.First(&campaign, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	var body struct {
		ScheduledAt *time.Time `json:"scheduled_at"` // nil = send now
	}
	c.ShouldBindJSON(&body)

	if body.ScheduledAt != nil {
		campaign.Status = models.CampaignStatusScheduled
		campaign.ScheduledAt = body.ScheduledAt
	} else {
		campaign.Status = models.CampaignStatusSending
		now := time.Now()
		campaign.SentAt = &now
	}
	h.DB.Save(&campaign)

	c.JSON(http.StatusOK, gin.H{"data": campaign})
}

// GetCampaignStats returns analytics for a campaign.
func (h *EmailHandler) GetCampaignStats(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var campaign models.EmailCampaign
	if err := h.DB.First(&campaign, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	// Count sends by status
	type StatusCount struct {
		Status string
		Count  int64
	}
	var counts []StatusCount
	h.DB.Model(&models.EmailSend{}).Select("status, count(*) as count").
		Where("campaign_id = ?", id).Group("status").Find(&counts)

	stats := models.CampaignStats{}
	for _, sc := range counts {
		switch sc.Status {
		case models.SendStatusSent:
			stats.Sent += int(sc.Count)
		case models.SendStatusDelivered:
			stats.Delivered += int(sc.Count)
		case models.SendStatusOpened:
			stats.Opened += int(sc.Count)
		case models.SendStatusClicked:
			stats.Clicked += int(sc.Count)
		case models.SendStatusBounced:
			stats.Bounced += int(sc.Count)
		}
	}
	stats.Sent += stats.Delivered + stats.Opened + stats.Clicked // cumulative

	c.JSON(http.StatusOK, gin.H{"data": stats})
}

// ===== Email Sequences =====

func (h *EmailHandler) ListSequences(c *gin.Context) {
	var sequences []models.EmailSequence
	h.DB.Preload("Steps", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Order("created_at DESC").Find(&sequences)
	c.JSON(http.StatusOK, gin.H{"data": sequences})
}

func (h *EmailHandler) GetSequence(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var seq models.EmailSequence
	if err := h.DB.Preload("Steps", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).First(&seq, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sequence not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": seq})
}

func (h *EmailHandler) CreateSequence(c *gin.Context) {
	var body models.EmailSequence
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	h.DB.Create(&body)
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *EmailHandler) UpdateSequence(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var seq models.EmailSequence
	if err := h.DB.First(&seq, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sequence not found"})
		return
	}
	if err := c.ShouldBindJSON(&seq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.DB.Save(&seq)
	c.JSON(http.StatusOK, gin.H{"data": seq})
}

func (h *EmailHandler) DeleteSequence(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	h.DB.Delete(&models.EmailSequence{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Sequence deleted"})
}

// Sequence Steps

func (h *EmailHandler) CreateSequenceStep(c *gin.Context) {
	seqID, _ := strconv.Atoi(c.Param("id"))
	var body models.EmailSequenceStep
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	body.SequenceID = uint(seqID)
	h.DB.Create(&body)
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *EmailHandler) UpdateSequenceStep(c *gin.Context) {
	stepID, _ := strconv.Atoi(c.Param("stepId"))
	var step models.EmailSequenceStep
	if err := h.DB.First(&step, stepID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Step not found"})
		return
	}
	if err := c.ShouldBindJSON(&step); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.DB.Save(&step)
	c.JSON(http.StatusOK, gin.H{"data": step})
}

func (h *EmailHandler) DeleteSequenceStep(c *gin.Context) {
	stepID, _ := strconv.Atoi(c.Param("stepId"))
	h.DB.Delete(&models.EmailSequenceStep{}, stepID)
	c.JSON(http.StatusOK, gin.H{"message": "Step deleted"})
}

// Sequence Enrollments

func (h *EmailHandler) EnrollContact(c *gin.Context) {
	seqID, _ := strconv.Atoi(c.Param("id"))
	var body struct {
		ContactID uint `json:"contact_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get first step
	var firstStep models.EmailSequenceStep
	if err := h.DB.Where("sequence_id = ?", seqID).Order("sort_order ASC").First(&firstStep).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Sequence has no steps"})
		return
	}

	now := time.Now()
	nextSend := now.Add(time.Duration(firstStep.DelayDays)*24*time.Hour + time.Duration(firstStep.DelayHours)*time.Hour)

	enrollment := models.EmailSequenceEnrollment{
		TenantID:      1,
		SequenceID:    uint(seqID),
		ContactID:     body.ContactID,
		CurrentStepID: &firstStep.ID,
		Status:        models.EnrollmentStatusActive,
		EnrolledAt:    now,
		NextSendAt:    &nextSend,
	}

	if err := h.DB.Create(&enrollment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enroll contact"})
		return
	}

	events.Emit(events.EmailSequenceEnrolled, enrollment)
	c.JSON(http.StatusCreated, gin.H{"data": enrollment})
}

func (h *EmailHandler) ListEnrollments(c *gin.Context) {
	seqID, _ := strconv.Atoi(c.Param("id"))
	var enrollments []models.EmailSequenceEnrollment
	h.DB.Where("sequence_id = ?", seqID).Preload("Contact").Preload("CurrentStep").
		Order("created_at DESC").Find(&enrollments)
	c.JSON(http.StatusOK, gin.H{"data": enrollments})
}

func (h *EmailHandler) CancelEnrollment(c *gin.Context) {
	enrollID, _ := strconv.Atoi(c.Param("enrollId"))
	var enrollment models.EmailSequenceEnrollment
	if err := h.DB.First(&enrollment, enrollID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Enrollment not found"})
		return
	}
	enrollment.Status = models.EnrollmentStatusCancelled
	h.DB.Save(&enrollment)
	c.JSON(http.StatusOK, gin.H{"data": enrollment})
}

// ===== Segments =====

func (h *EmailHandler) ListSegments(c *gin.Context) {
	var segments []models.Segment
	h.DB.Order("created_at DESC").Find(&segments)

	// Compute match counts
	for i := range segments {
		count := h.countSegmentMatches(segments[i])
		segments[i].MatchCount = count
	}

	c.JSON(http.StatusOK, gin.H{"data": segments})
}

func (h *EmailHandler) GetSegment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var seg models.Segment
	if err := h.DB.First(&seg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Segment not found"})
		return
	}
	seg.MatchCount = h.countSegmentMatches(seg)
	c.JSON(http.StatusOK, gin.H{"data": seg})
}

func (h *EmailHandler) CreateSegment(c *gin.Context) {
	var body models.Segment
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	h.DB.Create(&body)
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *EmailHandler) UpdateSegment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var seg models.Segment
	if err := h.DB.First(&seg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Segment not found"})
		return
	}
	if err := c.ShouldBindJSON(&seg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.DB.Save(&seg)
	c.JSON(http.StatusOK, gin.H{"data": seg})
}

func (h *EmailHandler) DeleteSegment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	h.DB.Delete(&models.Segment{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Segment deleted"})
}

// PreviewSegment shows contacts that match the segment rules.
func (h *EmailHandler) PreviewSegment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var seg models.Segment
	if err := h.DB.First(&seg, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Segment not found"})
		return
	}

	contacts := h.querySegmentContacts(seg, 50)
	c.JSON(http.StatusOK, gin.H{"data": contacts, "total": h.countSegmentMatches(seg)})
}

// countSegmentMatches counts contacts matching segment rules.
func (h *EmailHandler) countSegmentMatches(seg models.Segment) int64 {
	q := h.buildSegmentQuery(seg)
	var count int64
	q.Count(&count)
	return count
}

// querySegmentContacts returns contacts matching segment rules.
func (h *EmailHandler) querySegmentContacts(seg models.Segment, limit int) []models.Contact {
	q := h.buildSegmentQuery(seg)
	var contacts []models.Contact
	q.Limit(limit).Find(&contacts)
	return contacts
}

// buildSegmentQuery builds a GORM query from segment rules.
func (h *EmailHandler) buildSegmentQuery(seg models.Segment) *gorm.DB {
	q := h.DB.Model(&models.Contact{}).Where("tenant_id = ?", 1)

	if seg.Rules == nil {
		return q
	}

	var ruleGroup models.SegmentRuleGroup
	if err := json.Unmarshal(seg.Rules, &ruleGroup); err != nil {
		return q
	}

	for _, rule := range ruleGroup.Rules {
		switch rule.Field {
		case "email":
			switch rule.Operator {
			case "contains":
				q = q.Where("email ILIKE ?", "%"+rule.Value+"%")
			case "equals":
				q = q.Where("email = ?", rule.Value)
			case "ends_with":
				q = q.Where("email ILIKE ?", "%"+rule.Value)
			}
		case "first_name", "last_name":
			switch rule.Operator {
			case "contains":
				q = q.Where(fmt.Sprintf("%s ILIKE ?", rule.Field), "%"+rule.Value+"%")
			case "equals":
				q = q.Where(fmt.Sprintf("%s = ?", rule.Field), rule.Value)
			}
		case "source":
			q = q.Where("source = ?", rule.Value)
		case "country":
			q = q.Where("country = ?", rule.Value)
		case "tag":
			switch rule.Operator {
			case "has_tag":
				q = q.Where("id IN (SELECT contact_id FROM contact_tags ct JOIN tags t ON t.id = ct.tag_id WHERE t.name = ?)", rule.Value)
			case "has_no_tag":
				q = q.Where("id NOT IN (SELECT contact_id FROM contact_tags ct JOIN tags t ON t.id = ct.tag_id WHERE t.name = ?)", rule.Value)
			}
		case "subscribed_to_list":
			q = q.Where("id IN (SELECT contact_id FROM email_subscriptions WHERE email_list_id = ? AND status = 'active')", rule.Value)
		case "created_after":
			q = q.Where("created_at >= ?", rule.Value)
		case "created_before":
			q = q.Where("created_at <= ?", rule.Value)
		}
	}

	return q
}

// ===== Tracking (for opens, clicks) =====

// TrackOpen records an email open event.
func (h *EmailHandler) TrackOpen(c *gin.Context) {
	sendID, _ := strconv.Atoi(c.Param("id"))
	var send models.EmailSend
	if err := h.DB.First(&send, sendID).Error; err != nil {
		// Return transparent 1x1 pixel regardless
		c.Data(http.StatusOK, "image/gif", transparentPixel)
		return
	}
	if send.OpenedAt == nil {
		now := time.Now()
		send.OpenedAt = &now
		send.Status = models.SendStatusOpened
		h.DB.Save(&send)
		events.Emit(events.EmailOpened, send)
	}
	c.Data(http.StatusOK, "image/gif", transparentPixel)
}

// TrackClick records a click and redirects to the target URL.
func (h *EmailHandler) TrackClick(c *gin.Context) {
	sendID, _ := strconv.Atoi(c.Param("id"))
	url := c.Query("url")

	var send models.EmailSend
	if err := h.DB.First(&send, sendID).Error; err == nil {
		if send.ClickedAt == nil {
			now := time.Now()
			send.ClickedAt = &now
			send.Status = models.SendStatusClicked
			h.DB.Save(&send)
			events.Emit(events.EmailClicked, send)
		}
	}

	if url == "" {
		url = "/"
	}
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// 1x1 transparent GIF pixel
var transparentPixel = []byte{
	0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
	0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
	0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
	0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
	0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
	0x01, 0x00, 0x3b,
}

// ===== Email Activity Log =====

func (h *EmailHandler) ListSends(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	contactID := c.Query("contact_id")
	campaignID := c.Query("campaign_id")

	q := h.DB.Preload("Contact").Order("created_at DESC")
	if contactID != "" {
		q = q.Where("contact_id = ?", contactID)
	}
	if campaignID != "" {
		q = q.Where("campaign_id = ?", campaignID)
	}

	var total int64
	q.Model(&models.EmailSend{}).Count(&total)

	var sends []models.EmailSend
	q.Offset((page - 1) * pageSize).Limit(pageSize).Find(&sends)

	c.JSON(http.StatusOK, gin.H{
		"data": sends,
		"meta": gin.H{"total": total, "page": page, "page_size": pageSize, "pages": int(math.Ceil(float64(total) / float64(pageSize)))},
	})
}

// ===== Email Dashboard Stats =====

func (h *EmailHandler) DashboardStats(c *gin.Context) {
	var totalSubscribers int64
	h.DB.Model(&models.EmailSubscription{}).Where("status = ?", models.SubStatusActive).Count(&totalSubscribers)

	var totalLists int64
	h.DB.Model(&models.EmailList{}).Count(&totalLists)

	var totalCampaigns int64
	h.DB.Model(&models.EmailCampaign{}).Count(&totalCampaigns)

	var totalSent int64
	h.DB.Model(&models.EmailSend{}).Where("status != ?", models.SendStatusQueued).Count(&totalSent)

	// Growth: subscribers in last 30 days
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	var newSubscribers int64
	h.DB.Model(&models.EmailSubscription{}).Where("created_at >= ? AND status = ?", thirtyDaysAgo, models.SubStatusActive).Count(&newSubscribers)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"total_subscribers": totalSubscribers,
			"total_lists":       totalLists,
			"total_campaigns":   totalCampaigns,
			"total_sent":        totalSent,
			"new_subscribers_30d": newSubscribers,
		},
	})
}

// ===== Subscriber Import / Export =====

// ImportSubscribers imports subscribers to a specific email list from CSV, XLSX, or pasted emails.
func (h *EmailHandler) ImportSubscribers(c *gin.Context) {
	listID, _ := strconv.Atoi(c.Param("id"))

	// Verify list exists
	var list models.EmailList
	if err := h.DB.First(&list, listID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Email list not found"})
		return
	}

	// Parse file or pasted emails
	file, header, fileErr := c.Request.FormFile("file")
	pastedEmails := c.PostForm("emails")

	var rows [][]string
	var parseErr error

	if fileErr == nil {
		defer file.Close()
		ft := detectFileType(header.Filename)
		switch ft {
		case "csv":
			rows, parseErr = parseCSVFile(file)
		case "xlsx":
			rows, parseErr = parseXLSXFile(file)
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported file type. Use .csv or .xlsx"})
			return
		}
		if parseErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse file: " + parseErr.Error()})
			return
		}
	} else if pastedEmails != "" {
		rows = parsePastedEmails(pastedEmails)
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Provide a file or pasted emails"})
		return
	}

	if len(rows) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No data found"})
		return
	}

	result := importResult{Total: len(rows)}
	now := time.Now()

	for _, row := range rows {
		email := strings.ToLower(strings.TrimSpace(row[0]))
		if !isValidEmail(email) {
			result.Skipped++
			continue
		}

		// Upsert contact
		var contact models.Contact
		if err := h.DB.Where("email = ? AND tenant_id = ?", email, 1).First(&contact).Error; err != nil {
			contact = models.Contact{
				TenantID:       1,
				Email:          email,
				FirstName:      safeIndex(row, 1),
				LastName:       safeIndex(row, 2),
				Source:         "import",
				LastActivityAt: &now,
			}
			h.DB.Create(&contact)
		}

		// Check existing subscription
		var existing models.EmailSubscription
		if err := h.DB.Where("contact_id = ? AND email_list_id = ?", contact.ID, listID).First(&existing).Error; err == nil {
			if existing.Status == models.SubStatusActive {
				result.Skipped++
				continue
			}
			// Re-activate
			existing.Status = models.SubStatusActive
			existing.SubscribedAt = &now
			existing.UnsubscribedAt = nil
			h.DB.Save(&existing)
			result.Updated++
			continue
		}

		sub := models.EmailSubscription{
			TenantID:    1,
			ContactID:   contact.ID,
			EmailListID: uint(listID),
			Status:      models.SubStatusActive,
			Source:       "import",
			SubscribedAt: &now,
		}
		if err := h.DB.Create(&sub).Error; err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %s", email, err.Error()))
			continue
		}
		events.Emit(events.EmailSubscribed, sub)
		result.Created++
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
		"message": fmt.Sprintf("Import complete: %d created, %d updated, %d skipped",
			result.Created, result.Updated, result.Skipped),
	})
}

// ExportSubscribers exports subscribers of a list as CSV or XLSX.
func (h *EmailHandler) ExportSubscribers(c *gin.Context) {
	listID, _ := strconv.Atoi(c.Param("id"))
	format := c.DefaultQuery("format", "csv")

	var subs []models.EmailSubscription
	h.DB.Where("email_list_id = ?", listID).Preload("Contact").Find(&subs)

	if format == "xlsx" {
		f := excelize.NewFile()
		sheet := "Sheet1"
		headers := []string{"Email", "First Name", "Last Name", "Status", "Source", "Subscribed At"}
		for i, hdr := range headers {
			cell, _ := excelize.CoordinatesToCellName(i+1, 1)
			f.SetCellValue(sheet, cell, hdr)
		}
		for rowIdx, sub := range subs {
			row := rowIdx + 2
			subscribedAt := ""
			if sub.SubscribedAt != nil {
				subscribedAt = sub.SubscribedAt.Format(time.RFC3339)
			}
			f.SetCellValue(sheet, fmt.Sprintf("A%d", row), sub.Contact.Email)
			f.SetCellValue(sheet, fmt.Sprintf("B%d", row), sub.Contact.FirstName)
			f.SetCellValue(sheet, fmt.Sprintf("C%d", row), sub.Contact.LastName)
			f.SetCellValue(sheet, fmt.Sprintf("D%d", row), sub.Status)
			f.SetCellValue(sheet, fmt.Sprintf("E%d", row), sub.Source)
			f.SetCellValue(sheet, fmt.Sprintf("F%d", row), subscribedAt)
		}
		c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=subscribers-list-%d.xlsx", listID))
		f.Write(c.Writer)
		return
	}

	// CSV export
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=subscribers-list-%d.csv", listID))
	c.Writer.WriteString("email,first_name,last_name,status,source,subscribed_at\n")
	for _, sub := range subs {
		subscribedAt := ""
		if sub.SubscribedAt != nil {
			subscribedAt = sub.SubscribedAt.Format(time.RFC3339)
		}
		line := csvEscape(sub.Contact.Email) + "," +
			csvEscape(sub.Contact.FirstName) + "," +
			csvEscape(sub.Contact.LastName) + "," +
			sub.Status + "," +
			csvEscape(sub.Source) + "," +
			subscribedAt + "\n"
		c.Writer.WriteString(line)
	}
}
