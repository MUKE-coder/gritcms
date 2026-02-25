package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// --- Funnels ---

const (
	FunnelStatusDraft    = "draft"
	FunnelStatusActive   = "active"
	FunnelStatusArchived = "archived"

	FunnelTypeOptin   = "optin"
	FunnelTypeSales   = "sales"
	FunnelTypeWebinar = "webinar"
	FunnelTypeLaunch  = "launch"

	FunnelStepTypeLanding  = "landing"
	FunnelStepTypeSales    = "sales"
	FunnelStepTypeCheckout = "checkout"
	FunnelStepTypeUpsell   = "upsell"
	FunnelStepTypeDownsell = "downsell"
	FunnelStepTypeThankyou = "thankyou"
)

type Funnel struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	TenantID    uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Name        string         `gorm:"size:255;not null" json:"name"`
	Slug        string         `gorm:"size:255;uniqueIndex:idx_funnel_slug_tenant;not null" json:"slug"`
	Description string         `gorm:"type:text" json:"description"`
	Status      string         `gorm:"size:20;default:'draft'" json:"status"`
	Type        string         `gorm:"size:20;default:'optin'" json:"type"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	Steps       []FunnelStep       `gorm:"foreignKey:FunnelID" json:"steps,omitempty"`
	VisitCount  int64              `gorm:"-" json:"visit_count,omitempty"`
	ConvCount   int64              `gorm:"-" json:"conversion_count,omitempty"`
}

type FunnelStep struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	TenantID  uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	FunnelID  uint           `gorm:"index;not null" json:"funnel_id"`
	Name      string         `gorm:"size:255;not null" json:"name"`
	Slug      string         `gorm:"size:255" json:"slug"`
	Type      string         `gorm:"size:20;default:'landing'" json:"type"`
	Content   datatypes.JSON `gorm:"type:jsonb" json:"content"`
	SortOrder int            `gorm:"default:0" json:"sort_order"`
	Settings  datatypes.JSON `gorm:"type:jsonb" json:"settings"` // button text, redirect URL, etc.
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`

	Funnel *Funnel `gorm:"foreignKey:FunnelID" json:"funnel,omitempty"`
}

type FunnelVisit struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	TenantID  uint      `gorm:"index;not null;default:1" json:"tenant_id"`
	FunnelID  uint      `gorm:"index;not null" json:"funnel_id"`
	StepID    uint      `gorm:"index;not null" json:"step_id"`
	ContactID *uint     `gorm:"index" json:"contact_id"`
	IPAddress string    `gorm:"size:45" json:"ip_address"`
	UserAgent string    `gorm:"type:text" json:"user_agent"`
	Referrer  string    `gorm:"size:500" json:"referrer"`
	VisitedAt time.Time `gorm:"not null" json:"visited_at"`
}

type FunnelConversion struct {
	ID          uint      `gorm:"primarykey" json:"id"`
	TenantID    uint      `gorm:"index;not null;default:1" json:"tenant_id"`
	FunnelID    uint      `gorm:"index;not null" json:"funnel_id"`
	StepID      uint      `gorm:"index;not null" json:"step_id"`
	ContactID   *uint     `gorm:"index" json:"contact_id"`
	Type        string    `gorm:"size:20" json:"type"` // optin, purchase
	Value       int64     `gorm:"default:0" json:"value"` // in cents
	ConvertedAt time.Time `gorm:"not null" json:"converted_at"`
}
