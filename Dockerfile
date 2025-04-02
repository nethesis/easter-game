FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install PostgreSQL dependencies for node-gyp
RUN apk add --no-cache python3 make g++ postgresql-dev

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
