#!/usr/bin/env bash
#
# Update the live sites on the VPS from GitHub. Run on the VPS, as root:
#
#   sudo bash /opt/greatskills/scripts/deploy.sh
#
# Steps: pull main, build both sites in a throwaway Node container, copy them
# into the folders nginx serves, rebuild and restart the portal API, check health.
# Both sites are built before either is copied, so a failed build leaves the
# live sites exactly as they were.
#
set -euo pipefail

APP_DIR=/opt/greatskills
WEB_ROOT=/var/www/greatskills-web
PORTAL_ROOT=/var/www/greatskills-portal
SITE_URL=https://achievers.greatskills.org
COMPOSE=(docker compose -f "$APP_DIR/infra/docker-compose.prod.yml" --env-file "$APP_DIR/infra/.env.prod")

[[ $EUID -eq 0 ]] || { echo "Run as root: sudo bash $0" >&2; exit 1; }
[[ -f $APP_DIR/infra/.env.prod ]] || { echo "Missing $APP_DIR/infra/.env.prod" >&2; exit 1; }

cd "$APP_DIR"

echo "==> Pulling latest main"
before=$(git rev-parse --short HEAD)
git pull --ff-only
after=$(git rev-parse --short HEAD)
echo "    $before -> $after"

build() {  # build <app dir> <ENV=value>
  echo "==> Building $1"
  docker run --rm -v "$APP_DIR:/src" -w "/src/apps/$1" -e "$2" \
    node:22-alpine sh -c "npm ci --no-audit --no-fund --loglevel=error && npm run build"
  [[ -f apps/$1/dist/index.html ]] || { echo "Build of $1 produced no index.html" >&2; exit 1; }
}
build web    "VITE_PORTAL_URL=$SITE_URL"
build portal "VITE_API_URL=$SITE_URL"

echo "==> Publishing sites"
rsync -a --delete apps/web/dist/    "$WEB_ROOT/"
rsync -a --delete apps/portal/dist/ "$PORTAL_ROOT/"
chmod -R a+rX "$WEB_ROOT" "$PORTAL_ROOT"

echo "==> Restarting portal API"
"${COMPOSE[@]}" up -d --build

echo "==> Health check"
for _ in $(seq 1 15); do
  if curl -fsS localhost:8010/health >/dev/null 2>&1; then
    echo "    API healthy. Deployed $after."
    exit 0
  fi
  sleep 2
done
echo "API did not report healthy after 30s. Check: ${COMPOSE[*]} logs api" >&2
exit 1
