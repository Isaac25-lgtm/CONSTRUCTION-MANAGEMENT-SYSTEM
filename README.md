# BuildPro - Construction Project Management System

![BuildPro Banner](https://img.shields.io/badge/BuildPro-Construction%20PM-blue)
![Python](https://img.shields.io/badge/Python-3.11+-green)
![React](https://img.shields.io/badge/React-18-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-teal)

A comprehensive web-based Construction Project Management System designed specifically for Uganda's construction industry.

---

## ✨ Features

### 🎨 **Modern UI with Dark Mode**
- Dark mode enabled by default
- Light/dark theme toggle
- Responsive design for desktop, tablet, and mobile
- Tailwind CSS with custom design system

### 🔐 **Role-Based Access Control (RBAC)**
- **Administrator**: Full system access
- **Project Manager**: Project and team management
- **Site Supervisor**: Field operations focused
- **Team Member**: Task execution
- **Stakeholder**: High-level monitoring

### 📊 **Dashboard & Analytics**
- Real-time KPI tracking (SPI, CPI, progress)
- Interactive charts (Recharts)
- Project health indicators
- Budget utilization tracking

### 📁 **Project Management**
- Project hierarchy (parent/child projects)
- Status tracking (Planning → Completed)
- Budget management
- Team assignment

### ✅ **Task & Milestone Tracking**
- Task dependencies
- Progress tracking
- Gantt chart visualization
- Critical path highlighting

### 💰 **Budget & Finance**
- Expense tracking
- Budget allocation by category
- Approval workflows
- Financial reports

### ⚠️ **Risk Management**
- Risk register
- Probability × Impact matrix
- Mitigation planning
- Risk history tracking

### 📄 **Document Management**
- File upload with version control
- Support for drawings, reports, photos
- Document categorization

### 💬 **Communication Hub**
- Team messaging
- Real-time notifications (WebSocket ready)
- Announcement system

### 📈 **Reports & Analytics**
- Weekly progress reports
- Monthly financial summaries
- Risk assessment reports
- Export to PDF/Excel

---

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

**Windows:**
```bash
start.bat
```

**Mac/Linux:**
```bash
chmod +x start.sh
./start.sh
```

### Option 2: Manual Setup

See [SETUP.md](SETUP.md) for detailed instructions.

---

## 🛠️ Tech Stack

### Backend
- **Python 3.11+** with FastAPI
- **PostgreSQL** for data storage
- **Redis** for caching
- **SQLAlchemy 2.0** ORM
- **Alembic** migrations
- **JWT** authentication
- **Pydantic** validation

### Frontend
- **React 18** with TypeScript
- **Vite** build tool
- **Tailwind CSS** styling
- **Zustand** state management
- **React Query** server state
- **Recharts** data visualization
- **Axios** HTTP client

---

## 📦 Project Structure

```
buildpro/
├── apps/
│   ├── api/                    # Python FastAPI backend
│   │   ├── app/
│   │   │   ├── api/            # API routes & endpoints
│   │   │   ├── core/           # Security, config, RBAC
│   │   │   ├── db/             # Database session & seed
│   │   │   ├── models/         # SQLAlchemy models
│   │   │   └── schemas/        # Pydantic request/response schemas
│   │   ├── alembic/            # Database migrations
│   │   └── requirements.txt
│   │
│   └── web/                    # React + TypeScript frontend
│       ├── src/
│       │   ├── pages/          # Dashboard, Login pages
│       │   ├── stores/         # Zustand stores (auth, theme)
│       │   ├── lib/            # Axios config
│       │   └── App.tsx
│       └── package.json
│
├── docker-compose.yml          # PostgreSQL + Redis
├── start.sh / start.bat        # Quick start scripts
├── SETUP.md                    # Detailed setup guide
└── README.md
```

---

## 🔐 Default Credentials

After running the setup:

**Email:** `admin@buildpro.ug`  
**Password:** `Admin@123456`

---

## 🌐 Access Points

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

---

## 🎯 Key Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout

### Users
- `GET /api/v1/users/me` - Current user profile
- `GET /api/v1/users` - List all users (Admin)

### Projects
- `GET /api/v1/projects` - List projects
- `GET /api/v1/projects/{id}` - Project details
- `POST /api/v1/projects` - Create project

---

## 🔧 Configuration

### Backend Environment (.env in apps/api/)
```
DATABASE_URL=postgresql://buildpro:password@localhost:5432/buildpro_db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### Frontend Environment (.env in apps/web/)
```
VITE_API_URL=http://localhost:8000
```

---

## 📚 Documentation

- [Setup Guide](SETUP.md) - Detailed installation instructions
- [API Docs](http://localhost:8000/docs) - Interactive API documentation (Swagger UI)
- [API Redoc](http://localhost:8000/redoc) - Alternative API documentation

---

## 🧪 Testing

### Backend
```bash
cd apps/api
pytest
```

### Frontend
```bash
cd apps/web
npm test
```

---

## 🐳 Docker Deployment

Full dockerized deployment:

```bash
docker-compose up
```

This starts:
- PostgreSQL database
- Redis cache
- FastAPI backend
- React frontend (when configured)

---

## 🗂️ Database Migrations

### Create new migration
```bash
cd apps/api
alembic revision --autogenerate -m "description"
```

### Apply migrations
```bash
alembic upgrade head
```

### Rollback
```bash
alembic downgrade -1
```

---

## 🤝 Contributing

This is a research project by Limo Jesse Mwanga for MSc Civil Engineering.

---

## 📄 License

© 2025 Limo Jesse Mwanga  
MSc Civil Engineering Research Project  
Designed for Uganda's Construction Industry

---

## 👤 Author

**Limo Jesse Mwanga**  
MSc Civil Engineering Candidate  
Focus: Construction Project Management Systems for Developing Countries

---

## 🙏 Acknowledgments

- Built for Uganda's construction industry
- Optimized for local context (UGX currency, mobile-first for field operations)
- Designed with input from Ugandan construction professionals

---

## 📞 Support

For issues or questions about this research project, please contact through your academic institution.

---

**BuildPro** - Empowering construction teams to deliver projects on time and within budget.
