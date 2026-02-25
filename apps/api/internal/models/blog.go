package models

import (
	"time"

	"gorm.io/gorm"
)

// Blog represents a blog post in the system.
type Blog struct {
	gorm.Model
	TenantID    uint       `gorm:"index;not null;default:1" json:"tenant_id"`
	Title       string     `gorm:"size:255;not null" json:"title" binding:"required"`
	Slug        string     `gorm:"size:255;uniqueIndex" json:"slug"`
	Content     string     `gorm:"type:text" json:"content"`
	Image       string     `gorm:"size:500" json:"image"`
	Excerpt     string     `gorm:"size:500" json:"excerpt"`
	Published   bool       `gorm:"default:false" json:"published"`
	PublishedAt *time.Time `json:"published_at"`
}

// BeforeCreate auto-generates the slug before inserting.
func (b *Blog) BeforeCreate(tx *gorm.DB) error {
	if b.Slug == "" {
		b.Slug = slugify(b.Title)
	}
	return nil
}
