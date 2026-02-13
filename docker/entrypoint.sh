

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
  echo "Initializing database schema via Prisma db push (no migrations)..."
  $PRISMA_CMD db push --skip-generate 2>&1
else
  echo "Skipping Prisma database initialization (PRISMA_SKIP_DB_INIT=true)"
fi

echo "Starting Next.js server..."
exec "$@"

