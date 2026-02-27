package integrations

import (
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"

	"gritcms/apps/api/internal/config"
	"gritcms/apps/api/internal/models"
)

// MeetingService is the facade for all meeting/calendar integrations.
type MeetingService struct {
	DB     *gorm.DB
	Google *GoogleCalendarService
	Zoom   *ZoomService
}

// NewMeetingService creates a new MeetingService with configured sub-services.
func NewMeetingService(db *gorm.DB, cfg *config.Config) *MeetingService {
	return &MeetingService{
		DB: db,
		Google: &GoogleCalendarService{
			DB:           db,
			ClientID:     cfg.GoogleClientID,
			ClientSecret: cfg.GoogleClientSecret,
			RedirectURL:  cfg.AppURL + "/api/integrations/google/callback",
		},
		Zoom: &ZoomService{
			DB:           db,
			AccountID:    cfg.ZoomAccountID,
			ClientID:     cfg.ZoomClientID,
			ClientSecret: cfg.ZoomClientSecret,
		},
	}
}

// CreateMeetingForAppointment creates a meeting and syncs to Google Calendar.
// Returns the meeting URL (may be empty if no provider configured).
func (s *MeetingService) CreateMeetingForAppointment(
	appt *models.Appointment,
	et models.BookingEventType,
	contact models.Contact,
) (meetingURL string, err error) {
	provider := s.getSetting("meeting_provider") // "none", "google_meet", "zoom"
	contactName := fmt.Sprintf("%s %s", contact.FirstName, contact.LastName)

	// 1. Google Calendar sync (independent of meeting provider)
	if s.Google.IsConnected() {
		withMeet := provider == "google_meet"
		googleEventID, meetLink, gcErr := s.Google.CreateEvent(
			contactName, contact.Email, et.Name,
			appt.StartAt, appt.EndAt,
			withMeet,
		)
		if gcErr != nil {
			log.Printf("[meeting] Google Calendar error: %v", gcErr)
		} else {
			appt.GoogleEventID = googleEventID
			if meetLink != "" {
				meetingURL = meetLink
			}
		}
	}

	// 2. Zoom meeting (only if Zoom is the provider)
	if provider == "zoom" && s.Zoom.IsConfigured() {
		topic := fmt.Sprintf("%s with %s", et.Name, contactName)
		duration := et.DurationMinutes
		joinURL, zoomID, zErr := s.Zoom.CreateMeeting(topic, appt.StartAt, duration)
		if zErr != nil {
			log.Printf("[meeting] Zoom error: %v", zErr)
		} else {
			appt.ZoomMeetingID = zoomID
			meetingURL = joinURL
		}
	}

	return meetingURL, nil
}

// UpdateMeetingForAppointment updates external meetings when an appointment is rescheduled.
func (s *MeetingService) UpdateMeetingForAppointment(appt *models.Appointment) error {
	duration := 30 // default
	if appt.EventType != nil {
		duration = appt.EventType.DurationMinutes
	} else {
		// Calculate from start/end
		duration = int(appt.EndAt.Sub(appt.StartAt).Minutes())
	}

	// Update Google Calendar event
	if appt.GoogleEventID != "" && s.Google.IsConnected() {
		if err := s.Google.UpdateEvent(appt.GoogleEventID, appt.StartAt, appt.EndAt); err != nil {
			log.Printf("[meeting] Failed to update Google Calendar event: %v", err)
		}
	}

	// Update Zoom meeting
	if appt.ZoomMeetingID != "" && s.Zoom.IsConfigured() {
		if err := s.Zoom.UpdateMeeting(appt.ZoomMeetingID, appt.StartAt, duration); err != nil {
			log.Printf("[meeting] Failed to update Zoom meeting: %v", err)
		}
	}

	return nil
}

// CancelMeetingForAppointment deletes external meetings when an appointment is cancelled.
func (s *MeetingService) CancelMeetingForAppointment(appt *models.Appointment) error {
	// Delete Google Calendar event
	if appt.GoogleEventID != "" && s.Google.IsConnected() {
		if err := s.Google.DeleteEvent(appt.GoogleEventID); err != nil {
			log.Printf("[meeting] Failed to delete Google Calendar event: %v", err)
		}
	}

	// Delete Zoom meeting
	if appt.ZoomMeetingID != "" && s.Zoom.IsConfigured() {
		if err := s.Zoom.DeleteMeeting(appt.ZoomMeetingID); err != nil {
			log.Printf("[meeting] Failed to delete Zoom meeting: %v", err)
		}
	}

	return nil
}

func (s *MeetingService) getSetting(key string) string {
	var setting models.Setting
	if err := s.DB.Where("tenant_id = ? AND key = ?", 1, key).First(&setting).Error; err != nil {
		return ""
	}
	return setting.Value
}

// GetMeetingProvider returns the configured meeting provider.
func (s *MeetingService) GetMeetingProvider() string {
	provider := s.getSetting("meeting_provider")
	if provider == "" {
		return "none"
	}
	return provider
}

// SetSetting stores a setting value.
func (s *MeetingService) SetSetting(key, value string) {
	s.DB.Where("tenant_id = ? AND key = ?", 1, key).
		Assign(models.Setting{
			Group:    "integrations",
			Value:    value,
			Type:     "string",
			TenantID: 1,
		}).
		FirstOrCreate(&models.Setting{TenantID: 1, Key: key})
}

// helper to suppress unused import warning
var _ = time.Now
