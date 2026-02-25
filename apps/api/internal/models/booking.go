package models

import (
	"time"

	"gorm.io/gorm"
)

// --- Booking Calendar ---

const (
	CalendarStatusActive   = "active"
	CalendarStatusInactive = "inactive"

	AppointmentConfirmed   = "confirmed"
	AppointmentCancelled   = "cancelled"
	AppointmentRescheduled = "rescheduled"
	AppointmentCompleted   = "completed"
)

type Calendar struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	TenantID    uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Name        string         `gorm:"size:255;not null" json:"name"`
	Slug        string         `gorm:"size:255;uniqueIndex:idx_calendar_slug_tenant;not null" json:"slug"`
	Description string         `gorm:"type:text" json:"description"`
	Timezone    string         `gorm:"size:50;default:'UTC'" json:"timezone"`
	Status      string         `gorm:"size:20;default:'active'" json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	EventTypes     []BookingEventType `gorm:"foreignKey:CalendarID" json:"event_types,omitempty"`
	Availabilities []Availability     `gorm:"foreignKey:CalendarID" json:"availabilities,omitempty"`
}

type BookingEventType struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	TenantID        uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	CalendarID      uint           `gorm:"index;not null" json:"calendar_id"`
	Name            string         `gorm:"size:255;not null" json:"name"`
	Slug            string         `gorm:"size:255;uniqueIndex:idx_event_type_slug_tenant;not null" json:"slug"`
	Description     string         `gorm:"type:text" json:"description"`
	DurationMinutes int            `gorm:"default:30" json:"duration_minutes"`
	BufferBefore    int            `gorm:"default:0" json:"buffer_before"` // minutes
	BufferAfter     int            `gorm:"default:0" json:"buffer_after"`  // minutes
	MaxPerDay       int            `gorm:"default:10" json:"max_per_day"`
	Price           int64          `gorm:"default:0" json:"price"` // in cents, 0 = free
	ProductID       *uint          `gorm:"index" json:"product_id"`
	Color           string         `gorm:"size:20;default:'#6366f1'" json:"color"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	Calendar     *Calendar     `gorm:"foreignKey:CalendarID" json:"calendar,omitempty"`
	Appointments []Appointment `gorm:"foreignKey:EventTypeID" json:"appointments,omitempty"`
}

type Availability struct {
	ID         uint   `gorm:"primarykey" json:"id"`
	TenantID   uint   `gorm:"index;not null;default:1" json:"tenant_id"`
	CalendarID uint   `gorm:"index;not null" json:"calendar_id"`
	DayOfWeek  int    `gorm:"not null" json:"day_of_week"` // 0=Sunday, 6=Saturday
	StartTime  string `gorm:"size:5;not null" json:"start_time"` // "09:00"
	EndTime    string `gorm:"size:5;not null" json:"end_time"`   // "17:00"
}

type Appointment struct {
	ID          uint      `gorm:"primarykey" json:"id"`
	TenantID    uint      `gorm:"index;not null;default:1" json:"tenant_id"`
	EventTypeID uint      `gorm:"index;not null" json:"event_type_id"`
	ContactID   uint      `gorm:"index;not null" json:"contact_id"`
	StartAt     time.Time `gorm:"not null;index" json:"start_at"`
	EndAt       time.Time `gorm:"not null" json:"end_at"`
	Status      string    `gorm:"size:20;default:'confirmed'" json:"status"`
	Notes       string    `gorm:"type:text" json:"notes"`
	MeetingURL  string    `gorm:"size:500" json:"meeting_url"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	EventType *BookingEventType `gorm:"foreignKey:EventTypeID" json:"event_type,omitempty"`
	Contact   *Contact          `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
}
