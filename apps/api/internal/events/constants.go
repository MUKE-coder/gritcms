package events

// Event name constants for cross-module communication.
// Use these instead of string literals when emitting or listening.

// Contact events
const (
	ContactCreated = "contact.created"
	ContactUpdated = "contact.updated"
	ContactDeleted = "contact.deleted"
	ContactTagged  = "contact.tagged"
)

// Email events
const (
	EmailSubscribed    = "email.subscribed"
	EmailUnsubscribed  = "email.unsubscribed"
	EmailCampaignSent  = "email.campaign.sent"
	EmailOpened        = "email.opened"
	EmailClicked       = "email.clicked"
	EmailBounced       = "email.bounced"
	EmailSequenceEnrolled  = "email.sequence.enrolled"
	EmailSequenceCompleted = "email.sequence.completed"
	EmailSequenceStepSent  = "email.sequence.step.sent"
)

// Course events
const (
	CourseEnrolled       = "course.enrolled"
	CourseLessonCompleted = "course.lesson.completed"
	CourseCompleted      = "course.completed"
)

// Purchase / Commerce events
const (
	PurchaseCompleted = "purchase.completed"
	PurchaseRefunded  = "purchase.refunded"
	SubscriptionCreated  = "subscription.created"
	SubscriptionRenewed  = "subscription.renewed"
	SubscriptionCancelled = "subscription.cancelled"
	SubscriptionPastDue  = "subscription.past_due"
)

// Community events
const (
	CommunityThreadCreated = "community.thread.created"
	CommunityReplyCreated  = "community.reply.created"
	CommunityMemberJoined  = "community.member.joined"
)

// Booking events
const (
	BookingConfirmed   = "booking.confirmed"
	BookingCancelled   = "booking.cancelled"
	BookingRescheduled = "booking.rescheduled"
)

// Funnel events
const (
	FunnelVisited   = "funnel.visited"
	FunnelConverted = "funnel.converted"
)

// Affiliate events
const (
	AffiliateReferral  = "affiliate.referral"
	AffiliateCommission = "affiliate.commission"
)

// Website events
const (
	PagePublished = "website.page.published"
	PostPublished = "website.post.published"
)
