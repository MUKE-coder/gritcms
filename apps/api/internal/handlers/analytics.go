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

// AnalyticsHandler handles analytics and CRM dashboard endpoints.
type AnalyticsHandler struct {
	db *gorm.DB
}

// NewAnalyticsHandler creates a new AnalyticsHandler.
func NewAnalyticsHandler(db *gorm.DB) *AnalyticsHandler {
	return &AnalyticsHandler{db: db}
}

// Dashboard returns the main analytics dashboard data.
func (h *AnalyticsHandler) Dashboard(c *gin.Context) {
	// --- Audience metrics ---
	var totalContacts int64
	h.db.Model(&models.Contact{}).Count(&totalContacts)

	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	var newContacts30d int64
	h.db.Model(&models.Contact{}).Where("created_at >= ?", thirtyDaysAgo).Count(&newContacts30d)

	var totalSubscribers int64
	h.db.Model(&models.EmailSubscription{}).Where("status = 'active'").Count(&totalSubscribers)

	// --- Revenue metrics ---
	var totalRevenue float64
	h.db.Model(&models.Order{}).Where("status = 'paid'").Select("COALESCE(SUM(total), 0)").Scan(&totalRevenue)

	startOfMonth := time.Now().UTC().Truncate(24 * time.Hour).AddDate(0, 0, -time.Now().Day()+1)
	var monthlyRevenue float64
	h.db.Model(&models.Order{}).Where("status = 'paid' AND paid_at >= ?", startOfMonth).Select("COALESCE(SUM(total), 0)").Scan(&monthlyRevenue)

	var totalOrders int64
	h.db.Model(&models.Order{}).Where("status = 'paid'").Count(&totalOrders)

	var mrr float64
	h.db.Model(&models.Subscription{}).
		Where("subscriptions.status = 'active'").
		Joins("JOIN prices ON prices.id = subscriptions.price_id").
		Select("COALESCE(SUM(CASE WHEN prices.interval = 'year' THEN prices.amount / 12 ELSE prices.amount END), 0)").
		Scan(&mrr)

	// --- Course metrics ---
	var activeStudents int64
	h.db.Model(&models.CourseEnrollment{}).Where("status = 'active'").Count(&activeStudents)

	var completedCourses int64
	h.db.Model(&models.CourseEnrollment{}).Where("status = 'completed'").Count(&completedCourses)

	// --- Email metrics ---
	var totalEmailsSent int64
	h.db.Model(&models.EmailSend{}).Count(&totalEmailsSent)

	var totalCampaigns int64
	h.db.Model(&models.EmailCampaign{}).Count(&totalCampaigns)

	// --- Recent activity ---
	var recentContacts []models.Contact
	h.db.Order("created_at DESC").Limit(5).Find(&recentContacts)

	var recentOrders []models.Order
	h.db.Preload("Contact").Where("status = 'paid'").Order("paid_at DESC").Limit(5).Find(&recentOrders)

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"total_contacts":    totalContacts,
		"new_contacts_30d":  newContacts30d,
		"total_subscribers":  totalSubscribers,
		"total_revenue":      totalRevenue,
		"monthly_revenue":    monthlyRevenue,
		"total_orders":       totalOrders,
		"mrr":                mrr,
		"active_students":    activeStudents,
		"completed_courses":  completedCourses,
		"total_emails_sent":  totalEmailsSent,
		"total_campaigns":    totalCampaigns,
		"recent_contacts":    recentContacts,
		"recent_orders":      recentOrders,
	}})
}

// ContactProfile returns a unified contact profile with data from all modules.
func (h *AnalyticsHandler) ContactProfile(c *gin.Context) {
	contactID := c.Param("id")

	var contact models.Contact
	if err := h.db.Preload("Tags").First(&contact, contactID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contact not found"})
		return
	}

	// Email subscriptions
	var subscriptions []models.EmailSubscription
	h.db.Where("contact_id = ?", contactID).Preload("List").Find(&subscriptions)

	// Course enrollments
	var enrollments []models.CourseEnrollment
	h.db.Where("contact_id = ?", contactID).Preload("Course").Find(&enrollments)

	// Purchase history
	var orders []models.Order
	h.db.Where("contact_id = ? AND status = 'paid'", contactID).Preload("Items.Product").Order("paid_at DESC").Find(&orders)

	// Lifetime value
	var lifetimeValue float64
	h.db.Model(&models.Order{}).Where("contact_id = ? AND status = 'paid'", contactID).Select("COALESCE(SUM(total), 0)").Scan(&lifetimeValue)

	// Active subscriptions
	var activeSubs []models.Subscription
	h.db.Where("contact_id = ? AND status = 'active'", contactID).Preload("Product").Preload("Price").Find(&activeSubs)

	// Certificates
	var certificates []models.Certificate
	h.db.Where("contact_id = ?", contactID).Preload("Course").Find(&certificates)

	// Recent activity
	var activities []models.ContactActivity
	h.db.Where("contact_id = ?", contactID).Order("created_at DESC").Limit(50).Find(&activities)

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"contact":          contact,
		"subscriptions":    subscriptions,
		"enrollments":      enrollments,
		"orders":           orders,
		"lifetime_value":   lifetimeValue,
		"active_subs":      activeSubs,
		"certificates":     certificates,
		"activities":       activities,
	}})
}

// ActivityTimeline returns a paginated, filterable activity timeline.
func (h *AnalyticsHandler) ActivityTimeline(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	module := c.Query("module")
	contactID := c.Query("contact_id")

	if page < 1 {
		page = 1
	}
	offset := (page - 1) * pageSize

	q := h.db.Model(&models.ContactActivity{})
	if module != "" {
		q = q.Where("module = ?", module)
	}
	if contactID != "" {
		q = q.Where("contact_id = ?", contactID)
	}

	var total int64
	q.Count(&total)

	var activities []models.ContactActivity
	if err := q.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&activities).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list activities"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": activities,
		"meta": gin.H{"total": total, "page": page, "page_size": pageSize, "pages": int(math.Ceil(float64(total) / float64(pageSize)))},
	})
}

// RevenueChart returns revenue data points for charting.
func (h *AnalyticsHandler) RevenueChart(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	if days < 7 {
		days = 7
	}
	if days > 365 {
		days = 365
	}

	type DataPoint struct {
		Date    string  `json:"date"`
		Revenue float64 `json:"revenue"`
		Orders  int64   `json:"orders"`
	}

	var points []DataPoint
	for i := days - 1; i >= 0; i-- {
		day := time.Now().AddDate(0, 0, -i).UTC().Truncate(24 * time.Hour)
		nextDay := day.Add(24 * time.Hour)

		var revenue float64
		h.db.Model(&models.Order{}).Where("status = 'paid' AND paid_at >= ? AND paid_at < ?", day, nextDay).
			Select("COALESCE(SUM(total), 0)").Scan(&revenue)

		var orders int64
		h.db.Model(&models.Order{}).Where("status = 'paid' AND paid_at >= ? AND paid_at < ?", day, nextDay).Count(&orders)

		points = append(points, DataPoint{
			Date:    day.Format("2006-01-02"),
			Revenue: revenue,
			Orders:  orders,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": points})
}

// SubscriberGrowth returns subscriber growth data for charting.
func (h *AnalyticsHandler) SubscriberGrowth(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	if days < 7 {
		days = 7
	}
	if days > 365 {
		days = 365
	}

	type DataPoint struct {
		Date           string `json:"date"`
		NewSubscribers int64  `json:"new_subscribers"`
		NewContacts    int64  `json:"new_contacts"`
	}

	var points []DataPoint
	for i := days - 1; i >= 0; i-- {
		day := time.Now().AddDate(0, 0, -i).UTC().Truncate(24 * time.Hour)
		nextDay := day.Add(24 * time.Hour)

		var newSubs int64
		h.db.Model(&models.EmailSubscription{}).Where("created_at >= ? AND created_at < ?", day, nextDay).Count(&newSubs)

		var newContacts int64
		h.db.Model(&models.Contact{}).Where("created_at >= ? AND created_at < ?", day, nextDay).Count(&newContacts)

		points = append(points, DataPoint{
			Date:           day.Format("2006-01-02"),
			NewSubscribers: newSubs,
			NewContacts:    newContacts,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": points})
}

// TopProducts returns the top-selling products.
func (h *AnalyticsHandler) TopProducts(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if limit > 50 {
		limit = 50
	}

	type ProductStat struct {
		ProductID uint    `json:"product_id"`
		Name      string  `json:"name"`
		Sales     int64   `json:"sales"`
		Revenue   float64 `json:"revenue"`
	}

	var stats []ProductStat
	h.db.Raw(`
		SELECT oi.product_id, p.name,
			COUNT(DISTINCT oi.order_id) as sales,
			COALESCE(SUM(oi.total), 0) as revenue
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id AND o.status = 'paid'
		JOIN products p ON p.id = oi.product_id
		GROUP BY oi.product_id, p.name
		ORDER BY revenue DESC
		LIMIT ?
	`, limit).Scan(&stats)

	c.JSON(http.StatusOK, gin.H{"data": stats})
}

// ContactExport exports contacts as CSV.
func (h *AnalyticsHandler) ContactExport(c *gin.Context) {
	var contacts []models.Contact
	h.db.Preload("Tags").Find(&contacts)

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=contacts.csv")

	// Write CSV header
	c.Writer.WriteString("id,email,first_name,last_name,phone,source,country,city,tags,created_at\n")

	for _, contact := range contacts {
		tags := ""
		for i, t := range contact.Tags {
			if i > 0 {
				tags += ";"
			}
			tags += t.Name
		}
		line := strconv.FormatUint(uint64(contact.ID), 10) + "," +
			csvEscape(contact.Email) + "," +
			csvEscape(contact.FirstName) + "," +
			csvEscape(contact.LastName) + "," +
			csvEscape(contact.Phone) + "," +
			csvEscape(contact.Source) + "," +
			csvEscape(contact.Country) + "," +
			csvEscape(contact.City) + "," +
			csvEscape(tags) + "," +
			contact.CreatedAt.Format(time.RFC3339) + "\n"
		c.Writer.WriteString(line)
	}
}

func csvEscape(s string) string {
	if s == "" {
		return ""
	}
	// If contains comma, quote, or newline, wrap in quotes
	if len(s) > 0 && (s[0] == '"' || containsAny(s, ",\"\n\r")) {
		return "\"" + escapeQuotes(s) + "\""
	}
	return s
}

func containsAny(s, chars string) bool {
	for _, c := range chars {
		for _, sc := range s {
			if c == sc {
				return true
			}
		}
	}
	return false
}

func escapeQuotes(s string) string {
	result := ""
	for _, c := range s {
		if c == '"' {
			result += "\"\""
		} else {
			result += string(c)
		}
	}
	return result
}
