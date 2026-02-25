# Grit Framework — LLM Skill Guide

> **This document teaches AI assistants (Claude, Cursor, Kilo Code, etc.) how to work with the Grit framework.** Read this file completely before writing any code in a Grit project.

---

## What is Grit?

Grit is a full-stack meta-framework that combines **Go** (backend) + **React/Next.js** (frontend) in a monorepo. It provides:

- A **CLI tool** (`) that scaffolds entire projects and generates full-stack resources
- A **Go API** with Gin + GORM + PostgreSQL
- A **Next.js web app** with App Router + Tailwind + shadcn/ui
- A **Filament-like admin panel** with resource definitions, DataTables, forms, and widgets
- **Batteries included**: file storage (S3), email (Resend), background jobs (asynq), cron, Redis caching, AI integration (Claude/OpenAI), security (Sentinel), observability (Pulse)
- **Auto-generated API docs** via gin-docs — zero-annotation OpenAPI spec with interactive UI
- A **shared package** with Zod schemas, TypeScript types, and constants

**Think of it as:** Laravel + Filament, but with Go + React instead of PHP + Blade.

---

## Quick Reference — CLI Commands

`ash
# Create a new project
grit new myapp                    # Full monorepo (Go API + Next.js web + admin)
grit new myapp --api              # Go API only
grit new myapp --full             # Everything + Expo mobile + docs site

# Generate a resource (full-stack CRUD)
grit generate resource Post --fields "title:string,content:text,published:bool"
grit generate resource Post --fields "title:string,slug:string:unique,views:int"
grit generate resource Post --from post.yaml
grit generate resource Category -i   # Interactive mode

# Sync Go types to TypeScript
grit sync

# Add a new role to the project
grit add role MODERATOR             # Injects into Go, Zod, TypeScript, admin

# Database migrations
grit migrate                          # Run GORM AutoMigrate
grit migrate --fresh                  # Drop all tables + re-migrate

# Seed the database
grit seed                             # Create admin + demo users

# Upgrade existing project to latest templates
grit upgrade                          # Updates admin, web, configs
grit upgrade --force                  # Overwrite without prompting

# Update the Grit CLI itself
grit update                           # Remove old binary + install latest
`

---

## Project Structure

After running ` new gritcms`, you get:

`
gritcms/
├── .env                          # Environment variables (DB, Redis, S3, AI keys)
├── docker-compose.yml            # PostgreSQL, Redis, MinIO, Mailhog
├── turbo.json                    # Monorepo task orchestration
├── pnpm-workspace.yaml           # Workspace definition
├── GRIT_SKILL.md                 # This file — AI assistant guide
│
├── packages/shared/              # Shared between frontend and backend
│   ├── schemas/                  # Zod validation schemas
│   │   ├── index.ts              # Re-exports all schemas
│   │   └── user.ts               # UserSchema, LoginSchema, etc.
│   ├── types/                    # TypeScript interfaces
│   │   ├── index.ts              # Re-exports all types
│   │   ├── user.ts               # User, CreateUserInput, etc.
│   │   └── api.ts                # ApiResponse, PaginatedResponse, ApiError
│   └── constants/                # Shared constants
│       └── index.ts              # API_ROUTES, ROLES, etc.
│
├── apps/
│   ├── api/                      # Go backend
│   │   ├── go.mod
│   │   ├── cmd/server/main.go    # Entry point
│   │   └── internal/
│   │       ├── config/config.go       # Loads .env into Config struct
│   │       ├── database/database.go   # GORM connection setup
│   │       ├── models/                # GORM models
│   │       │   ├── user.go            # User model + AutoMigrate
│   │       │   └── upload.go          # Upload model
│   │       ├── handlers/              # HTTP request handlers
│   │       │   ├── auth.go            # Register, Login, Refresh, Logout, Me
│   │       │   ├── user.go            # CRUD for users
│   │       │   ├── upload.go          # File upload endpoints
│   │       │   ├── ai.go              # AI completion/chat/stream
│   │       │   ├── jobs.go            # Job queue admin endpoints
│   │       │   └── cron.go            # Cron task listing
│   │       ├── services/              # Business logic layer
│   │       │   └── auth.go            # JWT generation, validation
│   │       ├── middleware/             # Gin middleware
│   │       │   ├── auth.go            # JWT auth + role-based access
│   │       │   ├── cors.go            # CORS configuration
│   │       │   ├── logger.go          # Request logging
│   │       │   └── cache.go           # Response caching middleware
│   │       ├── routes/routes.go       # Route registration
│   │       ├── mail/                  # Email service (Resend)
│   │       ├── storage/               # File storage (S3/R2/MinIO)
│   │       ├── jobs/                  # Background jobs (asynq)
│   │       ├── cron/cron.go           # Scheduled tasks
│   │       ├── cache/cache.go         # Redis cache service
│   │       └── ai/ai.go              # AI service (Claude/OpenAI)
│   │
│   │   # Mounted tools (auto-configured in routes.go):
│   │   # /docs         → gin-docs API documentation (OpenAPI 3.1 + Scalar UI)
│   │   # /studio       → GORM Studio database browser
│   │   # /sentinel/*   → Sentinel security dashboard (WAF, rate limiting)
│   │   # /pulse        → Pulse observability dashboard (tracing, metrics)
│   │
│   ├── web/                      # SaaS landing page (Next.js)
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout
│   │   │   └── page.tsx               # Landing page with hero, features, CTA
│   │   └── lib/
│   │       └── utils.ts               # Utility functions
│   │
│   └── admin/                    # Admin panel (Filament-like)
│       ├── app/
│       │   ├── layout.tsx             # Root layout (Providers, no sidebar)
│       │   ├── page.tsx               # Redirect to /dashboard or /login
│       │   ├── (auth)/               # Auth pages (no sidebar)
│       │   │   ├── login/page.tsx
│       │   │   ├── sign-up/page.tsx
│       │   │   └── forgot-password/page.tsx
│       │   └── (dashboard)/          # Protected pages (with sidebar)
│       │       ├── layout.tsx         # AdminLayout wrapper
│       │       ├── dashboard/page.tsx # Dashboard with widgets
│       │       ├── resources/         # Resource pages
│       │       │   └── users/page.tsx
│       │       └── system/           # System pages
│       │           ├── jobs/page.tsx
│       │           ├── files/page.tsx
│       │           ├── cron/page.tsx
│       │           ├── mail/page.tsx
│       │           └── security/page.tsx
│       ├── components/
│       │   ├── layout/                # Sidebar, Navbar
│       │   ├── tables/                # DataTable, filters, pagination
│       │   ├── forms/                 # FormBuilder, field components
│       │   ├── widgets/               # StatsCard, ChartWidget
│       │   └── resource/              # ResourcePage renderer
│       ├── hooks/
│       │   ├── use-auth.ts            # Admin auth hooks
│       │   ├── use-resource.ts        # Generic CRUD hooks
│       │   └── use-system.ts          # Hooks for jobs/files/cron
│       ├── resources/                # Resource definitions
│       │   ├── index.ts               # Resource registry
│       │   └── users.ts              # Users resource definition
│       └── lib/
│           ├── resource.ts            # defineResource() + types
│           └── icons.ts               # Lucide icon map
`

---

## How to Work with Grit Projects

### Adding a New Resource

The most common task. Run:

`ash
grit generate resource Post --fields "title:string,content:text,published:bool,views:int"
`

This creates **8 files** and injects into **10 existing files**:

**New files created:**
| File | What it contains |
|------|-----------------|
| `apps/api/internal/models/post.go` | GORM model with fields, timestamps, soft delete |
| `apps/api/internal/services/post.go` | List (paginated, searchable, sortable), GetByID, Create, Update, Delete |
| `apps/api/internal/handlers/post.go` | HTTP handlers for GET/POST/PUT/DELETE |
| `packages/shared/schemas/post.ts` | Zod schemas: CreatePostSchema, UpdatePostSchema |
| `packages/shared/types/post.ts` | TypeScript interface: Post |
| `apps/web/hooks/use-posts.ts` | React Query hooks: usePosts, useCreatePost, etc. |
| `apps/admin/resources/posts.ts` | Resource definition: table columns, form fields, widgets |
| `apps/admin/app/(dashboard)/resources/posts/page.tsx` | Admin page that renders the resource |

**Existing files modified (via marker injection):**
| File | What's injected |
|------|----------------|
| `models/user.go` | `&Post{}` added to AutoMigrate |
| `routes/routes.go` | Handler init + CRUD routes registered |
| `schemas/index.ts` | Schema exports added |
| `types/index.ts` | Type export added |
| `constants/index.ts` | API route constants added |
| `resources/index.ts` | Resource imported and registered |

### Supported Field Types

| Type | Go Type | TypeScript | Zod | Form Input |
|------|---------|-----------|-----|-----------|
| `string` | `string` | `string` | `z.string()` | Text input |
| `text` | `string` | `string` | `z.string()` | Textarea |
| `int` | `int` | `number` | `z.number().int()` | Number input |
| `uint` | `uint` | `number` | `z.number().int().nonneg()` | Number input |
| `float` | `float64` | `number` | `z.number()` | Number input |
| `bool` | `bool` | `boolean` | `z.boolean()` | Toggle switch |
| `datetime` | `*time.Time` | `string | null` | `z.string().nullable()` | Datetime picker |
| `date` | `*time.Time` | `string | null` | `z.string().nullable()` | Date picker |
| `richtext` | `string` | `string` | `z.string()` | Tiptap WYSIWYG editor |
| `slug` | `string` | `string` | Auto-generated | Hidden from forms |
| `string_array` | `datatypes.JSONSlice[string]` | `string[]` | `z.array(z.string())` | Tag input |
| `belongs_to:Resource` | `uint` (FK) | `number` | `z.number()` | Relationship select |
| `many_to_many:Resource` | Junction table | `number[]` | `z.array(z.number())` | Multi-select |

### Field Modifiers

Append modifiers after the type with colons:

`ash
grit generate resource Post --fields "title:string,slug:string:unique,email:string:required,bio:text:optional"
`

| Modifier | Effect |
|----------|--------|
| `unique` | Adds `gorm:"uniqueIndex"` to the Go model |
| `required` | Marks the field as required (string fields are required by default) |
| `optional` | Marks the field as optional (overrides default required for strings) |

### Understanding Markers

Grit uses **marker comments** to know where to inject code. Never delete these:

`go
// In models/user.go — where new models are added to AutoMigrate
// grit:models          <-- DON'T DELETE THIS

// In routes/routes.go
// grit:handlers            <-- DON'T DELETE THIS
// grit:routes:protected    <-- DON'T DELETE THIS
// grit:routes:admin        <-- DON'T DELETE THIS
`

`typescript
// In schemas/index.ts
// grit:schemas              <-- DON'T DELETE THIS

// In types/index.ts
// grit:types                <-- DON'T DELETE THIS

// In constants/index.ts
// grit:api-routes           <-- DON'T DELETE THIS

// In resources/index.ts
// grit:resources            <-- DON'T DELETE THIS
// grit:resource-list        <-- DON'T DELETE THIS
`

---

## API Conventions

### Response Format

**Always** use this format in handlers:

`go
// Success (single item)
c.JSON(http.StatusOK, gin.H{
    "data":    item,
    "message": "Item retrieved successfully",
})

// Success (paginated list)
c.JSON(http.StatusOK, gin.H{
    "data": items,
    "meta": gin.H{
        "total":     total,
        "page":      page,
        "page_size": pageSize,
        "pages":     pages,
    },
})

// Error
c.JSON(http.StatusBadRequest, gin.H{
    "error": gin.H{
        "code":    "VALIDATION_ERROR",
        "message": "Email is required",
    },
})
`

### Standard Error Codes

| Code | HTTP Status | When |
|------|------------|------|
| `VALIDATION_ERROR` | 422 | Invalid input data |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Insufficient role/permissions |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `CONFLICT` | 409 | Duplicate key (e.g., unique email) |

### Authentication Flow

The API uses JWT tokens:

`
POST /api/auth/register  → Creates user, returns { access_token, refresh_token }
POST /api/auth/login     → Returns { access_token, refresh_token }
POST /api/auth/refresh   → New access_token from refresh_token
POST /api/auth/logout    → Invalidates refresh token
GET  /api/auth/me        → Returns current user (requires auth header)
`

Access tokens expire in 15 minutes. Refresh tokens last 7 days. The frontend automatically refreshes via Axios interceptor.

### Route Groups

`go
// Public routes — no auth required
public := router.Group("/api/auth")

// Protected routes — requires valid JWT
protected := router.Group("/api")
protected.Use(middleware.Auth(cfg.JWTSecret))

// Admin routes — requires JWT + admin role
admin := protected.Group("/admin")
admin.Use(middleware.RequireRole("admin"))
`

---

## Admin Panel — Resource Definitions

The admin panel uses a **resource definition system**. Each resource is defined in TypeScript:

`typescript
// apps/admin/resources/posts.ts
import { defineResource } from "@/lib/resource";

export const postsResource = defineResource({
  name: "Post",
  slug: "posts",
  endpoint: "/api/posts",
  icon: "FileText",
  label: { singular: "Post", plural: "Posts" },

  table: {
    columns: [
      { key: "id", label: "ID", sortable: true, format: "number" },
      { key: "title", label: "Title", sortable: true, searchable: true },
      { key: "published", label: "Published", format: "boolean" },
      { key: "views", label: "Views", sortable: true, format: "number" },
      { key: "created_at", label: "Created", sortable: true, format: "relative" },
    ],
    defaultSort: { key: "created_at", direction: "desc" },
    filters: [
      { key: "published", label: "Published", type: "boolean" },
    ],
    pageSize: 20,
    searchable: true,
    actions: ["create", "edit", "delete"],
  },

  form: {
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "content", label: "Content", type: "textarea", required: true },
      { key: "published", label: "Published", type: "toggle", defaultValue: false },
      { key: "cover", label: "Cover Image", type: "image" },
    ],
    layout: "single",
  },

  dashboard: {
    widgets: [
      {
        type: "stat",
        label: "Total Posts",
        endpoint: "/api/posts?page_size=1",
        icon: "FileText",
        color: "accent",
        format: "number",
        colSpan: 1,
      },
    ],
  },
});
`

### Form Field Types

| Type | Component | Notes |
|------|----------|-------|
| `text` | Text input | Supports prefix, suffix |
| `textarea` | Multi-line textarea | Configurable rows |
| `number` | Number input | Supports min, max, step |
| `select` | Dropdown select | Requires options array |
| `date` | Date picker | |
| `datetime` | Datetime picker | |
| `toggle` | On/off switch | |
| `checkbox` | Checkbox | |
| `radio` | Radio group | Requires options array |
| `image` | Image upload (drag & drop) | Uses react-dropzone, uploads to /api/uploads |
| `richtext` | Tiptap WYSIWYG editor | Bold, italic, headings, lists, code, links |
| `relationship-select` | Searchable dropdown | For belongs_to relationships |
| `multi-relationship-select` | Multi-select tags | For many_to_many relationships |

### Form View Variants

Set `formView` in the resource definition to change how forms render:

| View | Description |
|------|-----------|
| `modal` | Default — form opens in a modal dialog |
| `page` | Full-page form at a dedicated URL |
| `modal-steps` | Multi-step wizard in a modal with step indicators |
| `page-steps` | Multi-step wizard on a full page with progress bar |

### Dropzone Component

A reusable file upload component with 5 variants:

`tsx
import { Dropzone } from "@/components/ui/dropzone";

<Dropzone
  variant="default"     // "default" | "compact" | "minimal" | "avatar" | "inline"
  maxFiles={5}
  maxSize={1024 * 1024 * 10} // 10MB
  onFilesChange={setFiles}
  accept={{ "image/*": [] }}
/>
`

---

## Working with Go Models

### Model Pattern

`go
package models

import (
    "time"
    "gorm.io/gorm"
)

type Post struct {
    ID        uint           `gorm:"primarykey" json:"id"`
    Title     string         `gorm:"size:255;not null" json:"title" binding:"required"`
    Slug      string         `gorm:"size:255;uniqueIndex" json:"slug"`
    Content   string         `gorm:"type:text" json:"content"`
    Published bool           `gorm:"default:false" json:"published"`
    Views     int            `json:"views"`
    UserID    uint           `json:"user_id"`
    User      User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
`

Key rules:
- Always include `ID`, `CreatedAt`, `UpdatedAt`, `DeletedAt`
- Use `json:"-"` for DeletedAt (soft delete, hidden from API)
- Use `binding:"required"` for required fields in handlers
- Use `gorm:"size:255"` for string fields, `gorm:"type:text"` for long text

---

## Frontend Patterns

### React Query Hooks

All data fetching uses auto-generated hooks:

`typescript
// apps/web/hooks/use-posts.ts (auto-generated by grit generate)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function usePosts({ page = 1, pageSize = 20, search = "" } = {}) {
  return useQuery({
    queryKey: ["posts", { page, pageSize, search }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        ...(search && { search }),
      });
      const { data } = await apiClient.get(`/api/posts?${params}`);
      return data;
    },
  });
}
`

---

## Batteries (Phase 4 Services)

### File Storage

`go
// Upload a file
storage.Upload(ctx, "uploads/2024/01/photo.jpg", reader, "image/jpeg")

// Get public URL
url := storage.GetURL("uploads/2024/01/photo.jpg")

// Get signed URL (temporary access)
url, err := storage.GetSignedURL(ctx, key, 1*time.Hour)
`

API endpoint: `POST /api/uploads` (multipart form, max 10MB)

### Email

`go
mailer.Send(ctx, mail.SendOptions{
    To:       "user@example.com",
    Subject:  "Welcome!",
    Template: "welcome",
    Data:     map[string]interface{}{"Name": "John"},
})
`

Built-in templates: `welcome`, `password-reset`, `email-verification`, `notification`

### Background Jobs

`go
jobs.EnqueueSendEmail("user@example.com", "Welcome", "welcome", data)
jobs.EnqueueProcessImage(uploadID, key, mimeType)
`

### Redis Cache

`go
cache.Set(ctx, "user:123", userData, 5*time.Minute)
cache.Get(ctx, "user:123", &user)
cache.Delete(ctx, "user:123")

// As middleware
router.GET("/api/posts", middleware.CacheResponse(cache, 5*time.Minute), handler.List)
`

### AI Integration

`go
result, err := ai.Complete(ctx, ai.CompletionRequest{
    Prompt: "Summarize this article...",
})

// Streaming
ai.Stream(ctx, req, func(chunk string) { /* SSE */ })
`

### Security (Sentinel)

Built-in security suite powered by [Sentinel](https://github.com/MUKE-coder/sentinel):
- **WAF** — SQL injection, XSS, path traversal detection
- **Rate Limiting** — Per-IP request throttling
- **Brute-Force Protection** — Account lockout after failed logins
- **Anomaly Detection** — Unusual traffic pattern alerts
- **Dashboard** — Real-time threat monitoring at `/sentinel/ui`

Enabled by default. Disable with `SENTINEL_ENABLED=false`.

### Observability (Pulse)

Built-in observability SDK powered by [Pulse](https://github.com/MUKE-coder/pulse):
- **Request Tracing** — HTTP method, path, status, latency
- **Database Monitoring** — Query count, slow queries, pool stats
- **Runtime Metrics** — Memory, goroutines, GC stats
- **Error Tracking** — Captures panics and 5xx responses
- **Health Checks** — DB + custom checks (Redis, etc.)
- **Alerting** — High error rate, slow response alerts
- **Prometheus** — `/pulse/metrics` for Grafana
- **Dashboard** — Embedded React dashboard at `/pulse`

Enabled by default. Disable with `PULSE_ENABLED=false`.

### API Documentation (gin-docs)

Auto-generated docs via [gin-docs](https://github.com/MUKE-coder/gin-docs):
- Introspects Gin routes and GORM models — zero annotations needed
- OpenAPI 3.1 spec at `/docs/openapi.json`
- Interactive UI at `/docs` (Scalar theme)
- Export to Postman or Insomnia

---

## Configuration (.env)

`ash
DATABASE_URL=postgres://postgres:password@localhost:5432/gritcms?sslmode=disable
PORT=8080
JWT_SECRET=your-secret-key
WEB_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
REDIS_URL=redis://localhost:6379
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_BUCKET=gritcms
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
RESEND_API_KEY=re_xxxxx
AI_PROVIDER=claude
AI_API_KEY=sk-ant-xxxxx
SENTINEL_ENABLED=true
SENTINEL_USERNAME=admin
SENTINEL_PASSWORD=sentinel
PULSE_ENABLED=true
PULSE_USERNAME=admin
PULSE_PASSWORD=pulse
`

---

## Docker Services

`ash
docker compose up -d    # Start all services
`

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache + job queue |
| MinIO | 9000/9001 | Local S3 storage |
| Mailhog | 1025/8025 | Email testing |

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Go files | `snake_case.go` | `user_handler.go` |
| Go structs | `PascalCase` | `type PostHandler struct` |
| TypeScript files | `kebab-case.ts` | `use-posts.ts` |
| React components | `PascalCase.tsx` | `DataTable.tsx` |
| API routes | `/api/plural` | `/api/posts` |
| DB tables | `plural_snake` | `blog_posts` |

---

## Design System

### Colors (Dark Theme Default)

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#0a0a0f` | Page background |
| `bg-secondary` | `#111118` | Card background |
| `accent` | `#6c5ce7` | Primary accent (purple) |
| `success` | `#00b894` | Success states |
| `danger` | `#ff6b6b` | Error states |

### Fonts

- **UI:** DM Sans (400, 500, 600, 700)
- **Code:** JetBrains Mono (400, 500, 600)

---

## Common Tasks for AI Assistants

### "Add a new field to an existing resource"

1. Update the Go model (`apps/api/internal/models/<name>.go`) — add the field
2. Update the handler if the field needs special handling
3. Update the Zod schema (`packages/shared/schemas/<name>.ts`)
4. Update the TypeScript type (`packages/shared/types/<name>.ts`)
5. Update the admin resource definition (`apps/admin/resources/<name>.ts`) — add column + form field
6. Restart the API (GORM auto-migrates on startup)

### "Add a new API endpoint"

1. Create or update handler in `apps/api/internal/handlers/`
2. Register the route in `apps/api/internal/routes/routes.go`
3. Create React Query hook in `apps/web/hooks/` or `apps/admin/hooks/`

### "Add a new role"

`ash
grit add role MODERATOR
`

This injects the new role into 7 locations: Go constants, Zod enum, TypeScript union, ROLES array, admin badge mapping, filter options, and form options.

### "Add a relationship between resources"

In the Go model:
`go
type Post struct {
    CategoryID uint     `json:"category_id"`
    Category   Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}
`

In the handler, preload related data:
`go
query.Preload("Category").Find(&posts)
`

---

## Important: Don't Break These

1. **Never delete marker comments** (`// grit:models`, `// grit:routes:protected`, etc.)
2. **Always follow the response format** (`{ data, message }` or `{ data, meta }` or `{ error: { code, message } }`)
3. **Always handle errors in Go** — never ignore with `_`
4. **Keep the folder structure** — don't move files to non-standard locations
5. **Use React Query for all data fetching** — no raw `fetch` in components
6. **Use Zod for validation** — shared between frontend and backend
7. **Use Tailwind + shadcn/ui for styling** — no custom CSS files
8. **Use App Router** — never Pages Router in Next.js

---

## Mounted Dashboards

The Go API mounts several dashboards automatically:

| Path | Tool | Purpose |
|------|------|---------|
| `/studio` | GORM Studio | Visual database browser — view/edit data, run SQL, export schemas |
| `/docs` | gin-docs | Auto-generated API documentation with interactive UI |
| `/sentinel/ui` | Sentinel | Security dashboard — threats, blocked IPs, rate limits |
| `/pulse` | Pulse | Observability dashboard — request tracing, metrics, errors |

---

*Built with Grit. Go + React. Built with Grit.*
