# Split Bro — Shared Expense Management & Debt Simplification Platform

> **Split Smarter. Settle Faster.**  

---

## 1. Project Architecture

```text
Split Bro/
├── assets/                     # SVG brand assets and category icons
├── css/                        # Stylesheets for Vanilla JS pages (Lectures 1–30)
├── js/                         # Vanilla JS DOM, Storage, Fetch API & Form modules (Lectures 1–30)
│   ├── app.js                  # Shared UI navigation & initialization
│   ├── auth.js                 # Login & Registration DOM + API integration
│   ├── dashboard.js            # Dashboard metrics & recent activity rendering
│   ├── expense.js              # Expense form validation & split calculation
│   ├── groups.js               # Group creation, invite codes & member management
│   ├── history.js              # Expense history filtering & CSV export
│   ├── insights.js             # Category breakdown & spending analytics
│   ├── profile.js              # User profile & UPI ID management
│   ├── settlement.js           # Debt simplification & settlement recording
│   └── storage.js              # localStorage, sessionStorage & Fetch API wrapper
│
│   ├── src/
│   │   ├── components/         # Reusable Functional Components (Navbar, Footer, Card, Button, Alert)
│   │   ├── context/            # State & Auth persistence (AuthContext)
│   │   ├── pages/              # Controlled Forms, Props & useState views
│   │   └── utils/              # Currency/date formatters & storage helpers
│   ├── index.html              # SPA HTML entry point
│   └── vite.config.js          # Vite bundler & API proxy configuration
│
├── server/                     # Node.js, HTTP, Express.js & MongoDB Backend (Lectures 31–41)
│   ├── src/
│   │   ├── config/             # dotenv configuration & Mongoose connection
│   │   ├── controllers/        # CRUD REST API controllers (Auth, Groups, Expenses, Settlements, Insights, Users)
│   │   ├── middleware/         # JWT protect guard, express-validator, Multer upload, centralized errorHandler
│   │   ├── models/             # Mongoose Schemas, Models, Validation & Populate (User, Group, Expense, Settlement)
│   │   ├── routes/             # Express Router modules
│   │   ├── services/           # Share calculation & greedy debt simplification services
│   │   └── utils/              # AppError, EventEmitter (eventEmitter.js), Transform Stream (csvExporter.js)
│   ├── tests/                  # Automated Jest & Supertest unit + integration suites
│   └── uploads/receipts/       # Protected receipt upload storage
│
├── docs/                       # Course Syllabus Alignment & Postman Collection
│   ├── COURSE_ALIGNMENT.md     # Exact Lecture 1–48 Syllabus Alignment Matrix
│   ├── PROJECT_COMPLETION_REPORT.md # Audit & Verification Report
│   ├── AUTHENTICATION.md       # JWT & bcrypt security architecture
│   ├── ASYNC_JAVASCRIPT.md     # Callbacks, Promises, Async/Await & Event Loop guide
│   ├── POSTMAN_TESTING.md      # Postman API testing guide
│   └── postman/                # Split_Bro.postman_collection.json & environment
│
├── server.js                   # Main Node.js server entrypoint
├── package.json                # NPM scripts & dependencies
└── .env.example                # Environment variables template
```

---

## 2. Quick Start & Execution Guide

### 2.1 Prerequisites
- **Node.js** (v18+ or v20+)
- **MongoDB** running locally on `mongodb://127.0.0.1:27017/splitbro` (or MongoDB Atlas URI in `.env`)

### 2.2 Install Dependencies
```bash
# Install backend & test dependencies
npm install

```

### 2.3 Configure Environment Variables
Copy `.env.example` to `.env` (already pre-configured for local development):
```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/splitbro
JWT_SECRET=splitbro_super_secure_jwt_secret_dev_key_2026
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE=5242880
```

### 2.4 Seed Sample Data (Optional)
```bash
npm run seed
```

### 2.5 Run the Application
- **Start Backend Server (Express + Node HTTP + Static Vanilla JS Pages on Port 3000):**
  ```bash
  npm start
  # Or with Nodemon auto-reload:
  npm run dev
  ```
  - Backend API & Vanilla JS App: `http://localhost:3000`
  - Health & V8 Runtime Check: `http://localhost:3000/api/health`

  ```bash
  ```

---

## 3. Verification & Testing Commands

```bash
# Run all 60 automated unit and integration tests
npm test

```
