# BuildPro - Production Setup Guide

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for background jobs)

---

## Backend Setup

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb buildpro

# Or using psql
psql -U postgres
CREATE DATABASE buildpro;
\q
```

### 2. Environment Configuration

```bash
cd apps/api

# Create .env file
cp .env.example .env

# Edit .env with your settings:
# DATABASE_URL=postgresql://user:password@localhost/buildpro
# SECRET_KEY=your-secret-key-here
# ALLOWED_ORIGINS=http://localhost:5173
```

### 3. Install Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Run Migrations

```bash
# Run database migrations
alembic upgrade head

# Seed database with sample data
python -m app.db.init_db
```

### 5. Start API Server

```bash
# Development
uvicorn app.main:app --reload --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

API will be available at: `http://localhost:8000`
API docs: `http://localhost:8000/docs`

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd apps/web
npm install
```

### 2. Environment Configuration

```bash
# Create .env.local
cp .env.example .env.local

# Edit .env.local:
VITE_API_URL=http://localhost:8000
```

### 3. Start Development Server

```bash
npm run dev
```

Frontend will be available at: `http://localhost:5173`

---

## Default Credentials

**Admin User:**
- Email: `admin@buildpro.ug`
- Password: `Admin@123456`
- Organization: `BuildPro Construction`
- Role: `Org_Admin`

---

## Production Deployment

### Backend (Render.com)

1. **Create PostgreSQL Database**
   - Go to Render Dashboard
   - Create new PostgreSQL database
   - Copy internal database URL

2. **Create Web Service**
   - Connect your GitHub repository
   - Set build command: `cd apps/api && pip install -r requirements.txt`
   - Set start command: `cd apps/api && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Add environment variables:
     ```
     DATABASE_URL=<your-postgres-url>
     SECRET_KEY=<generate-random-key>
     ALLOWED_ORIGINS=https://your-frontend.onrender.com
     ENVIRONMENT=production
     ```

3. **Run Migrations**
   - In Render shell:
     ```bash
     cd apps/api
     alembic upgrade head
     python -m app.db.init_db
     ```

### Frontend (Render.com)

1. **Create Static Site**
   - Connect your GitHub repository
   - Set build command: `cd apps/web && npm install && npm run build`
   - Set publish directory: `apps/web/dist`
   - Add environment variable:
     ```
     VITE_API_URL=https://your-api.onrender.com
     ```

---

## File Storage Configuration

### Local Storage (Development)

Already configured by default. Files stored in `apps/api/uploads/`

### Cloudflare R2 (Production)

1. **Create R2 Bucket**
   - Go to Cloudflare Dashboard
   - Create R2 bucket
   - Generate API tokens

2. **Update .env**
   ```
   USE_CLOUD_STORAGE=true
   R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=your-access-key
   R2_SECRET_ACCESS_KEY=your-secret-key
   R2_BUCKET_NAME=buildpro-files
   R2_PUBLIC_URL=https://your-bucket.r2.dev
   ```

---

## Testing

### Backend Tests

```bash
cd apps/api
pytest
```

### Frontend Tests

```bash
cd apps/web
npm test
```

### Manual Testing

1. **Login**: `http://localhost:5173/login`
2. **Create Project**: Navigate to Projects → New Project
3. **Add Task**: Select project → Tasks → New Task
4. **Upload Document**: Documents → Upload
5. **Approve Expense**: Budget → Expenses → Approve

---

## Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

### Migration Error
```bash
# Reset database (WARNING: deletes all data)
alembic downgrade base
alembic upgrade head
python -m app.db.init_db
```

### CORS Error
```bash
# Verify ALLOWED_ORIGINS in backend .env
# Should match frontend URL exactly
```

### Token Refresh Error
```bash
# Clear browser cookies and localStorage
# Re-login
```

---

## Monitoring

### Health Check
```bash
curl http://localhost:8000/health
```

### Logs
```bash
# Backend logs
tail -f apps/api/logs/app.log

# Frontend logs
# Check browser console
```

---

## Security Checklist

- [ ] Change default admin password
- [ ] Set strong SECRET_KEY
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Set secure cookie flags
- [ ] Enable rate limiting
- [ ] Regular database backups
- [ ] Monitor audit logs

---

## Support

For issues or questions:
- Check documentation: `/docs`
- Review API docs: `http://localhost:8000/docs`
- Check logs for errors

---

## Next Steps

1. ✅ Complete backend setup
2. ✅ Complete frontend setup
3. ✅ Test login flow
4. ✅ Create sample project
5. ⏳ Deploy to production
6. ⏳ Configure custom domain
7. ⏳ Set up monitoring
8. ⏳ Configure backups
