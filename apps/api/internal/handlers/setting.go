package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/models"
)

type SettingHandler struct {
	DB *gorm.DB
}

func NewSettingHandler(db *gorm.DB) *SettingHandler {
	return &SettingHandler{DB: db}
}

// GetByGroup returns all settings for a given group.
func (h *SettingHandler) GetByGroup(c *gin.Context) {
	group := c.Param("group")
	var settings []models.Setting
	if err := h.DB.Where("\"group\" = ?", group).Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
		return
	}

	// Convert to map for easier frontend consumption
	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// BulkUpsert creates or updates multiple settings at once.
func (h *SettingHandler) BulkUpsert(c *gin.Context) {
	group := c.Param("group")

	var body map[string]string
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	tx := h.DB.Begin()
	for key, value := range body {
		setting := models.Setting{
			TenantID: 1,
			Group:    group,
			Key:      key,
			Value:    value,
			Type:     "string",
		}

		result := tx.Where("tenant_id = ? AND \"key\" = ? AND \"group\" = ?", 1, key, group).First(&models.Setting{})
		if result.Error == gorm.ErrRecordNotFound {
			if err := tx.Create(&setting).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save settings"})
				return
			}
		} else {
			if err := tx.Model(&models.Setting{}).
				Where("tenant_id = ? AND \"key\" = ? AND \"group\" = ?", 1, key, group).
				Update("value", value).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save settings"})
				return
			}
		}
	}
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Settings saved"})
}

// GetPublicTheme returns theme settings for the public website (no auth).
func (h *SettingHandler) GetPublicTheme(c *gin.Context) {
	var settings []models.Setting
	if err := h.DB.Where("\"group\" = ?", "theme").Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch theme"})
		return
	}

	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// SeedDefaults creates default email templates, funnel templates, and a sample course if none exist.
func (h *SettingHandler) SeedDefaults(c *gin.Context) {
	seeded := gin.H{}

	// --- Email Templates ---
	var templateCount int64
	h.DB.Model(&models.EmailTemplate{}).Count(&templateCount)
	if templateCount == 0 {
		templates := []models.EmailTemplate{
			{TenantID: 1, Name: "Welcome Email", Subject: "Welcome to {{site_name}}!", HTMLContent: "<h1>Welcome, {{first_name}}!</h1><p>Thanks for joining {{site_name}}. We're thrilled to have you.</p>", TextContent: "Welcome, {{first_name}}! Thanks for joining {{site_name}}.", Type: "onboarding"},
			{TenantID: 1, Name: "Email Confirmation", Subject: "Confirm your email", HTMLContent: "<h1>Confirm Your Email</h1><p>Hi {{first_name}}, click below to confirm your email.</p><p><a href=\"{{confirmation_url}}\">Confirm Email</a></p>", TextContent: "Confirm your email: {{confirmation_url}}", Type: "onboarding"},
			{TenantID: 1, Name: "Password Reset", Subject: "Reset your password", HTMLContent: "<h1>Password Reset</h1><p>Hi {{first_name}}, click below to reset your password.</p><p><a href=\"{{reset_url}}\">Reset Password</a></p>", TextContent: "Reset your password: {{reset_url}}", Type: "transactional"},
			{TenantID: 1, Name: "Order Confirmation", Subject: "Order #{{order_id}} confirmed", HTMLContent: "<h1>Order Confirmed</h1><p>Hi {{first_name}}, your order #{{order_id}} is confirmed. Total: {{order_total}}</p>", TextContent: "Order #{{order_id}} confirmed. Total: {{order_total}}", Type: "transactional"},
			{TenantID: 1, Name: "Course Enrollment", Subject: "You're enrolled in {{course_name}}", HTMLContent: "<h1>You're In!</h1><p>You've been enrolled in <strong>{{course_name}}</strong>.</p><p><a href=\"{{course_url}}\">Start Learning</a></p>", TextContent: "You're enrolled in {{course_name}}. Start: {{course_url}}", Type: "transactional"},
			{TenantID: 1, Name: "Newsletter", Subject: "{{subject}}", HTMLContent: "<h1>{{subject}}</h1><div>{{content}}</div><p><a href=\"{{unsubscribe_url}}\">Unsubscribe</a></p>", TextContent: "{{subject}}\n\n{{content}}\n\nUnsubscribe: {{unsubscribe_url}}", Type: "campaign"},
			{TenantID: 1, Name: "Broadcast", Subject: "{{subject}}", HTMLContent: "<div>{{content}}</div><p><a href=\"{{unsubscribe_url}}\">Unsubscribe</a></p>", TextContent: "{{content}}\n\nUnsubscribe: {{unsubscribe_url}}", Type: "campaign"},
			{TenantID: 1, Name: "Abandoned Cart", Subject: "You left something behind", HTMLContent: "<h1>Forgot Something?</h1><p>Complete your purchase before items are gone!</p><p><a href=\"{{cart_url}}\">Complete Purchase</a></p>", TextContent: "Complete your purchase: {{cart_url}}", Type: "campaign"},
			{TenantID: 1, Name: "Booking Confirmation", Subject: "Booking confirmed: {{event_name}}", HTMLContent: "<h1>Booking Confirmed</h1><p>Your booking for <strong>{{event_name}}</strong> on {{booking_date}} at {{booking_time}} is confirmed.</p>", TextContent: "Booking confirmed: {{event_name}} on {{booking_date}} at {{booking_time}}", Type: "transactional"},
			{TenantID: 1, Name: "Booking Reminder", Subject: "Reminder: {{event_name}} tomorrow", HTMLContent: "<h1>Booking Reminder</h1><p>Reminder for <strong>{{event_name}}</strong> on {{booking_date}} at {{booking_time}}.</p>", TextContent: "Reminder: {{event_name}} on {{booking_date}} at {{booking_time}}", Type: "transactional"},
			{TenantID: 1, Name: "Affiliate Welcome", Subject: "Welcome to our affiliate program!", HTMLContent: "<h1>Welcome, Affiliate!</h1><p>Your referral code: <strong>{{referral_code}}</strong>.</p><p><a href=\"{{dashboard_url}}\">View Dashboard</a></p>", TextContent: "Your referral code: {{referral_code}}. Dashboard: {{dashboard_url}}", Type: "onboarding"},
			{TenantID: 1, Name: "Commission Earned", Subject: "You earned a commission!", HTMLContent: "<h1>Commission Earned</h1><p>You earned <strong>{{commission_amount}}</strong> from a referral.</p>", TextContent: "You earned {{commission_amount}} commission.", Type: "transactional"},
		}
		h.DB.Create(&templates)
		seeded["email_templates"] = len(templates)
	}

	// --- Funnel Templates ---
	var funnelCount int64
	h.DB.Model(&models.Funnel{}).Count(&funnelCount)
	if funnelCount == 0 {
		funnelDefs := []struct {
			name, slug, desc, ftype string
			steps                   []struct{ name, slug, stype string }
		}{
			{"Opt-in Funnel", "optin-funnel", "Simple email opt-in funnel", "optin", []struct{ name, slug, stype string }{
				{"Opt-in Page", "optin-page", "landing"},
				{"Thank You Page", "thank-you", "thankyou"},
			}},
			{"Sales Page Funnel", "sales-funnel", "Product sales page with checkout", "sales", []struct{ name, slug, stype string }{
				{"Sales Page", "sales-page", "landing"},
				{"Checkout Page", "checkout", "checkout"},
				{"Order Confirmation", "order-confirmation", "thankyou"},
			}},
			{"Webinar Funnel", "webinar-funnel", "Webinar registration and replay", "webinar", []struct{ name, slug, stype string }{
				{"Registration Page", "registration", "landing"},
				{"Confirmation Page", "confirmed", "thankyou"},
				{"Webinar Room", "webinar-room", "landing"},
				{"Replay Page", "replay", "landing"},
			}},
			{"Launch Funnel", "launch-funnel", "Product launch sequence", "launch", []struct{ name, slug, stype string }{
				{"Coming Soon", "coming-soon", "landing"},
				{"Pre-Launch", "pre-launch", "landing"},
				{"Cart Open", "cart-open", "landing"},
				{"Checkout", "launch-checkout", "checkout"},
				{"Thank You", "launch-thanks", "thankyou"},
			}},
		}

		for _, fd := range funnelDefs {
			funnel := models.Funnel{
				TenantID:    1,
				Name:        fd.name,
				Slug:        fd.slug,
				Description: fd.desc,
				Status:      "draft",
				Type:        fd.ftype,
			}
			h.DB.Create(&funnel)
			for i, sd := range fd.steps {
				step := models.FunnelStep{
					TenantID:  1,
					FunnelID:  funnel.ID,
					Name:      sd.name,
					Slug:      sd.slug,
					Type:      sd.stype,
					SortOrder: i,
				}
				h.DB.Create(&step)
			}
		}
		seeded["funnel_templates"] = len(funnelDefs)
	}

	// --- Sample Course ---
	var courseCount int64
	h.DB.Model(&models.Course{}).Count(&courseCount)
	if courseCount == 0 {
		course := models.Course{
			TenantID:         1,
			Title:            "Getting Started with GritCMS",
			Slug:             "getting-started",
			Description:      "A sample course to help you understand the course platform. Edit or delete this anytime.",
			ShortDescription: "Learn the basics of creating and managing courses.",
			Status:           "draft",
			AccessType:       "free",
		}
		h.DB.Create(&course)

		modules := []struct {
			title string
			desc  string
			lessons []struct{ title, ltype string }
		}{
			{"Introduction", "Getting started basics", []struct{ title, ltype string }{
				{"Welcome to the Course", "text"},
				{"How to Navigate", "text"},
			}},
			{"Core Concepts", "Essential building blocks", []struct{ title, ltype string }{
				{"Understanding Modules", "text"},
				{"Creating Lessons", "text"},
				{"Adding Video Content", "video"},
			}},
			{"Wrap Up", "Course completion", []struct{ title, ltype string }{
				{"Summary & Next Steps", "text"},
			}},
		}

		for mi, m := range modules {
			mod := models.CourseModule{
				TenantID:    1,
				CourseID:    course.ID,
				Title:       m.title,
				Description: m.desc,
				SortOrder:   mi,
			}
			h.DB.Create(&mod)
			for li, l := range m.lessons {
				lesson := models.Lesson{
					TenantID:  1,
					ModuleID:  mod.ID,
					Title:     l.title,
					Slug:      generateSlug(l.title),
					Type:      l.ltype,
					SortOrder: li,
				}
				h.DB.Create(&lesson)
			}
		}
		seeded["sample_course"] = course.Title
	}

	if len(seeded) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "Defaults already seeded"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Defaults seeded", "seeded": seeded})
}
