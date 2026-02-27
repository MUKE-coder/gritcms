package integrations

import (
	"context"
	"fmt"
	"log"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	gcal "google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/models"
)

// GoogleCalendarService handles Google Calendar + Google Meet integration.
type GoogleCalendarService struct {
	DB           *gorm.DB
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

// GetOAuthConfig builds the OAuth2 config for Google Calendar.
func (s *GoogleCalendarService) GetOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     s.ClientID,
		ClientSecret: s.ClientSecret,
		RedirectURL:  s.RedirectURL,
		Scopes:       []string{gcal.CalendarEventsScope},
		Endpoint:     google.Endpoint,
	}
}

// GetAuthURL returns the Google OAuth consent URL.
func (s *GoogleCalendarService) GetAuthURL(state string) string {
	return s.GetOAuthConfig().AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
}

// HandleCallback exchanges the auth code for tokens and stores the refresh token.
func (s *GoogleCalendarService) HandleCallback(code string) error {
	cfg := s.GetOAuthConfig()
	token, err := cfg.Exchange(context.Background(), code)
	if err != nil {
		return fmt.Errorf("oauth exchange failed: %w", err)
	}

	if token.RefreshToken == "" {
		return fmt.Errorf("no refresh token received — user may have already authorized this app")
	}

	// Store refresh token in settings
	settings := map[string]string{
		"google_calendar_refresh_token": token.RefreshToken,
		"google_calendar_enabled":       "true",
	}
	for key, val := range settings {
		s.DB.Where("tenant_id = ? AND key = ?", 1, key).
			Assign(models.Setting{Group: "integrations", Value: val, Type: "string", TenantID: 1}).
			FirstOrCreate(&models.Setting{TenantID: 1, Key: key})
	}

	return nil
}

// GetClient returns an authenticated Google API HTTP client using the stored refresh token.
func (s *GoogleCalendarService) GetClient() (*gcal.Service, error) {
	refreshToken := s.getSetting("google_calendar_refresh_token")
	if refreshToken == "" {
		return nil, fmt.Errorf("google calendar not connected")
	}

	cfg := s.GetOAuthConfig()
	token := &oauth2.Token{RefreshToken: refreshToken}
	client := cfg.Client(context.Background(), token)

	srv, err := gcal.NewService(context.Background(), option.WithHTTPClient(client))
	if err != nil {
		return nil, fmt.Errorf("failed to create calendar service: %w", err)
	}
	return srv, nil
}

// IsConnected checks if a refresh token is stored and Google Calendar is enabled.
func (s *GoogleCalendarService) IsConnected() bool {
	return s.getSetting("google_calendar_refresh_token") != "" &&
		s.getSetting("google_calendar_enabled") == "true"
}

// Disconnect removes the stored Google tokens.
func (s *GoogleCalendarService) Disconnect() {
	s.DB.Where("tenant_id = ? AND key IN ?", 1, []string{
		"google_calendar_refresh_token",
		"google_calendar_enabled",
	}).Delete(&models.Setting{})
}

// CreateEvent creates a Google Calendar event, optionally with a Google Meet link.
func (s *GoogleCalendarService) CreateEvent(
	contactName, contactEmail, eventTypeName string,
	start, end time.Time,
	withMeet bool,
) (googleEventID string, meetURL string, err error) {
	srv, err := s.GetClient()
	if err != nil {
		return "", "", err
	}

	calendarID := s.getSetting("google_calendar_id")
	if calendarID == "" {
		calendarID = "primary"
	}

	event := &gcal.Event{
		Summary:     fmt.Sprintf("%s with %s", eventTypeName, contactName),
		Description: fmt.Sprintf("Booking with %s (%s)", contactName, contactEmail),
		Start: &gcal.EventDateTime{
			DateTime: start.Format(time.RFC3339),
			TimeZone: "UTC",
		},
		End: &gcal.EventDateTime{
			DateTime: end.Format(time.RFC3339),
			TimeZone: "UTC",
		},
		Attendees: []*gcal.EventAttendee{
			{Email: contactEmail, DisplayName: contactName},
		},
	}

	if withMeet {
		event.ConferenceData = &gcal.ConferenceData{
			CreateRequest: &gcal.CreateConferenceRequest{
				RequestId: fmt.Sprintf("grit-%d", time.Now().UnixNano()),
				ConferenceSolutionKey: &gcal.ConferenceSolutionKey{
					Type: "hangoutsMeet",
				},
			},
		}
	}

	conferenceVersion := int64(0)
	if withMeet {
		conferenceVersion = 1
	}

	created, err := srv.Events.Insert(calendarID, event).
		ConferenceDataVersion(conferenceVersion).
		SendUpdates("all").
		Do()
	if err != nil {
		return "", "", fmt.Errorf("failed to create calendar event: %w", err)
	}

	if withMeet && created.ConferenceData != nil {
		for _, ep := range created.ConferenceData.EntryPoints {
			if ep.EntryPointType == "video" {
				meetURL = ep.Uri
				break
			}
		}
	}

	if meetURL == "" && created.HangoutLink != "" {
		meetURL = created.HangoutLink
	}

	log.Printf("[google-calendar] Created event %s for %s", created.Id, contactEmail)
	return created.Id, meetURL, nil
}

// UpdateEvent updates the time of an existing Google Calendar event.
func (s *GoogleCalendarService) UpdateEvent(googleEventID string, newStart, newEnd time.Time) error {
	srv, err := s.GetClient()
	if err != nil {
		return err
	}

	calendarID := s.getSetting("google_calendar_id")
	if calendarID == "" {
		calendarID = "primary"
	}

	event, err := srv.Events.Get(calendarID, googleEventID).Do()
	if err != nil {
		return fmt.Errorf("failed to get event: %w", err)
	}

	event.Start = &gcal.EventDateTime{
		DateTime: newStart.Format(time.RFC3339),
		TimeZone: "UTC",
	}
	event.End = &gcal.EventDateTime{
		DateTime: newEnd.Format(time.RFC3339),
		TimeZone: "UTC",
	}

	_, err = srv.Events.Update(calendarID, googleEventID, event).
		SendUpdates("all").
		Do()
	if err != nil {
		return fmt.Errorf("failed to update event: %w", err)
	}

	log.Printf("[google-calendar] Updated event %s", googleEventID)
	return nil
}

// DeleteEvent deletes a Google Calendar event.
func (s *GoogleCalendarService) DeleteEvent(googleEventID string) error {
	srv, err := s.GetClient()
	if err != nil {
		return err
	}

	calendarID := s.getSetting("google_calendar_id")
	if calendarID == "" {
		calendarID = "primary"
	}

	if err := srv.Events.Delete(calendarID, googleEventID).
		SendUpdates("all").
		Do(); err != nil {
		return fmt.Errorf("failed to delete event: %w", err)
	}

	log.Printf("[google-calendar] Deleted event %s", googleEventID)
	return nil
}

func (s *GoogleCalendarService) getSetting(key string) string {
	var setting models.Setting
	if err := s.DB.Where("tenant_id = ? AND key = ?", 1, key).First(&setting).Error; err != nil {
		return ""
	}
	return setting.Value
}
