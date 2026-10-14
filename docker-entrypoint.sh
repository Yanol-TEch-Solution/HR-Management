#!/bin/sh
# Runtime entrypoint: prepare persistence, migrate schema, seed ONCE, start.
set -e

PERSIST=/app/persist
mkdir -p "$PERSIST/uploads"

# Redirect the upload dir into the persistent volume (UPLOAD_DIR is
# hardcoded to server/middleware/uploads, so symlink instead of patching).
if [ ! -L /app/server/middleware/uploads ]; then
    rm -rf /app/server/middleware/uploads
    ln -s "$PERSIST/uploads" /app/server/middleware/uploads
fi

cd /app/server

# Schema sync is idempotent and safe on every boot.
npx prisma db push --skip-generate --schema=prisma/schema.prisma

# The seeder wipes all business data (pure clean seeder) — run exactly once,
# guarded by a marker on the persistent volume.
if [ ! -f "$PERSIST/.seeded" ]; then
    echo "[entrypoint] first boot: seeding initial HR admin account"
    node prisma/seed.js
    touch "$PERSIST/.seeded"
fi

exec node index.js
