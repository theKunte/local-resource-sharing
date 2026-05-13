# ---- build stage ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY index.html ./
COPY postcss.config.js tailwind.config.js vite.config.ts ./
COPY public ./public
COPY src ./src

# Build without Firebase credentials - they'll be injected at runtime
RUN npm run build

# ---- production stage ----
FROM nginx:stable-alpine AS runner

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy and set up runtime entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

# Use custom entrypoint that generates config.js from runtime env vars
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
