package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// --- Courses ---

const (
	CourseStatusDraft     = "draft"
	CourseStatusPublished = "published"
	CourseStatusArchived  = "archived"
)

const (
	CourseAccessFree       = "free"
	CourseAccessPaid       = "paid"
	CourseAccessMembership = "membership"
)

// Course represents an online course.
type Course struct {
	ID               uint           `gorm:"primarykey" json:"id"`
	TenantID         uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	Title            string         `gorm:"size:500;not null" json:"title"`
	Slug             string         `gorm:"size:500;uniqueIndex:idx_course_slug_tenant;not null" json:"slug"`
	Description      string         `gorm:"type:text" json:"description"`
	ShortDescription string         `gorm:"size:500" json:"short_description"`
	Thumbnail        string         `gorm:"size:500" json:"thumbnail"`
	Price            float64        `gorm:"type:decimal(10,2);default:0" json:"price"`
	Currency         string         `gorm:"size:3;default:'USD'" json:"currency"`
	Status           string         `gorm:"size:20;default:'draft';index" json:"status"`
	AccessType       string         `gorm:"size:20;default:'free'" json:"access_type"`
	ProductID        *uint          `gorm:"index" json:"product_id"`
	InstructorID     *uint          `gorm:"index" json:"instructor_id"`
	PublishedAt      *time.Time     `json:"published_at"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	Modules     []CourseModule     `gorm:"foreignKey:CourseID;constraint:OnDelete:CASCADE" json:"modules,omitempty"`
	Enrollments []CourseEnrollment `gorm:"foreignKey:CourseID" json:"enrollments,omitempty"`
	Instructor  *User              `gorm:"foreignKey:InstructorID" json:"instructor,omitempty"`

	EnrollmentCount int64 `gorm:"-" json:"enrollment_count,omitempty"`
}

// --- Course Modules ---

// CourseModule groups lessons within a course.
type CourseModule struct {
	ID          uint           `gorm:"primarykey" json:"id"`
	TenantID    uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	CourseID    uint           `gorm:"index;not null" json:"course_id"`
	Title       string         `gorm:"size:500;not null" json:"title"`
	Description string         `gorm:"size:500" json:"description"`
	SortOrder   int            `gorm:"default:0" json:"sort_order"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	Lessons []Lesson `gorm:"foreignKey:ModuleID;constraint:OnDelete:CASCADE" json:"lessons,omitempty"`
}

// --- Lessons ---

const (
	LessonTypeVideo = "video"
	LessonTypeText  = "text"
	LessonTypeAudio = "audio"
	LessonTypePDF   = "pdf"
	LessonTypeEmbed = "embed"
)

// Lesson is an individual piece of learning content in a course module.
type Lesson struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	TenantID        uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	ModuleID        uint           `gorm:"index;not null" json:"module_id"`
	Title           string         `gorm:"size:500;not null" json:"title"`
	Slug            string         `gorm:"size:500" json:"slug"`
	Content         datatypes.JSON `gorm:"type:jsonb" json:"content"`
	Type            string         `gorm:"size:20;default:'text'" json:"type"`
	VideoURL        string         `gorm:"size:500" json:"video_url"`
	DurationMinutes int            `gorm:"default:0" json:"duration_minutes"`
	SortOrder       int            `gorm:"default:0" json:"sort_order"`
	IsFreePreview   bool           `gorm:"default:false" json:"is_free_preview"`
	DripDelayDays   int            `gorm:"default:0" json:"drip_delay_days"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	Quizzes []Quiz `gorm:"foreignKey:LessonID;constraint:OnDelete:CASCADE" json:"quizzes,omitempty"`
}

// --- Course Enrollments ---

const (
	EnrollStatusActive    = "active"
	EnrollStatusCompleted = "completed"
	EnrollStatusExpired   = "expired"
	EnrollStatusSuspended = "suspended"
)

// CourseEnrollment tracks a contact's enrollment in a course.
type CourseEnrollment struct {
	ID                 uint       `gorm:"primarykey" json:"id"`
	TenantID           uint       `gorm:"index;not null;default:1" json:"tenant_id"`
	ContactID          uint       `gorm:"uniqueIndex:idx_enrollment_contact_course;not null" json:"contact_id"`
	CourseID           uint       `gorm:"uniqueIndex:idx_enrollment_contact_course;not null" json:"course_id"`
	Status             string     `gorm:"size:20;default:'active';index" json:"status"`
	EnrolledAt         time.Time  `json:"enrolled_at"`
	CompletedAt        *time.Time `json:"completed_at"`
	ProgressPercentage float64    `gorm:"type:decimal(5,2);default:0" json:"progress_percentage"`
	Source             string     `gorm:"size:50" json:"source"` // purchase, manual, coupon, free
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`

	Contact          Contact          `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	Course           Course           `gorm:"foreignKey:CourseID" json:"course,omitempty"`
	LessonProgresses []LessonProgress `gorm:"foreignKey:EnrollmentID" json:"lesson_progresses,omitempty"`
}

// --- Lesson Progress ---

const (
	ProgressNotStarted = "not_started"
	ProgressInProgress = "in_progress"
	ProgressCompleted  = "completed"
)

// LessonProgress tracks a student's progress on a specific lesson.
type LessonProgress struct {
	ID               uint       `gorm:"primarykey" json:"id"`
	TenantID         uint       `gorm:"index;not null;default:1" json:"tenant_id"`
	EnrollmentID     uint       `gorm:"uniqueIndex:idx_progress_enrollment_lesson;not null" json:"enrollment_id"`
	LessonID         uint       `gorm:"uniqueIndex:idx_progress_enrollment_lesson;not null" json:"lesson_id"`
	Status           string     `gorm:"size:20;default:'not_started'" json:"status"`
	StartedAt        *time.Time `json:"started_at"`
	CompletedAt      *time.Time `json:"completed_at"`
	TimeSpentSeconds int        `gorm:"default:0" json:"time_spent_seconds"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`

	Lesson Lesson `gorm:"foreignKey:LessonID" json:"lesson,omitempty"`
}

// --- Quizzes ---

// Quiz is an assessment attached to a lesson.
type Quiz struct {
	ID                 uint           `gorm:"primarykey" json:"id"`
	TenantID           uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	LessonID           uint           `gorm:"index;not null" json:"lesson_id"`
	Title              string         `gorm:"size:500;not null" json:"title"`
	Description        string         `gorm:"size:500" json:"description"`
	PassingScore       int            `gorm:"default:70" json:"passing_score"` // percentage
	MaxAttempts        int            `gorm:"default:0" json:"max_attempts"`   // 0 = unlimited
	ShowCorrectAnswers bool           `gorm:"default:true" json:"show_correct_answers"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`

	Questions []QuizQuestion `gorm:"foreignKey:QuizID;constraint:OnDelete:CASCADE" json:"questions,omitempty"`
}

// --- Quiz Questions ---

const (
	QuestionTypeMultipleChoice = "multiple_choice"
	QuestionTypeTrueFalse      = "true_false"
	QuestionTypeShortAnswer    = "short_answer"
)

// QuizQuestion is a single question in a quiz.
type QuizQuestion struct {
	ID            uint           `gorm:"primarykey" json:"id"`
	TenantID      uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	QuizID        uint           `gorm:"index;not null" json:"quiz_id"`
	Question      string         `gorm:"type:text;not null" json:"question"`
	Type          string         `gorm:"size:30;default:'multiple_choice'" json:"type"`
	Options       datatypes.JSON `gorm:"type:jsonb" json:"options"`        // [{label, value}]
	CorrectAnswer string         `gorm:"size:500" json:"correct_answer"`   // hidden from students
	Explanation   string         `gorm:"type:text" json:"explanation"`
	SortOrder     int            `gorm:"default:0" json:"sort_order"`
	Points        int            `gorm:"default:1" json:"points"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// --- Quiz Attempts ---

// QuizAttempt records a student's attempt at a quiz.
type QuizAttempt struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	TenantID     uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	QuizID       uint           `gorm:"index;not null" json:"quiz_id"`
	EnrollmentID uint           `gorm:"index;not null" json:"enrollment_id"`
	Answers      datatypes.JSON `gorm:"type:jsonb" json:"answers"` // [{question_id, answer}]
	Score        float64        `gorm:"type:decimal(5,2);default:0" json:"score"`
	Passed       bool           `gorm:"default:false" json:"passed"`
	StartedAt    time.Time      `json:"started_at"`
	CompletedAt  *time.Time     `json:"completed_at"`
	CreatedAt    time.Time      `json:"created_at"`

	Quiz       Quiz             `gorm:"foreignKey:QuizID" json:"quiz,omitempty"`
	Enrollment CourseEnrollment `gorm:"foreignKey:EnrollmentID" json:"enrollment,omitempty"`
}

// --- Certificates ---

// Certificate is issued when a student completes a course.
type Certificate struct {
	ID                uint      `gorm:"primarykey" json:"id"`
	TenantID          uint      `gorm:"index;not null;default:1" json:"tenant_id"`
	CourseID          uint      `gorm:"index;not null" json:"course_id"`
	EnrollmentID      uint      `gorm:"index;not null" json:"enrollment_id"`
	ContactID         uint      `gorm:"index;not null" json:"contact_id"`
	CertificateNumber string    `gorm:"size:100;uniqueIndex;not null" json:"certificate_number"`
	IssuedAt          time.Time `json:"issued_at"`
	Template          string    `gorm:"size:100;default:'default'" json:"template"`
	CreatedAt         time.Time `json:"created_at"`

	Course     Course           `gorm:"foreignKey:CourseID" json:"course,omitempty"`
	Enrollment CourseEnrollment `gorm:"foreignKey:EnrollmentID" json:"enrollment,omitempty"`
	Contact    Contact          `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
}
