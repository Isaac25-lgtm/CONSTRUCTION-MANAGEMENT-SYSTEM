# BuildPro - Construction Project Management SaaS

> **Production-Ready Multi-Tenant SaaS Platform for Construction Project Management**

BuildPro is a comprehensive construction project management platform built for the Ugandan market, featuring multi-tenancy, robust authentication, file management, and real-time collaboration.

---

## 🚀 Features

### Core Functionality
- ✅ **Multi-Tenant Architecture** - Organizations with role-based access control
- ✅ **Project Management** - Complete project lifecycle management
- ✅ **Task Tracking** - Kanban-style task management with dependencies
- ✅ **Budget Management** - Expense tracking with approval workflows
- ✅ **Document Management** - File upload/download with versioning
- ✅ **Risk Management** - Risk assessment with mitigation plans
- ✅ **Milestone Tracking** - Project milestones with dependencies
- ✅ **Team Collaboration** - Real-time messaging and notifications
- ✅ **Audit Logging** - Complete audit trail for compliance

### Technical Features
- ✅ **JWT Authentication** - Secure token-based auth with refresh tokens
- ✅ **File Storage** - Local + Cloudflare R2 support
- ✅ **RESTful API** - Complete OpenAPI documentation
- ✅ **Type-Safe Frontend** - TypeScript with Zustand state management
- ✅ **Responsive Design** - Mobile-first UI with Tailwind CSS
- ✅ **Database Migrations** - Alembic for schema management
- ✅ **Docker Support** - Full containerization

---

## 📋 Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL 14
- **ORM**: SQLAlchemy
- **Migrations**: Alembic
- **Cache**: Redis
- **Authentication**: JWT (python-jose)
- **File Storage**: Cloudflare R2 / Local

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **Icons**: Lucide React

### Infrastructure
- **Deployment**: Render.com
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions (planned)

---

## 🏃 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+
- Redis (optional)

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/buildpro.git
cd buildpro
```

### 2. Backend Setup
```bash
cd apps/api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Seed database
python -m app.db.init_db

# Start server
uvicorn app.main:app --reload
```

Backend runs at: `http://localhost:8000`  
API Docs: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
cd apps/web

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit VITE_API_URL=http://localhost:8000

# Start dev server
npm run dev
```

Frontend runs at: `http://localhost:5173`

### 4. Login
- Email: `admin@buildpro.ug`
- Password: `Admin@123456`

---

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [API Documentation](http://localhost:8000/docs) - OpenAPI/Swagger docs
- [Architecture Overview](./docs/architecture.md) - System architecture
- [Deployment Guide](./docs/deployment.md) - Production deployment

---

## 🏗️ Project Structure

```
buildpro/
├── apps/
│   ├── api/                    # Backend FastAPI application
│   │   ├── app/
│   │   │   ├── api/           # API routes
│   │   │   ├── core/          # Core utilities (auth, config)
│   │   │   ├── db/            # Database setup
│   │   │   ├── models/        # SQLAlchemy models
│   │   │   ├── schemas/       # Pydantic schemas
│   │   │   └── services/      # Business logic
│   │   ├── alembic/           # Database migrations
│   │   └── requirements.txt
│   │
│   └── web/                   # Frontend React application
│       ├── src/
│       │   ├── components/    # React components
│       │   ├── pages/         # Page components
│       │   ├── stores/        # Zustand stores
│       │   ├── lib/           # Utilities (API client)
│       │   └── styles/        # CSS files
│       └── package.json
│
├── docker-compose.yml         # Docker orchestration
├── render.yaml               # Render deployment config
└── README.md
```

---

## 🔑 Environment Variables

### Backend (.env)
```bash
DATABASE_URL=postgresql://user:pass@localhost/buildpro
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=http://localhost:5173
ENVIRONMENT=development

# File Storage (Optional)
USE_CLOUD_STORAGE=false
R2_ENDPOINT_URL=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

### Frontend (.env.local)
```bash
VITE_API_URL=http://localhost:8000
```

---

## 🐳 Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services:
- API: `http://localhost:8000`
- Frontend: `http://localhost:5173`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

---

## 🚀 Production Deployment

### Render.com (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your repository
   - Render will auto-detect `render.yaml`

3. **Configure Environment Variables**
   - Set `ALLOWED_ORIGINS` to your frontend URL
   - Generate strong `SECRET_KEY`
   - Configure R2 credentials (optional)

4. **Deploy**
   - Render will automatically deploy
   - Run migrations in shell: `alembic upgrade head`
   - Seed database: `python -m app.db.init_db`

See [SETUP.md](./SETUP.md) for detailed deployment instructions.

---

## 📊 API Endpoints

### Authentication
- `POST /v1/auth/login` - Login
- `POST /v1/auth/refresh` - Refresh token
- `GET /v1/auth/me` - Current user
- `POST /v1/auth/logout` - Logout

### Projects
- `GET /v1/projects` - List projects
- `POST /v1/projects` - Create project
- `GET /v1/projects/{id}` - Get project
- `PUT /v1/projects/{id}` - Update project
- `DELETE /v1/projects/{id}` - Delete project

### Tasks
- `GET /v1/projects/{project_id}/tasks` - List tasks
- `POST /v1/projects/{project_id}/tasks` - Create task
- `PUT /v1/projects/{project_id}/tasks/{id}/status` - Update status
- `PUT /v1/projects/{project_id}/tasks/{id}/progress` - Update progress

### Expenses
- `GET /v1/projects/{project_id}/expenses` - List expenses
- `POST /v1/projects/{project_id}/expenses` - Create expense
- `POST /v1/projects/{project_id}/expenses/{id}/approve` - Approve
- `POST /v1/projects/{project_id}/expenses/{id}/reject` - Reject

### Documents
- `POST /v1/projects/{project_id}/documents` - Upload file
- `GET /v1/projects/{project_id}/documents/{id}/download` - Download

Full API documentation: `http://localhost:8000/docs`

---

## 🧪 Testing

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
1. Login with demo credentials
2. Create a new project
3. Add tasks to the project
4. Upload documents
5. Track expenses
6. Test approval workflows

---

## 🔒 Security

- ✅ JWT authentication with refresh tokens
- ✅ Password hashing with bcrypt
- ✅ CORS protection
- ✅ SQL injection prevention (SQLAlchemy)
- ✅ XSS protection (React)
- ✅ CSRF protection (planned)
- ✅ Rate limiting (planned)
- ✅ Audit logging

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

Built with ❤️ for the Ugandan construction industry.

---

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Email: support@buildpro.ug
- Documentation: [SETUP.md](./SETUP.md)

---

## 🎯 Roadmap

- [x] Multi-tenant architecture
- [x] Project & task management
- [x] Budget tracking
- [x] Document management
- [x] Risk management
- [ ] Real-time notifications
- [ ] Mobile app (React Native)
- [ ] AI-powered insights
- [ ] Advanced analytics
- [ ] Gantt charts
- [ ] Resource planning
- [ ] Time tracking
- [ ] Invoice generation

---

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

---

**Built with FastAPI, React, and PostgreSQL**
