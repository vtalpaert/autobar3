#!/usr/bin/env bash
# netcat_commands.sh
# Minimal HTTP listener using netcat (nc) to trigger commands
# call with curl -d "cmd=db_push" http://localhost:8081

PORT=8081
LOCAL_DATA_FOLDER=$1

db_push () {
    echo $(ls /data/db/)

    if [ ! -f /data/db/local.db ]; then
        docker run --rm \
            --mount type=bind,src=$LOCAL_DATA_FOLDER/db,dst=/data/db-init \
            autobar3:prod-db \
            /bin/sh -c "cp /data/db/local.db /data/db-init/local.db"
        echo "Initialized local.db from autobar3:prod-db"
    else
        docker run --rm \
            --mount type=bind,src=$LOCAL_DATA_FOLDER/db,dst=/data/db \
            autobar3:prod-db \
            /bin/sh -c "npm run db:push"
        echo "Ran npm run db:push from autobar3:prod-db"
    fi
}

echo "Starting netcat server on $PORT ..."
while true; do
    # Send HTTP OK response
    { 
        echo -e "HTTP/1.1 200 OK\r\nConnection: close\r\n\r\nOK"; 
    } | nc -vl -p $PORT -q 0 | {

        # Read full HTTP request from nc
        request=$(cat)

        # Extract POST body — tolerant to \r\n line endings
        body=$(echo "$request" | awk 'BEGIN{body=0} body{print} /^\r?$/{body=1}')

        # Extract cmd value
        cmd=$(echo "$body" | sed -n 's/^cmd=//p' | tr -d '\r\n')

        # Match command
        case "$cmd" in
        "db_push")
            db_push
            ;;
        *)
            echo "Unrecognized command" >&2
            ;;
        esac
    }
done
