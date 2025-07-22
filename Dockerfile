# Use official Node.js LTS image
FROM node:18

# Create app directory inside container
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your app files
COPY . .

# Expose port (match the one in server.js)
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
