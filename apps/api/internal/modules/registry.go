package modules

import (
	"log"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"gritcms/apps/api/internal/config"
	"gritcms/apps/api/internal/events"
)

// Module defines the interface that all GritCMS modules must implement.
type Module interface {
	// Name returns the unique module identifier.
	Name() string

	// RegisterRoutes adds the module's routes to the router.
	RegisterRoutes(r *gin.Engine, db *gorm.DB, cfg *config.Config)

	// RegisterEvents registers event listeners with the event bus.
	RegisterEvents(bus *events.Bus, db *gorm.DB)
}

// Registry holds all registered modules.
type Registry struct {
	modules []Module
}

// NewRegistry creates a new module registry.
func NewRegistry() *Registry {
	return &Registry{}
}

// Register adds a module to the registry.
func (r *Registry) Register(m Module) {
	r.modules = append(r.modules, m)
	log.Printf("[modules] Registered module: %s", m.Name())
}

// InitAll initializes all registered modules — registers routes and event listeners.
func (r *Registry) InitAll(engine *gin.Engine, db *gorm.DB, cfg *config.Config) {
	bus := events.Default()

	for _, m := range r.modules {
		m.RegisterRoutes(engine, db, cfg)
		m.RegisterEvents(bus, db)
		log.Printf("[modules] Initialized module: %s", m.Name())
	}
}

// Modules returns all registered modules.
func (r *Registry) Modules() []Module {
	return r.modules
}
