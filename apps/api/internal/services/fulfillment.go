package services

import (
	"log"

	"gorm.io/gorm"

	"gritcms/apps/api/internal/events"
	"gritcms/apps/api/internal/models"
)

// FulfillOrder handles post-payment fulfillment for a paid order:
// - auto-enrolls contacts in courses linked to purchased products
// - emits PurchaseCompleted event
func FulfillOrder(db *gorm.DB, order *models.Order) {
	for _, item := range order.Items {
		var product models.Product
		if err := db.First(&product, item.ProductID).Error; err != nil {
			continue
		}

		if product.Type == models.ProductTypeCourse {
			var courses []models.Course
			db.Where("product_id = ?", product.ID).Find(&courses)
			for _, course := range courses {
				enrollment := models.CourseEnrollment{
					TenantID:  1,
					ContactID: order.ContactID,
					CourseID:  course.ID,
					Status:    "active",
					Source:    "purchase",
				}
				if err := db.FirstOrCreate(&enrollment, models.CourseEnrollment{
					ContactID: order.ContactID,
					CourseID:  course.ID,
				}).Error; err != nil {
					log.Printf("[fulfillment] Failed to enroll contact %d in course %d: %v", order.ContactID, course.ID, err)
				}
			}
		}
	}

	events.Emit(events.PurchaseCompleted, map[string]interface{}{
		"order_id":   order.ID,
		"contact_id": order.ContactID,
		"total":      order.Total,
	})

	log.Printf("[fulfillment] Order %d fulfilled (contact=%d, total=%.2f)", order.ID, order.ContactID, order.Total)
}
