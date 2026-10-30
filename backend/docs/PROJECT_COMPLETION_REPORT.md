# Split Bro — Project Audit & Syllabus Verification Report

**Course Code & Name:** `24CAI0303` — Back End Engineering (Chitkara University)  
**Project:** Split Bro (Full-Stack Expense Sharing & Settlement Platform)  
**Evaluated Syllabus Scope:** Continuous Assessment-1 (Lectures 1–24) & Continuous Assessment-2 (Lectures 25–41)  
*Note: The React portion of the syllabus (Lectures 42–60) has been removed; the frontend is built entirely with semantic HTML5, CSS3, and vanilla JavaScript.*

---

## 1. Syllabus Implementation Summary (Lectures 25–41)

All topics within the Back End Engineering curriculum (Lectures 25–41) have been implemented and verified in the Split Bro codebase:

1. **Lectures 25–26 (Callbacks, Asynchronous JavaScript, Promises, Error Handling):** Implemented in [`server/src/middleware/upload.js`](../server/src/middleware/upload.js), [`js/storage.js`](../js/storage.js), and documented in [`docs/ASYNC_JAVASCRIPT.md`](ASYNC_JAVASCRIPT.md).
2. **Lectures 27–28 (Async/Await, Fetch API, REST API Consumption, JSON Handling):** Implemented in [`js/storage.js`](../js/storage.js) and demonstrated in [`test-api.html`](../test-api.html).
3. **Lectures 29–30 (JavaScript Mini Project with API Integration, Local Storage, Form Handling):** Implemented across the core web pages (`index.html`, `dashboard.html`, `groups.html`, `addExpense.html`, `settlement.html`, `history.html`, `insights.html`, `profile.html`, `login.html`, `signup.html`) and [`js/`](../js/).
4. **Lecture 31 (Node.js, Features, V8 Engine, Global Objects):** Implemented in [`server/src/app.js`](../server/src/app.js) (`/api/health` exposing `v8.getHeapStatistics()`, `process.version`, `process.uptime()`, and `__dirname`).
5. **Lecture 32 (Event Loop, Call Stack, Callback Queue, Non-Blocking I/O):** Implemented in [`server/src/utils/eventEmitter.js`](../server/src/utils/eventEmitter.js) (`process.nextTick` and `setImmediate` non-blocking event dispatch).
6. **Lecture 33 (Modules — CommonJS, File System Module `fs`, Path Module):** Implemented across [`server/src/`](../server/src/) with `fs` and `path` utilized for receipt storage, validation, and database migration.
7. **Lecture 34 (Buffers, Streams, EventEmitter, Error Handling):** Binary magic-byte validation in [`upload.js`](../server/src/middleware/upload.js), streaming CSV export in [`csvExporter.js`](../server/src/utils/csvExporter.js), events in [`eventEmitter.js`](../server/src/utils/eventEmitter.js), and centralized error handling in [`errorHandler.js`](../server/src/middleware/errorHandler.js).
8. **Lecture 35 (HTTP Module, Request-Response Lifecycle, Creating HTTP Server, Routing):** [`server.js`](../server.js) and [`server/src/server.js`](../server/src/server.js) use Node's native `http.createServer(app)`.
9. **Lecture 36 (NPM, `package.json`, Nodemon, Environment Variables):** Configured in [`package.json`](../package.json), [`.env.example`](../.env.example), and [`server/src/config/config.js`](../server/src/config/config.js).
10. **Lecture 37 (Express.js, Express Server, Routing, Request & Response Objects):** Implemented in [`server/src/app.js`](../server/src/app.js) and [`server/src/routes/`](../server/src/routes/).
11. **Lecture 38 (Middleware, Body Parsing, REST API Fundamentals, CRUD APIs):** Implemented in [`server/src/app.js`](../server/src/app.js) and [`server/src/controllers/`](../server/src/controllers/).
12. **Lecture 39 (Validation, Error Handling Middleware, JWT Authentication, bcrypt, Protected Routes):** Implemented in [`validator.js`](../server/src/middleware/validator.js), [`errorHandler.js`](../server/src/middleware/errorHandler.js), [`auth.js`](../server/src/middleware/auth.js), and [`User.js`](../server/src/models/User.js).
13. **Lecture 40 (Multer File Uploads, API Testing using Postman):** Implemented in [`upload.js`](../server/src/middleware/upload.js) and [`docs/postman/Split_Bro.postman_collection.json`](postman/Split_Bro.postman_collection.json).
14. **Lecture 41 (MongoDB, MongoDB Atlas, CRUD Operations, Mongoose):** Implemented in [`server/src/config/db.js`](../server/src/config/db.js) and [`server/src/models/`](../server/src/models/) with Mongoose schema validation and `.populate()`.

---

## 2. Automated Test Suite Execution

The automated test suite runs via Jest:
```powershell
npm test
```

### Current Test Suite Breakdown:
- **Unit Tests:**
  - `server/tests/unit/securityAndConfig.test.js`: Configuration guardrails, production secret length validation, binary magic-byte inspection (10 tests).
  - `server/tests/unit/expenseCalculation.test.js`: Exact, percentage, and custom expense shares, remainder distribution without penny loss (8 tests).
  - `server/tests/unit/settlementAlgorithm.test.js`: Cyclic debt simplification, net balance resolution, payment ledger updates (6 tests).
- **Integration Tests:**
  - `server/tests/integration/auth.test.js`: Registration, login, JWT verification, profile updates, CORS origin policy (12 tests).
  - `server/tests/integration/groups.test.js`: Group CRUD, member joins, guest additions, creator authorization (8 tests).
  - `server/tests/integration/expenses.test.js`: Expense creation, receipt attachment, category filtering (7 tests).
  - `server/tests/integration/settlements.test.js`: Debt settlement recording, simplified balance endpoints (4 tests).
  - `server/tests/integration/insights.test.js`: Spending aggregations, category breakdown, user financial summary (3 tests).

Total: **8 test suites, 60 tests.**

---

## 3. Environment & Security Checklist

- [x] All real credentials, connection strings, and JWT secrets removed from documentation and code.
- [x] `.env.example` provided with safe placeholder variables.
- [x] `.env`, `node_modules/`, and `.git/` excluded from submission packages.
- [x] Failed logins reject immediately without mock token fallbacks.
- [x] `node --check` syntax check passes on all project-owned JavaScript files.
