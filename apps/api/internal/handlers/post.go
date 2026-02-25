package handlers

import (
	"encoding/xml"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/events"
	"gritcms/apps/api/internal/models"
)

// PostHandler handles blog post CRUD operations.
type PostHandler struct {
	DB *gorm.DB
}

// NewPostHandler creates a new PostHandler.
func NewPostHandler(db *gorm.DB) *PostHandler {
	return &PostHandler{DB: db}
}

// List returns a paginated list of posts (admin) with search and filters.
func (h *PostHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")
	status := c.Query("status")
	categorySlug := c.Query("category")
	tagSlug := c.Query("tag")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	allowedSorts := map[string]bool{
		"id": true, "title": true, "status": true, "published_at": true,
		"created_at": true, "updated_at": true, "reading_time": true,
	}
	if !allowedSorts[sortBy] {
		sortBy = "created_at"
	}
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	tenantID, _ := c.Get("tenant_id")
	query := h.DB.Model(&models.Post{}).Where("posts.tenant_id = ?", tenantID)

	if search != "" {
		query = query.Where("posts.title ILIKE ? OR posts.slug ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if status != "" {
		query = query.Where("posts.status = ?", status)
	}

	if categorySlug != "" {
		query = query.Where(
			"posts.id IN (SELECT post_id FROM post_categories pc JOIN post_categories_ref cat ON pc.post_category_id = cat.id WHERE cat.slug = ?)",
			categorySlug,
		)
		// Simpler approach: join through the many2many table
		query = h.DB.Model(&models.Post{}).Where("posts.tenant_id = ?", tenantID)
		if search != "" {
			query = query.Where("posts.title ILIKE ? OR posts.slug ILIKE ?", "%"+search+"%", "%"+search+"%")
		}
		if status != "" {
			query = query.Where("posts.status = ?", status)
		}
		query = query.Joins("JOIN post_categories ON post_categories.post_id = posts.id").
			Joins("JOIN post_categories AS cat ON post_categories.post_category_id = cat.id AND cat.slug = ?", categorySlug)
	}

	if tagSlug != "" {
		query = query.Joins("JOIN post_tags_join ON post_tags_join.post_id = posts.id").
			Joins("JOIN post_tags ON post_tags_join.post_tag_id = post_tags.id AND post_tags.slug = ?", tagSlug)
	}

	var total int64
	query.Count(&total)

	var posts []models.Post
	offset := (page - 1) * pageSize
	query.Preload("Author", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, first_name, last_name, avatar")
	}).Preload("Categories").Preload("Tags").
		Order("posts." + sortBy + " " + sortOrder).
		Offset(offset).Limit(pageSize).Find(&posts)

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	c.JSON(http.StatusOK, gin.H{
		"data": posts,
		"meta": gin.H{
			"total":     total,
			"page":      page,
			"page_size": pageSize,
			"pages":     totalPages,
		},
	})
}

// ListPublished returns a paginated list of published posts (public).
func (h *PostHandler) ListPublished(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	categorySlug := c.Query("category")
	tagSlug := c.Query("tag")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := h.DB.Model(&models.Post{}).Where("posts.status = ?", models.PostStatusPublished)

	if categorySlug != "" {
		query = query.Joins("JOIN post_categories ON post_categories.post_id = posts.id").
			Joins("JOIN post_categories AS cat ON post_categories.post_category_id = cat.id AND cat.slug = ?", categorySlug)
	}

	if tagSlug != "" {
		query = query.Joins("JOIN post_tags_join ON post_tags_join.post_id = posts.id").
			Joins("JOIN post_tags ON post_tags_join.post_tag_id = post_tags.id AND post_tags.slug = ?", tagSlug)
	}

	var total int64
	query.Count(&total)

	var posts []models.Post
	offset := (page - 1) * pageSize
	query.Preload("Author", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, first_name, last_name, avatar")
	}).Preload("Categories").Preload("Tags").
		Order("posts.published_at DESC").
		Offset(offset).Limit(pageSize).Find(&posts)

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	c.JSON(http.StatusOK, gin.H{
		"data": posts,
		"meta": gin.H{
			"total":     total,
			"page":      page,
			"page_size": pageSize,
			"pages":     totalPages,
		},
	})
}

// GetByID returns a single post with all relationships (admin).
func (h *PostHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid post ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var post models.Post
	if err := h.DB.Preload("Author", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, first_name, last_name, avatar")
	}).Preload("Categories").Preload("Tags").
		Where("tenant_id = ?", tenantID).First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Post not found"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": post})
}

// GetBySlug returns a published post by slug (public).
func (h *PostHandler) GetBySlug(c *gin.Context) {
	slug := c.Param("slug")

	var post models.Post
	if err := h.DB.Preload("Author", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, first_name, last_name, avatar")
	}).Preload("Categories").Preload("Tags").
		Where("slug = ? AND status = ?", slug, models.PostStatusPublished).First(&post).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Post not found"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": post})
}

// Create creates a new post.
func (h *PostHandler) Create(c *gin.Context) {
	var req struct {
		Title           string         `json:"title" binding:"required"`
		Slug            string         `json:"slug"`
		Content         datatypes.JSON `json:"content"`
		Excerpt         string         `json:"excerpt"`
		FeaturedImage   string         `json:"featured_image"`
		Status          string         `json:"status"`
		MetaTitle       string         `json:"meta_title"`
		MetaDescription string         `json:"meta_description"`
		OGImage         string         `json:"og_image"`
		CategoryIDs     []uint         `json:"category_ids"`
		TagIDs          []uint         `json:"tag_ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	tenantIDUint := tenantID.(uint)
	userID, _ := c.Get("user_id")
	userIDUint := userID.(uint)

	post := models.Post{
		TenantID:        tenantIDUint,
		Title:           req.Title,
		Content:         req.Content,
		Excerpt:         req.Excerpt,
		FeaturedImage:   req.FeaturedImage,
		Status:          req.Status,
		MetaTitle:       req.MetaTitle,
		MetaDescription: req.MetaDescription,
		OGImage:         req.OGImage,
		AuthorID:        userIDUint,
	}

	if req.Slug != "" {
		post.Slug = strings.ToLower(strings.TrimSpace(req.Slug))
	}

	if post.Status == models.PostStatusPublished {
		now := time.Now()
		post.PublishedAt = &now
	}

	if err := h.DB.Create(&post).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to create post"},
		})
		return
	}

	// Handle categories
	if len(req.CategoryIDs) > 0 {
		var categories []models.PostCategory
		h.DB.Where("tenant_id = ? AND id IN ?", tenantIDUint, req.CategoryIDs).Find(&categories)
		h.DB.Model(&post).Association("Categories").Replace(categories)
	}

	// Handle tags
	if len(req.TagIDs) > 0 {
		var tags []models.PostTag
		h.DB.Where("tenant_id = ? AND id IN ?", tenantIDUint, req.TagIDs).Find(&tags)
		h.DB.Model(&post).Association("Tags").Replace(tags)
	}

	h.DB.Preload("Author", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, first_name, last_name, avatar")
	}).Preload("Categories").Preload("Tags").First(&post, post.ID)

	if post.Status == models.PostStatusPublished {
		events.Emit(events.PostPublished, post)
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    post,
		"message": "Post created successfully",
	})
}

// Update updates an existing post.
func (h *PostHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid post ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	tenantIDUint := tenantID.(uint)
	var post models.Post
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Post not found"},
		})
		return
	}

	var req struct {
		Title           *string        `json:"title"`
		Slug            *string        `json:"slug"`
		Content         datatypes.JSON `json:"content"`
		Excerpt         *string        `json:"excerpt"`
		FeaturedImage   *string        `json:"featured_image"`
		Status          *string        `json:"status"`
		MetaTitle       *string        `json:"meta_title"`
		MetaDescription *string        `json:"meta_description"`
		OGImage         *string        `json:"og_image"`
		CategoryIDs     []uint         `json:"category_ids"`
		TagIDs          []uint         `json:"tag_ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	updates := map[string]interface{}{}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Slug != nil {
		updates["slug"] = strings.ToLower(strings.TrimSpace(*req.Slug))
	}
	if req.Content != nil {
		updates["content"] = req.Content
	}
	if req.Excerpt != nil {
		updates["excerpt"] = *req.Excerpt
	}
	if req.FeaturedImage != nil {
		updates["featured_image"] = *req.FeaturedImage
	}
	if req.MetaTitle != nil {
		updates["meta_title"] = *req.MetaTitle
	}
	if req.MetaDescription != nil {
		updates["meta_description"] = *req.MetaDescription
	}
	if req.OGImage != nil {
		updates["og_image"] = *req.OGImage
	}

	wasPublished := post.Status == models.PostStatusPublished
	if req.Status != nil {
		updates["status"] = *req.Status
		if *req.Status == models.PostStatusPublished && !wasPublished {
			now := time.Now()
			updates["published_at"] = &now
		} else if *req.Status != models.PostStatusPublished && wasPublished {
			updates["published_at"] = nil
		}
	}

	if len(updates) > 0 {
		h.DB.Model(&post).Updates(updates)
	}

	// Handle categories
	if req.CategoryIDs != nil {
		var categories []models.PostCategory
		if len(req.CategoryIDs) > 0 {
			h.DB.Where("tenant_id = ? AND id IN ?", tenantIDUint, req.CategoryIDs).Find(&categories)
		}
		h.DB.Model(&post).Association("Categories").Replace(categories)
	}

	// Handle tags
	if req.TagIDs != nil {
		var tags []models.PostTag
		if len(req.TagIDs) > 0 {
			h.DB.Where("tenant_id = ? AND id IN ?", tenantIDUint, req.TagIDs).Find(&tags)
		}
		h.DB.Model(&post).Association("Tags").Replace(tags)
	}

	h.DB.Preload("Author", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, first_name, last_name, avatar")
	}).Preload("Categories").Preload("Tags").First(&post, post.ID)

	if req.Status != nil && *req.Status == models.PostStatusPublished && !wasPublished {
		events.Emit(events.PostPublished, post)
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    post,
		"message": "Post updated successfully",
	})
}

// Delete soft-deletes a post.
func (h *PostHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid post ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var post models.Post
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Post not found"},
		})
		return
	}

	h.DB.Model(&post).Association("Categories").Clear()
	h.DB.Model(&post).Association("Tags").Clear()
	h.DB.Delete(&post)

	c.JSON(http.StatusOK, gin.H{
		"message": "Post deleted successfully",
	})
}

// --- Category endpoints ---

// ListCategories returns all post categories.
func (h *PostHandler) ListCategories(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")
	var categories []models.PostCategory
	h.DB.Where("tenant_id = ?", tenantID).
		Order("sort_order ASC, name ASC").
		Find(&categories)

	c.JSON(http.StatusOK, gin.H{"data": categories})
}

// CreateCategory creates a new post category.
func (h *PostHandler) CreateCategory(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Slug        string `json:"slug"`
		Description string `json:"description"`
		ParentID    *uint  `json:"parent_id"`
		SortOrder   int    `json:"sort_order"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	tenantIDUint := tenantID.(uint)

	cat := models.PostCategory{
		TenantID:    tenantIDUint,
		Name:        req.Name,
		Description: req.Description,
		ParentID:    req.ParentID,
		SortOrder:   req.SortOrder,
	}
	if req.Slug != "" {
		cat.Slug = strings.ToLower(strings.TrimSpace(req.Slug))
	}

	if err := h.DB.Create(&cat).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{"code": "DUPLICATE", "message": "Category with this slug already exists"},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    cat,
		"message": "Category created successfully",
	})
}

// UpdateCategory updates an existing category.
func (h *PostHandler) UpdateCategory(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid category ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var cat models.PostCategory
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&cat, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Category not found"},
		})
		return
	}

	var req struct {
		Name        *string `json:"name"`
		Slug        *string `json:"slug"`
		Description *string `json:"description"`
		ParentID    *uint   `json:"parent_id"`
		SortOrder   *int    `json:"sort_order"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Slug != nil {
		updates["slug"] = strings.ToLower(strings.TrimSpace(*req.Slug))
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.ParentID != nil {
		updates["parent_id"] = *req.ParentID
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}

	h.DB.Model(&cat).Updates(updates)
	h.DB.First(&cat, cat.ID)

	c.JSON(http.StatusOK, gin.H{
		"data":    cat,
		"message": "Category updated successfully",
	})
}

// DeleteCategory deletes a category.
func (h *PostHandler) DeleteCategory(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid category ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var cat models.PostCategory
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&cat, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Category not found"},
		})
		return
	}

	h.DB.Model(&cat).Association("Posts").Clear()
	h.DB.Delete(&cat)

	c.JSON(http.StatusOK, gin.H{
		"message": "Category deleted successfully",
	})
}

// --- PostTag endpoints ---

// ListPostTags returns all post tags.
func (h *PostHandler) ListPostTags(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")
	var tags []models.PostTag
	h.DB.Where("tenant_id = ?", tenantID).Order("name ASC").Find(&tags)

	c.JSON(http.StatusOK, gin.H{"data": tags})
}

// CreatePostTag creates a new post tag.
func (h *PostHandler) CreatePostTag(c *gin.Context) {
	var req struct {
		Name string `json:"name" binding:"required"`
		Slug string `json:"slug"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	tenantIDUint := tenantID.(uint)

	tag := models.PostTag{
		TenantID: tenantIDUint,
		Name:     req.Name,
	}
	if req.Slug != "" {
		tag.Slug = strings.ToLower(strings.TrimSpace(req.Slug))
	}

	if err := h.DB.Create(&tag).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{"code": "DUPLICATE", "message": "Tag with this slug already exists"},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    tag,
		"message": "Post tag created successfully",
	})
}

// DeletePostTag deletes a post tag.
func (h *PostHandler) DeletePostTag(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "Invalid tag ID"},
		})
		return
	}

	tenantID, _ := c.Get("tenant_id")
	var tag models.PostTag
	if err := h.DB.Where("tenant_id = ?", tenantID).First(&tag, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Post tag not found"},
		})
		return
	}

	h.DB.Model(&tag).Association("Posts").Clear()
	h.DB.Delete(&tag)

	c.JSON(http.StatusOK, gin.H{
		"message": "Post tag deleted successfully",
	})
}

// --- RSS Feed ---

// RSSItem represents an item in an RSS feed.
type RSSItem struct {
	XMLName     xml.Name `xml:"item"`
	Title       string   `xml:"title"`
	Link        string   `xml:"link"`
	Description string   `xml:"description"`
	PubDate     string   `xml:"pubDate"`
	GUID        string   `xml:"guid"`
	Author      string   `xml:"author,omitempty"`
}

// RSSFeed represents an RSS 2.0 feed.
type RSSFeed struct {
	XMLName     xml.Name  `xml:"rss"`
	Version     string    `xml:"version,attr"`
	Title       string    `xml:"channel>title"`
	Link        string    `xml:"channel>link"`
	Description string    `xml:"channel>description"`
	Language    string    `xml:"channel>language"`
	PubDate     string    `xml:"channel>pubDate"`
	Items       []RSSItem `xml:"channel>item"`
}

// RSS returns the blog RSS feed.
func (h *PostHandler) RSS(c *gin.Context) {
	var posts []models.Post
	h.DB.Preload("Author", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, first_name, last_name")
	}).Where("status = ?", models.PostStatusPublished).
		Order("published_at DESC").
		Limit(50).
		Find(&posts)

	// Get site URL from settings or use request host
	siteURL := fmt.Sprintf("%s://%s", c.Request.URL.Scheme, c.Request.Host)
	if siteURL == "://" {
		siteURL = "http://" + c.Request.Host
	}

	items := make([]RSSItem, 0, len(posts))
	for _, p := range posts {
		authorName := ""
		if p.Author != nil {
			authorName = p.Author.FirstName + " " + p.Author.LastName
		}
		pubDate := ""
		if p.PublishedAt != nil {
			pubDate = p.PublishedAt.Format(time.RFC1123Z)
		}
		items = append(items, RSSItem{
			Title:       p.Title,
			Link:        siteURL + "/blog/" + p.Slug,
			Description: p.Excerpt,
			PubDate:     pubDate,
			GUID:        siteURL + "/blog/" + p.Slug,
			Author:      authorName,
		})
	}

	feed := RSSFeed{
		Version:     "2.0",
		Title:       "GritCMS Blog",
		Link:        siteURL + "/blog",
		Description: "Latest posts",
		Language:    "en-us",
		PubDate:     time.Now().Format(time.RFC1123Z),
		Items:       items,
	}

	c.Header("Content-Type", "application/rss+xml; charset=utf-8")
	c.XML(http.StatusOK, feed)
}

// --- Sitemap ---

// SitemapURL represents a single URL in the sitemap.
type SitemapURL struct {
	XMLName    xml.Name `xml:"url"`
	Loc        string   `xml:"loc"`
	LastMod    string   `xml:"lastmod,omitempty"`
	ChangeFreq string   `xml:"changefreq,omitempty"`
	Priority   string   `xml:"priority,omitempty"`
}

// SitemapURLSet is the root element of a sitemap.
type SitemapURLSet struct {
	XMLName xml.Name     `xml:"urlset"`
	XMLNS   string       `xml:"xmlns,attr"`
	URLs    []SitemapURL `xml:"url"`
}

// Sitemap returns sitemap.xml with published pages and posts.
func (h *PostHandler) Sitemap(c *gin.Context) {
	siteURL := fmt.Sprintf("%s://%s", c.Request.URL.Scheme, c.Request.Host)
	if siteURL == "://" {
		siteURL = "http://" + c.Request.Host
	}

	urls := []SitemapURL{
		{Loc: siteURL + "/", ChangeFreq: "daily", Priority: "1.0"},
		{Loc: siteURL + "/blog", ChangeFreq: "daily", Priority: "0.8"},
	}

	// Published pages
	var pages []models.Page
	h.DB.Where("status = ?", models.PageStatusPublished).
		Select("slug, updated_at").Find(&pages)

	for _, pg := range pages {
		urls = append(urls, SitemapURL{
			Loc:        siteURL + "/" + pg.Slug,
			LastMod:    pg.UpdatedAt.Format("2006-01-02"),
			ChangeFreq: "weekly",
			Priority:   "0.7",
		})
	}

	// Published posts
	var posts []models.Post
	h.DB.Where("status = ?", models.PostStatusPublished).
		Select("slug, updated_at").Find(&posts)

	for _, p := range posts {
		urls = append(urls, SitemapURL{
			Loc:        siteURL + "/blog/" + p.Slug,
			LastMod:    p.UpdatedAt.Format("2006-01-02"),
			ChangeFreq: "weekly",
			Priority:   "0.6",
		})
	}

	sitemap := SitemapURLSet{
		XMLNS: "http://www.sitemaps.org/schemas/sitemap/0.9",
		URLs:  urls,
	}

	c.Header("Content-Type", "application/xml; charset=utf-8")
	c.XML(http.StatusOK, sitemap)
}

// RobotsTxt serves a robots.txt file.
func (h *PostHandler) RobotsTxt(c *gin.Context) {
	siteURL := fmt.Sprintf("%s://%s", c.Request.URL.Scheme, c.Request.Host)
	if siteURL == "://" {
		siteURL = "http://" + c.Request.Host
	}

	content := fmt.Sprintf("User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n", siteURL)
	c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(content))
}

// --- JSON-LD ---

// JSONLD returns structured data for a post.
func (h *PostHandler) JSONLD(c *gin.Context) {
	slug := c.Param("slug")

	var post models.Post
	if err := h.DB.Preload("Author", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, first_name, last_name, avatar")
	}).Where("slug = ? AND status = ?", slug, models.PostStatusPublished).First(&post).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Post not found"},
		})
		return
	}

	siteURL := fmt.Sprintf("%s://%s", c.Request.URL.Scheme, c.Request.Host)
	if siteURL == "://" {
		siteURL = "http://" + c.Request.Host
	}

	ld := map[string]interface{}{
		"@context":      "https://schema.org",
		"@type":         "BlogPosting",
		"headline":      post.Title,
		"description":   post.Excerpt,
		"url":           siteURL + "/blog/" + post.Slug,
		"datePublished": post.PublishedAt,
		"dateModified":  post.UpdatedAt,
	}

	if post.FeaturedImage != "" {
		ld["image"] = post.FeaturedImage
	}

	if post.Author != nil {
		ld["author"] = map[string]interface{}{
			"@type": "Person",
			"name":  post.Author.FirstName + " " + post.Author.LastName,
		}
	}

	c.JSON(http.StatusOK, ld)
}

