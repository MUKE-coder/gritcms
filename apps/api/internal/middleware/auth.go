package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/models"
	"gritcms/apps/api/internal/services"
)

// Auth creates a JWT authentication middleware.
func Auth(db *gorm.DB, authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Authorization header is required",
				},
			})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Invalid authorization header format",
				},
			})
			c.Abort()
			return
		}

		claims, err := authService.ValidateToken(parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Invalid or expired token",
				},
			})
			c.Abort()
			return
		}

		// Load user from database
		var user models.User
		if err := db.First(&user, claims.UserID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "User not found",
				},
			})
			c.Abort()
			return
		}

		if !user.Active {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    "ACCOUNT_DISABLED",
					"message": "Your account has been disabled",
				},
			})
			c.Abort()
			return
		}

		c.Set("user", user)
		c.Set("user_id", user.ID)
		c.Set("user_role", user.Role)
		c.Set("tenant_id", user.TenantID)
		c.Next()
	}
}

// RequireRole creates a middleware that checks if the user has one of the required roles.
// OWNER role always has access (superuser).
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Not authenticated",
				},
			})
			c.Abort()
			return
		}

		role, ok := userRole.(string)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":    "INTERNAL_ERROR",
					"message": "Invalid user role",
				},
			})
			c.Abort()
			return
		}

		// OWNER always has access
		if role == "OWNER" {
			c.Next()
			return
		}

		for _, r := range roles {
			if role == r {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{
				"code":    "FORBIDDEN",
				"message": "You do not have permission to access this resource",
			},
		})
		c.Abort()
	}
}

// RequireOwner restricts access to OWNER role only.
func RequireOwner() gin.HandlerFunc {
	return RequireRole("OWNER")
}

// RequireAdmin restricts access to OWNER and ADMIN roles.
func RequireAdmin() gin.HandlerFunc {
	return RequireRole("OWNER", "ADMIN")
}

// RequireContent restricts access to roles that can manage content.
func RequireContent() gin.HandlerFunc {
	return RequireRole("OWNER", "ADMIN", "EDITOR")
}
