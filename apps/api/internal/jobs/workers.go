package jobs

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/hibiken/asynq"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/cache"
	"gritcms/apps/api/internal/mail"
	"gritcms/apps/api/internal/models"
	"gritcms/apps/api/internal/storage"
)

// WorkerDeps holds dependencies needed by job handlers.
type WorkerDeps struct {
	DB      *gorm.DB
	Mailer  *mail.Mailer
	Storage *storage.Storage
	Cache   *cache.Cache
}

// StartWorker starts the asynq worker server in a goroutine.
// Returns a stop function and any startup error.
func StartWorker(redisURL string, deps WorkerDeps) (func(), error) {
	redisOpt, err := asynq.ParseRedisURI(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parsing redis URL for worker: %w", err)
	}

	srv := asynq.NewServer(redisOpt, asynq.Config{
		Concurrency: 10,
		Queues: map[string]int{
			"default":  6,
			"critical": 3,
			"low":      1,
		},
	})

	mux := asynq.NewServeMux()
	mux.HandleFunc(TypeEmailSend, handleEmailSend(deps))
	mux.HandleFunc(TypeImageProcess, handleImageProcess(deps))
	mux.HandleFunc(TypeTokensCleanup, handleTokensCleanup(deps))

	go func() {
		if err := srv.Run(mux); err != nil {
			log.Printf("Worker error: %v", err)
		}
	}()

	return func() {
		srv.Shutdown()
	}, nil
}

func handleEmailSend(deps WorkerDeps) func(ctx context.Context, task *asynq.Task) error {
	return func(ctx context.Context, task *asynq.Task) error {
		if deps.Mailer == nil {
			return fmt.Errorf("mailer not configured")
		}

		var payload EmailPayload
		if err := json.Unmarshal(task.Payload(), &payload); err != nil {
			return fmt.Errorf("unmarshaling email payload: %w", err)
		}

		log.Printf("Sending email to %s: %s", payload.To, payload.Subject)

		return deps.Mailer.Send(ctx, mail.SendOptions{
			To:       payload.To,
			Subject:  payload.Subject,
			Template: payload.Template,
			Data:     payload.Data,
		})
	}
}

func handleImageProcess(deps WorkerDeps) func(ctx context.Context, task *asynq.Task) error {
	return func(ctx context.Context, task *asynq.Task) error {
		if deps.Storage == nil {
			return fmt.Errorf("storage not configured")
		}

		var payload ImagePayload
		if err := json.Unmarshal(task.Payload(), &payload); err != nil {
			return fmt.Errorf("unmarshaling image payload: %w", err)
		}

		log.Printf("Processing image: upload %d, key %s", payload.UploadID, payload.Key)

		// Download the original image
		reader, err := deps.Storage.Download(ctx, payload.Key)
		if err != nil {
			return fmt.Errorf("downloading image: %w", err)
		}
		defer reader.Close()

		// Generate thumbnail
		thumbBytes, err := storage.GenerateThumbnail(reader, payload.MimeType)
		if err != nil {
			return fmt.Errorf("generating thumbnail: %w", err)
		}

		// Upload thumbnail
		thumbKey := strings.Replace(payload.Key, "uploads/", "thumbnails/", 1)
		if err := deps.Storage.Upload(ctx, thumbKey, bytes.NewReader(thumbBytes), payload.MimeType); err != nil {
			return fmt.Errorf("uploading thumbnail: %w", err)
		}

		// Update the upload record with thumbnail URL
		thumbURL := deps.Storage.GetURL(thumbKey)
		if deps.DB != nil {
			deps.DB.Model(&models.Upload{}).Where("id = ?", payload.UploadID).Update("thumbnail_url", thumbURL)
		}

		log.Printf("Thumbnail created for upload %d", payload.UploadID)
		return nil
	}
}

func handleTokensCleanup(deps WorkerDeps) func(ctx context.Context, task *asynq.Task) error {
	return func(ctx context.Context, task *asynq.Task) error {
		if deps.DB == nil {
			return fmt.Errorf("database not configured")
		}

		log.Println("Running token cleanup...")

		// Clean up soft-deleted records older than 30 days
		result := deps.DB.Exec("DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days'")
		if result.Error != nil {
			return fmt.Errorf("cleaning up deleted users: %w", result.Error)
		}

		log.Printf("Token cleanup complete, removed %d records", result.RowsAffected)
		return nil
	}
}
