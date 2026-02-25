#!/bin/bash
set -e

# GritCMS — One-command deployment script
# Usage: ./deploy.sh [up|down|restart|logs|build]

COMPOSE_FILE="docker-compose.prod.yml"
PROJECT="gritcms"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[GritCMS]${NC} $1"; }
warn() { echo -e "${YELLOW}[GritCMS]${NC} $1"; }
err() { echo -e "${RED}[GritCMS]${NC} $1"; }

# Check prerequisites
check_prereqs() {
  if ! command -v docker &> /dev/null; then
    err "Docker is not installed. Install it: https://docs.docker.com/get-docker/"
    exit 1
  fi
  if ! docker compose version &> /dev/null; then
    err "Docker Compose V2 is required. Update Docker."
    exit 1
  fi
}

# Check .env file
check_env() {
  if [ ! -f .env ]; then
    warn ".env file not found. Copying from .env.example..."
    cp .env.example .env
    warn "Please edit .env with your production values before deploying."
    warn "At minimum, change: JWT_SECRET, DATABASE_URL passwords, SENTINEL_SECRET_KEY"
    exit 1
  fi
}

case "${1:-up}" in
  up)
    check_prereqs
    check_env
    log "Building and starting GritCMS..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" up -d --build
    log "Waiting for services to be healthy..."
    sleep 5
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" ps
    echo ""
    log "GritCMS is running!"
    log "  API:   http://localhost:8080"
    log "  Web:   http://localhost:3000"
    log "  Admin: http://localhost:3001"
    log "  API Docs: http://localhost:8080/docs"
    log "  Studio:   http://localhost:8080/studio"
    log "  Pulse:    http://localhost:8080/pulse"
    log "  Sentinel: http://localhost:8080/sentinel"
    ;;
  down)
    log "Stopping GritCMS..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" down
    log "Stopped."
    ;;
  restart)
    log "Restarting GritCMS..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" restart
    log "Restarted."
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" logs -f "${2:-}"
    ;;
  build)
    check_prereqs
    check_env
    log "Rebuilding GritCMS (no cache)..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" build --no-cache
    log "Build complete. Run './deploy.sh up' to start."
    ;;
  status)
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" ps
    ;;
  backup)
    log "Backing up PostgreSQL database..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" exec -T postgres \
      pg_dump -U grit gritcms > "backup_${TIMESTAMP}.sql"
    log "Backup saved to backup_${TIMESTAMP}.sql"
    ;;
  *)
    echo "Usage: ./deploy.sh [up|down|restart|logs|build|status|backup]"
    echo ""
    echo "Commands:"
    echo "  up       Build and start all services (default)"
    echo "  down     Stop all services"
    echo "  restart  Restart all services"
    echo "  logs     Follow logs (optional: service name)"
    echo "  build    Rebuild all images (no cache)"
    echo "  status   Show running containers"
    echo "  backup   Backup PostgreSQL to SQL file"
    ;;
esac
