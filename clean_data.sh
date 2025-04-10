# Function for colored logs with separator
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

log "Removing active players data from S3"
aws --endpoint-url "$DO_ENDPOINT" s3 rm s3://$DO_BUCKET_NAME/data/active_players/ --recursive

log "Removing prizes.jsonl from S3"
aws --endpoint-url "$DO_ENDPOINT" s3 rm s3://$DO_BUCKET_NAME/data/prizes.jsonl

log "Uploading prizes.jsonl to S3"
aws --endpoint-url "$DO_ENDPOINT" s3 cp prizes.jsonl s3://$DO_BUCKET_NAME/data/prizes.jsonl
