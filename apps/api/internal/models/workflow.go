package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// --- Workflow Automation ---

const (
	WorkflowStatusDraft  = "draft"
	WorkflowStatusActive = "active"
	WorkflowStatusPaused = "paused"

	ExecutionRunning   = "running"
	ExecutionCompleted = "completed"
	ExecutionFailed    = "failed"
)

type Workflow struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	TenantID       uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Name           string         `gorm:"size:255;not null" json:"name"`
	Description    string         `gorm:"type:text" json:"description"`
	TriggerType    string         `gorm:"size:50;not null" json:"trigger_type"` // event, schedule, manual
	TriggerConfig  datatypes.JSON `gorm:"type:jsonb" json:"trigger_config"`    // e.g. {"event": "purchase.completed"}
	Status         string         `gorm:"size:20;default:'draft'" json:"status"`
	ExecutionCount int64          `gorm:"default:0" json:"execution_count"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	Actions []WorkflowAction `gorm:"foreignKey:WorkflowID" json:"actions,omitempty"`
}

type WorkflowAction struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	TenantID     uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	WorkflowID   uint           `gorm:"index;not null" json:"workflow_id"`
	Type         string         `gorm:"size:50;not null" json:"type"` // send_email, add_tag, remove_tag, enroll_course, wait, webhook, update_contact, create_note, condition
	Config       datatypes.JSON `gorm:"type:jsonb" json:"config"`
	SortOrder    int            `gorm:"default:0" json:"sort_order"`
	DelaySeconds int            `gorm:"default:0" json:"delay_seconds"`
	Condition    datatypes.JSON `gorm:"type:jsonb" json:"condition"` // for if/else branching
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
}

type WorkflowExecution struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	TenantID     uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	WorkflowID   uint           `gorm:"index;not null" json:"workflow_id"`
	ContactID    uint           `gorm:"index" json:"contact_id"`
	TriggerEvent string         `gorm:"size:100" json:"trigger_event"`
	Status       string         `gorm:"size:20;default:'running'" json:"status"`
	CurrentStep  int            `gorm:"default:0" json:"current_step"`
	Log          datatypes.JSON `gorm:"type:jsonb" json:"log"`
	StartedAt    time.Time      `json:"started_at"`
	CompletedAt  *time.Time     `json:"completed_at"`
	CreatedAt    time.Time      `json:"created_at"`

	Workflow *Workflow `gorm:"foreignKey:WorkflowID" json:"workflow,omitempty"`
	Contact  *Contact  `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
}
