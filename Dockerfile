FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache python3 make g++ postgresql-dev

RUN npm install

COPY . .

COPY .env .env

EXPOSE 3000

CMD ["npm", "run", "dev"]
