package models

import (
	"time"

	"gorm.io/gorm"
)

// Menu location constants
const (
	MenuLocationHeader  = "header"
	MenuLocationFooter  = "footer"
	MenuLocationSidebar = "sidebar"
)

// Menu represents a navigation menu (header, footer, sidebar).
type Menu struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	TenantID  uint           `gorm:"uniqueIndex:idx_menus_tenant_slug;not null;default:1" json:"tenant_id"`
	Name      string         `gorm:"size:255;not null" json:"name"`
	Slug      string         `gorm:"size:255;not null;uniqueIndex:idx_menus_tenant_slug" json:"slug"`
	Location  string         `gorm:"size:50;index" json:"location"` // header, footer, sidebar
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Items []MenuItem `gorm:"foreignKey:MenuID;constraint:OnDelete:CASCADE" json:"items,omitempty"`
}

// BeforeCreate auto-generates the slug.
func (m *Menu) BeforeCreate(tx *gorm.DB) error {
	if m.Slug == "" {
		m.Slug = slugify(m.Name)
	}
	return nil
}

// MenuItem represents a single item in a navigation menu.
type MenuItem struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	TenantID  uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	MenuID    uint           `gorm:"index;not null" json:"menu_id"`
	Label     string         `gorm:"size:255;not null" json:"label"`
	URL       string         `gorm:"size:500" json:"url"`       // External URL
	PageID    *uint          `gorm:"index" json:"page_id"`      // Link to internal page
	Target    string         `gorm:"size:10;default:'_self'" json:"target"` // _self or _blank
	SortOrder int            `gorm:"default:0" json:"sort_order"`
	ParentID  *uint          `gorm:"index" json:"parent_id"` // Nested menu items
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Page     *Page      `gorm:"foreignKey:PageID" json:"page,omitempty"`
	Children []MenuItem `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}
