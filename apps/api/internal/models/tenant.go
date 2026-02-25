package models

import (
	"time"

	"gorm.io/gorm"
)

// Tenant represents an isolated workspace for multi-tenancy support.
// For now, all records belong to tenant_id=1 (single-tenant mode).
type Tenant struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	Name      string         `gorm:"size:255;not null" json:"name"`
	Slug      string         `gorm:"size:255;uniqueIndex;not null" json:"slug"`
	Domain    string         `gorm:"size:255" json:"domain"`
	Logo      string         `gorm:"size:500" json:"logo"`
	Active    bool           `gorm:"default:true" json:"active"`
	Settings  string         `gorm:"type:text" json:"settings"` // JSON string for tenant-level overrides
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
