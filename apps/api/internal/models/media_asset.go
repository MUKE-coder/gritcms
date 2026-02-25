package models

import (
	"time"

	"gorm.io/gorm"
)

// MediaAsset represents a file in the shared media library.
type MediaAsset struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	TenantID     uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Filename     string         `gorm:"size:255;not null" json:"filename"`
	OriginalName string         `gorm:"size:255;not null" json:"original_name"`
	MimeType     string         `gorm:"size:100;not null;index" json:"mime_type"`
	Size         int64          `gorm:"not null" json:"size"`
	Path         string         `gorm:"size:500;not null" json:"path"`
	URL          string         `gorm:"size:500" json:"url"`
	ThumbnailURL string         `gorm:"size:500" json:"thumbnail_url"`
	AltText      string         `gorm:"size:500" json:"alt_text"`
	Folder       string         `gorm:"size:255;index;default:'/'" json:"folder"`
	Width        int            `json:"width"`
	Height       int            `json:"height"`
	UserID       uint           `gorm:"index" json:"user_id"`
	User         User           `gorm:"foreignKey:UserID" json:"-"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
