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

RUN npm run build

# ---- production stage ----
FROM nginx:stable-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback: all routes serve index.html
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
