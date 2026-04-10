set -e

if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/public/uploads/tasks
  chown -R appuser:appgroup /app/public/uploads 2>/dev/null || true
  exec su-exec appuser sh "$0" "$@"
fi

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set."
  exit 1
fi

PRISMA_CMD="node /app/node_modules/prisma/build/index.js"
if [ ! -f "/app/node_modules/prisma/build/index.js" ]; then
  PRISMA_CMD="npx prisma"
fi

sleep 2

if [ "${PRISMA_SKIP_DB_INIT:-false}" != "true" ]; then
  PRISMA_MIGRATION_MODE="${PRISMA_MIGRATION_MODE:-deploy}"
  HAS_MIGRATIONS=false
  if [ -d "/app/prisma/migrations" ]; then
    if [ "$(ls -A /app/prisma/migrations 2>/dev/null | wc -l | tr -d ' ')" != "0" ]; then
      HAS_MIGRATIONS=true
    fi
  fi
  if [ "$PRISMA_MIGRATION_MODE" = "push" ]; then
    $PRISMA_CMD db push --skip-generate 2>&1
  else
    if [ "$HAS_MIGRATIONS" != "true" ]; then
      $PRISMA_CMD db push --skip-generate 2>&1
    else
      $PRISMA_CMD migrate deploy 2>&1 || {
        echo "Prisma migrate deploy failed (try PRISMA_MIGRATION_MODE=push or prisma migrate resolve)."
        exit 1
      }
    fi
  fi
fi

exec "$@"
