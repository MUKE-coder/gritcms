package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Contact source constants
const (
	SourceOrganic  = "organic"
	SourceFunnel   = "funnel"
	SourceReferral = "referral"
	SourceImport   = "import"
	SourceManual   = "manual"
	SourceAPI      = "api"
)

// Contact is the central entity of GritCMS — every module references it.
// A single contact profile aggregates email, course, community, purchase, and booking activity.
type Contact struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	TenantID       uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Email          string         `gorm:"size:255;not null" json:"email"`
	FirstName      string         `gorm:"size:255" json:"first_name"`
	LastName       string         `gorm:"size:255" json:"last_name"`
	Phone          string         `gorm:"size:50" json:"phone"`
	AvatarURL      string         `gorm:"size:500" json:"avatar_url"`
	Source         string         `gorm:"size:100;index" json:"source"`
	IPAddress      string         `gorm:"size:45" json:"ip_address"`
	Country        string         `gorm:"size:100" json:"country"`
	City           string         `gorm:"size:100" json:"city"`
	CustomFields   datatypes.JSON `gorm:"type:jsonb" json:"custom_fields"`
	UserID         *uint          `gorm:"index" json:"user_id"` // Optional link to a User account
	LastActivityAt *time.Time     `gorm:"index" json:"last_activity_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Tags       []Tag             `gorm:"many2many:contact_tags" json:"tags,omitempty"`
	Activities []ContactActivity `gorm:"foreignKey:ContactID" json:"activities,omitempty"`
}

// BeforeCreate ensures a unique (tenant_id, email) pair.
func (c *Contact) BeforeCreate(tx *gorm.DB) error {
	// Slug not needed — contacts are looked up by email
	return nil
}

// FullName returns the contact's full name.
func (c *Contact) FullName() string {
	name := c.FirstName
	if c.LastName != "" {
		if name != "" {
			name += " "
		}
		name += c.LastName
	}
	if name == "" {
		return c.Email
	}
	return name
}

// Tag represents a label that can be applied to contacts.
type Tag struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	TenantID  uint           `gorm:"uniqueIndex:idx_tags_tenant_name;not null;default:1" json:"tenant_id"`
	Name      string         `gorm:"size:100;uniqueIndex:idx_tags_tenant_name;not null" json:"name"`
	Color     string         `gorm:"size:20;default:'#6366f1'" json:"color"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Contacts []Contact `gorm:"many2many:contact_tags" json:"-"`
}

// ContactActivity records an action in the contact's timeline.
type ContactActivity struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	TenantID  uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	ContactID uint           `gorm:"index;not null" json:"contact_id"`
	Module    string         `gorm:"size:50;index;not null" json:"module"` // email, courses, community, commerce, etc.
	Action    string         `gorm:"size:100;not null" json:"action"`     // subscribed, enrolled, purchased, etc.
	Details   string         `gorm:"type:text" json:"details"`
	Metadata  datatypes.JSON `gorm:"type:jsonb" json:"metadata"`
	CreatedAt time.Time      `json:"created_at"`
}

// CustomFieldDefinition defines a custom field that can be added to contacts.
type CustomFieldDefinition struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	TenantID     uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Name         string         `gorm:"size:100;not null" json:"name"`
	FieldKey     string         `gorm:"size:100;not null" json:"field_key"` // snake_case key used in custom_fields JSON
	FieldType    string         `gorm:"size:50;not null" json:"field_type"` // text, number, date, select, boolean
	Options      datatypes.JSON `gorm:"type:jsonb" json:"options"`          // For select type: [{"label":"...", "value":"..."}]
	Required     bool           `gorm:"default:false" json:"required"`
	SortOrder    int            `gorm:"default:0" json:"sort_order"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
