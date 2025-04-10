#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "⚠️  Error: .env file not found. Please create it and set the required variables."
    exit 1
fi

# Requirement: whiptail must be installed
if ! command -v whiptail &> /dev/null; then
    echo "⚠️  Error: 'whiptail' is not installed. Install it with 'sudo apt install whiptail' or equivalent."
    exit 1
fi

# Endpoint and path
BUCKET_PATH="s3://$DO_BUCKET_NAME/data/active_players/"

# Main menu to choose functionality
CHOICE=$(whiptail --title "Main Menu" --menu "Choose an option:" 15 60 2 \
    "1" "Enter VAT number directly" \
    "2" "Choose from the list of all VAT numbers" 3>&1 1>&2 2>&3)

if [ $? -ne 0 ]; then
    echo "🚪 No option selected. Exiting."
    exit 0
fi

if [ "$CHOICE" -eq 1 ]; then
    # Option 1: Enter VAT number directly
    VAT_NUMBER=$(whiptail --title "Enter VAT Number" --inputbox "Please enter the VAT number:" 10 60 3>&1 1>&2 2>&3)
    
    if [ $? -ne 0 ] || [ -z "$VAT_NUMBER" ]; then
        echo "🚪 No VAT number entered. Exiting."
        exit 0
    fi

    # Check if the file exists before attempting to display its content
    if aws s3 ls --endpoint-url "$DO_ENDPOINT" "${BUCKET_PATH}${VAT_NUMBER}" > /dev/null 2>&1; then
        echo ""
        echo "📄 Content of: $VAT_NUMBER"
        aws s3 cp --endpoint-url "$DO_ENDPOINT" "${BUCKET_PATH}${VAT_NUMBER}.json" - | jq
    else
        echo "❌ VAT number '$VAT_NUMBER' not found."
    fi

else
    # Option 2: Choose from the list of all VAT numbers
    echo "📁 Retrieving available files..."
    FILES=$(aws s3 ls --endpoint-url "$DO_ENDPOINT" "$BUCKET_PATH" | awk '{print $4}' | grep -v '^$')

    if [ -z "$FILES" ]; then
        echo "❌ No files found in the directory."
        exit 1
    fi

    # Prepare file list for whiptail
    FILE_ARRAY=()
    while IFS= read -r file; do
        FILE_ARRAY+=("$file" "")
    done <<< "$FILES"

    # Interactive file selection with whiptail
    SELECTED_FILE=$(whiptail --title "File Selection" --menu "Choose a file to view:" 20 78 10 "${FILE_ARRAY[@]}" 3>&1 1>&2 2>&3)

    if [ $? -ne 0 ]; then
        echo "🚪 No file selected. Exiting."
        exit 0
    fi

    # Display the content of the selected file
    echo ""
    echo "📄 Content of: $SELECTED_FILE"
    aws s3 cp --endpoint-url "$DO_ENDPOINT" "${BUCKET_PATH}${SELECTED_FILE}" - | jq
fi
