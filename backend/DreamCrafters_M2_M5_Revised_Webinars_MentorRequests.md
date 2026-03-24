# Dream Crafters — Module 2 & 5 (Revised)
## Webinars & Mentor Requests
## Implementation Prompt

---

## What This Module Does

Two features only:

1. **Webinars** — Educators create webinars with a title, description, meet link, date and time. Students browse and register for them.
2. **Mentor Requests** — Students send a request for mentorship on a specific topic. Educators see all incoming requests on their dashboard and can accept or reject. When an educator accepts, they create a webinar for that topic which gets linked back to the request.

Everything else from the original Module 2 and 5 (content, career paths, job portal, analytics, feedback, surveys) is **removed**. Do not implement those.

---

## Tech Stack
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL using `node-postgres` (`pg` package)
- **Auth**: JWT middleware already in `middleware/auth.js` — imports `authenticate` and `authorize`. Attaches `req.user = { id, role }`.
- **Roles used here**: `student` and `mentor` (educator = user with role `mentor`)
- **Validation**: `express-validator`
- **File structure**:
  ```
  routes/webinars.js
  routes/mentorRequests.js
  controllers/webinarController.js
  controllers/mentorRequestController.js
  middleware/auth.js         ← already exists
  db/index.js                ← already exports pg Pool
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
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 20, "total": 50 } }
```

**HTTP status codes:** `200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`

---

## Database Tables

### `webinars`
```sql
CREATE TABLE webinars (
  id               SERIAL PRIMARY KEY,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  meet_link        TEXT,
  topic            VARCHAR(100),
  host_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_date   DATE NOT NULL,
  scheduled_time   TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_participants INTEGER,
  created_at       TIMESTAMP DEFAULT NOW()
);
```

### `webinar_registrations`
```sql
CREATE TABLE webinar_registrations (
  id            SERIAL PRIMARY KEY,
  webinar_id    INTEGER NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (webinar_id, user_id)
);
```

### `mentor_requests`
```sql
CREATE TABLE mentor_requests (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic       VARCHAR(255) NOT NULL,
  message     TEXT,
  status      VARCHAR(20) DEFAULT 'pending',
  -- pending | accepted | rejected
  webinar_id  INTEGER REFERENCES webinars(id) ON DELETE SET NULL,
  -- set when an educator accepts and creates a webinar for this request
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

---

## Routes

### `routes/webinars.js`
```
GET    /api/webinars                          → List all upcoming webinars (public)
GET    /api/webinars/my-registrations         → Student's registered webinars (auth required)
GET    /api/webinars/my-webinars              → Educator's own created webinars (mentor only)
GET    /api/webinars/:id                      → Single webinar details (public)
POST   /api/webinars                          → Create a webinar (mentor only)
PUT    /api/webinars/:id                      → Update a webinar (mentor, must be host)
DELETE /api/webinars/:id                      → Delete a webinar (mentor, must be host)
POST   /api/webinars/:id/register             → Student registers (auth required)
DELETE /api/webinars/:id/register             → Student cancels registration (auth required)
```

> Register `/api/webinars/my-registrations` and `/api/webinars/my-webinars` BEFORE `/api/webinars/:id` to prevent Express treating them as `:id` params.

### `routes/mentorRequests.js`
```
POST   /api/mentor-requests                   → Student creates a request (student only)
GET    /api/mentor-requests                   → Educator sees all pending requests / Student sees own requests
GET    /api/mentor-requests/:id               → Single request details
PATCH  /api/mentor-requests/:id/accept        → Educator accepts + creates webinar (mentor only)
PATCH  /api/mentor-requests/:id/reject        → Educator rejects (mentor only)
DELETE /api/mentor-requests/:id               → Student withdraws pending request (student only)
```

---

## Detailed Route Specifications

---

## SECTION A: Webinar Routes

---

### GET /api/webinars
**Public.** List all upcoming webinars — only webinars where the date is today or in the future.

**Query params:**
- `topic` — partial match on topic (ILIKE)
- `page` — default 1
- `limit` — default 20

**Logic:**
```sql
SELECT
  w.*,
  u.name AS host_name,
  COUNT(wr.id) AS registration_count,
  COUNT(*) OVER() AS total_count
FROM webinars w
JOIN users u ON w.host_id = u.id
LEFT JOIN webinar_registrations wr ON w.id = wr.webinar_id
WHERE w.scheduled_date >= CURRENT_DATE
  AND ($1::text IS NULL OR w.topic ILIKE '%' || $1 || '%')
GROUP BY w.id, u.name
ORDER BY w.scheduled_date ASC, w.scheduled_time ASC
LIMIT $2 OFFSET $3
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Career in AI — Expert Talk",
      "description": "Learn about AI careers from industry experts",
      "topic": "AI & ML",
      "meet_link": "https://meet.google.com/abc-xyz",
      "scheduled_date": "2025-02-15",
      "scheduled_time": "14:00",
      "duration_minutes": 90,
      "max_participants": 100,
      "registration_count": 34,
      "is_full": false,
      "host_name": "Dr. Karpagam",
      "created_at": "2025-01-01T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5 }
}
```

`is_full` = `registration_count >= max_participants` (if `max_participants` is null, always false).

---

### GET /api/webinars/my-registrations
**Auth required.** Get all webinars the current student is registered for.

**Logic:**
```sql
SELECT w.*, u.name AS host_name, wr.registered_at
FROM webinar_registrations wr
JOIN webinars w ON wr.webinar_id = w.id
JOIN users u ON w.host_id = u.id
WHERE wr.user_id = $1
ORDER BY w.scheduled_date ASC, w.scheduled_time ASC
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Career in AI — Expert Talk",
      "topic": "AI & ML",
      "meet_link": "https://meet.google.com/abc-xyz",
      "scheduled_date": "2025-02-15",
      "scheduled_time": "14:00",
      "host_name": "Dr. Karpagam",
      "registered_at": "2025-01-10T10:00:00Z"
    }
  ]
}
```

---

### GET /api/webinars/my-webinars
**Auth required. Mentor only.** Get all webinars created by the current educator.

**Logic:**
1. Verify `req.user.role === 'mentor'` → 403
2. SELECT webinars WHERE `host_id = req.user.id`, include registration count per webinar
3. Include both past and upcoming webinars, ordered by `scheduled_date DESC`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Career in AI — Expert Talk",
      "topic": "AI & ML",
      "scheduled_date": "2025-02-15",
      "scheduled_time": "14:00",
      "registration_count": 34,
      "max_participants": 100,
      "created_at": "2025-01-01T10:00:00Z"
    }
  ]
}
```

---

### GET /api/webinars/:id
**Public.** Get full details of one webinar.

**Logic:**
1. SELECT webinar JOIN host user → 404 if not found
2. COUNT registrations
3. If request has a valid auth token (use `optionalAuth` middleware), also check if current user is registered (`isRegistered: true/false`)
4. Compute `is_full`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Career in AI — Expert Talk",
    "description": "Learn about AI careers from industry experts",
    "topic": "AI & ML",
    "meet_link": "https://meet.google.com/abc-xyz",
    "scheduled_date": "2025-02-15",
    "scheduled_time": "14:00",
    "duration_minutes": 90,
    "max_participants": 100,
    "registration_count": 34,
    "is_full": false,
    "host": { "id": 5, "name": "Dr. Karpagam" },
    "isRegistered": true,
    "created_at": "2025-01-01T10:00:00Z"
  }
}
```

`isRegistered` is `null` if user is not authenticated.

---

### POST /api/webinars
**Auth required. Mentor only.** Create a new webinar.

**Request body:**
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "meet_link": "string (optional)",
  "topic": "string (optional)",
  "scheduled_date": "YYYY-MM-DD (required)",
  "scheduled_time": "HH:MM (required, 24hr format)",
  "duration_minutes": "integer (optional, default 60)",
  "max_participants": "integer (optional)"
}
```

**Validation:**
- `title` — required, non-empty
- `scheduled_date` — required, valid date, must be today or future
- `scheduled_time` — required, valid time format HH:MM
- `max_participants` — optional, positive integer if provided
- `duration_minutes` — optional, positive integer if provided

**Logic:**
1. Verify `req.user.role === 'mentor'` → 403 `"Only educators can create webinars"`
2. INSERT into `webinars` with `host_id = req.user.id`

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "title": "Python for Beginners",
    "description": "Intro to Python programming",
    "meet_link": "https://meet.google.com/xyz-abc",
    "topic": "Programming",
    "scheduled_date": "2025-03-01",
    "scheduled_time": "10:00",
    "duration_minutes": 60,
    "max_participants": 50,
    "host_id": 5,
    "created_at": "2025-01-20T10:00:00Z"
  }
}
```

---

### PUT /api/webinars/:id
**Auth required. Mentor (host only).** Update a webinar. All fields optional (partial update).

**Request body (all optional):**
```json
{
  "title": "string",
  "description": "string",
  "meet_link": "string",
  "topic": "string",
  "scheduled_date": "YYYY-MM-DD",
  "scheduled_time": "HH:MM",
  "duration_minutes": "integer",
  "max_participants": "integer"
}
```

**Logic:**
1. Fetch webinar → 404 if not found
2. Verify `webinar.host_id === req.user.id` → 403 `"You can only edit your own webinars"`
3. Build partial UPDATE query — only fields present in body
4. Return updated webinar

**Response 200:** Updated webinar object.

---

### DELETE /api/webinars/:id
**Auth required. Mentor (host only).** Delete a webinar.

**Logic:**
1. Fetch webinar → 404 if not found
2. Verify `webinar.host_id === req.user.id` → 403
3. DELETE FROM `webinars` WHERE `id = :id` (registrations removed by CASCADE)

**Response 200:**
```json
{ "success": true, "data": { "message": "Webinar deleted successfully" } }
```

---

### POST /api/webinars/:id/register
**Auth required.** Register the current user for a webinar.

**Logic:**
1. Fetch webinar → 404 if not found
2. Check `webinar.scheduled_date >= CURRENT_DATE` → 400 `"This webinar has already passed"`
3. If `max_participants` is set:
   ```sql
   SELECT COUNT(*) FROM webinar_registrations WHERE webinar_id = $1
   ```
   If count >= max_participants → 409 `"This webinar is full"`
4. INSERT INTO `webinar_registrations` ON CONFLICT (webinar_id, user_id) DO NOTHING

**Response 200:**
```json
{ "success": true, "data": { "message": "Successfully registered for webinar" } }
```

---

### DELETE /api/webinars/:id/register
**Auth required.** Cancel registration for a webinar.

**Logic:**
1. Fetch webinar → 404 if not found
2. Check `webinar.scheduled_date >= CURRENT_DATE` → 400 `"Cannot cancel registration for a past webinar"`
3. DELETE FROM `webinar_registrations` WHERE `webinar_id = :id AND user_id = req.user.id`
4. If no row deleted → 404 `"You are not registered for this webinar"`

**Response 200:**
```json
{ "success": true, "data": { "message": "Registration cancelled" } }
```

---

## SECTION B: Mentor Request Routes

---

### POST /api/mentor-requests
**Auth required. Student only.** Student submits a request for mentorship on a specific topic.

**Request body:**
```json
{
  "topic": "string (required)",
  "message": "string (optional, student can describe what they need)"
}
```

**Validation:**
- `topic` — required, non-empty string, max 255 chars
- `message` — optional, max 1000 chars

**Logic:**
1. Verify `req.user.role === 'student'` → 403 `"Only students can send mentor requests"`
2. Check student doesn't already have a `pending` request with the same topic → 409 `"You already have a pending request for this topic"`
3. INSERT into `mentor_requests` with `student_id = req.user.id`, `status = 'pending'`

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "student_id": 2,
    "topic": "How to start learning Machine Learning",
    "message": "I have no prior ML experience and want to know where to start.",
    "status": "pending",
    "webinar_id": null,
    "created_at": "2025-01-01T10:00:00Z"
  }
}
```

---

### GET /api/mentor-requests
**Auth required.** Role-based response:
- If `role === 'mentor'` → see ALL pending requests from all students (so any educator can respond)
- If `role === 'student'` → see only their own requests (all statuses)

**Query params:**
- `status` — filter by status: `pending | accepted | rejected` (optional)
- `page` — default 1
- `limit` — default 20

**Logic:**
```javascript
if (req.user.role === 'mentor') {
  // Show all requests, join with student name
  query = `
    SELECT mr.*, u.name AS student_name
    FROM mentor_requests mr
    JOIN users u ON mr.student_id = u.id
    WHERE ($1::text IS NULL OR mr.status = $1)
    ORDER BY mr.created_at DESC
    LIMIT $2 OFFSET $3
  `;
} else {
  // Show only current student's own requests
  query = `
    SELECT mr.*, w.title AS webinar_title, w.scheduled_date, w.meet_link
    FROM mentor_requests mr
    LEFT JOIN webinars w ON mr.webinar_id = w.id
    WHERE mr.student_id = $1
      AND ($2::text IS NULL OR mr.status = $2)
    ORDER BY mr.created_at DESC
    LIMIT $3 OFFSET $4
  `;
}
```

**Response 200 (mentor view):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "topic": "How to start learning Machine Learning",
      "message": "I have no prior ML experience...",
      "status": "pending",
      "student_name": "Darshan",
      "created_at": "2025-01-01T10:00:00Z"
    },
    {
      "id": 2,
      "topic": "Career guidance for software engineering",
      "message": "I'm in 2nd year and confused about which domain to focus on.",
      "status": "pending",
      "student_name": "Athilakshmi",
      "created_at": "2025-01-02T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 8 }
}
```

**Response 200 (student view):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "topic": "How to start learning Machine Learning",
      "message": "I have no prior ML experience...",
      "status": "accepted",
      "webinar_id": 3,
      "webinar_title": "Intro to ML — Mentorship Session",
      "scheduled_date": "2025-01-15",
      "meet_link": "https://meet.google.com/abc-xyz",
      "created_at": "2025-01-01T10:00:00Z"
    }
  ]
}
```

---

### GET /api/mentor-requests/:id
**Auth required.** Get single request details.

**Logic:**
1. Fetch request → 404 if not found
2. If `role === 'student'`: verify `request.student_id === req.user.id` → 403
3. If `role === 'mentor'`: any mentor can view any request
4. Join with student name, and webinar details if `webinar_id` is set

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "topic": "How to start learning Machine Learning",
    "message": "I have no prior ML experience and want to know where to start.",
    "status": "pending",
    "student": { "id": 2, "name": "Darshan", "location": "Coimbatore" },
    "webinar": null,
    "created_at": "2025-01-01T10:00:00Z",
    "updated_at": "2025-01-01T10:00:00Z"
  }
}
```

---

### PATCH /api/mentor-requests/:id/accept
**Auth required. Mentor only.** Accept a request and create a webinar for that topic in one action.

**Request body:**
```json
{
  "title": "string (required — webinar title)",
  "description": "string (optional)",
  "meet_link": "string (optional)",
  "scheduled_date": "YYYY-MM-DD (required)",
  "scheduled_time": "HH:MM (required)",
  "duration_minutes": "integer (optional, default 60)",
  "max_participants": "integer (optional)"
}
```

**Validation:**
- `title` — required
- `scheduled_date` — required, valid future date
- `scheduled_time` — required, valid HH:MM format

**Logic (wrap in a transaction):**
1. Verify `req.user.role === 'mentor'` → 403
2. Fetch request → 404 if not found
3. Verify `request.status === 'pending'` → 400 `"This request has already been handled"`
4. BEGIN transaction:
   a. INSERT into `webinars` with:
      - `host_id = req.user.id`
      - `topic = request.topic` (auto-populate from the request)
      - all fields from request body
   b. UPDATE `mentor_requests` SET `status = 'accepted'`, `webinar_id = newWebinar.id`, `updated_at = NOW()`
5. COMMIT
6. Return both the updated request and the created webinar

**Response 200:**
```json
{
  "success": true,
  "data": {
    "request": {
      "id": 1,
      "topic": "How to start learning Machine Learning",
      "status": "accepted",
      "webinar_id": 3,
      "updated_at": "2025-01-05T10:00:00Z"
    },
    "webinar": {
      "id": 3,
      "title": "Intro to ML — Mentorship Session",
      "description": "A session for students wanting to start ML",
      "meet_link": "https://meet.google.com/abc-xyz",
      "topic": "How to start learning Machine Learning",
      "scheduled_date": "2025-01-15",
      "scheduled_time": "15:00",
      "duration_minutes": 60,
      "host_id": 5,
      "created_at": "2025-01-05T10:00:00Z"
    }
  }
}
```

---

### PATCH /api/mentor-requests/:id/reject
**Auth required. Mentor only.** Reject a pending request.

**Request body:**
```json
{ "reason": "string (optional — feedback to student)" }
```

**Logic:**
1. Verify `req.user.role === 'mentor'` → 403
2. Fetch request → 404 if not found
3. Verify `request.status === 'pending'` → 400 `"This request has already been handled"`
4. UPDATE `mentor_requests` SET `status = 'rejected'`, `updated_at = NOW()`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "rejected",
    "updated_at": "2025-01-05T10:00:00Z"
  }
}
```

---

### DELETE /api/mentor-requests/:id
**Auth required. Student only.** Withdraw a pending request.

**Logic:**
1. Fetch request → 404 if not found
2. Verify `request.student_id === req.user.id` → 403
3. Verify `request.status === 'pending'` → 400 `"Cannot withdraw a request that has already been accepted or rejected"`
4. DELETE FROM `mentor_requests` WHERE `id = :id`

**Response 200:**
```json
{ "success": true, "data": { "message": "Request withdrawn" } }
```

---

## Implementation Notes

1. **The accept route is the most important** — it creates two things atomically. Always use a `pg` client transaction so if the webinar INSERT succeeds but the request UPDATE fails (or vice versa), neither change persists:
   ```javascript
   const client = await pool.connect();
   try {
     await client.query('BEGIN');
     const webinarResult = await client.query(
       `INSERT INTO webinars (title, description, meet_link, topic, host_id, scheduled_date, scheduled_time, duration_minutes, max_participants)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
       [title, description, meet_link, request.topic, req.user.id, scheduled_date, scheduled_time, duration_minutes || 60, max_participants || null]
     );
     const newWebinar = webinarResult.rows[0];
     await client.query(
       `UPDATE mentor_requests SET status = 'accepted', webinar_id = $1, updated_at = NOW() WHERE id = $2`,
       [newWebinar.id, requestId]
     );
     await client.query('COMMIT');
     res.status(200).json({ success: true, data: { request: updatedRequest, webinar: newWebinar } });
   } catch (err) {
     await client.query('ROLLBACK');
     throw err;
   } finally {
     client.release();
   }
   ```

2. **Route order in Express** — declare named routes before parameterized:
   ```javascript
   router.get('/my-registrations', authenticate, myRegistrations);
   router.get('/my-webinars', authenticate, authorize('mentor'), myWebinars);
   router.get('/:id', optionalAuth, getWebinarById); // last
   ```

3. **optionalAuth for GET /api/webinars/:id** — so logged-in users see `isRegistered` but unauthenticated users can still browse:
   ```javascript
   const optionalAuth = (req, res, next) => {
     const header = req.headers.authorization;
     if (!header) return next();
     try {
       const token = header.split(' ')[1];
       req.user = jwt.verify(token, process.env.JWT_SECRET);
     } catch (_) {}
     next();
   };
   ```

4. **Duplicate pending request check:**
   ```sql
   SELECT id FROM mentor_requests
   WHERE student_id = $1 AND topic ILIKE $2 AND status = 'pending'
   LIMIT 1
   ```

5. **Partial update for PUT /api/webinars/:id:**
   ```javascript
   const allowed = ['title', 'description', 'meet_link', 'topic', 'scheduled_date', 'scheduled_time', 'duration_minutes', 'max_participants'];
   const fields = [];
   const values = [];
   let i = 1;
   allowed.forEach(key => {
     if (req.body[key] !== undefined) {
       fields.push(`${key} = $${i++}`);
       values.push(req.body[key]);
     }
   });
   if (fields.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });
   values.push(webinarId);
   await pool.query(`UPDATE webinars SET ${fields.join(', ')} WHERE id = $${i}`, values);
   ```

6. **Error handling** — wrap all controllers:
   ```javascript
   } catch (err) {
     console.error(err);
     res.status(500).json({ success: false, error: 'Internal server error' });
   }
   ```
