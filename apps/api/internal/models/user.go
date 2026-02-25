package models

import (
	"fmt"
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Role constants
const (
	RoleAdmin     = "ADMIN"
	RoleEditor    = "EDITOR"
	RoleUser      = "USER"
	RoleOwner     = "OWNER"     // Full access, billing, settings
	RoleMember    = "MEMBER"    // Access purchased content, community
	RoleAffiliate = "AFFILIATE" // Access affiliate dashboard
	// grit:roles
)

// AllRoles returns all valid role strings.
func AllRoles() []string {
	return []string{RoleOwner, RoleAdmin, RoleEditor, RoleUser, RoleMember, RoleAffiliate}
}

// IsAdminRole returns true if the role has admin-level access.
func IsAdminRole(role string) bool {
	return role == RoleOwner || role == RoleAdmin
}

// IsContentRole returns true if the role can create/edit content.
func IsContentRole(role string) bool {
	return role == RoleOwner || role == RoleAdmin || role == RoleEditor
}

// User represents a user in the system.
type User struct {
	ID              uint           `gorm:"primarykey" json:"id"`
	TenantID        uint           `gorm:"index;not null;default:1" json:"tenant_id"`
	FirstName       string         `gorm:"size:255;not null" json:"first_name" binding:"required"`
	LastName        string         `gorm:"size:255;not null" json:"last_name" binding:"required"`
	Email           string         `gorm:"size:255;uniqueIndex;not null" json:"email" binding:"required,email"`
	Password        string         `gorm:"size:255" json:"-"`
	Role            string         `gorm:"size:20;default:USER" json:"role"`
	Avatar          string         `gorm:"size:500" json:"avatar"`
	JobTitle        string         `gorm:"size:255" json:"job_title"`
	Bio             string         `gorm:"type:text" json:"bio"`
	Active          bool           `gorm:"default:true" json:"active"`
	Provider        string         `gorm:"size:50;default:'local'" json:"provider"`
	GoogleID        string         `gorm:"size:255" json:"-"`
	GithubID        string         `gorm:"size:255" json:"-"`
	EmailVerifiedAt *time.Time     `json:"email_verified_at"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate hashes the password before saving.
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		u.Password = string(hashedPassword)
	}
	return nil
}

// CheckPassword compares the given password with the stored hash.
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil
}

// Models returns the ordered list of all models for migration.
// Models with no foreign key dependencies come first.
func Models() []interface{} {
	return []interface{}{
		&Tenant{},
		&User{},
		&Upload{},
		&Blog{},
		&Setting{},
		&MediaAsset{},
		&Tag{},
		&Contact{},
		&ContactActivity{},
		&CustomFieldDefinition{},
		&Page{},
		&Post{},
		&PostCategory{},
		&PostTag{},
		&Menu{},
		&MenuItem{},
		&EmailList{},
		&EmailSubscription{},
		&EmailTemplate{},
		&EmailCampaign{},
		&EmailSend{},
		&EmailSequence{},
		&EmailSequenceStep{},
		&EmailSequenceEnrollment{},
		&Segment{},
		&Course{},
		&CourseModule{},
		&Lesson{},
		&CourseEnrollment{},
		&LessonProgress{},
		&Quiz{},
		&QuizQuestion{},
		&QuizAttempt{},
		&Certificate{},
		&Product{},
		&Price{},
		&ProductVariant{},
		&Coupon{},
		&Order{},
		&OrderItem{},
		&Subscription{},
		&Space{},
		&CommunityMember{},
		&Thread{},
		&Reply{},
		&Reaction{},
		&CommunityEvent{},
		&EventAttendee{},
		&Funnel{},
		&FunnelStep{},
		&FunnelVisit{},
		&FunnelConversion{},
		&Calendar{},
		&BookingEventType{},
		&Availability{},
		&Appointment{},
		&AffiliateProgram{},
		&AffiliateAccount{},
		&AffiliateLink{},
		&Commission{},
		&Payout{},
		&Workflow{},
		&WorkflowAction{},
		&WorkflowExecution{},
		// grit:models
	}
}

// Migrate runs database migrations only for tables that don't exist yet.
// It prints which tables were created and which were skipped.
func Migrate(db *gorm.DB) error {
	models := Models()
	migrated := 0

	for _, model := range models {
		if db.Migrator().HasTable(model) {
			log.Printf("  ✓ %T — already exists, skipping", model)
			continue
		}

		if err := db.AutoMigrate(model); err != nil {
			return fmt.Errorf("migrating %T: %w", model, err)
		}
		log.Printf("  ✓ %T — created", model)
		migrated++
	}

	if migrated == 0 {
		log.Println("All tables are up to date — nothing to migrate.")
	} else {
		log.Printf("Migrated %d table(s).", migrated)
	}

	return nil
}
