

set -e


if [ "$(id -u)" = "0" ]; then
  echo "Running as root, fixing permissions on uploads directory..."

  mkdir -p /app/public/uploads/tasks
  chown -R appuser:appgroup /app/public/uploads 2>/dev/null || true

  exec su-exec appuser sh "$0" "$@"
fi

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set. Please configure it in your .env file"
  exit 1
fi

PRISMA_CMD="./node_modules/.bin/prisma"
if [ ! -f "$PRISMA_CMD" ]; then
  PRISMA_CMD="npx prisma@6"
fi

echo "Waiting a few seconds for database to be fully ready..."
sleep 5

if [ "${PRISMA_SKIP_DB_INIT:-false}" != "true" ]; then
  PRISMA_MIGRATION_MODE="${PRISMA_MIGRATION_MODE:-deploy}"
  HAS_MIGRATIONS=false
  if [ -d "/app/prisma/migrations" ]; then
    if [ "$(ls -A /app/prisma/migrations 2>/dev/null | wc -l | tr -d ' ')" != "0" ]; then
      HAS_MIGRATIONS=true
    fi
  fi
  if [ "$PRISMA_MIGRATION_MODE" = "push" ]; then
    echo "Applying schema via Prisma db push..."
    $PRISMA_CMD db push --skip-generate 2>&1
  else
    if [ "$HAS_MIGRATIONS" != "true" ]; then
      echo "No prisma/migrations found; falling back to Prisma db push..."
      $PRISMA_CMD db push --skip-generate 2>&1
    else
    echo "Applying migrations via Prisma migrate deploy..."
      $PRISMA_CMD migrate deploy 2>&1 || {
        echo "Prisma migrate deploy failed. If you see P3009 (failed migration recorded), resolve it with prisma migrate resolve, or switch PRISMA_MIGRATION_MODE=push."
        exit 1
      }
    fi
  fi
else
  echo "Skipping Prisma database initialization (PRISMA_SKIP_DB_INIT=true)"
fi

echo "Starting Next.js server..."
exec "$@"

