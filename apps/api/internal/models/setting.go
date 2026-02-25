package models

import (
	"time"

	"gorm.io/gorm"
)

// Setting stores system configuration as key-value pairs.
// Examples: site_name, site_logo, default_currency, smtp_host, etc.
type Setting struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	TenantID  uint           `gorm:"uniqueIndex:idx_settings_tenant_key;not null;default:1" json:"tenant_id"`
	Group     string         `gorm:"size:100;index;not null;default:'general'" json:"group"` // general, email, payments, seo, etc.
	Key       string         `gorm:"size:255;uniqueIndex:idx_settings_tenant_key;not null" json:"key"`
	Value     string         `gorm:"type:text" json:"value"`
	Type      string         `gorm:"size:50;default:'string'" json:"type"` // string, bool, int, json
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
