#!/usr/bin/env bash
#
# Build apps/web and upload it to Hostinger over FTPS. No third party involved:
# the build happens on this machine and only the compiled output leaves it.
#
# Setup, once:
#   1. cp scripts/deploy.env.example scripts/deploy.env
#   2. Fill in scripts/deploy.env with the FTP details from hPanel
#      (Files -> FTP Accounts). scripts/deploy.env is gitignored.
#   3. brew install lftp
#
# Usage:
#   ./scripts/deploy-web.sh            # dry run, shows what would change
#   ./scripts/deploy-web.sh --live     # actually upload
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/scripts/deploy.env"
DIST="$ROOT/apps/web/dist"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy scripts/deploy.env.example and fill it in." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

for var in FTP_HOST FTP_USER FTP_PASS FTP_REMOTE_DIR; do
  if [[ -z "${!var:-}" ]]; then
    echo "$var is not set in $ENV_FILE" >&2
    exit 1
  fi
done

command -v lftp >/dev/null || { echo "lftp not installed. brew install lftp" >&2; exit 1; }

DRY_RUN="--dry-run"
if [[ "${1:-}" == "--live" ]]; then
  DRY_RUN=""
  echo "LIVE deploy to $FTP_HOST:$FTP_REMOTE_DIR"
else
  echo "DRY RUN. Re-run with --live to actually upload."
fi

echo "==> Building apps/web"
( cd "$ROOT/apps/web" && npm ci && npm run build )

[[ -f "$DIST/index.html" ]]  || { echo "Build produced no index.html" >&2; exit 1; }
[[ -f "$DIST/.htaccess" ]]   || { echo "Build produced no .htaccess; SPA routes would 404" >&2; exit 1; }

echo "==> Uploading $DIST"
# --delete removes remote files that no longer exist locally, so old hashed
# bundles do not pile up. --parallel speeds up the many small asset files.
lftp -c "
set ftp:ssl-force true;
set ftp:ssl-protect-data true;
set ssl:verify-certificate true;
open -u '$FTP_USER','$FTP_PASS' '$FTP_HOST';
mirror --reverse --delete --verbose --parallel=4 $DRY_RUN \
  --exclude-glob .DS_Store \
  '$DIST/' '$FTP_REMOTE_DIR';
bye
"

echo "==> Done."
