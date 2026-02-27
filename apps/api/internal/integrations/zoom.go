package integrations

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sync"
	"time"

	"gorm.io/gorm"

	"gritcms/apps/api/internal/models"
)

// ZoomService handles Zoom Server-to-Server OAuth meeting creation.
type ZoomService struct {
	DB *gorm.DB
	// From config (env vars)
	AccountID    string
	ClientID     string
	ClientSecret string

	// Cached token
	mu          sync.Mutex
	accessToken string
	tokenExpiry time.Time
}

type zoomTokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

type zoomMeetingRequest struct {
	Topic     string             `json:"topic"`
	Type      int                `json:"type"` // 2 = scheduled
	StartTime string             `json:"start_time"`
	Duration  int                `json:"duration"`
	Timezone  string             `json:"timezone"`
	Settings  zoomMeetingSettings `json:"settings"`
}

type zoomMeetingSettings struct {
	JoinBeforeHost bool `json:"join_before_host"`
	MuteUponEntry  bool `json:"mute_upon_entry"`
}

type zoomMeetingResponse struct {
	ID       int64  `json:"id"`
	JoinURL  string `json:"join_url"`
	StartURL string `json:"start_url"`
}

// IsConfigured returns true if Zoom credentials are set (either from env or settings).
func (s *ZoomService) IsConfigured() bool {
	accountID, clientID, clientSecret := s.getCredentials()
	return accountID != "" && clientID != "" && clientSecret != ""
}

// GetAccessToken fetches or returns a cached Zoom access token.
func (s *ZoomService) GetAccessToken() (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Return cached if still valid
	if s.accessToken != "" && time.Now().Before(s.tokenExpiry) {
		return s.accessToken, nil
	}

	accountID, clientID, clientSecret := s.getCredentials()
	if accountID == "" || clientID == "" || clientSecret == "" {
		return "", fmt.Errorf("zoom credentials not configured")
	}

	data := url.Values{}
	data.Set("grant_type", "account_credentials")
	data.Set("account_id", accountID)

	req, err := http.NewRequest("POST", "https://zoom.us/oauth/token", bytes.NewBufferString(data.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(clientID, clientSecret)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("zoom token request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("zoom token request returned %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp zoomTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("zoom token parse error: %w", err)
	}

	s.accessToken = tokenResp.AccessToken
	s.tokenExpiry = time.Now().Add(time.Duration(tokenResp.ExpiresIn-60) * time.Second)

	return s.accessToken, nil
}

// CreateMeeting creates a Zoom meeting and returns the join URL and meeting ID.
func (s *ZoomService) CreateMeeting(topic string, start time.Time, durationMinutes int) (joinURL string, meetingID string, err error) {
	token, err := s.GetAccessToken()
	if err != nil {
		return "", "", err
	}

	meeting := zoomMeetingRequest{
		Topic:     topic,
		Type:      2,
		StartTime: start.UTC().Format("2006-01-02T15:04:05Z"),
		Duration:  durationMinutes,
		Timezone:  "UTC",
		Settings: zoomMeetingSettings{
			JoinBeforeHost: true,
			MuteUponEntry:  true,
		},
	}

	body, _ := json.Marshal(meeting)
	req, err := http.NewRequest("POST", "https://api.zoom.us/v2/users/me/meetings", bytes.NewBuffer(body))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("zoom create meeting failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 201 {
		return "", "", fmt.Errorf("zoom create meeting returned %d: %s", resp.StatusCode, string(respBody))
	}

	var meetingResp zoomMeetingResponse
	if err := json.Unmarshal(respBody, &meetingResp); err != nil {
		return "", "", fmt.Errorf("zoom meeting parse error: %w", err)
	}

	log.Printf("[zoom] Created meeting %d for: %s", meetingResp.ID, topic)
	return meetingResp.JoinURL, fmt.Sprintf("%d", meetingResp.ID), nil
}

// UpdateMeeting updates a Zoom meeting's time.
func (s *ZoomService) UpdateMeeting(meetingID string, newStart time.Time, durationMinutes int) error {
	token, err := s.GetAccessToken()
	if err != nil {
		return err
	}

	update := map[string]interface{}{
		"start_time": newStart.UTC().Format("2006-01-02T15:04:05Z"),
		"duration":   durationMinutes,
		"timezone":   "UTC",
	}

	body, _ := json.Marshal(update)
	req, err := http.NewRequest("PATCH", fmt.Sprintf("https://api.zoom.us/v2/meetings/%s", meetingID), bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("zoom update meeting failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 204 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("zoom update meeting returned %d: %s", resp.StatusCode, string(respBody))
	}

	log.Printf("[zoom] Updated meeting %s", meetingID)
	return nil
}

// DeleteMeeting deletes a Zoom meeting.
func (s *ZoomService) DeleteMeeting(meetingID string) error {
	token, err := s.GetAccessToken()
	if err != nil {
		return err
	}

	req, err := http.NewRequest("DELETE", fmt.Sprintf("https://api.zoom.us/v2/meetings/%s", meetingID), nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("zoom delete meeting failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 204 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("zoom delete meeting returned %d: %s", resp.StatusCode, string(respBody))
	}

	log.Printf("[zoom] Deleted meeting %s", meetingID)
	return nil
}

// getCredentials returns zoom credentials from env config or settings fallback.
func (s *ZoomService) getCredentials() (accountID, clientID, clientSecret string) {
	// Prefer env config
	if s.AccountID != "" {
		return s.AccountID, s.ClientID, s.ClientSecret
	}
	// Fall back to settings
	return s.getSettingVal("zoom_account_id"),
		s.getSettingVal("zoom_client_id"),
		s.getSettingVal("zoom_client_secret")
}

func (s *ZoomService) getSettingVal(key string) string {
	var setting models.Setting
	if err := s.DB.Where("tenant_id = ? AND key = ?", 1, key).First(&setting).Error; err != nil {
		return ""
	}
	return setting.Value
}
