FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache python3 make g++ postgresql-dev

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
