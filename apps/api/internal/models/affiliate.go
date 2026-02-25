package models

import (
	"time"

	"gorm.io/gorm"
)

// --- Affiliate System ---

const (
	AffiliateStatusPending   = "pending"
	AffiliateStatusActive    = "active"
	AffiliateStatusSuspended = "suspended"

	CommissionPending  = "pending"
	CommissionApproved = "approved"
	CommissionPaid     = "paid"
	CommissionRejected = "rejected"

	PayoutPending    = "pending"
	PayoutProcessing = "processing"
	PayoutCompleted  = "completed"
)

type AffiliateProgram struct {
	ID               uint           `gorm:"primarykey" json:"id"`
	TenantID         uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Name             string         `gorm:"size:255;not null" json:"name"`
	Description      string         `gorm:"type:text" json:"description"`
	CommissionType   string         `gorm:"size:20;default:'percentage'" json:"commission_type"` // percentage, fixed
	CommissionAmount int64          `gorm:"default:0" json:"commission_amount"` // percentage (e.g. 30 = 30%) or cents
	CookieDays       int            `gorm:"default:30" json:"cookie_days"`
	MinPayoutAmount  int64          `gorm:"default:5000" json:"min_payout_amount"` // in cents
	AutoApprove      bool           `gorm:"default:false" json:"auto_approve"`
	Status           string         `gorm:"size:20;default:'active'" json:"status"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	Accounts []AffiliateAccount `gorm:"foreignKey:ProgramID" json:"accounts,omitempty"`
}

type AffiliateAccount struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	TenantID       uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	ContactID      uint           `gorm:"index;not null" json:"contact_id"`
	ProgramID      uint           `gorm:"index;not null" json:"program_id"`
	Status         string         `gorm:"size:20;default:'pending'" json:"status"`
	ReferralCode   string         `gorm:"size:50;uniqueIndex" json:"referral_code"`
	CustomSlug     string         `gorm:"size:100" json:"custom_slug"`
	Balance        int64          `gorm:"default:0" json:"balance"` // in cents
	TotalEarned    int64          `gorm:"default:0" json:"total_earned"`
	TotalPaid      int64          `gorm:"default:0" json:"total_paid"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	Contact     *Contact          `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	Program     *AffiliateProgram `gorm:"foreignKey:ProgramID" json:"program,omitempty"`
	Links       []AffiliateLink   `gorm:"foreignKey:AccountID" json:"links,omitempty"`
	Commissions []Commission      `gorm:"foreignKey:AccountID" json:"commissions,omitempty"`
}

type AffiliateLink struct {
	ID          uint      `gorm:"primarykey" json:"id"`
	TenantID    uint      `gorm:"index;not null;default:1" json:"tenant_id"`
	AccountID   uint      `gorm:"index;not null" json:"account_id"`
	URL         string    `gorm:"size:500;not null" json:"url"`
	Slug        string    `gorm:"size:100" json:"slug"`
	Clicks      int64     `gorm:"default:0" json:"clicks"`
	Conversions int64     `gorm:"default:0" json:"conversions"`
	CreatedAt   time.Time `json:"created_at"`
}

type Commission struct {
	ID         uint       `gorm:"primarykey" json:"id"`
	TenantID   uint       `gorm:"index;not null;default:1" json:"tenant_id"`
	AccountID  uint       `gorm:"index;not null" json:"account_id"`
	OrderID    *uint      `gorm:"index" json:"order_id"`
	ProductID  *uint      `gorm:"index" json:"product_id"`
	Amount     int64      `gorm:"not null" json:"amount"` // in cents
	Status     string     `gorm:"size:20;default:'pending'" json:"status"`
	ApprovedAt *time.Time `json:"approved_at"`
	PaidAt     *time.Time `json:"paid_at"`
	CreatedAt  time.Time  `json:"created_at"`

	Account *AffiliateAccount `gorm:"foreignKey:AccountID" json:"account,omitempty"`
}

type Payout struct {
	ID            uint       `gorm:"primarykey" json:"id"`
	TenantID      uint       `gorm:"index;not null;default:1" json:"tenant_id"`
	AccountID     uint       `gorm:"index;not null" json:"account_id"`
	Amount        int64      `gorm:"not null" json:"amount"` // in cents
	Method        string     `gorm:"size:50" json:"method"` // paypal, bank_transfer, etc.
	Status        string     `gorm:"size:20;default:'pending'" json:"status"`
	ProcessedAt   *time.Time `json:"processed_at"`
	TransactionID string     `gorm:"size:255" json:"transaction_id"`
	CreatedAt     time.Time  `json:"created_at"`

	Account *AffiliateAccount `gorm:"foreignKey:AccountID" json:"account,omitempty"`
}
