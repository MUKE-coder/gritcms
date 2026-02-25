package events

import (
	"log"
	"sync"
)

// Handler is a function that handles an event.
type Handler func(data interface{})

// Bus is a simple in-process event bus for cross-module communication.
type Bus struct {
	mu       sync.RWMutex
	handlers map[string][]Handler
}

var (
	defaultBus *Bus
	once       sync.Once
)

// Default returns the singleton event bus instance.
func Default() *Bus {
	once.Do(func() {
		defaultBus = &Bus{
			handlers: make(map[string][]Handler),
		}
	})
	return defaultBus
}

// On registers a handler for the given event name.
func On(event string, handler Handler) {
	Default().On(event, handler)
}

// Emit fires an event, calling all registered handlers asynchronously.
func Emit(event string, data interface{}) {
	Default().Emit(event, data)
}

// EmitSync fires an event, calling all registered handlers synchronously.
func EmitSync(event string, data interface{}) {
	Default().EmitSync(event, data)
}

// On registers a handler for the given event name.
func (b *Bus) On(event string, handler Handler) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.handlers[event] = append(b.handlers[event], handler)
	log.Printf("[events] Registered handler for %q", event)
}

// Emit fires an event asynchronously — all handlers run in goroutines.
func (b *Bus) Emit(event string, data interface{}) {
	b.mu.RLock()
	handlers := b.handlers[event]
	b.mu.RUnlock()

	if len(handlers) == 0 {
		return
	}

	log.Printf("[events] Emitting %q (%d handlers)", event, len(handlers))
	for _, h := range handlers {
		go func(fn Handler) {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[events] Panic in handler for %q: %v", event, r)
				}
			}()
			fn(data)
		}(h)
	}
}

// EmitSync fires an event synchronously — blocks until all handlers complete.
func (b *Bus) EmitSync(event string, data interface{}) {
	b.mu.RLock()
	handlers := b.handlers[event]
	b.mu.RUnlock()

	if len(handlers) == 0 {
		return
	}

	log.Printf("[events] Emitting (sync) %q (%d handlers)", event, len(handlers))
	for _, h := range handlers {
		func(fn Handler) {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[events] Panic in handler for %q: %v", event, r)
				}
			}()
			fn(data)
		}(h)
	}
}

// HandlerCount returns how many handlers are registered for a given event.
func (b *Bus) HandlerCount(event string) int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.handlers[event])
}
