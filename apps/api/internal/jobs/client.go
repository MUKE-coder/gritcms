package jobs

import (
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"
)

// Task type constants.
const (
	TypeEmailSend     = "email:send"
	TypeImageProcess  = "image:process"
	TypeTokensCleanup = "tokens:cleanup"
)

// Client wraps asynq.Client for enqueuing background jobs.
type Client struct {
	client *asynq.Client
}

// NewClient creates a new job queue client connected to Redis.
func NewClient(redisURL string) (*Client, error) {
	redisOpt, err := asynq.ParseRedisURI(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parsing redis URL for jobs: %w", err)
	}

	client := asynq.NewClient(redisOpt)
	return &Client{client: client}, nil
}

// Close shuts down the client connection.
func (c *Client) Close() error {
	return c.client.Close()
}

// EmailPayload holds the data for an email send job.
type EmailPayload struct {
	To       string                 `json:"to"`
	Subject  string                 `json:"subject"`
	Template string                 `json:"template"`
	Data     map[string]interface{} `json:"data"`
}

// ImagePayload holds the data for an image processing job.
type ImagePayload struct {
	UploadID uint   `json:"upload_id"`
	Key      string `json:"key"`
	MimeType string `json:"mime_type"`
}

// EnqueueSendEmail enqueues an email send job.
func (c *Client) EnqueueSendEmail(to, subject, template string, data map[string]interface{}) error {
	payload, err := json.Marshal(EmailPayload{
		To:       to,
		Subject:  subject,
		Template: template,
		Data:     data,
	})
	if err != nil {
		return fmt.Errorf("marshaling email payload: %w", err)
	}

	task := asynq.NewTask(TypeEmailSend, payload)
	_, err = c.client.Enqueue(task, asynq.MaxRetry(3))
	if err != nil {
		return fmt.Errorf("enqueuing email job: %w", err)
	}
	return nil
}

// EnqueueProcessImage enqueues an image processing job.
func (c *Client) EnqueueProcessImage(uploadID uint, key, mimeType string) error {
	payload, err := json.Marshal(ImagePayload{
		UploadID: uploadID,
		Key:      key,
		MimeType: mimeType,
	})
	if err != nil {
		return fmt.Errorf("marshaling image payload: %w", err)
	}

	task := asynq.NewTask(TypeImageProcess, payload)
	_, err = c.client.Enqueue(task, asynq.MaxRetry(2))
	if err != nil {
		return fmt.Errorf("enqueuing image job: %w", err)
	}
	return nil
}

// EnqueueTokensCleanup enqueues a token cleanup job.
func (c *Client) EnqueueTokensCleanup() error {
	task := asynq.NewTask(TypeTokensCleanup, nil)
	_, err := c.client.Enqueue(task, asynq.MaxRetry(1))
	if err != nil {
		return fmt.Errorf("enqueuing cleanup job: %w", err)
	}
	return nil
}
