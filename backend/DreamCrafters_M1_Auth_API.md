# Dream Crafters — Module 1: Auth & User Management
## Implementation Prompt

---

## Your Task
Implement the **Auth & User Management** backend module for the Dream Crafters platform using the stack and spec below. This is the foundation module — the `authenticate` middleware and `users` table you create here will be imported and used by all other modules.

---

## Tech Stack
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL using `node-postgres` (`pg` package)
- **Password hashing**: `bcrypt` (saltRounds: 10)
- **Auth tokens**: `jsonwebtoken` (`jwt`)
  - Access token: expires in `15m`, payload `{ userId, role }`
  - Refresh token: random UUID stored hashed in DB, expires in 7 days
- **Email**: `nodemailer` for verification and password reset emails
- **Validation**: `express-validator` on all POST/PUT/PATCH routes
- **File structure**:
  ```
  routes/auth.js
  routes/users.js
  controllers/authController.js
  controllers/userController.js
  middleware/auth.js          ← YOU CREATE THIS — used by all other modules
  db/index.js                 ← exports a pg Pool instance
  ```

---

## Standard Response Format

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Error:**
```json
{ "success": false, "error": "Descriptive error message" }
```

**Paginated:**
```json
{
  "success": true,
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 100 }
}
```

**HTTP status codes:**
- `200` — OK
- `201` — Created
- `400` — Validation error / bad input
- `401` — Not authenticated
- `403` — Forbidden (wrong role or deactivated)
- `404` — Not found
- `409` — Conflict (duplicate)
- `500` — Internal server error

---

## Database Tables for This Module

### `users`
```sql
CREATE TABLE users (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  email            VARCHAR(255) UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  role             VARCHAR(20) DEFAULT 'student',   -- student | mentor | admin
  age              INTEGER,
  location         VARCHAR(100),
  profile_pic_url  TEXT,
  is_verified      BOOLEAN DEFAULT false,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);
```

### `user_interests`
```sql
CREATE TABLE user_interests (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest  VARCHAR(100) NOT NULL
);
```

### `user_learning_preferences`
```sql
CREATE TABLE user_learning_preferences (
  id                     SERIAL PRIMARY KEY,
  user_id                INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_language     VARCHAR(50) DEFAULT 'English',
  daily_study_hours      INTEGER DEFAULT 2,
  learning_style         VARCHAR(50),   -- visual | reading | hands-on
  difficulty_preference  VARCHAR(20) DEFAULT 'medium'  -- easy | medium | hard
);
```

### `refresh_tokens`
```sql
CREATE TABLE refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,       -- store bcrypt hash of the actual token
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## Middleware to Create

### `middleware/auth.js` — Export these two functions

**`authenticate`** — verifies JWT access token, attaches user to request:
```javascript
const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};
```

**`authorize(...roles)`** — checks role after authenticate:
```javascript
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  next();
};

module.exports = { authenticate, authorize };
```

**`optionalAuth`** — tries to verify token but never blocks (used by other modules for public routes that have optional user-specific data):
```javascript
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return next();
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId, role: decoded.role };
  } catch (_) { /* ignore */ }
  next();
};
```

Export all three: `module.exports = { authenticate, authorize, optionalAuth };`

---

## Routes to Implement

### `routes/auth.js`
```
POST  /api/auth/register           → Register new user
POST  /api/auth/login              → Login, get tokens
POST  /api/auth/logout             → Invalidate refresh token (auth required)
POST  /api/auth/refresh            → Get new access token
POST  /api/auth/forgot-password    → Send reset email
POST  /api/auth/reset-password     → Reset password with token
POST  /api/auth/verify-email/:token → Verify email address
```

### `routes/users.js`
```
GET    /api/users/me                    → Get own profile (auth required)
PUT    /api/users/me                    → Update own profile (auth required)
PUT    /api/users/me/interests          → Replace interest tags (auth required)
PUT    /api/users/me/preferences        → Upsert learning preferences (auth required)
PUT    /api/users/me/password           → Change password (auth required)

GET    /api/admin/users                 → List all users (admin only)
GET    /api/admin/users/:id             → Get any user (admin only)
PATCH  /api/admin/users/:id/status      → Toggle active status (admin only)
DELETE /api/admin/users/:id             → Delete user (admin only)
```

---

## Detailed Route Specifications

---

### POST /api/auth/register
Register a new user.

**Request body:**
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "password": "string (required, min 8 chars)",
  "role": "student | mentor | admin (default: student)",
  "age": "integer (optional)",
  "location": "string (optional)"
}
```

**Validation:**
- `name` — required, non-empty
- `email` — required, valid email format
- `password` — required, min 8 characters
- `role` — optional, must be one of: student, mentor, admin
- `age` — optional, positive integer

**Logic:**
1. Check if email already exists in `users` → 409 `"Email already registered"`
2. Hash password: `const hash = await bcrypt.hash(password, 10)`
3. INSERT into `users` with `is_verified: false`
4. Generate email verification token: `jwt.sign({ userId: newUser.id, purpose: 'verify' }, process.env.JWT_SECRET, { expiresIn: '24h' })`
5. Send verification email using nodemailer with a link: `${process.env.FRONTEND_URL}/verify-email?token=<token>`
6. Return created user (exclude `password_hash`)

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Darshan",
    "email": "darshan@example.com",
    "role": "student",
    "is_verified": false,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

### POST /api/auth/login
Login and receive access + refresh tokens.

**Request body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Validation:**
- `email` — required, valid email format
- `password` — required, non-empty

**Logic:**
1. SELECT user WHERE `email = $1` → 401 `"Invalid email or password"` if not found (do NOT say "email not found" — security)
2. `const match = await bcrypt.compare(password, user.password_hash)` → 401 `"Invalid email or password"` if false
3. Check `user.is_active` → 403 `"Account has been deactivated"` if false
4. Generate access token:
   ```javascript
   const accessToken = jwt.sign(
     { userId: user.id, role: user.role },
     process.env.JWT_SECRET,
     { expiresIn: '15m' }
   );
   ```
5. Generate refresh token UUID: `const refreshToken = require('crypto').randomUUID()`
6. Hash refresh token for storage: `const tokenHash = await bcrypt.hash(refreshToken, 10)`
7. INSERT into `refresh_tokens` with `expires_at = NOW() + INTERVAL '7 days'`
8. Return both tokens

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "uuid-string",
    "user": {
      "id": 1,
      "name": "Darshan",
      "email": "darshan@example.com",
      "role": "student",
      "is_verified": true
    }
  }
}
```

---

### POST /api/auth/logout
**Auth required.** Invalidate a refresh token.

**Request body:**
```json
{ "refreshToken": "string (required)" }
```

**Logic:**
1. Fetch all active refresh tokens for `req.user.id` from `refresh_tokens`
2. Loop through and `bcrypt.compare(incomingToken, storedHash)` to find the matching row
3. DELETE that row from `refresh_tokens`
4. If no matching row found, still return 200 (idempotent)

**Response 200:**
```json
{ "success": true, "data": { "message": "Logged out successfully" } }
```

---

### POST /api/auth/refresh
Get a new access token using a refresh token.

**Request body:**
```json
{ "refreshToken": "string (required)" }
```

**Logic:**
1. Fetch all refresh tokens for the user from `refresh_tokens` WHERE `expires_at > NOW()`
2. Find the matching row using `bcrypt.compare`
3. If no match or expired → 401 `"Invalid or expired refresh token"`
4. Fetch user from `users` to get latest role
5. Generate new access token
6. Return new access token (do NOT rotate the refresh token — keep existing one)

**Response 200:**
```json
{ "success": true, "data": { "accessToken": "eyJ..." } }
```

**Note:** The refresh token lookup requires the `user_id`. Since the refresh token itself doesn't encode the user_id (it's a random UUID), require the client to also send their `userId` in the request body alongside the `refreshToken`, or look up by scanning all non-expired tokens (use the userId approach for performance).

**Updated request body:**
```json
{
  "userId": "integer (required)",
  "refreshToken": "string (required)"
}
```

---

### POST /api/auth/forgot-password
Send a password reset email.

**Request body:**
```json
{ "email": "string (required)" }
```

**Logic:**
1. SELECT user WHERE `email = $1`
2. If no user found, still return 200 (never reveal if email exists — security)
3. If user found, generate reset token: `jwt.sign({ userId: user.id, purpose: 'reset' }, process.env.JWT_SECRET, { expiresIn: '1h' })`
4. Send email with link: `${process.env.FRONTEND_URL}/reset-password?token=<token>`

**Response 200:**
```json
{ "success": true, "data": { "message": "If that email exists, a reset link has been sent" } }
```

---

### POST /api/auth/reset-password
Reset password using token from email.

**Request body:**
```json
{
  "token": "string (required, JWT from reset email)",
  "newPassword": "string (required, min 8 chars)"
}
```

**Validation:**
- `token` — required
- `newPassword` — required, min 8 characters

**Logic:**
1. `jwt.verify(token, process.env.JWT_SECRET)` → 400 `"Invalid or expired reset token"` if fails
2. Check `decoded.purpose === 'reset'` → 400 if wrong purpose
3. Hash new password and UPDATE `users.password_hash`
4. DELETE all refresh tokens for this user (force re-login everywhere):
   ```sql
   DELETE FROM refresh_tokens WHERE user_id = $1
   ```

**Response 200:**
```json
{ "success": true, "data": { "message": "Password reset successfully. Please log in." } }
```

---

### POST /api/auth/verify-email/:token
Verify a user's email using the token from the verification email.

**URL param:** `:token` — JWT from verification email

**Logic:**
1. `jwt.verify(token, process.env.JWT_SECRET)` → 400 `"Invalid or expired verification link"`
2. Check `decoded.purpose === 'verify'` → 400 if wrong purpose
3. UPDATE `users` SET `is_verified = true` WHERE `id = decoded.userId`

**Response 200:**
```json
{ "success": true, "data": { "message": "Email verified successfully" } }
```

---

### GET /api/users/me
**Auth required.** Get the current user's full profile including interests and preferences.

**Logic:**
```sql
-- Fetch user
SELECT id, name, email, role, age, location, profile_pic_url, is_verified, is_active, created_at
FROM users WHERE id = $1

-- Fetch interests
SELECT interest FROM user_interests WHERE user_id = $1

-- Fetch preferences
SELECT preferred_language, daily_study_hours, learning_style, difficulty_preference
FROM user_learning_preferences WHERE user_id = $1
```

Run all three queries and combine in the response.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Darshan",
    "email": "darshan@example.com",
    "role": "student",
    "age": 20,
    "location": "Coimbatore",
    "profile_pic_url": null,
    "is_verified": true,
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "interests": ["technology", "design"],
    "preferences": {
      "preferred_language": "English",
      "daily_study_hours": 3,
      "learning_style": "visual",
      "difficulty_preference": "medium"
    }
  }
}
```

If no preferences row exists yet, return `"preferences": null`.

---

### PUT /api/users/me
**Auth required.** Update own profile fields (partial update).

**Request body (all optional):**
```json
{
  "name": "string",
  "age": "integer",
  "location": "string",
  "profile_pic_url": "string (URL)"
}
```

**Validation:**
- `age` — optional, positive integer between 5 and 120 if provided
- `profile_pic_url` — optional, valid URL if provided

**Logic:**
1. Build partial UPDATE (only fields present in body)
2. Always set `updated_at = NOW()`
3. Return updated user (run GET logic after update)

**Response 200:** Full updated user object (same shape as GET /api/users/me).

---

### PUT /api/users/me/interests
**Auth required.** Fully replace the user's interest tags.

**Request body:**
```json
{ "interests": ["technology", "arts", "science"] }
```

**Validation:**
- `interests` — required, must be an array (can be empty array to clear all interests)
- Each item — must be a non-empty string

**Logic:**
1. DELETE FROM `user_interests` WHERE `user_id = req.user.id`
2. If `interests` array is non-empty, bulk INSERT:
   ```sql
   INSERT INTO user_interests (user_id, interest)
   VALUES ($1, $2), ($1, $3), ...
   ```
3. Use a transaction so delete + insert are atomic

**Response 200:**
```json
{ "success": true, "data": { "interests": ["technology", "arts", "science"] } }
```

---

### PUT /api/users/me/preferences
**Auth required.** Upsert the user's learning preferences.

**Request body (all optional):**
```json
{
  "preferred_language": "string",
  "daily_study_hours": "integer 1-12",
  "learning_style": "visual | reading | hands-on",
  "difficulty_preference": "easy | medium | hard"
}
```

**Validation:**
- `daily_study_hours` — optional, integer between 1 and 12
- `learning_style` — optional, one of: visual, reading, hands-on
- `difficulty_preference` — optional, one of: easy, medium, hard

**Logic:**
```sql
INSERT INTO user_learning_preferences
  (user_id, preferred_language, daily_study_hours, learning_style, difficulty_preference)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id) DO UPDATE SET
  preferred_language    = COALESCE(EXCLUDED.preferred_language, user_learning_preferences.preferred_language),
  daily_study_hours     = COALESCE(EXCLUDED.daily_study_hours, user_learning_preferences.daily_study_hours),
  learning_style        = COALESCE(EXCLUDED.learning_style, user_learning_preferences.learning_style),
  difficulty_preference = COALESCE(EXCLUDED.difficulty_preference, user_learning_preferences.difficulty_preference)
```

Use `COALESCE` so only fields that are explicitly provided in the request overwrite existing values.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "preferred_language": "Tamil",
    "daily_study_hours": 4,
    "learning_style": "visual",
    "difficulty_preference": "medium"
  }
}
```

---

### PUT /api/users/me/password
**Auth required.** Change own password (requires current password verification).

**Request body:**
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required, min 8 chars)"
}
```

**Validation:**
- `currentPassword` — required
- `newPassword` — required, min 8 characters, must NOT equal currentPassword

**Logic:**
1. Fetch `password_hash` from `users` WHERE `id = req.user.id`
2. `bcrypt.compare(currentPassword, user.password_hash)` → 400 `"Current password is incorrect"` if false
3. Check `newPassword !== currentPassword` → 400 `"New password must differ from current"` if same
4. Hash new password and UPDATE `users.password_hash` + `updated_at = NOW()`

**Response 200:**
```json
{ "success": true, "data": { "message": "Password changed successfully" } }
```

---

### GET /api/admin/users
**Auth required. Admin only.** List all users with filters and pagination.

**Query params:**
- `role` — filter by role (student | mentor | admin)
- `is_active` — filter by status (true | false)
- `search` — partial match on name or email (ILIKE)
- `page` — default 1
- `limit` — default 20, max 100

**Logic:** Dynamic WHERE clause. Exclude `password_hash` from SELECT. Include COUNT using window function.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Darshan",
      "email": "darshan@example.com",
      "role": "student",
      "age": 20,
      "location": "Coimbatore",
      "is_verified": true,
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 234 }
}
```

---

### GET /api/admin/users/:id
**Auth required. Admin only.** Get any user's full profile with interests and preferences.

**Logic:** Same as GET /api/users/me but for any user by `:id`. → 404 if not found.

**Response 200:** Same shape as GET /api/users/me response.

---

### PATCH /api/admin/users/:id/status
**Auth required. Admin only.** Activate or deactivate a user account.

**Request body:**
```json
{ "is_active": "boolean (required)" }
```

**Validation:**
- `is_active` — required, must be boolean

**Logic:**
1. Check user exists → 404
2. Prevent admin from deactivating their own account → 400 `"Cannot deactivate your own account"`
3. UPDATE `users` SET `is_active = $1`, `updated_at = NOW()` WHERE `id = $2`
4. If deactivating, also DELETE all refresh tokens: `DELETE FROM refresh_tokens WHERE user_id = $1`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Some User",
    "is_active": false,
    "message": "User account deactivated"
  }
}
```

---

### DELETE /api/admin/users/:id
**Auth required. Admin only.** Permanently delete a user account.

**Logic:**
1. Check user exists → 404
2. Prevent admin from deleting their own account → 400 `"Cannot delete your own account"`
3. DELETE FROM `users` WHERE `id = :id` (CASCADE removes interests, preferences, refresh_tokens)

**Response 200:**
```json
{ "success": true, "data": { "message": "User deleted permanently" } }
```

---

## Environment Variables Required
```
JWT_SECRET=your-very-long-random-secret-key
FRONTEND_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@dreamcrafters.com
DATABASE_URL=postgresql://user:password@localhost:5432/dreamcrafters
```

---

## Implementation Notes

1. **Never return `password_hash`** — exclude it from every SELECT. Use explicit column lists, not `SELECT *` on the users table.

2. **Refresh token security** — the actual token (UUID) is sent to the client. Only a bcrypt hash is stored in DB. On logout/verify, fetch all tokens for that user and `bcrypt.compare` each until you find a match. Limit tokens per user to 5 (delete oldest when exceeded) to keep this loop small.

3. **Transaction for interests replace:**
   ```javascript
   const client = await pool.connect();
   try {
     await client.query('BEGIN');
     await client.query('DELETE FROM user_interests WHERE user_id = $1', [userId]);
     if (interests.length > 0) {
       const values = interests.map((_, i) => `($1, $${i + 2})`).join(', ');
       await client.query(`INSERT INTO user_interests (user_id, interest) VALUES ${values}`, [userId, ...interests]);
     }
     await client.query('COMMIT');
   } catch (e) {
     await client.query('ROLLBACK');
     throw e;
   } finally {
     client.release();
   }
   ```

4. **Partial update pattern** for PUT /api/users/me:
   ```javascript
   const allowed = ['name', 'age', 'location', 'profile_pic_url'];
   const fields = [];
   const values = [];
   let i = 1;
   allowed.forEach(key => {
     if (req.body[key] !== undefined) {
       fields.push(`${key} = $${i++}`);
       values.push(req.body[key]);
     }
   });
   if (fields.length === 0) {
     return res.status(400).json({ success: false, error: 'No fields to update' });
   }
   fields.push(`updated_at = NOW()`);
   values.push(req.user.id);
   await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`, values);
   ```

5. **Express validator example** for POST /api/auth/register:
   ```javascript
   const { body, validationResult } = require('express-validator');
   const validateRegister = [
     body('name').notEmpty().withMessage('Name is required'),
     body('email').isEmail().withMessage('Valid email is required'),
     body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
     body('role').optional().isIn(['student', 'mentor', 'admin']).withMessage('Invalid role'),
     body('age').optional().isInt({ min: 5, max: 120 }).withMessage('Invalid age'),
     (req, res, next) => {
       const errors = validationResult(req);
       if (!errors.isEmpty()) return res.status(400).json({ success: false, error: errors.array()[0].msg });
       next();
     }
   ];
   ```

6. **Nodemailer setup:**
   ```javascript
   const nodemailer = require('nodemailer');
   const transporter = nodemailer.createTransport({
     host: process.env.SMTP_HOST,
     port: process.env.SMTP_PORT,
     auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
   });

   const sendEmail = async (to, subject, html) => {
     await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
   };
   ```

7. **Dynamic WHERE for admin user list:**
   ```javascript
   const conditions = ['1=1'];
   const params = [];
   let i = 1;
   if (role) { conditions.push(`role = $${i++}`); params.push(role); }
   if (is_active !== undefined) { conditions.push(`is_active = $${i++}`); params.push(is_active === 'true'); }
   if (search) { conditions.push(`(name ILIKE $${i} OR email ILIKE $${i++})`); params.push(`%${search}%`); }
   ```

8. **Error handling** — wrap all controllers in try/catch:
   ```javascript
   } catch (err) {
     console.error(err);
     res.status(500).json({ success: false, error: 'Internal server error' });
   }
   ```
