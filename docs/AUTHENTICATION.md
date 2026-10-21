# Split Bro — Authentication & Security Architecture

**Course:** Back End Engineering & Full-Stack Web Development  
**Module:** Authentication, Cryptography, JWT, Bcrypt & Security Middleware  
**Target System:** Split Bro Expense Platform  

---

## 1. Overview & Threat Model

Authentication in the original Split Bro prototype consisted of storing plaintext user credentials in browser `localStorage`. This represented severe vulnerabilities:
1. **XSS Exposure:** Any third-party script or browser extension could inspect `localStorage.getItem("smartSettleUsers")` and extract raw user passwords.
2. **Missing Server-Side Enforcement:** Clients could spoof any user ID by simply modifying local JavaScript objects.
3. **No Cryptographic Proof:** The backend had no mechanism to verify whether an incoming request originated from an authenticated session.

The upgraded Split Bro architecture implements industry-standard **salted password hashing with bcrypt** and **stateless JSON Web Token (JWT) authorization**.

---

## 2. Authentication Lifecycle

```
[ Client: React SPA / Mobile ]                  [ Server: Express API ]                 [ Database: MongoDB ]
              |                                             |                                      |
              | --- 1. POST /api/auth/register -----------> |                                      |
              |    { name, email, userId, password }        | --- 2. Check duplicate email/ID ---> |
              |                                             | <--- No duplicate found ------------ |
              |                                             | --- 3. Hash with bcrypt (salt 10)    |
              |                                             | --- 4. Store user with hashed pw --> |
              | <--- 5. Return JWT token + user profile --- |                                      |
              |                                             |                                      |
              | --- 6. POST /api/auth/login --------------> |                                      |
              |    { identifier, password }                 | --- 7. Fetch user + hash ----------> |
              |                                             | <--- Return user document ---------- |
              |                                             | --- 8. bcrypt.compare(pw, hash)      |
              | <--- 9. Return JWT token + Set Cookie ----- |                                      |
              |                                             |                                      |
              | --- 10. GET /api/expenses (Bearer JWT) ---> |                                      |
              |                                             | --- 11. jwt.verify(token, secret)    |
              |                                             | --- 12. Attach req.user              |
              | <--- 13. Return protected group expenses -- |                                      |
```

---

## 3. Cryptographic Implementation Details

### 3.1 Password Hashing with Bcrypt
- **Algorithm:** Blowfish-based adaptive hashing algorithm (`bcryptjs`).
- **Work Factor (Salt Rounds):** `10` rounds (balances protection against offline dictionary attacks with low server latency ~60ms).
- **Mongoose Hook Integration:**
  Password hashing is encapsulated directly in the `User` schema's `pre('save')` hook:
  ```javascript
  userSchema.pre('save', async function() {
      if (!this.isModified('password')) return;
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
  });
  ```
- **Password Query Isolation:** The `password` field is designated `{ select: false }` so that database queries like `User.find()` never inadvertently leak password hashes to client responses.

### 3.2 JWT Token Architecture
- **Standard:** RFC 7519.
- **Algorithm:** HMAC with SHA-256 (`HS256`).
- **Payload:**
  ```json
  {
    "id": "670984...",
    "userId": "MAYUR01",
    "email": "mayur@example.com",
    "iat": 1728652800,
    "exp": 1729257600
  }
  ```
- **Lifespan:** 7 days (`JWT_EXPIRES_IN=7d`), stored as an environment configuration variable.

---

## 4. Protected Route Middleware

The `protect` middleware (`server/src/middleware/auth.js`) intercepts requests to protected endpoints:
1. Checks for the `Authorization: Bearer <token>` header or `token` cookie.
2. Verifies the cryptographic signature using `process.env.JWT_SECRET`.
3. Ensures the referenced user account still exists in the database.
4. Populates `req.user = { id, userId, name, email }`.
5. Forwards to the route controller, or halts with `401 Unauthorized` on missing, expired, or tampered tokens.

---

## 5. Token Storage Strategy & Trade-Offs

| Storage Mechanism | Vulnerability to XSS | Vulnerability to CSRF | Implementation in Split Bro |
| :--- | :--- | :--- | :--- |
| **HttpOnly, Secure Cookie** | Immune (JavaScript cannot read cookie) | Vulnerable if SameSite is Lax/None without anti-CSRF token | Configured with `SameSite: 'lax'`, `httpOnly: true`. |
| **Authorization: Bearer Header (In-Memory)** | Minimal if stored in React AuthContext state | Completely immune to CSRF | Primary strategy for Axios API client with bearer token interceptor. |
| **Local Storage (Bearer Token)** | Vulnerable to malicious XSS script injection | Immune to CSRF | Used only for non-sensitive token persistence across browser tab refresh, with token validation on mount. |

---

## 6. Password Complexity & Validation Rules

Split Bro enforces client-side and server-side validation schemas using `express-validator`:
- Minimum length: 6 characters.
- User ID: 3-20 characters, alphanumeric and underscores only (`/^[A-Za-z0-9_]{3,20}$/`).
- Email: Valid format checked with RFC 5322 regex and normalized to lowercase.
