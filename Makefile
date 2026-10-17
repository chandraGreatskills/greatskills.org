# ── Run manually (no make) ────────────────────────────────────────────────
#   Backend : cd services/api && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
#   Web     : cd apps/web    && npm run dev      # http://localhost:5173
#   Portal  : cd apps/portal && npm run dev      # http://localhost:5174
# ──────────────────────────────────────────────────────────────────────────
#   make install   one-time: create venv + install all deps
#   make dev       start backend + web + portal together (Ctrl+C stops all)
#   make test      run backend tests
#   make build     production build of both frontends
#   make stop      kill any running dev servers
# ──────────────────────────────────────────────────────────────────────────

API_DIR    := services/api
WEB_DIR    := apps/web
PORTAL_DIR := apps/portal
VENV       := $(API_DIR)/.venv
PYBIN      := $(VENV)/bin

.PHONY: dev api web portal install test build stop clean

## Start everything at once. Ctrl+C stops all three.
dev:
	@echo "API    http://localhost:8000   (docs: /docs)"
	@echo "Web    http://localhost:5173"
	@echo "Portal http://localhost:5174"
	@trap 'kill 0' INT TERM EXIT; \
	( cd $(API_DIR) && $(abspath $(PYBIN))/uvicorn app.main:app --reload --port 8000 ) & \
	( cd $(WEB_DIR) && npm run dev ) & \
	( cd $(PORTAL_DIR) && npm run dev ) & \
	wait

## Individual services
api:
	cd $(API_DIR) && $(abspath $(PYBIN))/uvicorn app.main:app --reload --port 8000

web:
	cd $(WEB_DIR) && npm run dev

portal:
	cd $(PORTAL_DIR) && npm run dev

## One-time setup: python venv + all npm deps
install:
	cd $(API_DIR) && python3 -m venv .venv && $(abspath $(PYBIN))/pip install -q --upgrade pip && $(abspath $(PYBIN))/pip install -q -r requirements.txt
	cd $(WEB_DIR) && npm install
	cd $(PORTAL_DIR) && npm install
	@echo "Done. Run 'make dev'."

test:
	cd $(API_DIR) && $(abspath $(PYBIN))/pytest -q

build:
	cd $(WEB_DIR) && npm run build
	cd $(PORTAL_DIR) && npm run build

stop:
	-@pkill -f "uvicorn app.main:app" 2>/dev/null || true
	-@pkill -f "vite" 2>/dev/null || true
	@echo "Stopped dev servers."

clean:
	rm -f $(API_DIR)/greatskills.db
	rm -rf $(WEB_DIR)/dist $(PORTAL_DIR)/dist
