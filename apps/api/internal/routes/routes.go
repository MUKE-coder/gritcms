package routes

import (
	"context"
	"log"
	"net/http"
	"runtime"
	"time"

	"github.com/MUKE-coder/gin-docs/gindocs"
	"github.com/MUKE-coder/gorm-studio/studio"
	"github.com/MUKE-coder/pulse/pulse"
	"github.com/MUKE-coder/sentinel"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/ai"
	"gritcms/apps/api/internal/cache"
	"gritcms/apps/api/internal/config"
	"gritcms/apps/api/internal/handlers"
	"gritcms/apps/api/internal/integrations"
	"gritcms/apps/api/internal/jobs"
	"gritcms/apps/api/internal/mail"
	"gritcms/apps/api/internal/middleware"
	"gritcms/apps/api/internal/models"
	"gritcms/apps/api/internal/services"
	"gritcms/apps/api/internal/storage"
)

// Services holds all Phase 4 services for dependency injection.
type Services struct {
	Cache   *cache.Cache
	Storage *storage.Storage
	Mailer  *mail.Mailer
	AI      *ai.AI
	Jobs    *jobs.Client
}

// Setup configures all routes and returns the Gin engine.
func Setup(db *gorm.DB, cfg *config.Config, svc *Services) *gin.Engine {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Global middleware
	r.Use(middleware.Logger())
	r.Use(gin.Recovery())
	log.Printf("[CORS] Allowed origins: %v", cfg.CORSOrigins)
	r.Use(middleware.CORS(cfg.CORSOrigins))
	r.Use(middleware.SecurityHeaders())

	// Max memory for multipart form parsing (excess goes to temp files)
	r.MaxMultipartMemory = 50 << 20

	// Mount Sentinel security suite (WAF, rate limiting, auth shield, anomaly detection)
	excludedRoutes := []string{"/pulse/*", "/studio/*", "/sentinel/*", "/docs/*", "/api/health"}
	if cfg.SentinelEnabled {
		sentinel.Mount(r, db, sentinel.Config{
			Dashboard: sentinel.DashboardConfig{
				Username:  cfg.SentinelUsername,
				Password:  cfg.SentinelPassword,
				SecretKey: cfg.SentinelSecretKey,
			},
			WAF: sentinel.WAFConfig{
				Enabled:       true,
				Mode:          sentinel.ModeBlock,
				ExcludeRoutes: excludedRoutes,
			},
			RateLimit: sentinel.RateLimitConfig{
				Enabled: true,
				ByIP:    &sentinel.Limit{Requests: 100, Window: 1 * time.Minute},
				ByRoute: map[string]sentinel.Limit{
					"/api/auth/login":    {Requests: 5, Window: 15 * time.Minute},
					"/api/auth/register": {Requests: 3, Window: 15 * time.Minute},
				},
				ExcludeRoutes: excludedRoutes,
			},
			AuthShield: sentinel.AuthShieldConfig{
				Enabled:    true,
				LoginRoute: "/api/auth/login",
			},
			Anomaly: sentinel.AnomalyConfig{
				Enabled: true,
			},
			Geo: sentinel.GeoConfig{
				Enabled: true,
			},
		})
		log.Println("Sentinel security suite mounted at /sentinel")
	}

	// Mount GORM Studio
	if cfg.GORMStudioEnabled {
		studioCfg := studio.Config{
			Prefix: "/studio",
		}
		if cfg.GORMStudioUsername != "" && cfg.GORMStudioPassword != "" {
			studioCfg.AuthMiddleware = gin.BasicAuth(gin.Accounts{
				cfg.GORMStudioUsername: cfg.GORMStudioPassword,
			})
		}
		studio.Mount(r, db, []interface{}{&models.Tenant{}, &models.User{}, &models.Upload{}, &models.Blog{}, &models.Setting{}, &models.MediaAsset{}, &models.Tag{}, &models.Contact{}, &models.ContactActivity{}, &models.CustomFieldDefinition{}, &models.Page{}, &models.Post{}, &models.PostCategory{}, &models.PostTag{}, &models.Menu{}, &models.MenuItem{}, &models.EmailList{}, &models.EmailSubscription{}, &models.EmailTemplate{}, &models.EmailCampaign{}, &models.EmailSend{}, &models.EmailSequence{}, &models.EmailSequenceStep{}, &models.EmailSequenceEnrollment{}, &models.Segment{}, &models.Course{}, &models.CourseModule{}, &models.Lesson{}, &models.CourseEnrollment{}, &models.LessonProgress{}, &models.Quiz{}, &models.QuizQuestion{}, &models.QuizAttempt{}, &models.Certificate{}, &models.Product{}, &models.Price{}, &models.ProductVariant{}, &models.Coupon{}, &models.Order{}, &models.OrderItem{}, &models.Subscription{}, &models.Space{}, &models.CommunityMember{}, &models.Thread{}, &models.Reply{}, &models.Reaction{}, &models.CommunityEvent{}, &models.EventAttendee{}, &models.Funnel{}, &models.FunnelStep{}, &models.FunnelVisit{}, &models.FunnelConversion{}, &models.Calendar{}, &models.BookingEventType{}, &models.Availability{}, &models.Appointment{}, &models.AffiliateProgram{}, &models.AffiliateAccount{}, &models.AffiliateLink{}, &models.Commission{}, &models.Payout{}, &models.Workflow{}, &models.WorkflowAction{}, &models.WorkflowExecution{} /* grit:studio */}, studioCfg)
		log.Println("GORM Studio mounted at /studio")
	}

	// API Documentation (gin-docs — auto-generated from routes + models)
	gindocs.Mount(r, db, gindocs.Config{
		Title:       cfg.AppName + " API",
		Description: "REST API built with [Grit](https://gritframework.dev) — Go + React meta-framework.",
		Version:     "1.0.0",
		UI:          gindocs.UIScalar,
		ScalarTheme: "kepler",
		Models:      []interface{}{&models.Tenant{}, &models.User{}, &models.Upload{}, &models.Blog{}, &models.Setting{}, &models.MediaAsset{}, &models.Tag{}, &models.Contact{}, &models.ContactActivity{}, &models.CustomFieldDefinition{}, &models.Page{}, &models.Post{}, &models.PostCategory{}, &models.PostTag{}, &models.Menu{}, &models.MenuItem{}, &models.EmailList{}, &models.EmailSubscription{}, &models.EmailTemplate{}, &models.EmailCampaign{}, &models.EmailSend{}, &models.EmailSequence{}, &models.EmailSequenceStep{}, &models.EmailSequenceEnrollment{}, &models.Segment{}, &models.Course{}, &models.CourseModule{}, &models.Lesson{}, &models.CourseEnrollment{}, &models.LessonProgress{}, &models.Quiz{}, &models.QuizQuestion{}, &models.QuizAttempt{}, &models.Certificate{}, &models.Product{}, &models.Price{}, &models.ProductVariant{}, &models.Coupon{}, &models.Order{}, &models.OrderItem{}, &models.Subscription{}, &models.Space{}, &models.CommunityMember{}, &models.Thread{}, &models.Reply{}, &models.Reaction{}, &models.CommunityEvent{}, &models.EventAttendee{}, &models.Funnel{}, &models.FunnelStep{}, &models.FunnelVisit{}, &models.FunnelConversion{}, &models.Calendar{}, &models.BookingEventType{}, &models.Availability{}, &models.Appointment{}, &models.AffiliateProgram{}, &models.AffiliateAccount{}, &models.AffiliateLink{}, &models.Commission{}, &models.Payout{}, &models.Workflow{}, &models.WorkflowAction{}, &models.WorkflowExecution{}},
		Auth: gindocs.AuthConfig{
			Type:         gindocs.AuthBearer,
			BearerFormat: "JWT",
		},
	})
	log.Println("API docs available at /docs")

	// Mount Pulse observability (request tracing, DB monitoring, runtime metrics, error tracking)
	if cfg.PulseEnabled {
		p := pulse.Mount(r, db, pulse.Config{
			AppName: cfg.AppName,
			DevMode: cfg.IsDevelopment(),
			Dashboard: pulse.DashboardConfig{
				Username: cfg.PulseUsername,
				Password: cfg.PulsePassword,
			},
			Tracing: pulse.TracingConfig{
				ExcludePaths: []string{"/studio/*", "/sentinel/*", "/docs/*", "/pulse/*"},
			},
			Alerts: pulse.AlertConfig{},
			Prometheus: pulse.PrometheusConfig{
				Enabled: true,
			},
		})

		// Register health checks for connected services
		if svc.Cache != nil {
			p.AddHealthCheck(pulse.HealthCheck{
				Name:     "redis",
				Type:     "redis",
				Critical: false,
				CheckFunc: func(ctx context.Context) error {
					return svc.Cache.Client().Ping(ctx).Err()
				},
			})
		}

		log.Println("Pulse observability mounted at /pulse")
	}

	// Auth service
	authService := &services.AuthService{
		Secret:        cfg.JWTSecret,
		AccessExpiry:  cfg.JWTAccessExpiry,
		RefreshExpiry: cfg.JWTRefreshExpiry,
	}

	// Handlers
	authHandler := &handlers.AuthHandler{
		DB:          db,
		AuthService: authService,
		Config:      cfg,
	}
	userHandler := &handlers.UserHandler{
		DB: db,
	}
	uploadHandler := &handlers.UploadHandler{
		DB:      db,
		Storage: svc.Storage,
		Jobs:    svc.Jobs,
	}
	aiHandler := &handlers.AIHandler{
		AI: svc.AI,
	}
	jobsHandler := &handlers.JobsHandler{
		RedisURL: cfg.RedisURL,
	}
	cronHandler := &handlers.CronHandler{}
	blogHandler := handlers.NewBlogHandler(db)
	contactHandler := handlers.NewContactHandler(db, svc.Mailer, svc.Jobs)
	mediaHandler := handlers.NewMediaHandler(db, svc.Storage, svc.Jobs)
	pageHandler := handlers.NewPageHandler(db)
	postHandler := handlers.NewPostHandler(db)
	menuHandler := handlers.NewMenuHandler(db)
	settingHandler := handlers.NewSettingHandler(db)
	emailHandler := handlers.NewEmailHandler(db, svc.Jobs)
	courseHandler := handlers.NewCourseHandler(db)
	commerceHandler := handlers.NewCommerceHandler(db, svc.Cache)
	analyticsHandler := handlers.NewAnalyticsHandler(db)
	communityHandler := handlers.NewCommunityHandler(db)
	funnelHandler := handlers.NewFunnelHandler(db)
	meetingService := integrations.NewMeetingService(db, cfg)
	bookingHandler := handlers.NewBookingHandler(db, meetingService, cfg)
	affiliateHandler := handlers.NewAffiliateHandler(db)
	workflowHandler := handlers.NewWorkflowHandler(db)
	paymentHandler := handlers.NewPaymentHandler(db, cfg)
	// grit:handlers

	// Health check
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"version": "0.1.0",
		})
	})

	// Cache middleware for public GET routes (5 min TTL)
	publicCache := middleware.CacheResponse(svc.Cache, 5*time.Minute)
	shortCache := middleware.CacheResponse(svc.Cache, 1*time.Minute)

	// Public blog routes (no auth required)
	blogs := r.Group("/api/blogs")
	{
		blogs.GET("", publicCache, blogHandler.ListPublished)
		blogs.GET("/:slug", publicCache, blogHandler.GetBySlug)
	}

	// Public website routes (no auth required, cached)
	// NOTE: Public routes use /api/p/ prefix to avoid conflicts with admin /api/ routes
	r.GET("/api/p/posts", publicCache, postHandler.ListPublished)
	r.GET("/api/p/posts/:slug", publicCache, postHandler.GetBySlug)
	r.GET("/api/p/posts/:slug/jsonld", publicCache, postHandler.JSONLD)
	r.GET("/api/p/pages/:slug", publicCache, pageHandler.GetBySlug)
	r.GET("/api/p/menus/location/:location", publicCache, menuHandler.GetByLocation)
	r.GET("/api/rss.xml", publicCache, postHandler.RSS)
	r.GET("/sitemap.xml", publicCache, postHandler.Sitemap)
	r.GET("/robots.txt", publicCache, postHandler.RobotsTxt)
	r.GET("/api/theme", publicCache, settingHandler.GetPublicTheme)

	// Public email routes (subscribe, confirm, unsubscribe, tracking)
	r.GET("/api/p/email/lists/:id", publicCache, emailHandler.GetPublicList)
	r.POST("/api/email/subscribe", emailHandler.Subscribe)
	r.GET("/api/email/confirm/:token", emailHandler.ConfirmSubscription)
	r.POST("/api/email/unsubscribe", emailHandler.Unsubscribe)
	r.GET("/api/email/track/open/:id", emailHandler.TrackOpen)
	r.GET("/api/email/track/click/:id", emailHandler.TrackClick)

	// Public course routes (cached)
	r.GET("/api/p/courses", publicCache, courseHandler.ListPublishedCourses)
	r.GET("/api/p/courses/:slug", publicCache, courseHandler.GetPublishedCourse)
	r.GET("/api/certificates/verify/:number", publicCache, courseHandler.VerifyCertificate)

	// Public commerce routes (cached)
	r.GET("/api/p/products", publicCache, commerceHandler.ListPublicProducts)
	r.GET("/api/p/products/:slug", publicCache, commerceHandler.GetPublicProduct)
	r.GET("/api/coupons/validate", shortCache, commerceHandler.ValidateCoupon)

	// Public community routes (cached)
	r.GET("/api/p/community/spaces", publicCache, communityHandler.ListPublicSpaces)
	r.GET("/api/p/community/spaces/:slug", shortCache, communityHandler.GetPublicSpace)

	// Public funnel routes (cached)
	r.GET("/api/p/funnels/:slug", publicCache, funnelHandler.GetPublicFunnel)
	r.GET("/api/p/funnels/:slug/:stepSlug", publicCache, funnelHandler.GetPublicStep)
	r.POST("/api/funnels/track/visit", funnelHandler.TrackVisit)
	r.POST("/api/funnels/track/conversion", funnelHandler.TrackConversion)

	// Public booking routes (event type cached, slots are real-time)
	r.GET("/api/p/booking/event-types", publicCache, bookingHandler.ListPublicEventTypes)
	r.GET("/api/book/:slug", publicCache, bookingHandler.GetPublicEventType)
	r.GET("/api/book/:slug/slots", bookingHandler.GetAvailableSlots)
	r.POST("/api/book/:slug", bookingHandler.BookAppointment)

	// Google Calendar OAuth callback (public — Google redirects here)
	r.GET("/api/integrations/google/callback", bookingHandler.GoogleCallback)

	// Stripe webhook (public, no auth — Stripe sends events here)
	r.POST("/api/webhooks/stripe", paymentHandler.StripeWebhook)

	// Public Stripe config (publishable key)
	r.GET("/api/p/stripe/config", paymentHandler.StripeConfig)

	// Public affiliate routes
	r.GET("/api/ref/:code", affiliateHandler.TrackReferral)

	// Public auth routes
	auth := r.Group("/api/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.Refresh)
		auth.POST("/forgot-password", authHandler.ForgotPassword)
		auth.POST("/reset-password", authHandler.ResetPassword)
	}

	// OAuth2 social login
	oauth := auth.Group("/oauth")
	{
		oauth.GET("/:provider", authHandler.OAuthBegin)
		oauth.GET("/:provider/callback", authHandler.OAuthCallback)
	}

	// Protected routes
	protected := r.Group("/api")
	protected.Use(middleware.Auth(db, authService))
	{
		protected.GET("/auth/me", authHandler.Me)
		protected.POST("/auth/logout", authHandler.Logout)

		// User routes (authenticated)
		protected.GET("/users/:id", userHandler.GetByID)

		// File uploads
		protected.POST("/uploads", uploadHandler.Create)
		protected.POST("/uploads/presign", uploadHandler.Presign)
		protected.POST("/uploads/complete", uploadHandler.CompleteUpload)
		protected.GET("/uploads", uploadHandler.List)
		protected.GET("/uploads/:id", uploadHandler.GetByID)
		protected.DELETE("/uploads/:id", uploadHandler.Delete)

		// AI
		protected.POST("/ai/complete", aiHandler.Complete)
		protected.POST("/ai/chat", aiHandler.Chat)
		protected.POST("/ai/stream", aiHandler.Stream)

		// Student routes (any authenticated user)
		student := protected.Group("/student")
		{
			student.GET("/courses", courseHandler.StudentGetCourses)
			student.GET("/courses/:id", courseHandler.StudentGetCourse)
			student.POST("/courses/:id/enroll", courseHandler.StudentEnroll)
			student.POST("/courses/:id/lessons/:lessonId/complete", courseHandler.StudentMarkLessonComplete)

			// Purchases
			student.GET("/purchases", commerceHandler.StudentGetPurchases)
			student.GET("/purchases/:orderId", commerceHandler.StudentGetPurchase)
		}

		// Checkout (any authenticated user)
		protected.POST("/checkout", paymentHandler.Checkout)
		protected.GET("/checkout/:orderId/status", paymentHandler.CheckoutStatus)
		protected.POST("/checkout/:orderId/confirm", paymentHandler.ConfirmCheckout)

		// grit:routes:protected
	}

	// Profile routes (any authenticated user)
	profile := protected.Group("/profile")
	{
		profile.GET("", userHandler.GetProfile)
		profile.PUT("", userHandler.UpdateProfile)
		profile.DELETE("", userHandler.DeleteProfile)
	}

	// Admin routes
	admin := r.Group("/api")
	admin.Use(middleware.Auth(db, authService))
	admin.Use(middleware.RequireRole("ADMIN"))
	{
		admin.GET("/users", userHandler.List)
		admin.POST("/users", userHandler.Create)
		admin.PUT("/users/:id", userHandler.Update)
		admin.DELETE("/users/:id", userHandler.Delete)

		// Admin system routes
		admin.GET("/admin/jobs/stats", jobsHandler.Stats)
		admin.GET("/admin/jobs/:status", jobsHandler.ListByStatus)
		admin.POST("/admin/jobs/:id/retry", jobsHandler.Retry)
		admin.DELETE("/admin/jobs/queue/:queue", jobsHandler.ClearQueue)
		admin.GET("/admin/cron/tasks", cronHandler.ListTasks)

		// Blog management (admin)
		admin.GET("/admin/blogs", blogHandler.List)
		admin.POST("/admin/blogs", blogHandler.Create)
		admin.PUT("/admin/blogs/:id", blogHandler.Update)
		admin.DELETE("/admin/blogs/:id", blogHandler.Delete)

		// Contact management (admin)
		admin.GET("/contacts", contactHandler.List)
		admin.GET("/contacts/sources", contactHandler.ListSources)
		admin.POST("/contacts/send-email", contactHandler.SendEmail)
		admin.GET("/contacts/:id", contactHandler.GetByID)
		admin.POST("/contacts", contactHandler.Create)
		admin.PUT("/contacts/:id", contactHandler.Update)
		admin.DELETE("/contacts/:id", contactHandler.Delete)
		admin.GET("/contacts/:id/activities", contactHandler.GetActivities)

		// Tag management (admin)
		admin.GET("/tags", contactHandler.ListTags)
		admin.POST("/tags", contactHandler.CreateTag)
		admin.DELETE("/tags/:id", contactHandler.DeleteTag)

		// Media library (admin)
		admin.POST("/media", mediaHandler.Upload)
		admin.GET("/media", mediaHandler.List)
		admin.GET("/media/:id", mediaHandler.GetByID)
		admin.PUT("/media/:id", mediaHandler.Update)
		admin.DELETE("/media/:id", mediaHandler.Delete)

		// Page management (admin)
		admin.GET("/pages", pageHandler.List)
		admin.GET("/pages/hierarchy", pageHandler.ListHierarchy)
		admin.GET("/pages/:id", pageHandler.GetByID)
		admin.POST("/pages", pageHandler.Create)
		admin.PUT("/pages/:id", pageHandler.Update)
		admin.DELETE("/pages/:id", pageHandler.Delete)

		// Post management (admin)
		admin.GET("/posts", postHandler.List)
		admin.GET("/posts/:id", postHandler.GetByID)
		admin.POST("/posts", postHandler.Create)
		admin.PUT("/posts/:id", postHandler.Update)
		admin.DELETE("/posts/:id", postHandler.Delete)

		// Post categories (admin)
		admin.GET("/post-categories", postHandler.ListCategories)
		admin.POST("/post-categories", postHandler.CreateCategory)
		admin.PUT("/post-categories/:id", postHandler.UpdateCategory)
		admin.DELETE("/post-categories/:id", postHandler.DeleteCategory)

		// Post tags (admin)
		admin.GET("/post-tags", postHandler.ListPostTags)
		admin.POST("/post-tags", postHandler.CreatePostTag)
		admin.DELETE("/post-tags/:id", postHandler.DeletePostTag)

		// Menu management (admin)
		admin.GET("/menus", menuHandler.List)
		admin.GET("/menus/:id", menuHandler.GetByID)
		admin.POST("/menus", menuHandler.Create)
		admin.PUT("/menus/:id", menuHandler.Update)
		admin.DELETE("/menus/:id", menuHandler.Delete)
		admin.POST("/menus/:id/items", menuHandler.CreateMenuItem)
		admin.PUT("/menus/:id/items/:itemId", menuHandler.UpdateMenuItem)
		admin.DELETE("/menus/:id/items/:itemId", menuHandler.DeleteMenuItem)
		admin.PUT("/menus/:id/reorder", menuHandler.ReorderMenuItems)

		// Settings management (admin)
		admin.GET("/settings/:group", settingHandler.GetByGroup)
		admin.PUT("/settings/:group", settingHandler.BulkUpsert)
		admin.POST("/seed-defaults", settingHandler.SeedDefaults)

		// Email lists (admin)
		admin.GET("/email/lists", emailHandler.ListEmailLists)
		admin.GET("/email/lists/:id", emailHandler.GetEmailList)
		admin.POST("/email/lists", emailHandler.CreateEmailList)
		admin.PUT("/email/lists/:id", emailHandler.UpdateEmailList)
		admin.DELETE("/email/lists/:id", emailHandler.DeleteEmailList)

		// Email list subscribers (admin)
		admin.GET("/email/lists/:id/subscribers", emailHandler.ListSubscribers)
		admin.POST("/email/lists/:id/subscribers", emailHandler.AdminAddSubscriber)
		admin.DELETE("/email/lists/:id/subscribers/:subId", emailHandler.AdminRemoveSubscriber)
		admin.POST("/email/lists/:id/import", emailHandler.ImportSubscribers)
		admin.GET("/email/lists/:id/export", emailHandler.ExportSubscribers)

		// Email templates (admin)
		admin.GET("/email/templates", emailHandler.ListTemplates)
		admin.GET("/email/templates/:id", emailHandler.GetTemplate)
		admin.POST("/email/templates", emailHandler.CreateTemplate)
		admin.PUT("/email/templates/:id", emailHandler.UpdateTemplate)
		admin.DELETE("/email/templates/:id", emailHandler.DeleteTemplate)
		admin.GET("/email/templates/:id/preview", emailHandler.PreviewTemplate)

		// Email campaigns (admin)
		admin.GET("/email/campaigns", emailHandler.ListCampaigns)
		admin.GET("/email/campaigns/:id", emailHandler.GetCampaign)
		admin.POST("/email/campaigns", emailHandler.CreateCampaign)
		admin.PUT("/email/campaigns/:id", emailHandler.UpdateCampaign)
		admin.DELETE("/email/campaigns/:id", emailHandler.DeleteCampaign)
		admin.POST("/email/campaigns/:id/schedule", emailHandler.ScheduleCampaign)
		admin.GET("/email/campaigns/:id/stats", emailHandler.GetCampaignStats)

		// Email sequences (admin)
		admin.GET("/email/sequences", emailHandler.ListSequences)
		admin.GET("/email/sequences/:id", emailHandler.GetSequence)
		admin.POST("/email/sequences", emailHandler.CreateSequence)
		admin.PUT("/email/sequences/:id", emailHandler.UpdateSequence)
		admin.DELETE("/email/sequences/:id", emailHandler.DeleteSequence)

		// Sequence steps (admin)
		admin.POST("/email/sequences/:id/steps", emailHandler.CreateSequenceStep)
		admin.PUT("/email/sequences/:id/steps/:stepId", emailHandler.UpdateSequenceStep)
		admin.DELETE("/email/sequences/:id/steps/:stepId", emailHandler.DeleteSequenceStep)

		// Sequence enrollments (admin)
		admin.POST("/email/sequences/:id/enroll", emailHandler.EnrollContact)
		admin.GET("/email/sequences/:id/enrollments", emailHandler.ListEnrollments)
		admin.DELETE("/email/sequences/:id/enrollments/:enrollId", emailHandler.CancelEnrollment)

		// Segments (admin)
		admin.GET("/email/segments", emailHandler.ListSegments)
		admin.GET("/email/segments/:id", emailHandler.GetSegment)
		admin.POST("/email/segments", emailHandler.CreateSegment)
		admin.PUT("/email/segments/:id", emailHandler.UpdateSegment)
		admin.DELETE("/email/segments/:id", emailHandler.DeleteSegment)
		admin.GET("/email/segments/:id/preview", emailHandler.PreviewSegment)

		// Email sends log & dashboard (admin)
		admin.GET("/email/sends", emailHandler.ListSends)
		admin.GET("/email/dashboard", emailHandler.DashboardStats)

		// Course management (admin)
		admin.GET("/courses", courseHandler.ListCourses)
		admin.GET("/courses/:id", courseHandler.GetCourse)
		admin.POST("/courses", courseHandler.CreateCourse)
		admin.PUT("/courses/:id", courseHandler.UpdateCourse)
		admin.DELETE("/courses/:id", courseHandler.DeleteCourse)
		admin.POST("/courses/:id/duplicate", courseHandler.DuplicateCourse)
		admin.POST("/courses/:id/publish", courseHandler.PublishCourse)
		admin.GET("/courses/:id/analytics", courseHandler.CourseAnalytics)

		// Course modules (admin)
		admin.POST("/courses/:id/modules", courseHandler.CreateModule)
		admin.PUT("/courses/:id/modules/:modId", courseHandler.UpdateModule)
		admin.DELETE("/courses/:id/modules/:modId", courseHandler.DeleteModule)
		admin.PUT("/courses/:id/modules/reorder", courseHandler.ReorderModules)

		// Course lessons (admin)
		admin.POST("/courses/:id/modules/:modId/lessons", courseHandler.CreateLesson)
		admin.GET("/courses/:id/lessons/:lessonId", courseHandler.GetLesson)
		admin.PUT("/courses/:id/lessons/:lessonId", courseHandler.UpdateLesson)
		admin.DELETE("/courses/:id/lessons/:lessonId", courseHandler.DeleteLesson)
		admin.PUT("/courses/:id/modules/:modId/lessons/reorder", courseHandler.ReorderLessons)

		// Course enrollments (admin)
		admin.POST("/courses/:id/enroll", courseHandler.EnrollContact)
		admin.GET("/courses/:id/enrollments", courseHandler.ListEnrollments)
		admin.DELETE("/courses/:id/enrollments/:enrollId", courseHandler.UnenrollContact)

		// Course progress (admin)
		admin.POST("/courses/progress/complete", courseHandler.MarkLessonComplete)
		admin.GET("/courses/enrollments/:enrollId/progress", courseHandler.GetProgress)

		// Quizzes (admin)
		admin.POST("/courses/:id/lessons/:lessonId/quizzes", courseHandler.CreateQuiz)
		admin.PUT("/courses/:id/quizzes/:quizId", courseHandler.UpdateQuiz)
		admin.DELETE("/courses/:id/quizzes/:quizId", courseHandler.DeleteQuiz)

		// Quiz questions (admin)
		admin.POST("/courses/:id/quizzes/:quizId/questions", courseHandler.CreateQuestion)
		admin.PUT("/courses/:id/quizzes/:quizId/questions/:qId", courseHandler.UpdateQuestion)
		admin.DELETE("/courses/:id/quizzes/:quizId/questions/:qId", courseHandler.DeleteQuestion)

		// Quiz attempts
		admin.POST("/courses/:id/quizzes/:quizId/attempt", courseHandler.SubmitQuizAttempt)
		admin.GET("/courses/:id/quizzes/:quizId/attempts", courseHandler.ListQuizAttempts)

		// Certificates (admin)
		admin.GET("/certificates", courseHandler.ListCertificates)

		// Products (admin)
		admin.GET("/products", commerceHandler.ListProducts)
		admin.GET("/products/:id", commerceHandler.GetProduct)
		admin.POST("/products", commerceHandler.CreateProduct)
		admin.PUT("/products/:id", commerceHandler.UpdateProduct)
		admin.DELETE("/products/:id", commerceHandler.DeleteProduct)

		// Prices (admin)
		admin.POST("/products/:id/prices", commerceHandler.CreatePrice)
		admin.PUT("/products/:id/prices/:priceId", commerceHandler.UpdatePrice)
		admin.DELETE("/products/:id/prices/:priceId", commerceHandler.DeletePrice)

		// Variants (admin)
		admin.POST("/products/:id/variants", commerceHandler.CreateVariant)
		admin.PUT("/products/:id/variants/:variantId", commerceHandler.UpdateVariant)
		admin.DELETE("/products/:id/variants/:variantId", commerceHandler.DeleteVariant)

		// Orders (admin)
		admin.GET("/orders", commerceHandler.ListOrders)
		admin.GET("/orders/:orderId", commerceHandler.GetOrder)
		admin.POST("/orders", commerceHandler.CreateOrder)
		admin.PUT("/orders/:orderId/status", commerceHandler.UpdateOrderStatus)
		admin.POST("/orders/:orderId/refund", commerceHandler.RefundOrder)

		// Coupons (admin)
		admin.GET("/coupons", commerceHandler.ListCoupons)
		admin.GET("/coupons/:couponId", commerceHandler.GetCoupon)
		admin.POST("/coupons", commerceHandler.CreateCoupon)
		admin.PUT("/coupons/:couponId", commerceHandler.UpdateCoupon)
		admin.DELETE("/coupons/:couponId", commerceHandler.DeleteCoupon)

		// Subscriptions (admin)
		admin.GET("/subscriptions", commerceHandler.ListSubscriptions)
		admin.GET("/subscriptions/:subId", commerceHandler.GetSubscription)
		admin.POST("/subscriptions/:subId/cancel", commerceHandler.CancelSubscription)

		// Revenue dashboard (admin)
		admin.GET("/commerce/dashboard", commerceHandler.RevenueDashboard)

		// Analytics & CRM (admin)
		admin.GET("/analytics/dashboard", analyticsHandler.Dashboard)
		admin.GET("/analytics/revenue-chart", analyticsHandler.RevenueChart)
		admin.GET("/analytics/subscriber-growth", analyticsHandler.SubscriberGrowth)
		admin.GET("/analytics/top-products", analyticsHandler.TopProducts)
		admin.GET("/analytics/activity-timeline", analyticsHandler.ActivityTimeline)
		admin.GET("/contacts/:id/profile", analyticsHandler.ContactProfile)
		admin.GET("/contacts/export", analyticsHandler.ContactExport)
		admin.POST("/contacts/import", contactHandler.ImportContacts)

		// Community (admin)
		admin.GET("/community/spaces", communityHandler.ListSpaces)
		admin.GET("/community/spaces/:id", communityHandler.GetSpace)
		admin.POST("/community/spaces", communityHandler.CreateSpace)
		admin.PUT("/community/spaces/:id", communityHandler.UpdateSpace)
		admin.DELETE("/community/spaces/:id", communityHandler.DeleteSpace)
		admin.PUT("/community/spaces/reorder", communityHandler.ReorderSpaces)

		// Members (admin)
		admin.GET("/community/spaces/:id/members", communityHandler.ListMembers)
		admin.POST("/community/spaces/:id/members", communityHandler.AddMember)
		admin.DELETE("/community/members/:memberId", communityHandler.RemoveMember)
		admin.PUT("/community/members/:memberId/role", communityHandler.UpdateMemberRole)

		// Threads (admin)
		admin.GET("/community/spaces/:id/threads", communityHandler.ListThreads)
		admin.GET("/community/threads/:threadId", communityHandler.GetThread)
		admin.POST("/community/spaces/:id/threads", communityHandler.CreateThread)
		admin.PUT("/community/threads/:threadId", communityHandler.UpdateThread)
		admin.DELETE("/community/threads/:threadId", communityHandler.DeleteThread)
		admin.POST("/community/threads/:threadId/pin", communityHandler.PinThread)
		admin.POST("/community/threads/:threadId/close", communityHandler.CloseThread)

		// Replies (admin)
		admin.POST("/community/threads/:threadId/replies", communityHandler.CreateReply)
		admin.PUT("/community/replies/:replyId", communityHandler.UpdateReply)
		admin.DELETE("/community/replies/:replyId", communityHandler.DeleteReply)

		// Reactions (admin)
		admin.POST("/community/reactions", communityHandler.ToggleReaction)

		// Events (admin)
		admin.GET("/community/events", communityHandler.ListEvents)
		admin.GET("/community/events/:eventId", communityHandler.GetEvent)
		admin.POST("/community/events", communityHandler.CreateEvent)
		admin.PUT("/community/events/:eventId", communityHandler.UpdateEvent)
		admin.DELETE("/community/events/:eventId", communityHandler.DeleteEvent)
		admin.POST("/community/events/:eventId/register", communityHandler.RegisterForEvent)
		admin.DELETE("/community/events/:eventId/attendees/:attendeeId", communityHandler.CancelRegistration)

		// Funnels (admin)
		admin.GET("/funnels", funnelHandler.ListFunnels)
		admin.GET("/funnels/:id", funnelHandler.GetFunnel)
		admin.POST("/funnels", funnelHandler.CreateFunnel)
		admin.PUT("/funnels/:id", funnelHandler.UpdateFunnel)
		admin.DELETE("/funnels/:id", funnelHandler.DeleteFunnel)
		admin.GET("/funnels/:id/analytics", funnelHandler.FunnelAnalytics)

		// Funnel steps (admin)
		admin.POST("/funnels/:id/steps", funnelHandler.CreateStep)
		admin.PUT("/funnels/:id/steps/:stepId", funnelHandler.UpdateStep)
		admin.DELETE("/funnels/:id/steps/:stepId", funnelHandler.DeleteStep)
		admin.PUT("/funnels/:id/steps/reorder", funnelHandler.ReorderSteps)

		// Booking calendars (admin)
		admin.GET("/booking/calendars", bookingHandler.ListCalendars)
		admin.GET("/booking/calendars/:id", bookingHandler.GetCalendar)
		admin.POST("/booking/calendars", bookingHandler.CreateCalendar)
		admin.PUT("/booking/calendars/:id", bookingHandler.UpdateCalendar)
		admin.DELETE("/booking/calendars/:id", bookingHandler.DeleteCalendar)

		// Booking event types (admin)
		admin.POST("/booking/calendars/:id/event-types", bookingHandler.CreateEventType)
		admin.PUT("/booking/event-types/:etId", bookingHandler.UpdateEventType)
		admin.DELETE("/booking/event-types/:etId", bookingHandler.DeleteEventType)

		// Booking availability (admin)
		admin.PUT("/booking/calendars/:id/availability", bookingHandler.SetAvailability)

		// Booking appointments (admin)
		admin.GET("/booking/appointments", bookingHandler.ListAppointments)
		admin.GET("/booking/appointments/:appointmentId", bookingHandler.GetAppointment)
		admin.POST("/booking/appointments/:appointmentId/cancel", bookingHandler.CancelAppointment)
		admin.POST("/booking/appointments/:appointmentId/complete", bookingHandler.CompleteAppointment)
		admin.POST("/booking/appointments/:appointmentId/reschedule", bookingHandler.RescheduleAppointment)

		// Integrations (admin)
		admin.GET("/integrations/google/auth-url", bookingHandler.GoogleAuthURL)
		admin.GET("/integrations/google/status", bookingHandler.GoogleStatus)
		admin.POST("/integrations/google/disconnect", bookingHandler.GoogleDisconnect)
		admin.GET("/integrations/zoom/status", bookingHandler.ZoomStatus)

		// Affiliate programs (admin)
		admin.GET("/affiliates/programs", affiliateHandler.ListPrograms)
		admin.GET("/affiliates/programs/:id", affiliateHandler.GetProgram)
		admin.POST("/affiliates/programs", affiliateHandler.CreateProgram)
		admin.PUT("/affiliates/programs/:id", affiliateHandler.UpdateProgram)
		admin.DELETE("/affiliates/programs/:id", affiliateHandler.DeleteProgram)

		// Affiliate accounts (admin)
		admin.GET("/affiliates/accounts", affiliateHandler.ListAccounts)
		admin.GET("/affiliates/accounts/:accountId", affiliateHandler.GetAccount)
		admin.POST("/affiliates/accounts", affiliateHandler.CreateAccount)
		admin.PUT("/affiliates/accounts/:accountId/status", affiliateHandler.UpdateAccountStatus)

		// Affiliate links (admin)
		admin.POST("/affiliates/accounts/:accountId/links", affiliateHandler.CreateLink)
		admin.DELETE("/affiliates/links/:linkId", affiliateHandler.DeleteLink)

		// Commissions (admin)
		admin.GET("/affiliates/commissions", affiliateHandler.ListCommissions)
		admin.POST("/affiliates/commissions/:commissionId/approve", affiliateHandler.ApproveCommission)
		admin.POST("/affiliates/commissions/:commissionId/reject", affiliateHandler.RejectCommission)

		// Payouts (admin)
		admin.GET("/affiliates/payouts", affiliateHandler.ListPayouts)
		admin.POST("/affiliates/payouts", affiliateHandler.CreatePayout)
		admin.POST("/affiliates/payouts/:payoutId/process", affiliateHandler.ProcessPayout)

		// Affiliate dashboard (admin)
		admin.GET("/affiliates/dashboard", affiliateHandler.Dashboard)

		// Workflows (admin)
		admin.GET("/workflows", workflowHandler.ListWorkflows)
		admin.GET("/workflows/:id", workflowHandler.GetWorkflow)
		admin.POST("/workflows", workflowHandler.CreateWorkflow)
		admin.PUT("/workflows/:id", workflowHandler.UpdateWorkflow)
		admin.DELETE("/workflows/:id", workflowHandler.DeleteWorkflow)
		admin.POST("/workflows/:id/trigger", workflowHandler.TriggerWorkflow)

		// Workflow actions (admin)
		admin.POST("/workflows/:id/actions", workflowHandler.CreateAction)
		admin.PUT("/workflows/:id/actions/:actionId", workflowHandler.UpdateAction)
		admin.DELETE("/workflows/:id/actions/:actionId", workflowHandler.DeleteAction)
		admin.PUT("/workflows/:id/actions/reorder", workflowHandler.ReorderActions)

		// Workflow executions (admin)
		admin.GET("/workflows/executions", workflowHandler.ListExecutions)
		admin.GET("/workflows/executions/:execId", workflowHandler.GetExecution)

		// System info (admin)
		admin.GET("/admin/system/info", func(c *gin.Context) {
			var dbVersion string
			db.Raw("SELECT version()").Scan(&dbVersion)

			enabledServices := []string{}
			if svc.Cache != nil {
				enabledServices = append(enabledServices, "Redis Cache")
			}
			if svc.Storage != nil {
				enabledServices = append(enabledServices, "S3 Storage")
			}
			if svc.Mailer != nil {
				enabledServices = append(enabledServices, "Email (Resend)")
			}
			if svc.AI != nil {
				enabledServices = append(enabledServices, "AI")
			}
			if svc.Jobs != nil {
				enabledServices = append(enabledServices, "Background Jobs")
			}

			var tableCount int64
			db.Raw("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'").Scan(&tableCount)

			var modelCount int
			modelCount = len(models.Models())

			c.JSON(http.StatusOK, gin.H{"data": gin.H{
				"version":          "1.0.0",
				"go_version":       runtime.Version(),
				"environment":      cfg.AppEnv,
				"database":         dbVersion,
				"database_tables":  tableCount,
				"registered_models": modelCount,
				"enabled_services": enabledServices,
				"os":               runtime.GOOS + "/" + runtime.GOARCH,
				"goroutines":       runtime.NumGoroutine(),
			}})
		})

		// grit:routes:admin
	}

	// Custom role-restricted routes
	// grit:routes:custom

	// Register contact activity event listeners
	services.RegisterActivityListeners(db)

	return r
}
