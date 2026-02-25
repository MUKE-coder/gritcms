package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/events"
	"gritcms/apps/api/internal/models"
)

type AffiliateHandler struct {
	DB *gorm.DB
}

func NewAffiliateHandler(db *gorm.DB) *AffiliateHandler {
	return &AffiliateHandler{DB: db}
}

// ---------- Programs ----------

func (h *AffiliateHandler) ListPrograms(c *gin.Context) {
	var programs []models.AffiliateProgram
	h.DB.Order("created_at DESC").Find(&programs)

	// Attach account counts
	type result struct {
		ProgramID uint
		Count     int64
	}
	var counts []result
	h.DB.Model(&models.AffiliateAccount{}).Select("program_id, count(*) as count").
		Group("program_id").Find(&counts)
	countMap := make(map[uint]int64)
	for _, c := range counts {
		countMap[c.ProgramID] = c.Count
	}

	type ProgramWithCount struct {
		models.AffiliateProgram
		AccountCount int64 `json:"account_count"`
	}
	out := make([]ProgramWithCount, len(programs))
	for i, p := range programs {
		out[i] = ProgramWithCount{AffiliateProgram: p, AccountCount: countMap[p.ID]}
	}

	c.JSON(http.StatusOK, gin.H{"data": out})
}

func (h *AffiliateHandler) GetProgram(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var program models.AffiliateProgram
	if err := h.DB.First(&program, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": program})
}

func (h *AffiliateHandler) CreateProgram(c *gin.Context) {
	var body models.AffiliateProgram
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.TenantID = 1
	if err := h.DB.Create(&body).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create program"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": body})
}

func (h *AffiliateHandler) UpdateProgram(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var program models.AffiliateProgram
	if err := h.DB.First(&program, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sanitizeUpdates(body)
	h.DB.Model(&program).Updates(body)
	h.DB.First(&program, id)
	c.JSON(http.StatusOK, gin.H{"data": program})
}

func (h *AffiliateHandler) DeleteProgram(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.DB.Delete(&models.AffiliateProgram{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete program"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Program deleted"})
}

// ---------- Accounts ----------

func (h *AffiliateHandler) ListAccounts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize := 20
	if page < 1 {
		page = 1
	}

	var total int64
	q := h.DB.Model(&models.AffiliateAccount{})

	if st := c.Query("status"); st != "" {
		q = q.Where("status = ?", st)
	}
	if pid := c.Query("program_id"); pid != "" {
		q = q.Where("program_id = ?", pid)
	}

	q.Count(&total)

	var accounts []models.AffiliateAccount
	q.Preload("Contact").Preload("Program").
		Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&accounts)

	c.JSON(http.StatusOK, gin.H{
		"data": accounts,
		"meta": gin.H{
			"total": total, "page": page, "page_size": pageSize,
			"pages": int(math.Ceil(float64(total) / float64(pageSize))),
		},
	})
}

func (h *AffiliateHandler) GetAccount(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("accountId"))
	var account models.AffiliateAccount
	if err := h.DB.Preload("Contact").Preload("Program").Preload("Links").
		Preload("Commissions", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Limit(50)
		}).First(&account, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": account})
}

func (h *AffiliateHandler) CreateAccount(c *gin.Context) {
	var body struct {
		ContactID uint `json:"contact_id" binding:"required"`
		ProgramID uint `json:"program_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check program exists
	var program models.AffiliateProgram
	if err := h.DB.First(&program, body.ProgramID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Program not found"})
		return
	}

	status := models.AffiliateStatusPending
	if program.AutoApprove {
		status = models.AffiliateStatusActive
	}

	account := models.AffiliateAccount{
		TenantID:     1,
		ContactID:    body.ContactID,
		ProgramID:    body.ProgramID,
		Status:       status,
		ReferralCode: generateReferralCode(),
	}
	if err := h.DB.Create(&account).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create affiliate account"})
		return
	}

	h.DB.Preload("Contact").Preload("Program").First(&account, account.ID)
	c.JSON(http.StatusCreated, gin.H{"data": account})
}

func (h *AffiliateHandler) UpdateAccountStatus(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("accountId"))
	var body struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var account models.AffiliateAccount
	if err := h.DB.First(&account, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		return
	}
	h.DB.Model(&account).Update("status", body.Status)
	c.JSON(http.StatusOK, gin.H{"data": account})
}

// ---------- Links ----------

func (h *AffiliateHandler) CreateLink(c *gin.Context) {
	accountID, _ := strconv.Atoi(c.Param("accountId"))
	var body struct {
		URL  string `json:"url" binding:"required"`
		Slug string `json:"slug"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	link := models.AffiliateLink{
		TenantID:  1,
		AccountID: uint(accountID),
		URL:       body.URL,
		Slug:      body.Slug,
	}
	if err := h.DB.Create(&link).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create link"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": link})
}

func (h *AffiliateHandler) DeleteLink(c *gin.Context) {
	linkID, _ := strconv.Atoi(c.Param("linkId"))
	if err := h.DB.Delete(&models.AffiliateLink{}, linkID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete link"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Link deleted"})
}

// ---------- Commissions ----------

func (h *AffiliateHandler) ListCommissions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize := 20
	if page < 1 {
		page = 1
	}

	var total int64
	q := h.DB.Model(&models.Commission{})

	if st := c.Query("status"); st != "" {
		q = q.Where("status = ?", st)
	}
	if aid := c.Query("account_id"); aid != "" {
		q = q.Where("account_id = ?", aid)
	}

	q.Count(&total)

	var commissions []models.Commission
	q.Preload("Account.Contact").
		Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&commissions)

	c.JSON(http.StatusOK, gin.H{
		"data": commissions,
		"meta": gin.H{
			"total": total, "page": page, "page_size": pageSize,
			"pages": int(math.Ceil(float64(total) / float64(pageSize))),
		},
	})
}

func (h *AffiliateHandler) ApproveCommission(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("commissionId"))
	var comm models.Commission
	if err := h.DB.First(&comm, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Commission not found"})
		return
	}
	now := time.Now()
	h.DB.Model(&comm).Updates(map[string]interface{}{
		"status":      models.CommissionApproved,
		"approved_at": now,
	})

	// Add to account balance
	h.DB.Model(&models.AffiliateAccount{}).Where("id = ?", comm.AccountID).
		UpdateColumn("balance", gorm.Expr("balance + ?", comm.Amount))

	c.JSON(http.StatusOK, gin.H{"data": comm})
}

func (h *AffiliateHandler) RejectCommission(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("commissionId"))
	var comm models.Commission
	if err := h.DB.First(&comm, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Commission not found"})
		return
	}
	h.DB.Model(&comm).Update("status", models.CommissionRejected)
	c.JSON(http.StatusOK, gin.H{"data": comm})
}

// ---------- Payouts ----------

func (h *AffiliateHandler) ListPayouts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize := 20
	if page < 1 {
		page = 1
	}

	var total int64
	q := h.DB.Model(&models.Payout{})

	if st := c.Query("status"); st != "" {
		q = q.Where("status = ?", st)
	}

	q.Count(&total)

	var payouts []models.Payout
	q.Preload("Account.Contact").
		Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&payouts)

	c.JSON(http.StatusOK, gin.H{
		"data": payouts,
		"meta": gin.H{
			"total": total, "page": page, "page_size": pageSize,
			"pages": int(math.Ceil(float64(total) / float64(pageSize))),
		},
	})
}

func (h *AffiliateHandler) CreatePayout(c *gin.Context) {
	var body struct {
		AccountID uint   `json:"account_id" binding:"required"`
		Amount    int64  `json:"amount" binding:"required"`
		Method    string `json:"method"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check balance
	var account models.AffiliateAccount
	if err := h.DB.First(&account, body.AccountID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		return
	}
	if account.Balance < body.Amount {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient balance"})
		return
	}

	payout := models.Payout{
		TenantID:  1,
		AccountID: body.AccountID,
		Amount:    body.Amount,
		Method:    body.Method,
		Status:    models.PayoutPending,
	}
	if err := h.DB.Create(&payout).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payout"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": payout})
}

func (h *AffiliateHandler) ProcessPayout(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("payoutId"))
	var payout models.Payout
	if err := h.DB.First(&payout, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payout not found"})
		return
	}

	now := time.Now()
	h.DB.Model(&payout).Updates(map[string]interface{}{
		"status":       models.PayoutCompleted,
		"processed_at": now,
	})

	// Deduct from account balance, add to total_paid
	h.DB.Model(&models.AffiliateAccount{}).Where("id = ?", payout.AccountID).
		UpdateColumns(map[string]interface{}{
			"balance":    gorm.Expr("balance - ?", payout.Amount),
			"total_paid": gorm.Expr("total_paid + ?", payout.Amount),
		})

	// Mark approved commissions as paid up to payout amount
	h.DB.Model(&models.Commission{}).
		Where("account_id = ? AND status = ?", payout.AccountID, models.CommissionApproved).
		Updates(map[string]interface{}{"status": models.CommissionPaid, "paid_at": now})

	c.JSON(http.StatusOK, gin.H{"data": payout})
}

// ---------- Dashboard ----------

func (h *AffiliateHandler) Dashboard(c *gin.Context) {
	var totalAffiliates, activeAffiliates, pendingCommissions int64
	var totalCommissionValue, totalPaidOut int64

	h.DB.Model(&models.AffiliateAccount{}).Count(&totalAffiliates)
	h.DB.Model(&models.AffiliateAccount{}).Where("status = ?", models.AffiliateStatusActive).Count(&activeAffiliates)
	h.DB.Model(&models.Commission{}).Where("status = ?", models.CommissionPending).Count(&pendingCommissions)
	h.DB.Model(&models.Commission{}).Where("status IN ?", []string{models.CommissionApproved, models.CommissionPaid}).
		Select("COALESCE(SUM(amount), 0)").Scan(&totalCommissionValue)
	h.DB.Model(&models.Payout{}).Where("status = ?", models.PayoutCompleted).
		Select("COALESCE(SUM(amount), 0)").Scan(&totalPaidOut)

	// Top affiliates
	type TopAffiliate struct {
		AccountID  uint   `json:"account_id"`
		Name       string `json:"name"`
		TotalEarned int64 `json:"total_earned"`
		Conversions int64 `json:"conversions"`
	}
	var topAffiliates []TopAffiliate
	h.DB.Raw(`
		SELECT aa.id as account_id,
		       CONCAT(c.first_name, ' ', c.last_name) as name,
		       aa.total_earned,
		       (SELECT COUNT(*) FROM commissions WHERE account_id = aa.id) as conversions
		FROM affiliate_accounts aa
		JOIN contacts c ON c.id = aa.contact_id
		WHERE aa.status = ?
		ORDER BY aa.total_earned DESC
		LIMIT 5
	`, models.AffiliateStatusActive).Scan(&topAffiliates)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"total_affiliates":     totalAffiliates,
			"active_affiliates":    activeAffiliates,
			"pending_commissions":  pendingCommissions,
			"total_commission":     totalCommissionValue,
			"total_paid":           totalPaidOut,
			"top_affiliates":       topAffiliates,
		},
	})
}

// ---------- Public: Referral Tracking ----------

func (h *AffiliateHandler) TrackReferral(c *gin.Context) {
	code := c.Param("code")
	var account models.AffiliateAccount
	if err := h.DB.Where("referral_code = ? AND status = ?", code, models.AffiliateStatusActive).
		First(&account).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid referral code"})
		return
	}

	// Increment click on first link
	h.DB.Model(&models.AffiliateLink{}).Where("account_id = ?", account.ID).
		UpdateColumn("clicks", gorm.Expr("clicks + 1"))

	events.Emit(events.AffiliateReferral, map[string]interface{}{
		"account_id": account.ID, "referral_code": code,
	})

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"referral_code": account.ReferralCode,
			"account_id":    account.ID,
		},
	})
}

// ---------- Helpers ----------

func generateReferralCode() string {
	b := make([]byte, 6)
	rand.Read(b)
	return hex.EncodeToString(b)
}
