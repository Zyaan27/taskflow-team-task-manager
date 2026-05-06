<<<<<<< HEAD
# TaskFlow — Team Task Manager

A full-stack collaborative task management application with role-based access control.

## 🖥️ Live Demo
- **App**: [https://your-app.railway.app](https://your-app.railway.app)
- **API**: [https://your-api.railway.app/api/health](https://your-api.railway.app/api/health)

## 📸 Features

| Feature | Description |
|---------|-------------|
| 🔐 Authentication | JWT-based signup/login |
| 📁 Projects | Create, manage, delete projects |
| 👥 Team Management | Add/remove members with roles |
| ✅ Tasks | Kanban board with To Do / In Progress / Done |
| 📊 Dashboard | Stats, overdue tasks, per-user breakdown |
| 🔒 Role-Based Access | Admin (full control) vs Member (own tasks only) |

---

## 🛠️ Tech Stack

**Backend**
- Node.js + Express
- PostgreSQL
- JWT authentication (bcryptjs)
- express-validator

**Frontend**
- React 18 + Vite
- React Router v6
- Tailwind CSS
- Axios
- date-fns

**Deployment**
- Railway (backend + frontend + PostgreSQL as separate services)

---

## 🗄️ Database Schema

```sql
users           — id, name, email, password_hash, created_at
projects        — id, name, description, created_by, created_at
project_members — id, project_id, user_id, role (admin|member), joined_at
tasks           — id, project_id, title, description, due_date, priority,
                  status (todo|in_progress|done), assigned_to, created_by,
                  created_at, updated_at
```

---

## 🔑 Role-Based Access

| Action | Admin | Member |
|--------|-------|--------|
| Create tasks | ✅ | ❌ |
| Edit any task | ✅ | ❌ |
| Update own task status | ✅ | ✅ |
| Delete tasks | ✅ | ❌ |
| Add/remove members | ✅ | ❌ |
| View project tasks | ✅ | ✅ |
| Delete project | ✅ | ❌ |

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Clone & Install

```bash
git clone https://github.com/your-username/team-task-manager.git
cd team-task-manager

# Install all dependencies
npm run install:all
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/taskmanager
JWT_SECRET=your-super-secret-key-at-least-32-chars
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Create the database:
```bash
psql -U postgres -c "CREATE DATABASE taskmanager;"
```

Start backend:
```bash
npm run dev
```

The server auto-creates all tables on first run.

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
```

`.env` (for local dev with vite proxy, leave empty or set):
```env
VITE_API_URL=http://localhost:5000/api
```

Start frontend:
```bash
npm run dev
```

Visit: http://localhost:5173

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/users/search?email=` | Search users |

### Projects
| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| GET | `/api/projects` | ✅ | Any member |
| POST | `/api/projects` | ✅ | Any user |
| GET | `/api/projects/:id` | ✅ | Member |
| PUT | `/api/projects/:id` | ✅ | Admin |
| DELETE | `/api/projects/:id` | ✅ | Admin |
| POST | `/api/projects/:id/members` | ✅ | Admin |
| DELETE | `/api/projects/:id/members/:userId` | ✅ | Admin |

### Tasks
| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| GET | `/api/projects/:projectId/tasks` | ✅ | Member |
| POST | `/api/projects/:projectId/tasks` | ✅ | Admin |
| GET | `/api/tasks/:id` | ✅ | Member |
| PUT | `/api/tasks/:id` | ✅ | Admin (all) / Member (own status) |
| DELETE | `/api/tasks/:id` | ✅ | Admin |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Stats for all user's projects |

---

## ☁️ Railway Deployment

### Step 1: Create Railway Account
Go to [railway.app](https://railway.app) and sign up.

### Step 2: Create a New Project
```
Railway Dashboard → New Project → Empty Project
```

### Step 3: Add PostgreSQL
```
Add Service → Database → PostgreSQL
```
Copy the `DATABASE_URL` from the service variables.

### Step 4: Deploy Backend
```
Add Service → GitHub Repo → Select your repo → Set root directory: backend
```

Set environment variables:
```
DATABASE_URL=<from PostgreSQL service>
JWT_SECRET=<generate: openssl rand -base64 32>
NODE_ENV=production
FRONTEND_URL=<your frontend Railway URL>
PORT=5000
```

### Step 5: Deploy Frontend
```
Add Service → GitHub Repo → Same repo → Set root directory: frontend
```

Set environment variables:
```
VITE_API_URL=https://<your-backend-railway-url>/api
```

Add to `package.json` in frontend (for serve):
```json
"dependencies": { "serve": "^14.0.0" }
```

### Step 6: Connect Domain
Railway auto-generates URLs for each service. Share the frontend URL as your live app.

---

## 🧪 Testing the API

```bash
# Health check
curl https://your-api.railway.app/api/health

# Signup
curl -X POST https://your-api.railway.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@test.com","password":"password123"}'

# Login
curl -X POST https://your-api.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"password123"}'
```

---

## 📁 Project Structure

```
team-task-manager/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js     # PostgreSQL pool + auto-migration
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT auth + role guards
│   │   ├── routes/
│   │   │   ├── auth.js         # Signup, login, user search
│   │   │   ├── projects.js     # CRUD + member management
│   │   │   ├── tasks.js        # CRUD with RBAC
│   │   │   └── dashboard.js    # Aggregated stats
│   │   └── app.js              # Express entry + DB init
│   ├── .env.example
│   ├── package.json
│   └── railway.toml
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js        # Axios client + all API calls
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── Layout.jsx  # Sidebar + nav
│   │   │   └── ui/
│   │   │       └── index.jsx   # Modal, badges, inputs, etc.
│   │   ├── context/
│   │   │   └── AuthContext.jsx # JWT auth state
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ProjectsPage.jsx
│   │   │   ├── ProjectDetailPage.jsx
│   │   │   └── TasksPage.jsx   # Kanban board
│   │   ├── App.jsx             # Router + protected routes
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── railway.toml
├── package.json                # Monorepo scripts
├── .gitignore
└── README.md
```

---

## 🔧 Environment Variables Summary

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `JWT_SECRET` | Backend | Secret for signing JWTs (min 32 chars) |
| `NODE_ENV` | Backend | `production` or `development` |
| `FRONTEND_URL` | Backend | Frontend origin for CORS |
| `PORT` | Backend | Port (Railway sets this automatically) |
| `VITE_API_URL` | Frontend | Backend API base URL |

---

## 👤 Author

Built for the Full-Stack Coding Assignment.  
Estimated time: ~10 hours
=======
# taskflow-team-task-manager
A full-stack collaborative task management platform with JWT authentication, role-based access control, Kanban task boards, PostgreSQL integration, dashboard analytics, and Railway deployment support.
>>>>>>> 7efae875ea036e42fc1d01b4bff9fa7362176c17
