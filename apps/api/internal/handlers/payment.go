package handlers

import (
	"fmt"
	"log"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/paymentintent"
	"github.com/stripe/stripe-go/v82/webhook"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/config"
	"gritcms/apps/api/internal/events"
	"gritcms/apps/api/internal/models"
)

// PaymentHandler handles Stripe checkout and webhook endpoints.
type PaymentHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

// NewPaymentHandler creates a new PaymentHandler.
func NewPaymentHandler(db *gorm.DB, cfg *config.Config) *PaymentHandler {
	// Set Stripe secret key globally
	if cfg.StripeSecretKey != "" {
		stripe.Key = cfg.StripeSecretKey
	}
	return &PaymentHandler{db: db, cfg: cfg}
}

// Checkout creates a pending order and a Stripe PaymentIntent, returning
// the client_secret for the frontend to complete payment via Stripe Elements.
func (h *PaymentHandler) Checkout(c *gin.Context) {
	var input struct {
		Type       string `json:"type" binding:"required"` // "product" or "course"
		ProductID  *uint  `json:"product_id"`
		CourseID   *uint  `json:"course_id"`
		PriceID    uint   `json:"price_id"`
		CouponCode string `json:"coupon_code"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Resolve authenticated user → contact
	user, _ := c.Get("user")
	u := user.(models.User)

	var contact models.Contact
	if err := h.db.Where("email = ? AND tenant_id = ?", u.Email, 1).First(&contact).Error; err != nil {
		contact = models.Contact{
			TenantID:  1,
			Email:     u.Email,
			FirstName: u.FirstName,
			LastName:  u.LastName,
			Source:    "organic",
			UserID:    &u.ID,
		}
		h.db.Create(&contact)
	} else if contact.UserID == nil {
		contact.UserID = &u.ID
		h.db.Save(&contact)
	}

	// Resolve product and price
	var product models.Product
	var price models.Price
	var currency string

	switch input.Type {
	case "course":
		if input.CourseID == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "course_id is required"})
			return
		}
		var course models.Course
		if err := h.db.First(&course, *input.CourseID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
			return
		}
		if course.Status != models.CourseStatusPublished {
			c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
			return
		}
		if course.AccessType != models.CourseAccessPaid {
			c.JSON(http.StatusBadRequest, gin.H{"error": "This course is free — no payment needed"})
			return
		}
		if course.ProductID == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Course has no linked product"})
			return
		}
		if err := h.db.First(&product, *course.ProductID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
			return
		}
		currency = course.Currency

	case "product":
		if input.ProductID == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "product_id is required"})
			return
		}
		if err := h.db.First(&product, *input.ProductID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
			return
		}

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'product' or 'course'"})
		return
	}

	if product.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Product is not available"})
		return
	}

	// Load price — auto-resolve default price if not specified
	if input.PriceID > 0 {
		if err := h.db.First(&price, input.PriceID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Price not found"})
			return
		}
		if price.ProductID != product.ID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Price does not belong to this product"})
			return
		}
	} else {
		// Auto-select the first one_time price for the product
		if err := h.db.Where("product_id = ? AND type = ?", product.ID, models.PriceTypeOneTime).
			Order("sort_order ASC").First(&price).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No price found for this product"})
			return
		}
	}

	if currency == "" {
		currency = price.Currency
	}
	if currency == "" {
		currency = "USD"
	}

	// Calculate amount
	subtotal := price.Amount
	var discountAmount float64
	var couponID *uint

	if input.CouponCode != "" {
		var coupon models.Coupon
		if err := h.db.Where("code = ? AND status = 'active'", strings.ToUpper(input.CouponCode)).First(&coupon).Error; err == nil {
			if coupon.MaxUses == 0 || coupon.UsedCount < coupon.MaxUses {
				now := time.Now()
				validTime := true
				if coupon.ValidFrom != nil && now.Before(*coupon.ValidFrom) {
					validTime = false
				}
				if coupon.ValidUntil != nil && now.After(*coupon.ValidUntil) {
					validTime = false
				}
				if validTime && subtotal >= coupon.MinOrderAmount {
					if coupon.Type == models.CouponTypePercentage {
						discountAmount = subtotal * (coupon.Amount / 100)
					} else {
						discountAmount = coupon.Amount
					}
					if discountAmount > subtotal {
						discountAmount = subtotal
					}
					couponID = &coupon.ID
				}
			}
		}
	}

	totalAmount := subtotal - discountAmount
	if totalAmount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Total amount must be greater than zero"})
		return
	}

	// Convert dollars to cents for Stripe
	amountInCents := int64(math.Round(totalAmount * 100))

	// Create pending order
	order := models.Order{
		TenantID:        1,
		ContactID:       contact.ID,
		OrderNumber:     generateOrderNumber(),
		Status:          models.OrderStatusPending,
		Subtotal:        subtotal,
		DiscountAmount:  discountAmount,
		TaxAmount:       0,
		Total:           totalAmount,
		Currency:        currency,
		PaymentProvider: "stripe",
		CouponID:        couponID,
		Items: []models.OrderItem{
			{
				TenantID:  1,
				ProductID: product.ID,
				PriceID:   &price.ID,
				Quantity:  1,
				UnitPrice: price.Amount,
				Total:     price.Amount,
			},
		},
	}

	if err := h.db.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	// Increment coupon usage
	if couponID != nil {
		h.db.Model(&models.Coupon{}).Where("id = ?", *couponID).UpdateColumn("used_count", gorm.Expr("used_count + 1"))
	}

	// Create Stripe PaymentIntent
	params := &stripe.PaymentIntentParams{
		Amount:   stripe.Int64(amountInCents),
		Currency: stripe.String(strings.ToLower(currency)),
		AutomaticPaymentMethods: &stripe.PaymentIntentAutomaticPaymentMethodsParams{
			Enabled: stripe.Bool(true),
		},
		Description: stripe.String(product.Name),
		ReceiptEmail: stripe.String(u.Email),
		Metadata: map[string]string{
			"order_id":   fmt.Sprintf("%d", order.ID),
			"contact_id": fmt.Sprintf("%d", contact.ID),
			"type":       input.Type,
		},
	}

	pi, err := paymentintent.New(params)
	if err != nil {
		log.Printf("[payment] Stripe PaymentIntent creation failed: %v", err)
		// Clean up the order
		h.db.Delete(&order)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize payment"})
		return
	}

	// Store PaymentIntent ID on order
	order.PaymentID = pi.ID
	h.db.Model(&order).Update("payment_id", pi.ID)

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"client_secret":  pi.ClientSecret,
		"order_id":       order.ID,
		"order_number":   order.OrderNumber,
		"amount":         amountInCents,
		"currency":       currency,
		"publishable_key": h.cfg.StripePublishableKey,
	}})
}

// CheckoutStatus returns the current status of an order for the authenticated user.
func (h *PaymentHandler) CheckoutStatus(c *gin.Context) {
	orderID := c.Param("orderId")
	user, _ := c.Get("user")
	u := user.(models.User)

	var contact models.Contact
	if err := h.db.Where("email = ? AND tenant_id = ?", u.Email, 1).First(&contact).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contact not found"})
		return
	}

	var order models.Order
	if err := h.db.Where("id = ? AND contact_id = ?", orderID, contact.ID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"order_id":     order.ID,
		"order_number": order.OrderNumber,
		"status":       order.Status,
		"total":        order.Total,
	}})
}

// StripeConfig returns the publishable key for the frontend.
func (h *PaymentHandler) StripeConfig(c *gin.Context) {
	if h.cfg.StripePublishableKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Payments not configured"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"publishable_key": h.cfg.StripePublishableKey,
	}})
}

// StripeWebhook handles incoming Stripe webhook events.
func (h *PaymentHandler) StripeWebhook(c *gin.Context) {
	payload, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read body"})
		return
	}

	sig := c.GetHeader("Stripe-Signature")
	event, err := webhook.ConstructEvent(payload, sig, h.cfg.StripeWebhookSecret)
	if err != nil {
		log.Printf("[webhook] Signature verification failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid signature"})
		return
	}

	switch event.Type {
	case "payment_intent.succeeded":
		h.handlePaymentSucceeded(event)
	case "payment_intent.payment_failed":
		h.handlePaymentFailed(event)
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}

func (h *PaymentHandler) handlePaymentSucceeded(event stripe.Event) {
	pi, ok := event.Data.Object["id"].(string)
	if !ok {
		log.Println("[webhook] Missing payment_intent ID")
		return
	}

	var order models.Order
	if err := h.db.Where("payment_id = ?", pi).Preload("Items").First(&order).Error; err != nil {
		log.Printf("[webhook] Order not found for PI %s: %v", pi, err)
		return
	}

	// Idempotency: skip if already paid
	if order.Status == models.OrderStatusPaid {
		log.Printf("[webhook] Order %d already paid, skipping", order.ID)
		return
	}

	// Mark as paid
	now := time.Now()
	order.Status = models.OrderStatusPaid
	order.PaidAt = &now
	h.db.Save(&order)

	// Fulfill order (auto-enroll in courses, etc.)
	// Import the fulfillment service
	fulfillOrder(h.db, &order)

	log.Printf("[webhook] Order %d marked as paid (PI: %s)", order.ID, pi)
}

func (h *PaymentHandler) handlePaymentFailed(event stripe.Event) {
	pi, ok := event.Data.Object["id"].(string)
	if !ok {
		return
	}

	var order models.Order
	if err := h.db.Where("payment_id = ?", pi).First(&order).Error; err != nil {
		return
	}

	if order.Status != models.OrderStatusPending {
		return
	}

	order.Status = models.OrderStatusFailed
	h.db.Save(&order)
	log.Printf("[webhook] Order %d payment failed (PI: %s)", order.ID, pi)
}

// fulfillOrder is a local wrapper to avoid circular imports.
// It duplicates the logic from services.FulfillOrder.
func fulfillOrder(db *gorm.DB, order *models.Order) {
	for _, item := range order.Items {
		var product models.Product
		if err := db.First(&product, item.ProductID).Error; err != nil {
			continue
		}
		if product.Type == models.ProductTypeCourse {
			var courses []models.Course
			db.Where("product_id = ?", product.ID).Find(&courses)
			for _, course := range courses {
				enrollment := models.CourseEnrollment{
					TenantID:  1,
					ContactID: order.ContactID,
					CourseID:  course.ID,
					Status:    "active",
					Source:    "purchase",
				}
				db.FirstOrCreate(&enrollment, models.CourseEnrollment{
					ContactID: order.ContactID,
					CourseID:  course.ID,
				})
			}
		}
	}

	events.Emit(events.PurchaseCompleted, map[string]interface{}{
		"order_id":   order.ID,
		"contact_id": order.ContactID,
		"total":      order.Total,
	})
}
