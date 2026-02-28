package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// --- Products ---

const (
	ProductTypeDigital    = "digital"
	ProductTypePhysical   = "physical"
	ProductTypeCourse     = "course"
	ProductTypeMembership = "membership"
	ProductTypeService    = "service"
)

const (
	ProductStatusActive   = "active"
	ProductStatusInactive = "inactive"
	ProductStatusArchived = "archived"
)

type Product struct {
	ID               uint           `gorm:"primarykey" json:"id"`
	TenantID         uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Name             string         `gorm:"size:500;not null" json:"name"`
	Slug             string         `gorm:"size:500;uniqueIndex:idx_product_slug_tenant;not null" json:"slug"`
	Description      string         `gorm:"type:text" json:"description"`
	Type             string         `gorm:"size:20;default:'digital'" json:"type"`
	Status           string         `gorm:"size:20;default:'active';index" json:"status"`
	Images           datatypes.JSON `gorm:"type:jsonb" json:"images"`
	DownloadableFiles datatypes.JSON `gorm:"type:jsonb" json:"downloadable_files"`
	Metadata         datatypes.JSON `gorm:"type:jsonb" json:"metadata"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	Prices   []Price          `gorm:"foreignKey:ProductID;constraint:OnDelete:CASCADE" json:"prices,omitempty"`
	Variants []ProductVariant `gorm:"foreignKey:ProductID;constraint:OnDelete:CASCADE" json:"variants,omitempty"`

	SalesCount int64 `gorm:"-" json:"sales_count,omitempty"`
}

// --- Prices ---

const (
	PriceTypeOneTime      = "one_time"
	PriceTypeSubscription = "subscription"
)

type Price struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	TenantID  uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	ProductID uint           `gorm:"index;not null" json:"product_id"`
	Amount    float64        `gorm:"type:decimal(10,2);not null" json:"amount"`
	Currency  string         `gorm:"size:3;default:'USD'" json:"currency"`
	Type      string         `gorm:"size:20;default:'one_time'" json:"type"`
	Interval  string         `gorm:"size:10" json:"interval"` // month, year
	TrialDays int            `gorm:"default:0" json:"trial_days"`
	SortOrder int            `gorm:"default:0" json:"sort_order"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// --- Product Variants ---

type ProductVariant struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	TenantID       uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	ProductID      uint           `gorm:"index;not null" json:"product_id"`
	Name           string         `gorm:"size:255;not null" json:"name"`
	SKU            string         `gorm:"size:100" json:"sku"`
	PriceOverride  *float64       `gorm:"type:decimal(10,2)" json:"price_override"`
	StockQuantity  *int           `json:"stock_quantity"`
	Attributes     datatypes.JSON `gorm:"type:jsonb" json:"attributes"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// --- Orders ---

const (
	OrderStatusPending            = "pending"
	OrderStatusPaid               = "paid"
	OrderStatusFailed             = "failed"
	OrderStatusRefunded           = "refunded"
	OrderStatusPartiallyRefunded  = "partially_refunded"
)

type Order struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	TenantID        uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	ContactID       uint           `gorm:"index;not null" json:"contact_id"`
	OrderNumber     string         `gorm:"size:50;uniqueIndex;not null" json:"order_number"`
	Status          string         `gorm:"size:30;default:'pending';index" json:"status"`
	Subtotal        float64        `gorm:"type:decimal(10,2);default:0" json:"subtotal"`
	DiscountAmount  float64        `gorm:"type:decimal(10,2);default:0" json:"discount_amount"`
	TaxAmount       float64        `gorm:"type:decimal(10,2);default:0" json:"tax_amount"`
	Total           float64        `gorm:"type:decimal(10,2);default:0" json:"total"`
	Currency        string         `gorm:"size:3;default:'USD'" json:"currency"`
	PaymentProvider string         `gorm:"size:50" json:"payment_provider"`
	PaymentID       string         `gorm:"size:255" json:"payment_id"`
	CouponID        *uint          `gorm:"index" json:"coupon_id"`
	Metadata        datatypes.JSON `gorm:"type:jsonb" json:"metadata"`
	PaidAt          *time.Time     `json:"paid_at"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	Contact  *Contact    `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	Items    []OrderItem `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE" json:"items,omitempty"`
	Coupon   *Coupon     `gorm:"foreignKey:CouponID" json:"coupon,omitempty"`
}

// --- Order Items ---

type OrderItem struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	TenantID  uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	OrderID   uint           `gorm:"index;not null" json:"order_id"`
	ProductID *uint          `gorm:"index" json:"product_id"`
	CourseID  *uint          `gorm:"index" json:"course_id"`
	PriceID   *uint          `gorm:"index" json:"price_id"`
	VariantID *uint          `gorm:"index" json:"variant_id"`
	Quantity  int            `gorm:"default:1" json:"quantity"`
	UnitPrice float64        `gorm:"type:decimal(10,2);not null" json:"unit_price"`
	Total     float64        `gorm:"type:decimal(10,2);not null" json:"total"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Course  *Course  `gorm:"foreignKey:CourseID" json:"course,omitempty"`
}

// --- Coupons ---

const (
	CouponTypePercentage = "percentage"
	CouponTypeFixed      = "fixed"
)

const (
	CouponStatusActive   = "active"
	CouponStatusExpired  = "expired"
	CouponStatusDisabled = "disabled"
)

type Coupon struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	TenantID       uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Code           string         `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Type           string         `gorm:"size:20;default:'percentage'" json:"type"`
	Amount         float64        `gorm:"type:decimal(10,2);not null" json:"amount"`
	MinOrderAmount float64        `gorm:"type:decimal(10,2);default:0" json:"min_order_amount"`
	MaxUses        int            `gorm:"default:0" json:"max_uses"` // 0 = unlimited
	UsedCount      int            `gorm:"default:0" json:"used_count"`
	ValidFrom      *time.Time     `json:"valid_from"`
	ValidUntil     *time.Time     `json:"valid_until"`
	ProductIDs     datatypes.JSON `gorm:"type:jsonb" json:"product_ids"` // restrict to specific products
	Status         string         `gorm:"size:20;default:'active'" json:"status"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// --- Subscriptions ---

const (
	SubscriptionActive    = "active"
	SubscriptionPastDue   = "past_due"
	SubscriptionCancelled = "cancelled"
	SubscriptionPaused    = "paused"
)

type Subscription struct {
	ID                     uint           `gorm:"primarykey" json:"id"`
	TenantID               uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	ContactID              uint           `gorm:"index;not null" json:"contact_id"`
	ProductID              uint           `gorm:"index;not null" json:"product_id"`
	PriceID                uint           `gorm:"index;not null" json:"price_id"`
	Status                 string         `gorm:"size:20;default:'active';index" json:"status"`
	PaymentProvider        string         `gorm:"size:50" json:"payment_provider"`
	ProviderSubscriptionID string         `gorm:"size:255" json:"provider_subscription_id"`
	CurrentPeriodStart     time.Time      `json:"current_period_start"`
	CurrentPeriodEnd       time.Time      `json:"current_period_end"`
	CancelledAt            *time.Time     `json:"cancelled_at"`
	CancelAtPeriodEnd      bool           `gorm:"default:false" json:"cancel_at_period_end"`
	CreatedAt              time.Time      `json:"created_at"`
	UpdatedAt              time.Time      `json:"updated_at"`
	DeletedAt              gorm.DeletedAt `gorm:"index" json:"-"`

	Contact *Contact `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	Product *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Price   *Price   `gorm:"foreignKey:PriceID" json:"price,omitempty"`
}
