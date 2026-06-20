FROM node:22-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source code
COPY . .

# Expose the cheeky Once Human stardust port 6660
EXPOSE 6660

# Run database seeding first, then start the server
CMD [ "sh", "-c", "node seed.js && node server.js" ]
