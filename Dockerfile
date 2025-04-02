FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install PostgreSQL dependencies for node-gyp
RUN apk add --no-cache python3 make g++ postgresql-dev

RUN npm install

COPY . .

# Environment variables that were in docker-compose.yml
ENV EMAIL_USER=your-email@example.com
ENV EMAIL_PASS=your-email-password
ENV SMTP_HOST=smtp.example.com
ENV SMTP_PORT=587
ENV COMMERCIAL_EMAIL=commercial@yourcompany.com

EXPOSE 3000

CMD ["npm", "run", "dev"]
