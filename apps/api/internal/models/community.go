package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// --- Spaces ---

const (
	SpaceTypePublic  = "public"
	SpaceTypePrivate = "private"
	SpaceTypePaid    = "paid"
)

type Space struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	TenantID    uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Name        string         `gorm:"size:255;not null" json:"name"`
	Slug        string         `gorm:"size:255;uniqueIndex:idx_space_slug_tenant;not null" json:"slug"`
	Description string         `gorm:"type:text" json:"description"`
	Type        string         `gorm:"size:20;default:'public'" json:"type"`
	ProductID   *uint          `gorm:"index" json:"product_id"` // for paid spaces
	SortOrder   int            `gorm:"default:0" json:"sort_order"`
	Icon        string         `gorm:"size:50" json:"icon"`
	Color       string         `gorm:"size:20;default:'#6366f1'" json:"color"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	Members     []CommunityMember `gorm:"foreignKey:SpaceID" json:"members,omitempty"`
	MemberCount int64             `gorm:"-" json:"member_count,omitempty"`
	ThreadCount int64             `gorm:"-" json:"thread_count,omitempty"`
}

// --- Community Members ---

const (
	MemberRoleAdmin     = "admin"
	MemberRoleModerator = "moderator"
	MemberRoleMember    = "member"
)

type CommunityMember struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TenantID   uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	ContactID  uint           `gorm:"uniqueIndex:idx_member_space_contact;not null" json:"contact_id"`
	SpaceID    uint           `gorm:"uniqueIndex:idx_member_space_contact;index;not null" json:"space_id"`
	Role       string         `gorm:"size:20;default:'member'" json:"role"`
	JoinedAt   time.Time      `json:"joined_at"`
	MutedUntil *time.Time     `json:"muted_until"`
	CreatedAt  time.Time      `json:"created_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

	Contact *Contact `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
}

// --- Threads ---

const (
	ThreadTypeDiscussion   = "discussion"
	ThreadTypeQuestion     = "question"
	ThreadTypeAnnouncement = "announcement"
)

const (
	ThreadStatusOpen   = "open"
	ThreadStatusClosed = "closed"
	ThreadStatusPinned = "pinned"
)

type Thread struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	TenantID       uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	SpaceID        uint           `gorm:"index;not null" json:"space_id"`
	AuthorID       uint           `gorm:"index;not null" json:"author_id"` // contact_id
	Title          string         `gorm:"size:500;not null" json:"title"`
	Content        datatypes.JSON `gorm:"type:jsonb" json:"content"`
	Type           string         `gorm:"size:20;default:'discussion'" json:"type"`
	Status         string         `gorm:"size:20;default:'open';index" json:"status"`
	LikeCount      int            `gorm:"default:0" json:"like_count"`
	ReplyCount     int            `gorm:"default:0" json:"reply_count"`
	LastActivityAt time.Time      `gorm:"index" json:"last_activity_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	Author  *Contact `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	Replies []Reply  `gorm:"foreignKey:ThreadID" json:"replies,omitempty"`
}

// --- Replies ---

type Reply struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	TenantID  uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	ThreadID  uint           `gorm:"index;not null" json:"thread_id"`
	AuthorID  uint           `gorm:"index;not null" json:"author_id"` // contact_id
	Content   datatypes.JSON `gorm:"type:jsonb" json:"content"`
	ParentID  *uint          `gorm:"index" json:"parent_id"` // for nested replies
	LikeCount int            `gorm:"default:0" json:"like_count"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Author   *Contact `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
	Children []Reply  `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

// --- Reactions ---

type Reaction struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	TenantID      uint      `gorm:"index;not null;default:1" json:"tenant_id"`
	ReactableType string    `gorm:"size:20;not null;index:idx_reaction_unique" json:"reactable_type"` // thread, reply
	ReactableID   uint      `gorm:"not null;index:idx_reaction_unique" json:"reactable_id"`
	ContactID     uint      `gorm:"not null;index:idx_reaction_unique" json:"contact_id"`
	Type          string    `gorm:"size:20;default:'like';index:idx_reaction_unique" json:"type"` // like, heart, celebrate
	CreatedAt     time.Time `json:"created_at"`
}

// --- Community Events ---

const (
	EventTypeVirtual  = "virtual"
	EventTypeInPerson = "in_person"
)

const (
	EventStatusUpcoming  = "upcoming"
	EventStatusLive      = "live"
	EventStatusCompleted = "completed"
	EventStatusCancelled = "cancelled"
)

type CommunityEvent struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	TenantID     uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	SpaceID      uint           `gorm:"index;not null" json:"space_id"`
	Title        string         `gorm:"size:500;not null" json:"title"`
	Description  string         `gorm:"type:text" json:"description"`
	Type         string         `gorm:"size:20;default:'virtual'" json:"type"`
	Location     string         `gorm:"size:500" json:"location"`
	URL          string         `gorm:"size:500" json:"url"` // for virtual events
	StartAt      time.Time      `json:"start_at"`
	EndAt        time.Time      `json:"end_at"`
	MaxAttendees int            `gorm:"default:0" json:"max_attendees"` // 0 = unlimited
	Status       string         `gorm:"size:20;default:'upcoming';index" json:"status"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	Attendees     []EventAttendee `gorm:"foreignKey:EventID" json:"attendees,omitempty"`
	AttendeeCount int64           `gorm:"-" json:"attendee_count,omitempty"`
}

// --- Event Attendees ---

type EventAttendee struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	TenantID  uint      `gorm:"index;not null;default:1" json:"tenant_id"`
	EventID   uint      `gorm:"uniqueIndex:idx_attendee_event_contact;index;not null" json:"event_id"`
	ContactID uint      `gorm:"uniqueIndex:idx_attendee_event_contact;not null" json:"contact_id"`
	Status    string    `gorm:"size:20;default:'registered'" json:"status"` // registered, attended, cancelled
	CreatedAt time.Time `json:"created_at"`

	Contact *Contact `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
}
