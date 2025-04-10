# Function for colored logs
log() {
    term_width=$(tput cols)
    msg=" $1 "
    msg_length=${#msg}
    filler_length=$(( (term_width - msg_length) / 2 ))
    filler=$(printf '%*s' "$filler_length" '' | tr ' ' '-')
    echo ""
    echo "\033[1;32m${filler}${msg}${filler}\033[0m"
    echo ""
}

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "⚠️  Error: .env file not found. Please create it and set the required variables."
    exit 1
fi

# Removes all files in the active_players directory in the S3 bucket
log "Removing active players data from S3"
aws --endpoint-url "$DO_ENDPOINT" s3 rm s3://$DO_BUCKET_NAME/data/active_players/ --recursive

# Stops the existing Docker container named easter-game
log "Stopping the existing Docker container"
docker stop easter-game

# Removes all unused Docker volumes and system data
log "Pruning unused Docker volumes and system data"
docker system prune -f --volumes

# Builds a new Docker image for easter-game
log "Building the Docker image for easter-game"
docker build -t easter-game .

# Starts a new Docker container for easter-game
log "Starting a new Docker container for easter-game"
docker run -d -p 3000:3000 --env-file .env --name easter-game easter-game

# Displays the logs of the container in real-time
log "Displaying logs for the Docker container"
docker logs easter-game -f
