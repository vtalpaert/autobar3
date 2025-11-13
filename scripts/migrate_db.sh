#!/usr/bin/env bash
# migrate_db.sh
# Create the database or migrate it

mkdir -p /data/db
mkdir -p /data/uploads

if [ ! -f /data/db/local.db ]; then
    cp /app/initial.db /data/db/local.db
    echo "Initialized local.db from autobar3:prod-db"
else
    npm run db:push
    echo "Ran npm run db:push from autobar3:prod-db"
fi
