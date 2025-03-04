# Build
FROM node:20-alpine AS build
RUN npm install -g pnpm
WORKDIR /app

# Clean pnpm store and install dependencies
COPY package*.json pnpm-lock.yaml ./
RUN pnpm store prune && \
    pnpm install --frozen-lockfile

COPY . .
# Build
RUN pnpm run build

# Application runtime container
FROM node:20-alpine
RUN npm install -g pnpm serve
WORKDIR /app

COPY --from=build /app/dist ./dist

EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]
