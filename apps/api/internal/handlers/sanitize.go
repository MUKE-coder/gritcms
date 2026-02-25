package handlers

// sanitizeUpdates removes dangerous keys from a map before passing to GORM .Updates().
// This prevents mass-assignment attacks where users inject tenant_id, id, or other
// protected fields into partial-update payloads.
func sanitizeUpdates(m map[string]interface{}) map[string]interface{} {
	forbidden := []string{
		"id", "ID",
		"tenant_id", "TenantID",
		"created_at", "CreatedAt",
		"deleted_at", "DeletedAt",
		"user_id", "UserID",
		"password", "Password",
		"password_hash", "PasswordHash",
		"role", "Role",
	}
	for _, key := range forbidden {
		delete(m, key)
	}
	return m
}
