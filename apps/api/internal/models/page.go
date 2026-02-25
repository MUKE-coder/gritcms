package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Page status constants
const (
	PageStatusDraft     = "draft"
	PageStatusPublished = "published"
	PageStatusArchived  = "archived"
)

// Page represents a website page with block-based content.
type Page struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	TenantID        uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Title           string         `gorm:"size:255;not null" json:"title"`
	Slug            string         `gorm:"size:255;not null;uniqueIndex:idx_pages_tenant_slug" json:"slug"`
	Content         datatypes.JSON `gorm:"type:jsonb" json:"content"`           // Block-based JSON content
	Excerpt         string         `gorm:"size:500" json:"excerpt"`
	Status          string         `gorm:"size:20;default:'draft';index" json:"status"`
	Template        string         `gorm:"size:100;default:'default'" json:"template"`
	MetaTitle       string         `gorm:"size:255" json:"meta_title"`
	MetaDescription string         `gorm:"size:500" json:"meta_description"`
	OGImage         string         `gorm:"size:500" json:"og_image"`
	SortOrder       int            `gorm:"default:0" json:"sort_order"`
	ParentID        *uint          `gorm:"index" json:"parent_id"` // For nested pages
	AuthorID        uint           `gorm:"index" json:"author_id"`
	PublishedAt     *time.Time     `gorm:"index" json:"published_at"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Parent   *Page  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children []Page `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Author   *User  `gorm:"foreignKey:AuthorID" json:"author,omitempty"`

	// Composite unique: tenant_id + slug
	_ struct{} `gorm:"uniqueIndex:idx_pages_tenant_slug"`
}

// BeforeCreate auto-generates the slug before inserting.
func (p *Page) BeforeCreate(tx *gorm.DB) error {
	if p.Slug == "" {
		p.Slug = slugify(p.Title)
	}
	if p.Status == "" {
		p.Status = PageStatusDraft
	}
	return nil
}
