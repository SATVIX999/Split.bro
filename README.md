# 💸 Split Bro &mdash; Smart Shared Expense & Debt Simplification Platform

<p align="center">
  <img src="https://github.com/user-attachments/assets/f2ae6167-96d9-46ff-a8f2-df1f314049d7" alt="Split Bro Banner" width="100%" style="border-radius: 12px;" />
</p>

<p align="center">
  <b>Production-grade Shared Expense Tracker & Settlement Engine</b><br>
  Built with <b>Node.js, Express.js, MongoDB Atlas (Mongoose), and Vanilla JavaScript</b>.<br>
  <i>Chitkara University &bull; 24CAI0303 Back End Engineering &bull; Evaluation-2 (Lectures 25&ndash;41)</i>
</p>

<p align="center">
  <a href="#live-deployment">Live Deployment</a> &bull;
  <a href="#-features">Features</a> &bull;
  <a href="#-system-architecture">Architecture</a> &bull;
  <a href="#-workflow-diagrams">Workflows</a> &bull;
  <a href="#%EF%B8%8F-technology-stack">Tech Stack</a> &bull;
  <a href="#-api-endpoints">API Suite</a> &bull;
  <a href="#-quick-start">Quick Start</a> &bull;
  <a href="#-screenshots">Screenshots</a> &bull;
  <a href="#-team-members">Team</a>
</p>

---

## Live Deployment

- **API Base URL:** https://split-bro-api.onrender.com
- **Health Check:** https://split-bro-api.onrender.com/api/health

The backend is deployed on Render and connects to MongoDB. API endpoints can be tested using Postman or Thunder Client.

---

## 📌 Overview

**Split Bro** is a full-stack shared expense management and debt simplification platform. It allows roommates, travel groups, and event teams to track joint expenses, compute exact shares (equal, percentage, or custom), upload and protect receipt documents, and settle debts with the **mathematical minimum number of payments** using a greedy debt-simplification algorithm.

Originally developed in Evaluation-1 as a client-side prototype, **Evaluation-2 (Lectures 25&ndash;41)** transforms Split Bro into an asynchronous RESTful backend architecture with **JWT Authentication, Multer file upload security, Mongoose schemas, and MongoDB Atlas cloud storage**.

---

## ✨ Features

- 🔐 **JWT Authentication & Bcrypt:** Secure user signup and login with hashed passwords (10 salt rounds) and signed JWT Bearer tokens.
- 👥 **Group Management:** Create groups, generate unique 6-character alphanumeric invite codes, and manage both registered and guest members.
- ➕ **Flexible Expense Splitting:**
  - **Equal (=):** Exact split with remainder cents allocated without precision drift.
  - **Percentage (%):** Real-time validation verifying 100% distribution.
  - **Custom (₹):** Exact individual contributions matching total bill amount.
- 🧾 **Receipt Uploads via Multer:** Attach bill receipts (JPEG, PNG, WEBP, PDF up to 5 MB) with magic-byte file signature validation.
- ⚡ **Greedy Debt Simplification:** Graph-based settlement algorithm that collapses complex group debts into the absolute minimum transactions.
- 📊 **Real-time Analytics:** Category-wise spending breakdowns, group summaries, and user spending metrics.
- 🧪 **Interactive Testing Panel & Automated Test Suite:** Integrated browser API tester (`test-api.html`), 60 passing automated Jest unit/integration tests, and ready-to-run Postman collection.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Tier (Browser)"]
        UI["Vanilla JS Web Application\n(HTML5 / CSS3 / ES6+)"]
        TestUI["Interactive API Tester\n(test-api.html)"]
        Storage["Storage Engine\n(localStorage / sessionStorage)"]
    end

    subgraph Server ["Application Tier (Node.js & Express.js)"]
        HTTP["HTTP Server (Node.js http.createServer)"]
        MW["Middleware Chain\n(CORS, JSON Parser, CookieParser, Morgan)"]
        AuthMW["Security & Auth Middleware\n(JWT Verification, Express-Validator)"]
        MulterMW["Multer Engine\n(File Signature & Magic-Byte Validation)"]
        
        subgraph Controllers ["Controllers & Logic"]
            AuthCtrl["Auth Controller"]
            GrpCtrl["Group Controller"]
            ExpCtrl["Expense Controller"]
            SetCtrl["Settlement Controller\n(Greedy Debt Simplification)"]
            InsCtrl["Insight Controller"]
        end
        
        Events["Non-Blocking EventEmitter\n(process.nextTick / microtasks)"]
    end

    subgraph Database ["Database Tier (Cloud)"]
        Atlas[("MongoDB Atlas Cloud Database")]
        Models["Mongoose ODM Models\n(User, Group, Expense, Settlement)"]
    end

    UI -->|"HTTP Fetch + JWT Bearer"| HTTP
    TestUI -->|"REST API Calls"| HTTP
    Storage <-->|"JWT & Session Cache"| UI
    
    HTTP --> MW --> AuthMW --> Controllers
    MulterMW -.->|"Save Encrypted Receipt"| ExpCtrl
    Controllers <--> Models <--> Atlas
    Controllers -.->|"Asynchronous Audit Logs"| Events
```

---

## 🔄 Workflow Diagrams

### 1. User Authentication & JWT Flow (Lecture 39)

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Client
    participant API as Express API (/api/auth)
    participant Auth as Auth Middleware & Bcrypt
    participant DB as MongoDB Atlas

    User->>API: POST /api/auth/register (name, email, password, userId)
    API->>Auth: Validate schema & hash password with bcrypt (10 rounds)
    Auth->>DB: Save User document
    DB-->>API: User Created
    API-->>User: Return Signed JWT Token

    Note over User,API: Subsequent Protected Requests
    User->>API: GET /api/groups (Header: Authorization Bearer <token>)
    API->>Auth: Verify JWT signature & expiration
    Auth->>DB: Fetch user by token ID
    DB-->>Auth: User Verified
    API-->>User: Return 200 OK + Group Data
```

### 2. Expense Settlement & Debt Simplification Flow

```mermaid
flowchart LR
    Start["Group Expenses\nRecorded"] --> Calc["Calculate Net Balances\n(Paid - Consumed)"]
    Calc --> Partition["Partition Members into\nDebtors (-) & Creditors (+)"]
    Partition --> Sort["Sort Descending:\nMax Debtor vs Max Creditor"]
    Sort --> Match["Settle Minimum of\n(|Debtor|, Creditor)"]
    Match --> Settle["Generate Single Direct\nSettlement Payment"]
    Settle --> Check{"All Net Balances\nZero?"}
    Check -- No --> Sort
    Check -- Yes --> End["Minimum Transactions\nOptimized ✓"]
```

---

## 🛠️ Technology Stack

| Layer | Technologies Used | Course Reference |
|---|---|---|
| **Backend Runtime** | Node.js (v20+), V8 JavaScript Engine | Lectures 31&ndash;35 |
| **Web Framework** | Express.js 5.x, Router, Middleware | Lectures 37&ndash;38 |
| **Cloud Database** | MongoDB Atlas Cloud, Mongoose ODM | Lecture 41 |
| **Security & Auth** | JSON Web Tokens (JWT), `bcryptjs`, CORS | Lecture 39 |
| **File Storage** | Multer, Magic-Byte File Signature Validator | Lecture 40 |
| **Validation & Core** | `express-validator`, `dotenv`, Node `EventEmitter`, Streams | Lectures 32, 34, 36 |
| **Testing** | Jest, Supertest, MongoDB In-Memory Server (60/60 Tests Passing) | Core Project Verification |
| **Frontend** | HTML5, CSS3, Modern ES6+ JavaScript (`async`/`await`, `fetch`) | Evaluation-1 & Lectures 25&ndash;30 |

---

## 📡 REST API Endpoints

| Category | Method | Route | Description | Auth Required |
|---|---|---|---|:---:|
| **Authentication** | `POST` | `/api/auth/register` | Register new user account with hashed password | No |
| | `POST` | `/api/auth/login` | Authenticate user & issue signed JWT | No |
| | `GET` | `/api/auth/me` | Fetch authenticated user profile | **Yes (Bearer)** |
| | `PATCH` | `/api/auth/me` | Update bio and UPI ID | **Yes (Bearer)** |
| **Groups** | `GET` | `/api/groups` | Fetch all groups current user belongs to | **Yes (Bearer)** |
| | `POST` | `/api/groups` | Create group with members | **Yes (Bearer)** |
| | `GET` | `/api/groups/:id` | Get group details, members, and expenses | **Yes (Bearer)** |
| | `POST` | `/api/groups/join` | Join group via 6-digit group code | **Yes (Bearer)** |
| **Expenses** | `GET` | `/api/expenses` | List group expenses with payer information | **Yes (Bearer)** |
| | `POST` | `/api/expenses` | Add expense (supports multipart receipt upload) | **Yes (Bearer)** |
| | `GET` | `/api/expenses/:id/receipt` | Stream protected receipt file | **Yes (Bearer)** |
| **Settlements** | `GET` | `/api/settlements` | Run greedy algorithm and return simplified debts | **Yes (Bearer)** |
| | `POST` | `/api/settlements` | Record settlement payment between two members | **Yes (Bearer)** |
| **Insights** | `GET` | `/api/insights/group/:id` | Aggregated group spending and category breakdown | **Yes (Bearer)** |
| | `GET` | `/api/insights/user` | User total paid and net balance summary | **Yes (Bearer)** |
| **Diagnostics** | `GET` | `/api/health` | Node uptime, V8 heap memory stats, and Atlas status | No (Public) |

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18+ installed
- Internet connection (for cloud MongoDB Atlas)

### 2. Installation
```powershell
# Clone the repository
git clone https://github.com/SATVIX999/Split.bro.git
cd Split.bro/backend

# Install backend dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `backend/` folder (or use `backend/.env.example` as a template):
```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/splitbro?retryWrites=true&w=majority
JWT_SECRET=your_secure_jwt_secret_key_here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500
```

### 4. Run the Project
```powershell
# Start the backend server (from backend/ directory)
npm start
# Or directly: node src/server.js

# Run the automated test suite (70 tests)
npm test
```

Access the application in your browser:
- **Main Website:** `http://localhost:3000`
- **Interactive API Testing Panel:** `http://localhost:3000/test-api.html`
- **Health Check & Diagnostics:** `http://localhost:3000/api/health`

---

## 📸 Screenshots

<div align="center">

### 1. Landing Page & Hero Section
<img width="100%" alt="Landing Page" src="https://github.com/user-attachments/assets/f2ae6167-96d9-46ff-a8f2-df1f314049d7" />

<br/><br/>

### 2. Group Dashboard & Balance Overview
<img width="100%" alt="Dashboard" src="https://github.com/user-attachments/assets/412e838c-3f11-4a08-8f82-d2ff48d10980" />

<br/><br/>

### 3. Add Expense & Split Configuration
<img width="100%" alt="Add Expense" src="https://github.com/user-attachments/assets/1940a900-d10f-4a07-a75e-e77914bc585c" />

<br/><br/>

### 4. Smart Settlement & Debt Simplification
<img width="100%" alt="Settlement Screen" src="https://github.com/user-attachments/assets/92bd17ff-86d7-4708-a9e3-ceec2cf20434" />

<br/><br/>

### 5. Group Management & Joining with Code
<img width="100%" alt="Groups List" src="https://github.com/user-attachments/assets/df9d2237-36f1-44e7-b8b5-72dbaae7dbb6" />

<br/><br/>

### 6. Analytics & Category Insights
<img width="100%" alt="Insights" src="https://github.com/user-attachments/assets/acd5170c-7cb2-45ad-a436-9f92417ca350" />

<br/><br/>

### 7. User Profile & Settings
<img width="100%" alt="Profile" src="https://github.com/user-attachments/assets/22aaca11-09bc-407b-9599-17b05738294a" />

<br/><br/>

### 8. Full Application Interface Gallery
<img width="49%" alt="Mobile Responsive View" src="https://github.com/user-attachments/assets/e19534bf-783d-43b2-bb86-f1c4e21593cb" />
<img width="49%" alt="Modal Dialogs" src="https://github.com/user-attachments/assets/819b3abc-143e-4a7f-8c41-532e4077cb16" />

<br/>

<img width="49%" alt="Transaction History" src="https://github.com/user-attachments/assets/f0023937-68d9-4d4a-9fae-349978fb90e0" />
<img width="49%" alt="Settled Payments" src="https://github.com/user-attachments/assets/e5c6cc2b-43f6-4d9d-a57b-711ae0905e74" />

<br/>

<img width="49%" alt="FAQ & Help" src="https://github.com/user-attachments/assets/e6e716d9-9bc7-4691-9771-500a7f73ea55" />
<img width="49%" alt="Contact Us" src="https://github.com/user-attachments/assets/f4ac9cbb-c214-4dd4-9f25-9a8a756fab61" />

<br/>

<img width="49%" alt="About Split Bro" src="https://github.com/user-attachments/assets/62e10f4a-cd32-4e15-a761-1b3365294b32" />
<img width="49%" alt="System Flow" src="https://github.com/user-attachments/assets/1fadc803-1423-4caf-b60c-4774f3361130" />

<br/>

<img width="100%" alt="Expense Overview" src="https://github.com/user-attachments/assets/7538f4ef-9899-44c6-8173-fb1095eb827d" />

</div>

---

## 👨‍💻 Team Members

| Name | Roll Number | Role |
|---|:---:|---|
| **Mayur Mittal** | `2410993231` | Back End Architecture, Express REST APIs, MongoDB Atlas & Security |
| **Satvik Sharma** | `2410992972` | Front End UI/UX, Group Logic & DOM Integration |
| **Shriya Kathuria** | `2410992888` | Expense History, Settlements & Documentation |

---

<p align="center">
  <b>Chitkara University &bull; Continuous Assessment 2 (2026)</b><br>
  Built with care for transparent, fair expense sharing.
</p>
