package handlers

import (
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/cache"
	"gritcms/apps/api/internal/events"
	"gritcms/apps/api/internal/models"
)

// CommerceHandler handles all commerce-related endpoints.
type CommerceHandler struct {
	db    *gorm.DB
	cache *cache.Cache
}

// NewCommerceHandler creates a new CommerceHandler.
func NewCommerceHandler(db *gorm.DB, cache *cache.Cache) *CommerceHandler {
	return &CommerceHandler{db: db, cache: cache}
}

// invalidateProductCache clears cached public product pages.
func (h *CommerceHandler) invalidateProductCache(c *gin.Context) {
	if h.cache != nil {
		_ = h.cache.DeletePattern(c.Request.Context(), "http:*")
	}
}

// ===================== PRODUCTS =====================

// ListProducts lists products with pagination and filters.
func (h *CommerceHandler) ListProducts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")
	productType := c.Query("type")
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	offset := (page - 1) * pageSize

	q := h.db.Model(&models.Product{})
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if productType != "" {
		q = q.Where("type = ?", productType)
	}
	if search != "" {
		q = q.Where("name ILIKE ?", "%"+search+"%")
	}

	var total int64
	q.Count(&total)

	var products []models.Product
	if err := q.Preload("Prices").Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list products"})
		return
	}

	// Attach sales counts
	for i := range products {
		h.db.Model(&models.OrderItem{}).Where("product_id = ?", products[i].ID).
			Joins("JOIN orders ON orders.id = order_items.order_id AND orders.status = 'paid'").
			Count(&products[i].SalesCount)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": products,
		"meta": gin.H{"total": total, "page": page, "page_size": pageSize, "pages": int(math.Ceil(float64(total) / float64(pageSize)))},
	})
}

// GetProduct returns a single product with prices and variants.
func (h *CommerceHandler) GetProduct(c *gin.Context) {
	id := c.Param("id")
	var product models.Product
	if err := h.db.Preload("Prices", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Preload("Variants").First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": product})
}

// CreateProduct creates a new product.
func (h *CommerceHandler) CreateProduct(c *gin.Context) {
	var product models.Product
	if err := c.ShouldBindJSON(&product); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product.TenantID = 1
	if product.Slug == "" {
		product.Slug = generateProductSlug(product.Name)
	}

	if err := h.db.Create(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": product})
}

// UpdateProduct updates a product.
func (h *CommerceHandler) UpdateProduct(c *gin.Context) {
	id := c.Param("id")
	var product models.Product
	if err := h.db.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(input)

	// Marshal JSON fields to datatypes.JSON so GORM can write them to JSONB columns
	jsonFields := []string{"images", "downloadable_files", "metadata"}
	for _, field := range jsonFields {
		if val, ok := input[field]; ok && val != nil {
			b, err := json.Marshal(val)
			if err == nil {
				input[field] = datatypes.JSON(b)
			}
		}
	}

	if err := h.db.Model(&product).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	h.db.Preload("Prices").Preload("Variants").First(&product, id)
	h.invalidateProductCache(c)
	c.JSON(http.StatusOK, gin.H{"data": product})
}

// DeleteProduct deletes a product.
func (h *CommerceHandler) DeleteProduct(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Delete(&models.Product{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Product deleted"})
}

// ===================== PRICES =====================

// CreatePrice creates a price for a product.
func (h *CommerceHandler) CreatePrice(c *gin.Context) {
	productID, _ := strconv.Atoi(c.Param("id"))
	var price models.Price
	if err := c.ShouldBindJSON(&price); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	price.TenantID = 1
	price.ProductID = uint(productID)

	if err := h.db.Create(&price).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create price"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": price})
}

// UpdatePrice updates a price.
func (h *CommerceHandler) UpdatePrice(c *gin.Context) {
	priceID := c.Param("priceId")
	var price models.Price
	if err := h.db.First(&price, priceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Price not found"})
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(input)

	if err := h.db.Model(&price).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update price"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": price})
}

// DeletePrice deletes a price.
func (h *CommerceHandler) DeletePrice(c *gin.Context) {
	priceID := c.Param("priceId")
	if err := h.db.Delete(&models.Price{}, priceID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete price"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Price deleted"})
}

// ===================== VARIANTS =====================

// CreateVariant creates a variant for a product.
func (h *CommerceHandler) CreateVariant(c *gin.Context) {
	productID, _ := strconv.Atoi(c.Param("id"))
	var variant models.ProductVariant
	if err := c.ShouldBindJSON(&variant); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	variant.TenantID = 1
	variant.ProductID = uint(productID)

	if err := h.db.Create(&variant).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create variant"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": variant})
}

// UpdateVariant updates a variant.
func (h *CommerceHandler) UpdateVariant(c *gin.Context) {
	variantID := c.Param("variantId")
	var variant models.ProductVariant
	if err := h.db.First(&variant, variantID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Variant not found"})
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(input)

	if err := h.db.Model(&variant).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update variant"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": variant})
}

// DeleteVariant deletes a variant.
func (h *CommerceHandler) DeleteVariant(c *gin.Context) {
	variantID := c.Param("variantId")
	if err := h.db.Delete(&models.ProductVariant{}, variantID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete variant"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Variant deleted"})
}

// ===================== ORDERS =====================

// ListOrders lists orders with pagination and filters.
func (h *CommerceHandler) ListOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")
	contactID := c.Query("contact_id")

	if page < 1 {
		page = 1
	}
	offset := (page - 1) * pageSize

	q := h.db.Model(&models.Order{})
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if contactID != "" {
		q = q.Where("contact_id = ?", contactID)
	}

	var total int64
	q.Count(&total)

	var orders []models.Order
	if err := q.Preload("Contact").Preload("Items.Product").Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list orders"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": orders,
		"meta": gin.H{"total": total, "page": page, "page_size": pageSize, "pages": int(math.Ceil(float64(total) / float64(pageSize)))},
	})
}

// GetOrder returns a single order with items.
func (h *CommerceHandler) GetOrder(c *gin.Context) {
	id := c.Param("orderId")
	var order models.Order
	if err := h.db.Preload("Contact").Preload("Items.Product").Preload("Coupon").First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": order})
}

// CreateOrder creates a new order (admin-initiated or checkout).
func (h *CommerceHandler) CreateOrder(c *gin.Context) {
	var input struct {
		ContactID uint `json:"contact_id" binding:"required"`
		Items     []struct {
			ProductID uint  `json:"product_id"`
			PriceID   *uint `json:"price_id"`
			VariantID *uint `json:"variant_id"`
			Quantity  int   `json:"quantity"`
		} `json:"items" binding:"required"`
		CouponCode string `json:"coupon_code"`
		Currency   string `json:"currency"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	currency := input.Currency
	if currency == "" {
		currency = "USD"
	}

	// Build order items
	var orderItems []models.OrderItem
	var subtotal float64

	for _, item := range input.Items {
		qty := item.Quantity
		if qty < 1 {
			qty = 1
		}

		// Get product price
		var unitPrice float64
		if item.PriceID != nil {
			var price models.Price
			if err := h.db.First(&price, *item.PriceID).Error; err == nil {
				unitPrice = price.Amount
			}
		}
		if unitPrice == 0 {
			// Fallback: get first price of product
			var price models.Price
			if err := h.db.Where("product_id = ?", item.ProductID).Order("sort_order ASC").First(&price).Error; err == nil {
				unitPrice = price.Amount
			}
		}

		total := unitPrice * float64(qty)
		subtotal += total

		pid := item.ProductID
		orderItems = append(orderItems, models.OrderItem{
			TenantID:  1,
			ProductID: &pid,
			PriceID:   item.PriceID,
			VariantID: item.VariantID,
			Quantity:  qty,
			UnitPrice: unitPrice,
			Total:     total,
		})
	}

	// Apply coupon
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

	order := models.Order{
		TenantID:       1,
		ContactID:      input.ContactID,
		OrderNumber:    generateOrderNumber(),
		Status:         models.OrderStatusPending,
		Subtotal:       subtotal,
		DiscountAmount: discountAmount,
		TaxAmount:      0,
		Total:          totalAmount,
		Currency:       currency,
		CouponID:       couponID,
		Items:          orderItems,
	}

	if err := h.db.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	// Increment coupon usage
	if couponID != nil {
		h.db.Model(&models.Coupon{}).Where("id = ?", *couponID).UpdateColumn("used_count", gorm.Expr("used_count + 1"))
	}

	h.db.Preload("Contact").Preload("Items.Product").First(&order, order.ID)
	c.JSON(http.StatusCreated, gin.H{"data": order})
}

// UpdateOrderStatus updates an order's status and handles fulfillment.
func (h *CommerceHandler) UpdateOrderStatus(c *gin.Context) {
	orderID := c.Param("orderId")
	var input struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var order models.Order
	if err := h.db.Preload("Items").First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	oldStatus := order.Status
	order.Status = input.Status

	if input.Status == models.OrderStatusPaid && oldStatus != models.OrderStatusPaid {
		now := time.Now()
		order.PaidAt = &now
		h.db.Save(&order)

		// Fulfill: auto-enroll in linked courses
		for _, item := range order.Items {
			// Direct course purchase
			if item.CourseID != nil {
				enrollment := models.CourseEnrollment{
					TenantID:  1,
					ContactID: order.ContactID,
					CourseID:  *item.CourseID,
					Status:    "active",
					Source:    "purchase",
				}
				h.db.FirstOrCreate(&enrollment, models.CourseEnrollment{
					ContactID: order.ContactID,
					CourseID:  *item.CourseID,
				})
				continue
			}
			// Legacy: product-type-course linkage
			if item.ProductID != nil {
				var product models.Product
				if err := h.db.First(&product, *item.ProductID).Error; err == nil {
					if product.Type == models.ProductTypeCourse {
						var courses []models.Course
						h.db.Where("product_id = ?", product.ID).Find(&courses)
						for _, course := range courses {
							enrollment := models.CourseEnrollment{
								TenantID:  1,
								ContactID: order.ContactID,
								CourseID:  course.ID,
								Status:    "active",
								Source:    "purchase",
							}
							h.db.FirstOrCreate(&enrollment, models.CourseEnrollment{
								ContactID: order.ContactID,
								CourseID:  course.ID,
							})
						}
					}
				}
			}
		}

		events.Emit(events.PurchaseCompleted, map[string]interface{}{
			"order_id":   order.ID,
			"contact_id": order.ContactID,
			"total":      order.Total,
		})
	} else if input.Status == models.OrderStatusRefunded {
		h.db.Save(&order)
		events.Emit(events.PurchaseRefunded, map[string]interface{}{
			"order_id":   order.ID,
			"contact_id": order.ContactID,
			"total":      order.Total,
		})
	} else {
		h.db.Save(&order)
	}

	c.JSON(http.StatusOK, gin.H{"data": order})
}

// RefundOrder processes a refund.
func (h *CommerceHandler) RefundOrder(c *gin.Context) {
	orderID := c.Param("orderId")
	var order models.Order
	if err := h.db.First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	if order.Status != models.OrderStatusPaid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order is not in paid status"})
		return
	}

	order.Status = models.OrderStatusRefunded
	h.db.Save(&order)

	events.Emit(events.PurchaseRefunded, map[string]interface{}{
		"order_id":   order.ID,
		"contact_id": order.ContactID,
		"total":      order.Total,
	})

	c.JSON(http.StatusOK, gin.H{"data": order})
}

// ===================== COUPONS =====================

// ListCoupons lists all coupons.
func (h *CommerceHandler) ListCoupons(c *gin.Context) {
	var coupons []models.Coupon
	if err := h.db.Order("created_at DESC").Find(&coupons).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list coupons"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": coupons})
}

// GetCoupon returns a single coupon.
func (h *CommerceHandler) GetCoupon(c *gin.Context) {
	id := c.Param("couponId")
	var coupon models.Coupon
	if err := h.db.First(&coupon, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Coupon not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": coupon})
}

// CreateCoupon creates a new coupon.
func (h *CommerceHandler) CreateCoupon(c *gin.Context) {
	var coupon models.Coupon
	if err := c.ShouldBindJSON(&coupon); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	coupon.TenantID = 1
	coupon.Code = strings.ToUpper(coupon.Code)

	if err := h.db.Create(&coupon).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create coupon"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": coupon})
}

// UpdateCoupon updates a coupon.
func (h *CommerceHandler) UpdateCoupon(c *gin.Context) {
	id := c.Param("couponId")
	var coupon models.Coupon
	if err := h.db.First(&coupon, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Coupon not found"})
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(input)

	if err := h.db.Model(&coupon).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update coupon"})
		return
	}

	h.db.First(&coupon, id)
	c.JSON(http.StatusOK, gin.H{"data": coupon})
}

// DeleteCoupon deletes a coupon.
func (h *CommerceHandler) DeleteCoupon(c *gin.Context) {
	id := c.Param("couponId")
	if err := h.db.Delete(&models.Coupon{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete coupon"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Coupon deleted"})
}

// ValidateCoupon validates a coupon code (public).
func (h *CommerceHandler) ValidateCoupon(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Coupon code is required"})
		return
	}

	var coupon models.Coupon
	if err := h.db.Where("code = ? AND status = 'active'", strings.ToUpper(code)).First(&coupon).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid coupon code"})
		return
	}

	now := time.Now()
	if coupon.ValidFrom != nil && now.Before(*coupon.ValidFrom) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Coupon is not yet valid"})
		return
	}
	if coupon.ValidUntil != nil && now.After(*coupon.ValidUntil) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Coupon has expired"})
		return
	}
	if coupon.MaxUses > 0 && coupon.UsedCount >= coupon.MaxUses {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Coupon usage limit reached"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": coupon})
}

// ===================== SUBSCRIPTIONS =====================

// ListSubscriptions lists subscriptions with pagination.
func (h *CommerceHandler) ListSubscriptions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")

	if page < 1 {
		page = 1
	}
	offset := (page - 1) * pageSize

	q := h.db.Model(&models.Subscription{})
	if status != "" {
		q = q.Where("status = ?", status)
	}

	var total int64
	q.Count(&total)

	var subscriptions []models.Subscription
	if err := q.Preload("Contact").Preload("Product").Preload("Price").Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&subscriptions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list subscriptions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": subscriptions,
		"meta": gin.H{"total": total, "page": page, "page_size": pageSize, "pages": int(math.Ceil(float64(total) / float64(pageSize)))},
	})
}

// GetSubscription returns a single subscription.
func (h *CommerceHandler) GetSubscription(c *gin.Context) {
	id := c.Param("subId")
	var sub models.Subscription
	if err := h.db.Preload("Contact").Preload("Product").Preload("Price").First(&sub, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": sub})
}

// CancelSubscription cancels a subscription.
func (h *CommerceHandler) CancelSubscription(c *gin.Context) {
	id := c.Param("subId")
	var input struct {
		Immediately bool `json:"immediately"`
	}
	c.ShouldBindJSON(&input)

	var sub models.Subscription
	if err := h.db.First(&sub, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
		return
	}

	now := time.Now()
	if input.Immediately {
		sub.Status = models.SubscriptionCancelled
		sub.CancelledAt = &now
	} else {
		sub.CancelAtPeriodEnd = true
		sub.CancelledAt = &now
	}

	h.db.Save(&sub)

	events.Emit(events.SubscriptionCancelled, map[string]interface{}{
		"subscription_id": sub.ID,
		"contact_id":      sub.ContactID,
		"product_id":      sub.ProductID,
	})

	c.JSON(http.StatusOK, gin.H{"data": sub})
}

// ===================== REVENUE DASHBOARD =====================

// RevenueDashboard returns commerce analytics.
func (h *CommerceHandler) RevenueDashboard(c *gin.Context) {
	var totalRevenue float64
	h.db.Model(&models.Order{}).Where("status = 'paid'").Select("COALESCE(SUM(total), 0)").Scan(&totalRevenue)

	var totalOrders int64
	h.db.Model(&models.Order{}).Where("status = 'paid'").Count(&totalOrders)

	var totalProducts int64
	h.db.Model(&models.Product{}).Where("status = 'active'").Count(&totalProducts)

	var activeSubscriptions int64
	h.db.Model(&models.Subscription{}).Where("status = 'active'").Count(&activeSubscriptions)

	// Revenue this month
	startOfMonth := time.Now().UTC().Truncate(24*time.Hour).AddDate(0, 0, -time.Now().Day()+1)
	var monthlyRevenue float64
	h.db.Model(&models.Order{}).Where("status = 'paid' AND paid_at >= ?", startOfMonth).Select("COALESCE(SUM(total), 0)").Scan(&monthlyRevenue)

	// Recent orders
	var recentOrders []models.Order
	h.db.Preload("Contact").Where("status = 'paid'").Order("paid_at DESC").Limit(5).Find(&recentOrders)

	// MRR from active subscriptions
	var mrr float64
	h.db.Model(&models.Subscription{}).
		Where("subscriptions.status = 'active'").
		Joins("JOIN prices ON prices.id = subscriptions.price_id").
		Select("COALESCE(SUM(CASE WHEN prices.interval = 'year' THEN prices.amount / 12 ELSE prices.amount END), 0)").
		Scan(&mrr)

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"total_revenue":        totalRevenue,
		"total_orders":         totalOrders,
		"total_products":       totalProducts,
		"active_subscriptions": activeSubscriptions,
		"monthly_revenue":      monthlyRevenue,
		"mrr":                  mrr,
		"recent_orders":        recentOrders,
	}})
}

// ===================== PUBLIC ENDPOINTS =====================

// ListPublicProducts lists active products for the storefront.
func (h *CommerceHandler) ListPublicProducts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "12"))

	if page < 1 {
		page = 1
	}
	offset := (page - 1) * pageSize

	q := h.db.Model(&models.Product{}).Where("status = 'active'")

	var total int64
	q.Count(&total)

	var products []models.Product
	if err := q.Preload("Prices", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list products"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": products,
		"meta": gin.H{"total": total, "page": page, "page_size": pageSize, "pages": int(math.Ceil(float64(total) / float64(pageSize)))},
	})
}

// GetPublicProduct returns a single product by slug.
func (h *CommerceHandler) GetPublicProduct(c *gin.Context) {
	slug := c.Param("slug")
	var product models.Product
	if err := h.db.Where("slug = ? AND status = 'active'", slug).Preload("Prices", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Preload("Variants").First(&product).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": product})
}

// ===================== STUDENT PURCHASES =====================

// StudentGetPurchases returns all paid orders for the authenticated user.
func (h *CommerceHandler) StudentGetPurchases(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(models.User)

	var contact models.Contact
	if err := h.db.Where("email = ? AND tenant_id = ?", u.Email, 1).First(&contact).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}})
		return
	}

	// Only return orders that have at least one product item (exclude course-only orders)
	var orders []models.Order
	h.db.Where("contact_id = ? AND status = ? AND id IN (?)",
		contact.ID, models.OrderStatusPaid,
		h.db.Model(&models.OrderItem{}).Select("order_id").Where("product_id IS NOT NULL"),
	).
		Preload("Items.Product").
		Order("paid_at DESC").
		Find(&orders)

	result := make([]gin.H, 0, len(orders))
	for _, o := range orders {
		// Filter items to only product items
		var productItems []models.OrderItem
		for _, item := range o.Items {
			if item.ProductID != nil {
				productItems = append(productItems, item)
			}
		}
		result = append(result, gin.H{
			"order": o,
			"items": productItems,
		})
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// StudentGetPurchase returns a single paid order for the authenticated user.
func (h *CommerceHandler) StudentGetPurchase(c *gin.Context) {
	orderID := c.Param("orderId")
	user, _ := c.Get("user")
	u := user.(models.User)

	var contact models.Contact
	if err := h.db.Where("email = ? AND tenant_id = ?", u.Email, 1).First(&contact).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contact not found"})
		return
	}

	var order models.Order
	if err := h.db.Where("id = ? AND contact_id = ? AND status = ?", orderID, contact.ID, models.OrderStatusPaid).
		Preload("Items.Product").
		First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"order": order,
		"items": order.Items,
	}})
}

// ===================== HELPERS =====================

func generateProductSlug(name string) string {
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
	slug = strings.Trim(slug, "-")
	return slug
}

func generateOrderNumber() string {
	return fmt.Sprintf("ORD-%d%04d", time.Now().Unix()%100000, rand.Intn(10000))
}
