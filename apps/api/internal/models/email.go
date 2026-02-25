package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// --- Email Lists ---

// EmailList represents a mailing list that contacts can subscribe to.
type EmailList struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	TenantID       uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Name           string         `gorm:"size:255;not null" json:"name"`
	Description    string         `gorm:"size:500" json:"description"`
	DoubleOptin    bool           `gorm:"default:false" json:"double_optin"`
	WelcomeEmailID *uint          `gorm:"index" json:"welcome_email_id"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	Subscriptions  []EmailSubscription `gorm:"foreignKey:EmailListID" json:"subscriptions,omitempty"`
	WelcomeEmail   *EmailTemplate      `gorm:"foreignKey:ID;references:WelcomeEmailID" json:"welcome_email,omitempty"`
	SubscriberCount int64              `gorm:"-" json:"subscriber_count,omitempty"`
}

// --- Email Subscriptions ---

const (
	SubStatusActive       = "active"
	SubStatusUnsubscribed = "unsubscribed"
	SubStatusBounced      = "bounced"
	SubStatusComplained   = "complained"
	SubStatusPending      = "pending" // awaiting double opt-in confirmation
)

// EmailSubscription links a contact to an email list.
type EmailSubscription struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	TenantID       uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	ContactID      uint           `gorm:"uniqueIndex:idx_sub_contact_list;not null" json:"contact_id"`
	EmailListID    uint           `gorm:"uniqueIndex:idx_sub_contact_list;not null" json:"email_list_id"`
	Status         string         `gorm:"size:20;default:'active';index" json:"status"`
	Source         string         `gorm:"size:100" json:"source"` // form, api, import, manual
	IPAddress      string         `gorm:"size:45" json:"ip_address"`
	ConfirmToken   string         `gorm:"size:100;index" json:"-"` // for double opt-in
	SubscribedAt   *time.Time     `json:"subscribed_at"`
	UnsubscribedAt *time.Time     `json:"unsubscribed_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	Contact   Contact   `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	EmailList EmailList `gorm:"foreignKey:EmailListID" json:"email_list,omitempty"`
}

// --- Email Templates ---

const (
	TemplateTypeCampaign      = "campaign"
	TemplateTypeSequence      = "sequence"
	TemplateTypeTransactional = "transactional"
)

// EmailTemplate stores reusable email templates.
type EmailTemplate struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	TenantID    uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Name        string         `gorm:"size:255;not null" json:"name"`
	Subject     string         `gorm:"size:500" json:"subject"`
	HTMLContent string         `gorm:"type:text" json:"html_content"`
	TextContent string         `gorm:"type:text" json:"text_content"`
	Type        string         `gorm:"size:50;default:'campaign';index" json:"type"`
	Thumbnail   string         `gorm:"size:500" json:"thumbnail"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// --- Email Campaigns ---

const (
	CampaignStatusDraft     = "draft"
	CampaignStatusScheduled = "scheduled"
	CampaignStatusSending   = "sending"
	CampaignStatusSent      = "sent"
	CampaignStatusCancelled = "cancelled"
)

// EmailCampaign represents a one-time email blast to selected audiences.
type EmailCampaign struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	TenantID     uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Name         string         `gorm:"size:255;not null" json:"name"`
	Subject      string         `gorm:"size:500" json:"subject"`
	TemplateID   *uint          `gorm:"index" json:"template_id"`
	FromName     string         `gorm:"size:255" json:"from_name"`
	FromEmail    string         `gorm:"size:255" json:"from_email"`
	ReplyTo      string         `gorm:"size:255" json:"reply_to"`
	HTMLContent  string         `gorm:"type:text" json:"html_content"`  // inline content if no template
	TextContent  string         `gorm:"type:text" json:"text_content"`
	ListIDs      datatypes.JSON `gorm:"type:jsonb" json:"list_ids"`     // []uint
	SegmentIDs   datatypes.JSON `gorm:"type:jsonb" json:"segment_ids"`  // []uint
	TagIDs       datatypes.JSON `gorm:"type:jsonb" json:"tag_ids"`      // []uint
	Status       string         `gorm:"size:20;default:'draft';index" json:"status"`
	ScheduledAt  *time.Time     `json:"scheduled_at"`
	SentAt       *time.Time     `json:"sent_at"`
	Stats        datatypes.JSON `gorm:"type:jsonb" json:"stats"` // { sent, delivered, opened, clicked, bounced, unsubscribed }
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	Template *EmailTemplate `gorm:"foreignKey:TemplateID" json:"template,omitempty"`
	Sends    []EmailSend    `gorm:"foreignKey:CampaignID" json:"sends,omitempty"`
}

// CampaignStats holds analytics for a campaign.
type CampaignStats struct {
	Sent         int `json:"sent"`
	Delivered    int `json:"delivered"`
	Opened       int `json:"opened"`
	Clicked      int `json:"clicked"`
	Bounced      int `json:"bounced"`
	Unsubscribed int `json:"unsubscribed"`
}

// --- Email Sends (individual sends tracking) ---

const (
	SendStatusQueued    = "queued"
	SendStatusSent      = "sent"
	SendStatusDelivered = "delivered"
	SendStatusOpened    = "opened"
	SendStatusClicked   = "clicked"
	SendStatusBounced   = "bounced"
	SendStatusFailed    = "failed"
)

// EmailSend tracks an individual email delivery to a contact.
type EmailSend struct {
	ID             uint       `gorm:"primarykey" json:"id"`
	TenantID       uint       `gorm:"index;not null;default:1" json:"tenant_id"`
	ContactID      uint       `gorm:"index;not null" json:"contact_id"`
	CampaignID     *uint      `gorm:"index" json:"campaign_id"`
	SequenceStepID *uint      `gorm:"index" json:"sequence_step_id"`
	Subject        string     `gorm:"size:500" json:"subject"`
	Status         string     `gorm:"size:20;default:'queued';index" json:"status"`
	ExternalID     string     `gorm:"size:255;index" json:"external_id"` // Resend message ID
	OpenedAt       *time.Time `json:"opened_at"`
	ClickedAt      *time.Time `json:"clicked_at"`
	BouncedAt      *time.Time `json:"bounced_at"`
	SentAt         *time.Time `json:"sent_at"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`

	Contact      Contact       `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	Campaign     *EmailCampaign `gorm:"foreignKey:CampaignID" json:"campaign,omitempty"`
	SequenceStep *EmailSequenceStep `gorm:"foreignKey:SequenceStepID" json:"sequence_step,omitempty"`
}

// --- Email Sequences ---

const (
	SequenceStatusActive = "active"
	SequenceStatusPaused = "paused"
	SequenceStatusDraft  = "draft"
)

const (
	SequenceTriggerManual = "manual"
	SequenceTriggerEvent  = "event"
)

// EmailSequence represents an automated email sequence (drip campaign).
type EmailSequence struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	TenantID    uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Name        string         `gorm:"size:255;not null" json:"name"`
	Description string         `gorm:"size:500" json:"description"`
	Trigger     string         `gorm:"size:50;default:'manual'" json:"trigger"` // manual or event-based
	TriggerEvent string        `gorm:"size:100" json:"trigger_event"`           // e.g. "email.subscribed"
	Status      string         `gorm:"size:20;default:'draft';index" json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	Steps       []EmailSequenceStep       `gorm:"foreignKey:SequenceID;constraint:OnDelete:CASCADE" json:"steps,omitempty"`
	Enrollments []EmailSequenceEnrollment `gorm:"foreignKey:SequenceID" json:"enrollments,omitempty"`
}

// EmailSequenceStep is one email in a sequence, sent after a delay.
type EmailSequenceStep struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	TenantID   uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	SequenceID uint           `gorm:"index;not null" json:"sequence_id"`
	TemplateID *uint          `gorm:"index" json:"template_id"`
	Subject    string         `gorm:"size:500" json:"subject"`
	HTMLContent string        `gorm:"type:text" json:"html_content"`
	TextContent string        `gorm:"type:text" json:"text_content"`
	DelayDays  int            `gorm:"default:0" json:"delay_days"`
	DelayHours int            `gorm:"default:0" json:"delay_hours"`
	SortOrder  int            `gorm:"default:0" json:"sort_order"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

	Template *EmailTemplate `gorm:"foreignKey:TemplateID" json:"template,omitempty"`
}

// --- Email Sequence Enrollments ---

const (
	EnrollmentStatusActive    = "active"
	EnrollmentStatusCompleted = "completed"
	EnrollmentStatusCancelled = "cancelled"
)

// EmailSequenceEnrollment tracks a contact's progress through a sequence.
type EmailSequenceEnrollment struct {
	ID            uint       `gorm:"primarykey" json:"id"`
	TenantID      uint       `gorm:"index;not null;default:1" json:"tenant_id"`
	SequenceID    uint       `gorm:"uniqueIndex:idx_enrollment_seq_contact;not null" json:"sequence_id"`
	ContactID     uint       `gorm:"uniqueIndex:idx_enrollment_seq_contact;not null" json:"contact_id"`
	CurrentStepID *uint      `gorm:"index" json:"current_step_id"`
	Status        string     `gorm:"size:20;default:'active';index" json:"status"`
	EnrolledAt    time.Time  `json:"enrolled_at"`
	CompletedAt   *time.Time `json:"completed_at"`
	NextSendAt    *time.Time `gorm:"index" json:"next_send_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`

	Sequence    EmailSequence     `gorm:"foreignKey:SequenceID" json:"sequence,omitempty"`
	Contact     Contact           `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	CurrentStep *EmailSequenceStep `gorm:"foreignKey:CurrentStepID" json:"current_step,omitempty"`
}

// --- Segments ---

const (
	SegmentTypeStatic  = "static"
	SegmentTypeDynamic = "dynamic"
)

// Segment defines a group of contacts matched by rules.
type Segment struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	TenantID  uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Name      string         `gorm:"size:255;not null" json:"name"`
	Rules     datatypes.JSON `gorm:"type:jsonb" json:"rules"` // JSON rule definition
	Type      string         `gorm:"size:20;default:'dynamic'" json:"type"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	MatchCount int64 `gorm:"-" json:"match_count,omitempty"`
}

// SegmentRule represents a single condition in a segment rule set.
type SegmentRule struct {
	Field    string `json:"field"`    // e.g. "email", "tag", "activity"
	Operator string `json:"operator"` // e.g. "contains", "equals", "has_tag", "has_no_tag"
	Value    string `json:"value"`
}

// SegmentRuleGroup is a group of rules joined by AND, groups joined by OR.
type SegmentRuleGroup struct {
	Operator string        `json:"operator"` // "and" | "or"
	Rules    []SegmentRule `json:"rules"`
}
