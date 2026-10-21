# Split Bro — Postman API Testing Guide

This guide documents how to import, configure, and execute the Split Bro REST API suite using Postman or Newman CLI.

---

## 1. Files Included

- **Postman Collection:** [`docs/postman/Split_Bro.postman_collection.json`](file:///home/armaanjaat/Desktop/Final%20Continious%20Evaluvation/Split%20Bro/docs/postman/Split_Bro.postman_collection.json)
- **Postman Environment:** [`docs/postman/Split_Bro.postman_environment.json`](file:///home/armaanjaat/Desktop/Final%20Continious%20Evaluvation/Split%20Bro/docs/postman/Split_Bro.postman_environment.json)

---

## 2. Quick Setup & Execution

### Option A: Using Postman GUI
1. Open Postman.
2. Click **Import** (top-left) and select both files from `docs/postman/`.
3. Select the environment **Split Bro Local Environment** in the top-right environment selector.
4. Ensure the backend server is running (`npm start` at `http://localhost:3000`).
5. Execute requests in sequence:
   - **1. System Health -> API Health Check** (Status 200)
   - **2. Authentication -> Login User** (Automatically captures and sets `{{token}}` in environment)
   - **3. Groups -> Create Group** (Automatically captures `{{groupId}}` and `{{groupCode}}`)
   - **4. Expenses -> Record Expense (Equal Split)** (Automatically captures `{{expenseId}}`)
   - **5. Settlements -> Get Balances & Debt Simplification Suggestions**
   - **6. Analytics -> Get Group Insights**

### Option B: Using Newman CLI
You can run automated API testing from the terminal using Newman:

```bash
npx newman run docs/postman/Split_Bro.postman_collection.json \
  -e docs/postman/Split_Bro.postman_environment.json \
  --reporters cli
```

---

## 3. Pre-Configured Test Credentials

| Role | Email | Password | User ID |
| :--- | :--- | :--- | :--- |
| Primary Demo User | `mayur@example.com` | `Password@123` | `MAYUR01` |
| Member 2 | `satvik@example.com` | `Password@123` | `SATVIK01` |
| Member 3 | `shriya@example.com` | `Password@123` | `SHRIYA01` |
| Member 4 | `aman@example.com` | `Password@123` | `AMAN01` |

---

## 4. Endpoints Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service uptime and DB status | No |
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT | No |
| `GET` | `/api/auth/me` | Fetch active profile | Yes (Bearer) |
| `PATCH`| `/api/auth/me` | Update bio and UPI ID | Yes (Bearer) |
| `POST` | `/api/groups` | Create group with members | Yes (Bearer) |
| `GET` | `/api/groups` | List user's groups | Yes (Bearer) |
| `GET` | `/api/groups/:id` | Group details and transactions | Yes (Bearer) |
| `POST` | `/api/groups/join`| Join group by 6-char code | Yes (Bearer) |
| `POST` | `/api/expenses` | Add expense (equal/custom/pct) | Yes (Bearer) |
| `GET` | `/api/expenses` | Query & filter expenses | Yes (Bearer) |
| `GET` | `/api/expenses/export/csv` | Stream CSV export | Yes (Bearer) |
| `GET` | `/api/settlements/balances/:id` | Net balances & suggestions | Yes (Bearer) |
| `POST` | `/api/settlements`| Record settled payment | Yes (Bearer) |
| `GET` | `/api/insights/group/:id` | Category breakdown & metrics | Yes (Bearer) |
| `GET` | `/api/insights/user` | Global financial summary | Yes (Bearer) |
