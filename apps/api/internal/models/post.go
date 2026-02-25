package models

import (
	"math"
	"strings"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Post status constants
const (
	PostStatusDraft     = "draft"
	PostStatusPublished = "published"
	PostStatusArchived  = "archived"
)

// Post represents a blog post with block-based content.
type Post struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	TenantID        uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Title           string         `gorm:"size:255;not null" json:"title"`
	Slug            string         `gorm:"size:255;not null;uniqueIndex:idx_posts_tenant_slug" json:"slug"`
	Content         datatypes.JSON `gorm:"type:jsonb" json:"content"` // Block-based JSON content
	Excerpt         string         `gorm:"size:500" json:"excerpt"`
	FeaturedImage   string         `gorm:"size:500" json:"featured_image"`
	Status          string         `gorm:"size:20;default:'draft';index" json:"status"`
	MetaTitle       string         `gorm:"size:255" json:"meta_title"`
	MetaDescription string         `gorm:"size:500" json:"meta_description"`
	OGImage         string         `gorm:"size:500" json:"og_image"`
	AuthorID        uint           `gorm:"index" json:"author_id"`
	ReadingTime     int            `gorm:"default:0" json:"reading_time"` // Minutes
	PublishedAt     *time.Time     `gorm:"index" json:"published_at"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Author     *User          `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	Categories []PostCategory `gorm:"many2many:post_categories" json:"categories,omitempty"`
	Tags       []PostTag      `gorm:"many2many:post_tags_join" json:"tags,omitempty"`

	// Composite unique: tenant_id + slug
	_ struct{} `gorm:"uniqueIndex:idx_posts_tenant_slug"`
}

// BeforeCreate auto-generates the slug and calculates reading time.
func (p *Post) BeforeCreate(tx *gorm.DB) error {
	if p.Slug == "" {
		p.Slug = slugify(p.Title)
	}
	if p.Status == "" {
		p.Status = PostStatusDraft
	}
	p.ReadingTime = estimateReadingTime(string(p.Content))
	return nil
}

// BeforeUpdate recalculates reading time on content change.
func (p *Post) BeforeUpdate(tx *gorm.DB) error {
	if tx.Statement.Changed("Content") {
		p.ReadingTime = estimateReadingTime(string(p.Content))
	}
	return nil
}

// PostCategory represents a blog category.
type PostCategory struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	TenantID    uint           `gorm:"uniqueIndex:idx_categories_tenant_slug;not null;default:1" json:"tenant_id"`
	Name        string         `gorm:"size:255;not null" json:"name"`
	Slug        string         `gorm:"size:255;not null;uniqueIndex:idx_categories_tenant_slug" json:"slug"`
	Description string         `gorm:"size:500" json:"description"`
	ParentID    *uint          `gorm:"index" json:"parent_id"` // For nested categories
	SortOrder   int            `gorm:"default:0" json:"sort_order"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	Parent   *PostCategory  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children []PostCategory `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Posts    []Post         `gorm:"many2many:post_categories" json:"-"`
}

// BeforeCreate auto-generates the slug.
func (pc *PostCategory) BeforeCreate(tx *gorm.DB) error {
	if pc.Slug == "" {
		pc.Slug = slugify(pc.Name)
	}
	return nil
}

// PostTag represents a blog tag (separate from Contact tags).
type PostTag struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	TenantID  uint           `gorm:"uniqueIndex:idx_posttags_tenant_slug;not null;default:1" json:"tenant_id"`
	Name      string         `gorm:"size:100;not null" json:"name"`
	Slug      string         `gorm:"size:100;not null;uniqueIndex:idx_posttags_tenant_slug" json:"slug"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Posts []Post `gorm:"many2many:post_tags_join" json:"-"`
}

// BeforeCreate auto-generates the slug.
func (pt *PostTag) BeforeCreate(tx *gorm.DB) error {
	if pt.Slug == "" {
		pt.Slug = slugify(pt.Name)
	}
	return nil
}

// estimateReadingTime returns the estimated minutes to read the content.
// Average reading speed: ~200 words per minute.
func estimateReadingTime(content string) int {
	words := len(strings.Fields(content))
	minutes := int(math.Ceil(float64(words) / 200.0))
	if minutes < 1 {
		minutes = 1
	}
	return minutes
}
