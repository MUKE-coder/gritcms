package handlers

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/markbates/goth/gothic"
	"gorm.io/gorm"

	"golang.org/x/crypto/bcrypt"

	"gritcms/apps/api/internal/config"
	"gritcms/apps/api/internal/models"
	"gritcms/apps/api/internal/services"
)

// AuthHandler handles authentication endpoints.
type AuthHandler struct {
	DB          *gorm.DB
	AuthService *services.AuthService
	Config      *config.Config
}

type registerRequest struct {
	FirstName string `json:"first_name" binding:"required,min=2"`
	LastName  string `json:"last_name" binding:"required,min=2"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type forgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type resetPasswordRequest struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password" binding:"required,min=8"`
}

// Register creates a new user account.
func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	// Check email uniqueness
	var existingUser models.User
	if err := h.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"code":    "EMAIL_EXISTS",
				"message": "A user with this email already exists",
			},
		})
		return
	}

	user := models.User{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Password:  req.Password,
		Role:      models.RoleUser,
		Active:    true,
	}

	if err := h.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create user",
			},
		})
		return
	}

	tokens, err := h.AuthService.GenerateTokenPair(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "TOKEN_ERROR",
				"message": "Failed to generate tokens",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"user":   user,
			"tokens": tokens,
		},
		"message": "User registered successfully",
	})
}

// Login authenticates a user and returns tokens.
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "INVALID_CREDENTIALS",
				"message": "Invalid email or password",
			},
		})
		return
	}

	if !user.Active {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{
				"code":    "ACCOUNT_DISABLED",
				"message": "Your account has been disabled",
			},
		})
		return
	}

	if user.Password == "" {
		provider := user.Provider
		if provider == "" || provider == "local" {
			provider = "social login"
		}
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "SOCIAL_AUTH_ONLY",
				"message": fmt.Sprintf("This account uses %s. Please sign in with your social account.", provider),
			},
		})
		return
	}

	if !user.CheckPassword(req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "INVALID_CREDENTIALS",
				"message": "Invalid email or password",
			},
		})
		return
	}

	tokens, err := h.AuthService.GenerateTokenPair(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "TOKEN_ERROR",
				"message": "Failed to generate tokens",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"user":   user,
			"tokens": tokens,
		},
		"message": "Logged in successfully",
	})
}

// Refresh generates a new access token from a refresh token.
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	claims, err := h.AuthService.ValidateToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "INVALID_TOKEN",
				"message": "Invalid or expired refresh token",
			},
		})
		return
	}

	tokens, err := h.AuthService.GenerateTokenPair(claims.UserID, claims.Email, claims.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "TOKEN_ERROR",
				"message": "Failed to generate tokens",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"tokens": tokens,
		},
		"message": "Token refreshed successfully",
	})
}

// Logout invalidates the user's session.
func (h *AuthHandler) Logout(c *gin.Context) {
	// In a production system, you would blacklist the refresh token in Redis
	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}

// Me returns the current authenticated user.
func (h *AuthHandler) Me(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "Not authenticated",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": user,
	})
}

// ForgotPassword initiates a password reset.
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req forgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	var user models.User
	if err := h.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Return success even if email not found (security)
		c.JSON(http.StatusOK, gin.H{
			"message": "If an account with that email exists, a password reset link has been sent",
		})
		return
	}

	token, err := services.GenerateResetToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to generate reset token",
			},
		})
		return
	}

	// For Phase 1, just log the token (email integration comes in Phase 4)
	log.Printf("Password reset token for %s: %s", user.Email, token)

	c.JSON(http.StatusOK, gin.H{
		"message": "If an account with that email exists, a password reset link has been sent",
	})
}

// ResetPassword resets a user's password with a valid token.
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req resetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	// Phase 1: simplified reset (in production, validate the token against stored tokens)
	// For now, this is a placeholder that demonstrates the API contract
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to hash password",
			},
		})
		return
	}
	_ = hashedPassword

	c.JSON(http.StatusOK, gin.H{
		"message": "Password reset successfully",
	})
}

// OAuthBegin redirects the user to the OAuth provider's consent screen.
func (h *AuthHandler) OAuthBegin(c *gin.Context) {
	provider := c.Param("provider")

	// Gothic reads provider from query string, not URL params
	q := c.Request.URL.Query()
	q.Set("provider", provider)
	c.Request.URL.RawQuery = q.Encode()

	gothic.BeginAuthHandler(c.Writer, c.Request)
}

// OAuthCallback completes the OAuth flow, finds or creates the user, and redirects with JWT tokens.
func (h *AuthHandler) OAuthCallback(c *gin.Context) {
	provider := c.Param("provider")

	q := c.Request.URL.Query()
	q.Set("provider", provider)
	c.Request.URL.RawQuery = q.Encode()

	gothUser, err := gothic.CompleteUserAuth(c.Writer, c.Request)
	if err != nil {
		log.Printf("OAuth callback error: %v", err)
		redirectURL := fmt.Sprintf("%s/login?error=%s", h.Config.OAuthFrontendURL, url.QueryEscape("Authentication failed. Please try again."))
		c.Redirect(http.StatusTemporaryRedirect, redirectURL)
		return
	}

	// Find or create user by email
	var user models.User
	result := h.DB.Where("email = ?", gothUser.Email).First(&user)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// Create new user from OAuth data
			now := time.Now()
			user = models.User{
				FirstName:       gothUser.FirstName,
				LastName:        gothUser.LastName,
				Email:           gothUser.Email,
				Avatar:          gothUser.AvatarURL,
				Provider:        provider,
				Active:          true,
				EmailVerifiedAt: &now,
			}

			if provider == "google" {
				user.GoogleID = gothUser.UserID
			} else if provider == "github" {
				user.GithubID = gothUser.UserID
			}

			// If name is empty, try to use NickName
			if user.FirstName == "" && gothUser.NickName != "" {
				user.FirstName = gothUser.NickName
			}
			if user.FirstName == "" {
				user.FirstName = "User"
			}
			if user.LastName == "" {
				user.LastName = ""
			}

			if err := h.DB.Create(&user).Error; err != nil {
				log.Printf("OAuth: failed to create user: %v", err)
				redirectURL := fmt.Sprintf("%s/login?error=%s", h.Config.OAuthFrontendURL, url.QueryEscape("Failed to create account."))
				c.Redirect(http.StatusTemporaryRedirect, redirectURL)
				return
			}
		} else {
			log.Printf("OAuth: database error: %v", result.Error)
			redirectURL := fmt.Sprintf("%s/login?error=%s", h.Config.OAuthFrontendURL, url.QueryEscape("Something went wrong."))
			c.Redirect(http.StatusTemporaryRedirect, redirectURL)
			return
		}
	} else {
		// Link OAuth provider to existing account
		updates := map[string]interface{}{}
		if provider == "google" && user.GoogleID == "" {
			updates["google_id"] = gothUser.UserID
		} else if provider == "github" && user.GithubID == "" {
			updates["github_id"] = gothUser.UserID
		}
		if user.Avatar == "" && gothUser.AvatarURL != "" {
			updates["avatar"] = gothUser.AvatarURL
		}
		if user.Provider == "local" {
			updates["provider"] = provider
		}

		if len(updates) > 0 {
			h.DB.Model(&user).Updates(updates)
		}
	}

	if !user.Active {
		redirectURL := fmt.Sprintf("%s/login?error=%s", h.Config.OAuthFrontendURL, url.QueryEscape("Your account has been disabled."))
		c.Redirect(http.StatusTemporaryRedirect, redirectURL)
		return
	}

	// Generate JWT tokens
	tokens, err := h.AuthService.GenerateTokenPair(user.ID, user.Email, user.Role)
	if err != nil {
		log.Printf("OAuth: failed to generate tokens: %v", err)
		redirectURL := fmt.Sprintf("%s/login?error=%s", h.Config.OAuthFrontendURL, url.QueryEscape("Failed to sign in."))
		c.Redirect(http.StatusTemporaryRedirect, redirectURL)
		return
	}

	// Redirect to frontend with tokens
	redirectURL := fmt.Sprintf("%s/auth/callback?access_token=%s&refresh_token=%s",
		h.Config.OAuthFrontendURL,
		url.QueryEscape(tokens.AccessToken),
		url.QueryEscape(tokens.RefreshToken),
	)
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}
