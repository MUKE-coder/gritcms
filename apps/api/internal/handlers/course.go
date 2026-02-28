package handlers

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/events"
	"gritcms/apps/api/internal/models"
)

type CourseHandler struct {
	DB *gorm.DB
}

func NewCourseHandler(db *gorm.DB) *CourseHandler {
	return &CourseHandler{DB: db}
}

// ===== Courses =====

func (h *CourseHandler) ListCourses(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")
	search := c.Query("search")

	q := h.DB.Order("created_at DESC")
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if search != "" {
		q = q.Where("title ILIKE ?", "%"+search+"%")
	}

	var total int64
	q.Model(&models.Course{}).Count(&total)

	var courses []models.Course
	q.Preload("Modules", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Offset((page - 1) * pageSize).Limit(pageSize).Find(&courses)

	// Add enrollment counts
	for i := range courses {
		var count int64
		h.DB.Model(&models.CourseEnrollment{}).Where("course_id = ? AND status = ?", courses[i].ID, models.EnrollStatusActive).Count(&count)
		courses[i].EnrollmentCount = count
	}

	c.JSON(http.StatusOK, gin.H{
		"data": courses,
		"meta": gin.H{"total": total, "page": page, "page_size": pageSize, "pages": int(math.Ceil(float64(total) / float64(pageSize)))},
	})
}

func (h *CourseHandler) GetCourse(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var course models.Course
	if err := h.DB.Preload("Modules", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Preload("Modules.Lessons", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).Preload("Instructor").First(&course, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}
	var count int64
	h.DB.Model(&models.CourseEnrollment{}).Where("course_id = ? AND status = ?", course.ID, models.EnrollStatusActive).Count(&count)
	course.EnrollmentCount = count
	c.JSON(http.StatusOK, gin.H{"data": course})
}

func (h *CourseHandler) CreateCourse(c *gin.Context) {
	var body models.Course
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	if body.Slug == "" {
		body.Slug = generateSlug(body.Title)
	}
	if err := h.DB.Create(&body).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create course"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *CourseHandler) UpdateCourse(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var course models.Course
	if err := h.DB.First(&course, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}
	if err := c.ShouldBindJSON(&course); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.DB.Save(&course)
	c.JSON(http.StatusOK, gin.H{"data": course})
}

func (h *CourseHandler) DeleteCourse(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	h.DB.Delete(&models.Course{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Course deleted"})
}

// DuplicateCourse creates a copy of a course with all modules and lessons.
func (h *CourseHandler) DuplicateCourse(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var original models.Course
	if err := h.DB.Preload("Modules.Lessons").First(&original, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	newCourse := models.Course{
		TenantID:         original.TenantID,
		Title:            original.Title + " (Copy)",
		Slug:             original.Slug + "-copy-" + fmt.Sprintf("%d", time.Now().Unix()),
		Description:      original.Description,
		ShortDescription: original.ShortDescription,
		Thumbnail:        original.Thumbnail,
		Price:            original.Price,
		Currency:         original.Currency,
		Status:           models.CourseStatusDraft,
		AccessType:       original.AccessType,
	}
	h.DB.Create(&newCourse)

	for _, mod := range original.Modules {
		newMod := models.CourseModule{
			TenantID:    mod.TenantID,
			CourseID:    newCourse.ID,
			Title:       mod.Title,
			Description: mod.Description,
			SortOrder:   mod.SortOrder,
		}
		h.DB.Create(&newMod)

		for _, lesson := range mod.Lessons {
			newLesson := models.Lesson{
				TenantID:        lesson.TenantID,
				ModuleID:        newMod.ID,
				Title:           lesson.Title,
				Slug:            lesson.Slug,
				Content:         lesson.Content,
				Type:            lesson.Type,
				VideoURL:        lesson.VideoURL,
				DurationMinutes: lesson.DurationMinutes,
				SortOrder:       lesson.SortOrder,
				IsFreePreview:   lesson.IsFreePreview,
				DripDelayDays:   lesson.DripDelayDays,
			}
			h.DB.Create(&newLesson)
		}
	}

	c.JSON(http.StatusCreated, gin.H{"data": newCourse})
}

// PublishCourse publishes a course.
func (h *CourseHandler) PublishCourse(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var course models.Course
	if err := h.DB.First(&course, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}
	now := time.Now()
	course.Status = models.CourseStatusPublished
	course.PublishedAt = &now
	h.DB.Save(&course)
	c.JSON(http.StatusOK, gin.H{"data": course})
}

// ===== Course Modules =====

func (h *CourseHandler) CreateModule(c *gin.Context) {
	courseID, _ := strconv.Atoi(c.Param("id"))
	var body models.CourseModule
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	body.CourseID = uint(courseID)
	h.DB.Create(&body)
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *CourseHandler) UpdateModule(c *gin.Context) {
	modID, _ := strconv.Atoi(c.Param("modId"))
	var mod models.CourseModule
	if err := h.DB.First(&mod, modID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Module not found"})
		return
	}
	if err := c.ShouldBindJSON(&mod); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.DB.Save(&mod)
	c.JSON(http.StatusOK, gin.H{"data": mod})
}

func (h *CourseHandler) DeleteModule(c *gin.Context) {
	modID, _ := strconv.Atoi(c.Param("modId"))
	h.DB.Delete(&models.CourseModule{}, modID)
	c.JSON(http.StatusOK, gin.H{"message": "Module deleted"})
}

func (h *CourseHandler) ReorderModules(c *gin.Context) {
	var body struct {
		Items []struct {
			ID        uint `json:"id"`
			SortOrder int  `json:"sort_order"`
		} `json:"items"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	for _, item := range body.Items {
		h.DB.Model(&models.CourseModule{}).Where("id = ?", item.ID).Update("sort_order", item.SortOrder)
	}
	c.JSON(http.StatusOK, gin.H{"message": "Modules reordered"})
}

// ===== Lessons =====

func (h *CourseHandler) CreateLesson(c *gin.Context) {
	modID, _ := strconv.Atoi(c.Param("modId"))
	var body models.Lesson
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	body.ModuleID = uint(modID)
	if body.Slug == "" {
		body.Slug = generateSlug(body.Title)
	}
	h.DB.Create(&body)
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *CourseHandler) GetLesson(c *gin.Context) {
	lessonID, _ := strconv.Atoi(c.Param("lessonId"))
	var lesson models.Lesson
	if err := h.DB.Preload("Quizzes.Questions", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order ASC")
	}).First(&lesson, lessonID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lesson not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": lesson})
}

func (h *CourseHandler) UpdateLesson(c *gin.Context) {
	lessonID, _ := strconv.Atoi(c.Param("lessonId"))
	var lesson models.Lesson
	if err := h.DB.First(&lesson, lessonID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lesson not found"})
		return
	}
	if err := c.ShouldBindJSON(&lesson); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.DB.Save(&lesson)
	c.JSON(http.StatusOK, gin.H{"data": lesson})
}

func (h *CourseHandler) DeleteLesson(c *gin.Context) {
	lessonID, _ := strconv.Atoi(c.Param("lessonId"))
	h.DB.Delete(&models.Lesson{}, lessonID)
	c.JSON(http.StatusOK, gin.H{"message": "Lesson deleted"})
}

func (h *CourseHandler) ReorderLessons(c *gin.Context) {
	var body struct {
		Items []struct {
			ID        uint `json:"id"`
			SortOrder int  `json:"sort_order"`
		} `json:"items"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	for _, item := range body.Items {
		h.DB.Model(&models.Lesson{}).Where("id = ?", item.ID).Update("sort_order", item.SortOrder)
	}
	c.JSON(http.StatusOK, gin.H{"message": "Lessons reordered"})
}

// ===== Enrollments =====

func (h *CourseHandler) EnrollContact(c *gin.Context) {
	courseID, _ := strconv.Atoi(c.Param("id"))
	var body struct {
		ContactID uint   `json:"contact_id" binding:"required"`
		Source    string `json:"source"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if already enrolled
	var existing models.CourseEnrollment
	if err := h.DB.Where("contact_id = ? AND course_id = ?", body.ContactID, courseID).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{"data": existing, "message": "Already enrolled"})
		return
	}

	enrollment := models.CourseEnrollment{
		TenantID:   1,
		ContactID:  body.ContactID,
		CourseID:   uint(courseID),
		Status:     models.EnrollStatusActive,
		EnrolledAt: time.Now(),
		Source:     body.Source,
	}
	if body.Source == "" {
		enrollment.Source = "manual"
	}
	if err := h.DB.Create(&enrollment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enroll contact"})
		return
	}
	events.Emit(events.CourseEnrolled, enrollment)
	c.JSON(http.StatusCreated, gin.H{"data": enrollment})
}

func (h *CourseHandler) ListEnrollments(c *gin.Context) {
	courseID, _ := strconv.Atoi(c.Param("id"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	q := h.DB.Where("course_id = ?", courseID).Preload("Contact").Order("created_at DESC")

	var total int64
	q.Model(&models.CourseEnrollment{}).Count(&total)

	var enrollments []models.CourseEnrollment
	q.Offset((page - 1) * pageSize).Limit(pageSize).Find(&enrollments)

	c.JSON(http.StatusOK, gin.H{
		"data": enrollments,
		"meta": gin.H{"total": total, "page": page, "page_size": pageSize, "pages": int(math.Ceil(float64(total) / float64(pageSize)))},
	})
}

func (h *CourseHandler) UnenrollContact(c *gin.Context) {
	enrollID, _ := strconv.Atoi(c.Param("enrollId"))
	h.DB.Delete(&models.CourseEnrollment{}, enrollID)
	c.JSON(http.StatusOK, gin.H{"message": "Enrollment removed"})
}

// ===== Progress =====

// MarkLessonComplete marks a lesson as completed for a student.
func (h *CourseHandler) MarkLessonComplete(c *gin.Context) {
	var body struct {
		EnrollmentID uint `json:"enrollment_id" binding:"required"`
		LessonID     uint `json:"lesson_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	var progress models.LessonProgress
	result := h.DB.Where("enrollment_id = ? AND lesson_id = ?", body.EnrollmentID, body.LessonID).First(&progress)

	if result.Error == gorm.ErrRecordNotFound {
		progress = models.LessonProgress{
			TenantID:     1,
			EnrollmentID: body.EnrollmentID,
			LessonID:     body.LessonID,
			Status:       models.ProgressCompleted,
			StartedAt:    &now,
			CompletedAt:  &now,
		}
		h.DB.Create(&progress)
	} else {
		progress.Status = models.ProgressCompleted
		progress.CompletedAt = &now
		h.DB.Save(&progress)
	}

	events.Emit(events.CourseLessonCompleted, progress)

	// Recalculate course progress
	h.recalculateProgress(body.EnrollmentID)

	c.JSON(http.StatusOK, gin.H{"data": progress})
}

// GetProgress returns progress data for an enrollment.
func (h *CourseHandler) GetProgress(c *gin.Context) {
	enrollID, _ := strconv.Atoi(c.Param("enrollId"))
	var enrollment models.CourseEnrollment
	if err := h.DB.Preload("LessonProgresses.Lesson").First(&enrollment, enrollID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Enrollment not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": enrollment})
}

func (h *CourseHandler) recalculateProgress(enrollmentID uint) {
	var enrollment models.CourseEnrollment
	if err := h.DB.Preload("Course.Modules.Lessons").First(&enrollment, enrollmentID).Error; err != nil {
		return
	}

	totalLessons := 0
	for _, mod := range enrollment.Course.Modules {
		totalLessons += len(mod.Lessons)
	}
	if totalLessons == 0 {
		return
	}

	var completedCount int64
	h.DB.Model(&models.LessonProgress{}).Where("enrollment_id = ? AND status = ?", enrollmentID, models.ProgressCompleted).Count(&completedCount)

	enrollment.ProgressPercentage = float64(completedCount) / float64(totalLessons) * 100

	if int(completedCount) >= totalLessons {
		enrollment.Status = models.EnrollStatusCompleted
		now := time.Now()
		enrollment.CompletedAt = &now
		events.Emit(events.CourseCompleted, enrollment)

		// Auto-generate certificate
		h.generateCertificate(enrollment)
	}

	h.DB.Save(&enrollment)
}

func (h *CourseHandler) generateCertificate(enrollment models.CourseEnrollment) {
	// Check if certificate already exists
	var existing models.Certificate
	if err := h.DB.Where("enrollment_id = ?", enrollment.ID).First(&existing).Error; err == nil {
		return
	}

	certNum := generateCertNumber()
	cert := models.Certificate{
		TenantID:          enrollment.TenantID,
		CourseID:          enrollment.CourseID,
		EnrollmentID:      enrollment.ID,
		ContactID:         enrollment.ContactID,
		CertificateNumber: certNum,
		IssuedAt:          time.Now(),
		Template:          "default",
	}
	h.DB.Create(&cert)
}

func generateCertNumber() string {
	b := make([]byte, 8)
	rand.Read(b)
	return fmt.Sprintf("CERT-%X", b)
}

// ===== Quizzes =====

func (h *CourseHandler) CreateQuiz(c *gin.Context) {
	lessonID, _ := strconv.Atoi(c.Param("lessonId"))
	var body models.Quiz
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	body.LessonID = uint(lessonID)
	h.DB.Create(&body)
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *CourseHandler) UpdateQuiz(c *gin.Context) {
	quizID, _ := strconv.Atoi(c.Param("quizId"))
	var quiz models.Quiz
	if err := h.DB.First(&quiz, quizID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
		return
	}
	if err := c.ShouldBindJSON(&quiz); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.DB.Save(&quiz)
	c.JSON(http.StatusOK, gin.H{"data": quiz})
}

func (h *CourseHandler) DeleteQuiz(c *gin.Context) {
	quizID, _ := strconv.Atoi(c.Param("quizId"))
	h.DB.Delete(&models.Quiz{}, quizID)
	c.JSON(http.StatusOK, gin.H{"message": "Quiz deleted"})
}

// Quiz Questions

func (h *CourseHandler) CreateQuestion(c *gin.Context) {
	quizID, _ := strconv.Atoi(c.Param("quizId"))
	var body models.QuizQuestion
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	body.QuizID = uint(quizID)
	h.DB.Create(&body)
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *CourseHandler) UpdateQuestion(c *gin.Context) {
	qID, _ := strconv.Atoi(c.Param("qId"))
	var question models.QuizQuestion
	if err := h.DB.First(&question, qID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Question not found"})
		return
	}
	if err := c.ShouldBindJSON(&question); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.DB.Save(&question)
	c.JSON(http.StatusOK, gin.H{"data": question})
}

func (h *CourseHandler) DeleteQuestion(c *gin.Context) {
	qID, _ := strconv.Atoi(c.Param("qId"))
	h.DB.Delete(&models.QuizQuestion{}, qID)
	c.JSON(http.StatusOK, gin.H{"message": "Question deleted"})
}

// Quiz Attempts

func (h *CourseHandler) SubmitQuizAttempt(c *gin.Context) {
	quizID, _ := strconv.Atoi(c.Param("quizId"))
	var body struct {
		EnrollmentID uint `json:"enrollment_id" binding:"required"`
		Answers      []struct {
			QuestionID uint   `json:"question_id"`
			Answer     string `json:"answer"`
		} `json:"answers"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Load quiz with questions
	var quiz models.Quiz
	if err := h.DB.Preload("Questions").First(&quiz, quizID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quiz not found"})
		return
	}

	// Check max attempts
	if quiz.MaxAttempts > 0 {
		var attemptCount int64
		h.DB.Model(&models.QuizAttempt{}).Where("quiz_id = ? AND enrollment_id = ?", quizID, body.EnrollmentID).Count(&attemptCount)
		if int(attemptCount) >= quiz.MaxAttempts {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Maximum attempts reached"})
			return
		}
	}

	// Score the quiz
	totalPoints := 0
	earnedPoints := 0
	for _, q := range quiz.Questions {
		totalPoints += q.Points
		for _, a := range body.Answers {
			if a.QuestionID == q.ID && strings.EqualFold(strings.TrimSpace(a.Answer), strings.TrimSpace(q.CorrectAnswer)) {
				earnedPoints += q.Points
			}
		}
	}

	score := float64(0)
	if totalPoints > 0 {
		score = float64(earnedPoints) / float64(totalPoints) * 100
	}
	passed := score >= float64(quiz.PassingScore)

	answersJSON, _ := json.Marshal(body.Answers)
	now := time.Now()
	attempt := models.QuizAttempt{
		TenantID:     1,
		QuizID:       uint(quizID),
		EnrollmentID: body.EnrollmentID,
		Answers:      answersJSON,
		Score:        score,
		Passed:       passed,
		StartedAt:    now,
		CompletedAt:  &now,
	}
	h.DB.Create(&attempt)

	c.JSON(http.StatusCreated, gin.H{
		"data": attempt,
		"result": gin.H{
			"score":         score,
			"passed":        passed,
			"total_points":  totalPoints,
			"earned_points": earnedPoints,
		},
	})
}

func (h *CourseHandler) ListQuizAttempts(c *gin.Context) {
	quizID, _ := strconv.Atoi(c.Param("quizId"))
	enrollmentID := c.Query("enrollment_id")

	q := h.DB.Where("quiz_id = ?", quizID).Order("created_at DESC")
	if enrollmentID != "" {
		q = q.Where("enrollment_id = ?", enrollmentID)
	}

	var attempts []models.QuizAttempt
	q.Find(&attempts)
	c.JSON(http.StatusOK, gin.H{"data": attempts})
}

// ===== Certificates =====

func (h *CourseHandler) ListCertificates(c *gin.Context) {
	courseID := c.Query("course_id")
	contactID := c.Query("contact_id")

	q := h.DB.Preload("Course").Preload("Contact").Order("created_at DESC")
	if courseID != "" {
		q = q.Where("course_id = ?", courseID)
	}
	if contactID != "" {
		q = q.Where("contact_id = ?", contactID)
	}

	var certs []models.Certificate
	q.Find(&certs)
	c.JSON(http.StatusOK, gin.H{"data": certs})
}

// VerifyCertificate is a public endpoint that verifies a certificate number.
func (h *CourseHandler) VerifyCertificate(c *gin.Context) {
	number := c.Param("number")
	var cert models.Certificate
	if err := h.DB.Preload("Course").Preload("Contact").Where("certificate_number = ?", number).First(&cert).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Certificate not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"certificate_number": cert.CertificateNumber,
			"issued_at":          cert.IssuedAt,
			"course_title":       cert.Course.Title,
			"student_name":       cert.Contact.FirstName + " " + cert.Contact.LastName,
		},
	})
}

// ===== Public Course Endpoints =====

// ListPublishedCourses returns published courses for the public site.
func (h *CourseHandler) ListPublishedCourses(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "12"))
	search := c.Query("search")

	q := h.DB.Where("status = ?", models.CourseStatusPublished).Order("published_at DESC")
	if search != "" {
		q = q.Where("title ILIKE ? OR short_description ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	q.Model(&models.Course{}).Count(&total)

	var courses []models.Course
	q.Preload("Instructor").Offset((page - 1) * pageSize).Limit(pageSize).Find(&courses)

	c.JSON(http.StatusOK, gin.H{
		"data": courses,
		"meta": gin.H{"total": total, "page": page, "page_size": pageSize, "pages": int(math.Ceil(float64(total) / float64(pageSize)))},
	})
}

// GetPublishedCourse returns a single published course by slug.
func (h *CourseHandler) GetPublishedCourse(c *gin.Context) {
	slug := c.Param("slug")
	var course models.Course
	if err := h.DB.Where("slug = ? AND status = ?", slug, models.CourseStatusPublished).
		Preload("Modules", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		Preload("Modules.Lessons", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		Preload("Instructor").
		First(&course).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	var count int64
	h.DB.Model(&models.CourseEnrollment{}).Where("course_id = ?", course.ID).Count(&count)
	course.EnrollmentCount = count

	c.JSON(http.StatusOK, gin.H{"data": course})
}

// ===== Course Analytics =====

func (h *CourseHandler) CourseAnalytics(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var totalEnrollments int64
	h.DB.Model(&models.CourseEnrollment{}).Where("course_id = ?", id).Count(&totalEnrollments)

	var completedEnrollments int64
	h.DB.Model(&models.CourseEnrollment{}).Where("course_id = ? AND status = ?", id, models.EnrollStatusCompleted).Count(&completedEnrollments)

	var avgProgress float64
	h.DB.Model(&models.CourseEnrollment{}).Where("course_id = ?", id).Select("COALESCE(AVG(progress_percentage), 0)").Row().Scan(&avgProgress)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"total_enrollments":     totalEnrollments,
			"completed_enrollments": completedEnrollments,
			"completion_rate":       safePercent(completedEnrollments, totalEnrollments),
			"avg_progress":          math.Round(avgProgress*100) / 100,
		},
	})
}

func safePercent(num, denom int64) float64 {
	if denom == 0 {
		return 0
	}
	return math.Round(float64(num)/float64(denom)*10000) / 100
}

// ===== Student (Public Authenticated) Endpoints =====

// StudentEnroll allows an authenticated user to self-enroll in a course.
func (h *CourseHandler) StudentEnroll(c *gin.Context) {
	courseID, _ := strconv.Atoi(c.Param("id"))
	user, _ := c.Get("user")
	u := user.(models.User)

	// Load course to check access type
	var course models.Course
	if err := h.DB.First(&course, courseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}
	if course.Status != models.CourseStatusPublished {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	// Only allow free courses for now (paid courses need payment integration)
	if course.AccessType == models.CourseAccessPaid {
		c.JSON(http.StatusPaymentRequired, gin.H{"error": "This course requires payment"})
		return
	}

	// Find or create contact for this user
	var contact models.Contact
	if err := h.DB.Where("email = ? AND tenant_id = ?", u.Email, 1).First(&contact).Error; err != nil {
		contact = models.Contact{
			TenantID:  1,
			Email:     u.Email,
			FirstName: u.FirstName,
			LastName:  u.LastName,
			Source:    "organic",
			UserID:    &u.ID,
		}
		h.DB.Create(&contact)
	} else if contact.UserID == nil {
		contact.UserID = &u.ID
		h.DB.Save(&contact)
	}

	// Check if already enrolled
	var existing models.CourseEnrollment
	if err := h.DB.Where("contact_id = ? AND course_id = ?", contact.ID, courseID).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{"data": existing, "message": "Already enrolled"})
		return
	}

	enrollment := models.CourseEnrollment{
		TenantID:   1,
		ContactID:  contact.ID,
		CourseID:   uint(courseID),
		Status:     models.EnrollStatusActive,
		EnrolledAt: time.Now(),
		Source:     "self-enroll",
	}
	if err := h.DB.Create(&enrollment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enroll"})
		return
	}
	events.Emit(events.CourseEnrolled, enrollment)
	c.JSON(http.StatusCreated, gin.H{"data": enrollment})
}

// StudentGetCourses returns all courses the authenticated user is enrolled in.
func (h *CourseHandler) StudentGetCourses(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(models.User)

	var contact models.Contact
	if err := h.DB.Where("email = ? AND tenant_id = ?", u.Email, 1).First(&contact).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}})
		return
	}

	var enrollments []models.CourseEnrollment
	h.DB.Where("contact_id = ?", contact.ID).
		Preload("Course").
		Preload("Course.Modules", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		Preload("Course.Modules.Lessons", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		Preload("LessonProgresses").
		Order("created_at DESC").
		Find(&enrollments)

	result := make([]gin.H, 0, len(enrollments))
	for _, e := range enrollments {
		result = append(result, gin.H{
			"course":            e.Course,
			"enrollment":        e,
			"lesson_progresses": e.LessonProgresses,
		})
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// StudentGetCourse returns a single course with enrollment and progress for the authenticated user.
func (h *CourseHandler) StudentGetCourse(c *gin.Context) {
	courseID, _ := strconv.Atoi(c.Param("id"))
	user, _ := c.Get("user")
	u := user.(models.User)

	var course models.Course
	if err := h.DB.Where("id = ? AND status = ?", courseID, models.CourseStatusPublished).
		Preload("Modules", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		Preload("Modules.Lessons", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC")
		}).
		Preload("Instructor").
		First(&course).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	// Find contact + enrollment
	var contact models.Contact
	if err := h.DB.Where("email = ? AND tenant_id = ?", u.Email, 1).First(&contact).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"data": gin.H{"course": course, "enrollment": nil, "lesson_progresses": []interface{}{}}})
		return
	}

	var enrollment models.CourseEnrollment
	if err := h.DB.Where("contact_id = ? AND course_id = ?", contact.ID, courseID).
		Preload("LessonProgresses").
		First(&enrollment).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"data": gin.H{"course": course, "enrollment": nil, "lesson_progresses": []interface{}{}}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"course":            course,
		"enrollment":        enrollment,
		"lesson_progresses": enrollment.LessonProgresses,
	}})
}

// StudentMarkLessonComplete marks a lesson as completed for the authenticated student.
func (h *CourseHandler) StudentMarkLessonComplete(c *gin.Context) {
	courseID, _ := strconv.Atoi(c.Param("id"))
	lessonID, _ := strconv.Atoi(c.Param("lessonId"))
	user, _ := c.Get("user")
	u := user.(models.User)

	// Find contact
	var contact models.Contact
	if err := h.DB.Where("email = ? AND tenant_id = ?", u.Email, 1).First(&contact).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not enrolled"})
		return
	}

	// Find enrollment
	var enrollment models.CourseEnrollment
	if err := h.DB.Where("contact_id = ? AND course_id = ?", contact.ID, courseID).First(&enrollment).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not enrolled in this course"})
		return
	}

	now := time.Now()
	var progress models.LessonProgress
	result := h.DB.Where("enrollment_id = ? AND lesson_id = ?", enrollment.ID, lessonID).First(&progress)

	if result.Error == gorm.ErrRecordNotFound {
		progress = models.LessonProgress{
			TenantID:     1,
			EnrollmentID: enrollment.ID,
			LessonID:     uint(lessonID),
			Status:       models.ProgressCompleted,
			StartedAt:    &now,
			CompletedAt:  &now,
		}
		h.DB.Create(&progress)
	} else {
		progress.Status = models.ProgressCompleted
		progress.CompletedAt = &now
		h.DB.Save(&progress)
	}

	events.Emit(events.CourseLessonCompleted, progress)
	h.recalculateProgress(enrollment.ID)

	c.JSON(http.StatusOK, gin.H{"data": progress})
}

// CourseDashboard returns aggregate stats for all courses.
func (h *CourseHandler) CourseDashboard(c *gin.Context) {
	var totalCourses int64
	h.DB.Model(&models.Course{}).Count(&totalCourses)

	var publishedCourses int64
	h.DB.Model(&models.Course{}).Where("status = 'published'").Count(&publishedCourses)

	var totalEnrollments int64
	h.DB.Model(&models.CourseEnrollment{}).Count(&totalEnrollments)

	// Revenue from course orders (order items with course_id set)
	var courseRevenue float64
	h.DB.Model(&models.Order{}).
		Where("status = 'paid' AND id IN (?)",
			h.DB.Model(&models.OrderItem{}).Select("order_id").Where("course_id IS NOT NULL"),
		).
		Select("COALESCE(SUM(total), 0)").Scan(&courseRevenue)

	// Monthly course revenue
	startOfMonth := time.Now().UTC().Truncate(24 * time.Hour).AddDate(0, 0, -time.Now().Day()+1)
	var monthlyRevenue float64
	h.DB.Model(&models.Order{}).
		Where("status = 'paid' AND paid_at >= ? AND id IN (?)",
			startOfMonth,
			h.DB.Model(&models.OrderItem{}).Select("order_id").Where("course_id IS NOT NULL"),
		).
		Select("COALESCE(SUM(total), 0)").Scan(&monthlyRevenue)

	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"total_courses":     totalCourses,
		"published_courses": publishedCourses,
		"total_enrollments": totalEnrollments,
		"course_revenue":    courseRevenue,
		"monthly_revenue":   monthlyRevenue,
	}})
}

func generateSlug(title string) string {
	slug := strings.ToLower(title)
	slug = strings.ReplaceAll(slug, " ", "-")
	// Remove non-alphanumeric except hyphens
	result := make([]byte, 0, len(slug))
	for i := 0; i < len(slug); i++ {
		c := slug[i]
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' {
			result = append(result, c)
		}
	}
	return string(result)
}
