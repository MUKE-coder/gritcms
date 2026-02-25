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

type BookingHandler struct {
	DB *gorm.DB
}

func NewBookingHandler(db *gorm.DB) *BookingHandler {
	return &BookingHandler{DB: db}
}

// ---------- Calendars ----------

func (h *BookingHandler) ListCalendars(c *gin.Context) {
	var calendars []models.Calendar
	h.DB.Preload("EventTypes").Preload("Availabilities").
		Order("created_at DESC").Find(&calendars)
	c.JSON(http.StatusOK, gin.H{"data": calendars})
}

func (h *BookingHandler) GetCalendar(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var cal models.Calendar
	if err := h.DB.Preload("EventTypes").Preload("Availabilities").
		First(&cal, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Calendar not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": cal})
}

func (h *BookingHandler) CreateCalendar(c *gin.Context) {
	var body models.Calendar
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	body.Slug = generateCalendarSlug(h.DB, body.Name)
	if body.Timezone == "" {
		body.Timezone = "UTC"
	}
	if err := h.DB.Create(&body).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create calendar"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *BookingHandler) UpdateCalendar(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var cal models.Calendar
	if err := h.DB.First(&cal, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Calendar not found"})
		return
	}
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(body)
	h.DB.Model(&cal).Updates(body)
	h.DB.Preload("EventTypes").Preload("Availabilities").First(&cal, id)
	c.JSON(http.StatusOK, gin.H{"data": cal})
}

func (h *BookingHandler) DeleteCalendar(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.DB.Delete(&models.Calendar{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete calendar"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Calendar deleted"})
}

// ---------- Event Types ----------

func (h *BookingHandler) CreateEventType(c *gin.Context) {
	calID, _ := strconv.Atoi(c.Param("id"))
	var body models.BookingEventType
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	body.CalendarID = uint(calID)
	body.Slug = generateEventTypeSlug(h.DB, body.Name)
	if body.DurationMinutes == 0 {
		body.DurationMinutes = 30
	}
	if err := h.DB.Create(&body).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event type"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *BookingHandler) UpdateEventType(c *gin.Context) {
	etID, _ := strconv.Atoi(c.Param("etId"))
	var et models.BookingEventType
	if err := h.DB.First(&et, etID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event type not found"})
		return
	}
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(body)
	h.DB.Model(&et).Updates(body)
	h.DB.First(&et, etID)
	c.JSON(http.StatusOK, gin.H{"data": et})
}

func (h *BookingHandler) DeleteEventType(c *gin.Context) {
	etID, _ := strconv.Atoi(c.Param("etId"))
	if err := h.DB.Delete(&models.BookingEventType{}, etID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event type"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Event type deleted"})
}

// ---------- Availability ----------

func (h *BookingHandler) SetAvailability(c *gin.Context) {
	calID, _ := strconv.Atoi(c.Param("id"))
	var body []models.Availability
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Replace all availability for this calendar
	h.DB.Where("calendar_id = ?", calID).Delete(&models.Availability{})
	for i := range body {
		body[i].TenantID = 1
		body[i].CalendarID = uint(calID)
		body[i].ID = 0
	}
	if len(body) > 0 {
		h.DB.Create(&body)
	}
	c.JSON(http.StatusOK, gin.H{"data": body})
}

// ---------- Appointments ----------

func (h *BookingHandler) ListAppointments(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize := 20
	if page < 1 {
		page = 1
	}

	var total int64
	q := h.DB.Model(&models.Appointment{})

	if st := c.Query("status"); st != "" {
		q = q.Where("status = ?", st)
	}
	if etID := c.Query("event_type_id"); etID != "" {
		q = q.Where("event_type_id = ?", etID)
	}
	if upcoming := c.Query("upcoming"); upcoming == "true" {
		q = q.Where("start_at > ?", time.Now())
	}

	q.Count(&total)

	var appointments []models.Appointment
	q.Preload("EventType").Preload("Contact").
		Order("start_at ASC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&appointments)

	c.JSON(http.StatusOK, gin.H{
		"data": appointments,
		"meta": gin.H{
			"total": total, "page": page, "page_size": pageSize,
			"pages": int(math.Ceil(float64(total) / float64(pageSize))),
		},
	})
}

func (h *BookingHandler) GetAppointment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("appointmentId"))
	var appt models.Appointment
	if err := h.DB.Preload("EventType").Preload("Contact").
		First(&appt, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": appt})
}

func (h *BookingHandler) CancelAppointment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("appointmentId"))
	var appt models.Appointment
	if err := h.DB.First(&appt, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment not found"})
		return
	}
	h.DB.Model(&appt).Update("status", models.AppointmentCancelled)

	events.Emit(events.BookingCancelled, map[string]interface{}{
		"appointment_id": appt.ID, "contact_id": appt.ContactID,
	})

	c.JSON(http.StatusOK, gin.H{"data": appt})
}

func (h *BookingHandler) CompleteAppointment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("appointmentId"))
	var appt models.Appointment
	if err := h.DB.First(&appt, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment not found"})
		return
	}
	h.DB.Model(&appt).Update("status", models.AppointmentCompleted)
	c.JSON(http.StatusOK, gin.H{"data": appt})
}

func (h *BookingHandler) RescheduleAppointment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("appointmentId"))
	var appt models.Appointment
	if err := h.DB.First(&appt, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment not found"})
		return
	}
	var body struct {
		StartAt string `json:"start_at"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	newStart, err := time.Parse(time.RFC3339, body.StartAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	// Load event type for duration
	var et models.BookingEventType
	h.DB.First(&et, appt.EventTypeID)
	newEnd := newStart.Add(time.Duration(et.DurationMinutes) * time.Minute)

	h.DB.Model(&appt).Updates(map[string]interface{}{
		"start_at": newStart,
		"end_at":   newEnd,
		"status":   models.AppointmentConfirmed,
	})

	events.Emit(events.BookingRescheduled, map[string]interface{}{
		"appointment_id": appt.ID, "contact_id": appt.ContactID,
	})

	h.DB.Preload("EventType").Preload("Contact").First(&appt, id)
	c.JSON(http.StatusOK, gin.H{"data": appt})
}

// ---------- Public Booking Routes ----------

func (h *BookingHandler) GetPublicEventType(c *gin.Context) {
	slug := c.Param("slug")
	var et models.BookingEventType
	if err := h.DB.Preload("Calendar").Where("slug = ?", slug).First(&et).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event type not found"})
		return
	}
	// Only return if calendar is active
	if et.Calendar != nil && et.Calendar.Status != models.CalendarStatusActive {
		c.JSON(http.StatusNotFound, gin.H{"error": "Calendar is inactive"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": et})
}

func (h *BookingHandler) GetAvailableSlots(c *gin.Context) {
	slug := c.Param("slug")
	dateStr := c.Query("date") // YYYY-MM-DD

	var et models.BookingEventType
	if err := h.DB.Preload("Calendar.Availabilities").Where("slug = ?", slug).First(&et).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event type not found"})
		return
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date. Use YYYY-MM-DD"})
		return
	}

	// Load timezone
	tz := "UTC"
	if et.Calendar != nil && et.Calendar.Timezone != "" {
		tz = et.Calendar.Timezone
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.UTC
	}

	// Find availability for this day of week
	dayOfWeek := int(date.Weekday())
	var avails []models.Availability
	if et.Calendar != nil {
		for _, a := range et.Calendar.Availabilities {
			if a.DayOfWeek == dayOfWeek {
				avails = append(avails, a)
			}
		}
	}

	if len(avails) == 0 {
		c.JSON(http.StatusOK, gin.H{"data": []string{}})
		return
	}

	// Get existing appointments for this date
	dayStart := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, loc)
	dayEnd := dayStart.Add(24 * time.Hour)
	var existing []models.Appointment
	h.DB.Where("event_type_id = ? AND start_at >= ? AND start_at < ? AND status != ?",
		et.ID, dayStart, dayEnd, models.AppointmentCancelled).Find(&existing)

	// Check max per day
	if et.MaxPerDay > 0 && len(existing) >= et.MaxPerDay {
		c.JSON(http.StatusOK, gin.H{"data": []string{}})
		return
	}

	// Generate slots
	duration := time.Duration(et.DurationMinutes) * time.Minute
	bufferBefore := time.Duration(et.BufferBefore) * time.Minute
	bufferAfter := time.Duration(et.BufferAfter) * time.Minute

	var slots []string
	for _, avail := range avails {
		startH, startM := parseTime(avail.StartTime)
		endH, endM := parseTime(avail.EndTime)

		slotStart := time.Date(date.Year(), date.Month(), date.Day(), startH, startM, 0, 0, loc)
		windowEnd := time.Date(date.Year(), date.Month(), date.Day(), endH, endM, 0, 0, loc)

		for slotStart.Add(duration).Before(windowEnd) || slotStart.Add(duration).Equal(windowEnd) {
			slotEnd := slotStart.Add(duration)
			blocked := false

			// Check slot doesn't overlap with existing appointments (including buffers)
			for _, appt := range existing {
				apptStart := appt.StartAt.Add(-bufferBefore)
				apptEnd := appt.EndAt.Add(bufferAfter)
				if slotStart.Before(apptEnd) && slotEnd.After(apptStart) {
					blocked = true
					break
				}
			}

			// Don't offer slots in the past
			if slotStart.Before(time.Now()) {
				blocked = true
			}

			if !blocked {
				slots = append(slots, slotStart.Format(time.RFC3339))
			}

			slotStart = slotStart.Add(duration + bufferAfter)
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": slots})
}

func (h *BookingHandler) BookAppointment(c *gin.Context) {
	slug := c.Param("slug")
	var body struct {
		StartAt string `json:"start_at" binding:"required"`
		Name    string `json:"name" binding:"required"`
		Email   string `json:"email" binding:"required"`
		Notes   string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var et models.BookingEventType
	if err := h.DB.Preload("Calendar").Where("slug = ?", slug).First(&et).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event type not found"})
		return
	}

	startAt, err := time.Parse(time.RFC3339, body.StartAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}
	endAt := startAt.Add(time.Duration(et.DurationMinutes) * time.Minute)

	// Upsert contact
	var contact models.Contact
	result := h.DB.Where("email = ?", body.Email).First(&contact)
	if result.Error != nil {
		// Split name
		firstName, lastName := splitName(body.Name)
		contact = models.Contact{
			TenantID:  1,
			Email:     body.Email,
			FirstName: firstName,
			LastName:  lastName,
			Source:    "booking",
		}
		h.DB.Create(&contact)
	}

	// Create appointment
	appt := models.Appointment{
		TenantID:    1,
		EventTypeID: et.ID,
		ContactID:   contact.ID,
		StartAt:     startAt,
		EndAt:       endAt,
		Status:      models.AppointmentConfirmed,
		Notes:       body.Notes,
	}
	if err := h.DB.Create(&appt).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to book appointment"})
		return
	}

	events.Emit(events.BookingConfirmed, map[string]interface{}{
		"appointment_id": appt.ID, "contact_id": contact.ID, "event_type": et.Name,
	})

	c.JSON(http.StatusCreated, gin.H{"data": appt})
}

// ---------- Helpers ----------

func generateCalendarSlug(db *gorm.DB, name string) string {
	base := generateSlug(name)
	slug := base
	i := 1
	for {
		var count int64
		db.Model(&models.Calendar{}).Where("slug = ?", slug).Count(&count)
		if count == 0 {
			return slug
		}
		slug = fmt.Sprintf("%s-%d", base, i)
		i++
	}
}

func generateEventTypeSlug(db *gorm.DB, name string) string {
	base := generateSlug(name)
	slug := base
	i := 1
	for {
		var count int64
		db.Model(&models.BookingEventType{}).Where("slug = ?", slug).Count(&count)
		if count == 0 {
			return slug
		}
		slug = fmt.Sprintf("%s-%d", base, i)
		i++
	}
}

func parseTime(s string) (int, int) {
	var h, m int
	fmt.Sscanf(s, "%d:%d", &h, &m)
	return h, m
}

func splitName(name string) (string, string) {
	parts := make([]string, 0)
	for _, p := range []byte(name) {
		if p == ' ' && len(parts) > 0 {
			parts = append(parts, "")
		} else {
			if len(parts) == 0 {
				parts = append(parts, string(p))
			} else {
				parts[len(parts)-1] += string(p)
			}
		}
	}
	if len(parts) == 0 {
		return name, ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], parts[len(parts)-1]
}
