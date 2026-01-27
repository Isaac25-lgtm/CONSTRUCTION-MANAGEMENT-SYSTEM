# BuildPro - AI-Powered Construction Project Management System

![BuildPro Banner](https://img.shields.io/badge/BuildPro-Construction%20PM-blue)
![AI Powered](https://img.shields.io/badge/AI-Gemini%202.0-purple)
![Python](https://img.shields.io/badge/Python-3.11+-green)
![React](https://img.shields.io/badge/React-18-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-teal)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)

A comprehensive, **AI-powered** web-based Construction Project Management System designed specifically for Uganda's construction industry. Features an intelligent AI assistant that provides real-time project insights, risk analysis, and budget recommendations.

---

## 🤖 AI-Powered Features

### BuildPro AI Assistant

BuildPro integrates **Google Gemini 2.0 Flash** as an intelligent construction project assistant. The AI system demonstrates advanced **prompt engineering**, **context injection**, and **domain-specific knowledge integration**.

#### How the AI Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    BuildPro AI Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌─────────────────┐    ┌───────────────┐  │
│  │ User Query   │───▶│ Context Builder │───▶│ Gemini 2.0    │  │
│  │              │    │                 │    │ Flash API     │  │
│  └──────────────┘    └─────────────────┘    └───────────────┘  │
│                              │                      │           │
│                              ▼                      ▼           │
│                    ┌─────────────────┐    ┌───────────────┐    │
│                    │ Project Data    │    │ AI Response   │    │
│                    │ - Tasks         │    │ - Analysis    │    │
│                    │ - Budgets       │    │ - Insights    │    │
│                    │ - Risks         │    │ - Actions     │    │
│                    │ - Milestones    │    └───────────────┘    │
│                    └─────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Technical Implementation

**1. Prompt Engineering**
```typescript
// System prompt with domain-specific knowledge injection
const SYSTEM_PROMPT = `You are BuildPro AI, an intelligent construction
project management assistant for Uganda's construction industry...

CAPABILITIES:
1. Project Analysis: Analyze timelines, budgets, tasks, milestones
2. Risk Assessment: Identify risks, suggest mitigation, calculate scores
3. Budget Advice: Track spending, predict overruns, cost-saving measures
4. Schedule Optimization: Critical paths, task reordering, delay flags

UGANDA CONSTRUCTION KNOWLEDGE:
- Currency: Uganda Shillings (UGX)
- Regulatory bodies: UNRA, KCCA, Ministry of Works
- Seasonal challenges: Rainy seasons (March-May, Sept-Nov)
- Major suppliers: Roofings Group, Hima Cement, Steel & Tube...`;
```

**2. Context Injection**
```typescript
// Real-time project data is injected into each AI query
const fullPrompt = `${SYSTEM_PROMPT}

PROJECT CONTEXT:
${JSON.stringify({
  projects: currentProjects,
  tasks: activeTasks,
  expenses: recentExpenses,
  risks: identifiedRisks,
  budgetUtilization: calculateUtilization()
}, null, 2)}

USER QUESTION: ${userMessage}`;
```

**3. Response Generation**
- Temperature: 0.7 (balanced creativity/accuracy)
- Max tokens: 1024 (comprehensive responses)
- Model: Gemini 2.0 Flash (fast, accurate)

#### AI Capabilities

| Feature | Description | Data Science Technique |
|---------|-------------|----------------------|
| **Risk Analysis** | Identifies project risks and suggests mitigations | Pattern recognition, probability assessment |
| **Budget Forecasting** | Predicts cost overruns based on spending patterns | Time-series analysis, trend detection |
| **Schedule Optimization** | Suggests task reordering for efficiency | Critical path method, dependency analysis |
| **Anomaly Detection** | Flags unusual spending or delays | Statistical outlier detection |
| **Natural Language Queries** | Understands complex project questions | NLP, semantic understanding |

#### Sample AI Interactions

```
User: "What are the main risks for the Kampala Office Complex?"

BuildPro AI: Based on the project data, I've identified these key risks:

1. **Supply Chain Risk (HIGH)**
   - Steel delivery delays from Uganda Steel Mills
   - Mitigation: Source alternative suppliers, maintain 2-week buffer stock

2. **Weather Risk (MEDIUM)**
   - Upcoming rainy season (March-May) may impact foundation work
   - Mitigation: Accelerate current phase, prepare dewatering equipment

3. **Budget Risk (MEDIUM)**
   - Current spend rate: 65% budget, 60% timeline
   - Projected overrun: 8-12% if trend continues
   - Action: Review subcontractor rates, optimize material procurement
```

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
- Client and contract type tracking

### ✅ **Task & Milestone Tracking**
- Task dependencies
- Progress tracking
- Gantt chart visualization with zoom (Week/Month/Quarter)
- Critical path highlighting

### 💰 **Budget & Finance** (NEW)
- **Receipt Attachment**: Upload receipts (images/PDFs) when logging expenses
- **Receipt Viewing**: View and download attached receipts
- **Expense Reports**: Generate PDF reports with filters
- **Advanced Filtering**: Filter by project, status, category, date range
- Expense tracking with approval workflows
- Budget allocation by category
- Financial analytics

### ⚠️ **Risk Management**
- Risk register
- Probability × Impact matrix
- AI-powered risk suggestions
- Mitigation planning

### 📄 **Document Management**
- File upload with version control
- Support for drawings, reports, photos, CAD files
- Base64 storage with cloud support (Cloudflare R2)

### 💬 **Communication Hub**
- Team messaging
- Real-time notifications (WebSocket ready)
- Announcement system

### 📈 **Reports & Analytics**
- Weekly progress reports
- Monthly financial summaries
- Risk assessment reports
- Export to PDF

---

## 🧠 Data Science & AI Skills Demonstrated

This project showcases the following data science and AI/ML competencies:

### 1. **Large Language Model Integration**
- Integration with Google Gemini 2.0 API
- Prompt engineering for domain-specific responses
- Context window management for large project datasets

### 2. **Natural Language Processing**
- Query understanding and intent extraction
- Structured data to natural language conversion
- Multi-turn conversation handling

### 3. **Data Engineering**
- ETL pipelines for project data
- Real-time data aggregation for AI context
- State management with Zustand

### 4. **Analytics & Visualization**
- KPI calculation (SPI, CPI, EVM metrics)
- Interactive charting with Recharts
- Statistical summaries and trend analysis

### 5. **Domain Knowledge Engineering**
- Construction industry terminology
- Uganda-specific regulatory knowledge
- Risk assessment frameworks

### 6. **API Design & Integration**
- RESTful API architecture
- Async/await patterns for API calls
- Error handling and fallback strategies

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+ (for full backend)
- Docker (optional, for database)

### Option 1: Frontend Only (Quick Demo)
```bash
cd apps/web
npm install
npm run dev
```
Access at: http://localhost:5000

### Option 2: Full Stack Setup
```bash
# Windows
start.bat

# Mac/Linux
chmod +x start.sh
./start.sh
```

### Option 3: Docker
```bash
docker-compose up
```

---

## 🛠️ Tech Stack

### Backend
- **Python 3.11+** with FastAPI
- **PostgreSQL** for data storage
- **Redis** for caching
- **SQLAlchemy 2.0** ORM
- **Alembic** migrations
- **JWT** authentication

### Frontend
- **React 18** with TypeScript
- **Vite** build tool
- **Tailwind CSS** styling
- **Zustand** state management
- **Recharts** data visualization
- **html2canvas + jsPDF** for exports

### AI/ML
- **Google Gemini 2.0 Flash** - LLM for intelligent assistance
- **Prompt Engineering** - Domain-specific prompt design
- **Context Injection** - Real-time project data integration

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
│   │   │   └── schemas/        # Pydantic schemas
│   │   └── requirements.txt
│   │
│   └── web/                    # React + TypeScript frontend
│       ├── src/
│       │   ├── components/
│       │   │   └── AIChat/     # 🤖 AI Assistant components
│       │   │       ├── AIChatWidget.tsx
│       │   │       ├── ChatWindow.tsx
│       │   │       ├── ChatMessage.tsx
│       │   │       └── QuickActions.tsx
│       │   ├── services/
│       │   │   └── geminiService.ts  # 🧠 Gemini AI integration
│       │   ├── pages/          # Application pages
│       │   ├── stores/         # Zustand state management
│       │   └── App.tsx
│       └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## 🔐 Default Credentials

**Email:** `admin@buildpro.ug`
**Password:** `Admin@123456`

---

## 🌐 Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

## 🔧 Environment Variables

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:8000
VITE_GEMINI_API_KEY=your_gemini_api_key  # For AI features
```

### Backend (.env)
```env
DATABASE_URL=postgresql://buildpro:password@localhost:5432/buildpro_db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-min-32-chars
```

---

## 📸 Screenshots

### AI Assistant
The floating AI button (bottom-right) opens an intelligent chat interface that:
- Analyzes real-time project data
- Provides construction-specific advice
- Suggests risk mitigations
- Offers budget optimization tips

### Expense Management with Receipts
- Upload hardware receipts when logging expenses
- View receipts directly in the application
- Generate filtered expense reports as PDFs

---

## 🧪 Testing

```bash
# Backend
cd apps/api && pytest

# Frontend
cd apps/web && npm test
```

---

## 🚢 Deployment

### Render.com (Production)
The project includes `render.yaml` for easy deployment:
- PostgreSQL database
- FastAPI backend
- React static site

### Environment Setup
1. Configure Cloudflare R2 for document storage
2. Set Gemini API key for AI features
3. Configure SMTP for email notifications

---

## 🤝 Contributing

This is a research project demonstrating full-stack development with AI integration.

---

## 📄 License

© 2025 Limo Jesse Mwanga
MSc Civil Engineering Research Project
Designed for Uganda's Construction Industry

---

## 👤 Author

**Limo Jesse Mwanga**
MSc Civil Engineering Candidate
Focus: AI-Powered Construction Project Management Systems

### Skills Demonstrated
- Full-Stack Development (React, FastAPI, PostgreSQL)
- AI/ML Integration (LLMs, Prompt Engineering)
- Data Science (Analytics, Visualization, ETL)
- Cloud Architecture (Docker, Render, Cloudflare R2)
- Domain Expertise (Construction Management)

---

## 🙏 Acknowledgments

- **Google Gemini API** - AI capabilities
- **Uganda Construction Industry** - Domain knowledge
- Built with modern web technologies for real-world impact

---

**BuildPro** - AI-powered construction management for the modern era.
