# Deployment Guide

This guide covers deploying GearShare securely to production using Docker.

## 🔒 Security Model

GearShare uses **runtime configuration injection** to keep credentials secure:

- ✅ **No secrets in image layers**: Credentials injected when container starts
- ✅ **Environment-specific config**: Same image works across dev/staging/production
- ✅ **Credential rotation**: Update secrets without rebuilding images
- ✅ **Registry-safe**: Images can be pushed to registries without exposing secrets

## 📋 Prerequisites

- Docker and Docker Compose installed
- Firebase project configured
- PostgreSQL database (can use Docker Compose)
- SSL/TLS certificate (for production HTTPS)
- Domain name (optional, for production deployment)

## 🚀 Quick Start (Development)

1. **Clone and install dependencies:**

   ```bash
   git clone https://github.com/theKunte/local-resource-sharing.git
   cd local-resource-sharing
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your Firebase credentials
   ```

3. **Start all services:**

   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - Frontend: `http://localhost`
   - Backend API: `http://localhost:3001`

## 🏭 Production Deployment

### Step 1: Build Production Images

```bash
# Build frontend (no credentials needed at build time!)
docker build -t gearshare-frontend:latest ./frontend

# Build backend
docker build -t gearshare-backend:latest ./backend
```

**Verification**: Check that no secrets are in the images:

```bash
docker history gearshare-frontend:latest | grep -i "FIREBASE\|API_KEY"
# Should return nothing
```

### Step 2: Configure Production Environment

Create a production `.env` file (keep this **secret** and **never commit it**):

```env
# PostgreSQL Database
POSTGRES_USER=gearshare_prod
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=gearshare_production

# Backend Configuration
NODE_ENV=production
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
PORT=3001
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Firebase Admin SDK (Backend)
FIREBASE_PROJECT_ID=your-production-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Frontend Firebase Configuration (Runtime - NOT build time!)
VITE_FIREBASE_API_KEY=your-production-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-production-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_API_URL=https://api.yourdomain.com
```

### Step 3: Deploy with Docker Compose

```bash
# Use production environment file
docker-compose --env-file .env up -d

# Check logs
docker-compose logs -f frontend
docker-compose logs -f backend
```

### Step 4: Setup HTTPS (Production)

For production, use a reverse proxy like Nginx or Traefik with Let's Encrypt:

**Example nginx.conf for reverse proxy:**

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔐 Security Checklist

Before deploying to production, verify:

- [ ] All environment variables configured in `.env`
- [ ] PostgreSQL using strong password
- [ ] `NODE_ENV=production` set for backend
- [ ] HTTPS enabled with valid SSL certificate
- [ ] `ALLOWED_ORIGINS` restricted to your domain(s)
- [ ] Firebase authentication rules configured properly
- [ ] Database backups configured
- [ ] Rate limiting tested and appropriate
- [ ] Docker images scanned for vulnerabilities
- [ ] No secrets visible in `docker history`
- [ ] `.env` file excluded from version control (in `.gitignore`)

## 🔄 Credential Rotation

To rotate Firebase credentials without downtime:

1. **Update the `.env` file** with new credentials
2. **Restart containers**:
   ```bash
   docker-compose restart frontend
   # Backend restart only if Admin SDK credentials changed
   docker-compose restart backend
   ```

No rebuild needed! Credentials are loaded at container startup.

## 📊 Monitoring

### Check Container Health

```bash
# View all containers
docker-compose ps

# View logs
docker-compose logs -f --tail=100

# Check resource usage
docker stats
```

### Database Backups

```bash
# Backup PostgreSQL database
docker-compose exec postgres pg_dump -U gearshare_prod gearshare_production > backup_$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec -T postgres psql -U gearshare_prod gearshare_production < backup_20240512.sql
```

## 🛠️ Troubleshooting

### Frontend can't reach backend

1. Check `VITE_API_URL` in frontend environment
2. Verify `ALLOWED_ORIGINS` includes frontend domain in backend
3. Check network connectivity between containers:
   ```bash
   docker-compose exec frontend wget -O- http://backend:3001/health
   ```

### Firebase authentication not working

1. Verify Firebase credentials in container:
   ```bash
   docker-compose exec frontend cat /usr/share/nginx/html/config.js
   ```
2. Check browser console for errors
3. Verify Firebase project configuration matches environment variables

### Runtime config not loading

1. Check that `docker-entrypoint.sh` is executable:
   ```bash
   docker-compose exec frontend ls -la /docker-entrypoint.sh
   ```
2. View generated config:

   ```bash
   docker-compose exec frontend cat /usr/share/nginx/html/config.js
   ```

3. Check container logs:
   ```bash
   docker-compose logs frontend
   ```

## 📚 Additional Resources

- [Firebase Console](https://console.firebase.google.com/) - Manage Firebase configuration
- [SECURITY.md](SECURITY.md) - Security best practices
- [SECURITY_FIXES.md](SECURITY_FIXES.md) - Security vulnerabilities and fixes
- [API.md](docs/API.md) - API documentation
- [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) - Database schema

## 🆘 Support

If you encounter issues:

1. Check [GitHub Issues](https://github.com/theKunte/local-resource-sharing/issues)
2. Review logs: `docker-compose logs`
3. Verify environment configuration
4. Check Firebase console for authentication errors
