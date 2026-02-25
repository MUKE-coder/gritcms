package models

import (
	"time"

	"gorm.io/gorm"
)

// Upload represents a file uploaded to storage.
type Upload struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	TenantID     uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Filename     string         `gorm:"size:255;not null" json:"filename"`
	OriginalName string         `gorm:"size:255;not null" json:"original_name"`
	MimeType     string         `gorm:"size:100;not null" json:"mime_type"`
	Size         int64          `gorm:"not null" json:"size"`
	Path         string         `gorm:"size:500;not null" json:"path"`
	URL          string         `gorm:"size:500" json:"url"`
	ThumbnailURL string         `gorm:"size:500" json:"thumbnail_url"`
	UserID       uint           `gorm:"index;not null" json:"user_id"`
	User         User           `gorm:"foreignKey:UserID" json:"-"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
