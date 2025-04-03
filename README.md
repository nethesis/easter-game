# easter-game
Easter game for nethesis partners to win an exclusive prize.

## Requirements

1. **S3 Bucket**:
   - Create an S3 bucket with a folder named `data`.
   - Inside the `data` folder, add a file `players.json` containing the partners' data.

2. **Digital Ocean Configuration**:
   - Provide Digital Ocean with the following environment variables:
     - `DO_ACCESS_KEY`
     - `DO_SECRET_KEY`
     - `DO_ENDPOINT`
     - `DO_REGION`
     - `DO_BUCKET_NAME`
     - `EMAIL_USER`
     - `EMAIL_PASS`
     - `SMTP_HOST`
     - `SMTP_PORT`
     - `COMMERCIAL_EMAIL`

