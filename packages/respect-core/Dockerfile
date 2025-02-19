# Run the fake db in an isolated environment
FROM node:22-alpine@sha256:f2dc6eea95f787e25f173ba9904c9d0647ab2506178c7b5b7c5a3d02bc4af145

# Set the working directory inside the container
WORKDIR /server

# Copy the package.json file into the container
COPY package.json .

# Install dependencies
RUN npm install --no-optional

COPY . .

# Run the Test Runner
CMD ["npm", "run", "json-server"]
