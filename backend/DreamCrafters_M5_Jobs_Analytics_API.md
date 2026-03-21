# Dream Crafters — Module 5: Jobs, Feedback & Platform Analytics
## Implementation Prompt

---

## Your Task
Implement the **Jobs, Feedback & Platform Analytics** backend module for the Dream Crafters platform using the stack and spec below. This module covers the job portal, content feedback, periodic surveys, and admin analytics.

---

## Tech Stack
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL using `node-postgres` (`pg` package)
- **Auth**: JWT middleware already implemented in `middleware/auth.js` — import `authenticate` and `authorize` from it. It attaches `req.user = { id, role }`.
- **Validation**: `express-validator` on all POST/PUT/PATCH routes
- **File structure**:
  ```
  routes/jobs.js
  routes/feedback.js
  routes/surveys.js
  routes/analytics.js
  controllers/jobController.js
  controllers/feedbackController.js
  controllers/surveyController.js
  controllers/analyticsController.js
  middleware/auth.js         ← already exists, import from here
  db/index.js                ← already exports a pg Pool instance
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
- `400` — Bad input
- `401` — Not authenticated
- `403` — Forbidden
- `404` — Not found
- `409` — Conflict (duplicate)
- `500` — Internal server error

---

## Database Tables for This Module

### `job_listings`
```sql
CREATE TABLE job_listings (
  id                    SERIAL PRIMARY KEY,
  title                 VARCHAR(255) NOT NULL,
  company               VARCHAR(255) NOT NULL,
  description           TEXT,
  location              VARCHAR(100),
  job_type              VARCHAR(50),
  -- full-time | part-time | internship | freelance
  required_skills       TEXT[],
  salary_range          VARCHAR(100),
  application_deadline  DATE,
  apply_url             TEXT,
  posted_by             INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMP DEFAULT NOW()
);
```

### `job_applications`
```sql
CREATE TABLE job_applications (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id        INTEGER NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  status        VARCHAR(50) DEFAULT 'applied',
  -- applied | shortlisted | rejected | hired
  resume_url    TEXT,
  cover_letter  TEXT,
  applied_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);
```

### `content_feedback`
```sql
CREATE TABLE content_feedback (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id  INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  rating      INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, content_id)
);
```

### `surveys`
```sql
CREATE TABLE surveys (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### `survey_questions`
```sql
CREATE TABLE survey_questions (
  id           SERIAL PRIMARY KEY,
  survey_id    INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  question     TEXT NOT NULL,
  type         VARCHAR(50) NOT NULL,
  -- mcq | text | rating | checkbox
  options      JSONB,   -- array of option strings for mcq/checkbox
  order_index  INTEGER DEFAULT 0
);
```

### `survey_responses`
```sql
CREATE TABLE survey_responses (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id  INTEGER NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  response     TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, question_id)
);
```

### `platform_events`
```sql
CREATE TABLE platform_events (
  id          BIGSERIAL PRIMARY KEY,
  event_type  VARCHAR(100) NOT NULL,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  metadata    JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_platform_events_created_at ON platform_events(created_at);
CREATE INDEX idx_platform_events_event_type ON platform_events(event_type);
CREATE INDEX idx_platform_events_user_id ON platform_events(user_id);
```

---

## Routes to Implement

### `routes/jobs.js`
```
GET    /api/jobs                              → List jobs with filters (public)
GET    /api/jobs/recommended                  → Jobs matched to user (auth required)
GET    /api/jobs/my-applications              → User's applications (auth required)
GET    /api/jobs/:id                          → Single job listing (public)
POST   /api/jobs                              → Create job listing (admin only)
PUT    /api/jobs/:id                          → Update job listing (admin only)
DELETE /api/jobs/:id                          → Delete job listing (admin only)
POST   /api/jobs/:id/apply                    → Apply for a job (auth required)
PATCH  /api/jobs/applications/:id/status      → Update application status (admin only)
```

> **IMPORTANT:** Register `/api/jobs/recommended` and `/api/jobs/my-applications` BEFORE `/api/jobs/:id` to prevent Express treating them as `:id` params.

### `routes/feedback.js`
```
POST   /api/feedback/content/:id              → Submit content feedback (auth required)
GET    /api/feedback/content/:id              → Get aggregated feedback (public)
PUT    /api/feedback/content/:id              → Update own feedback (auth required)
DELETE /api/feedback/content/:id              → Delete own feedback (auth required)
```

### `routes/surveys.js`
```
GET    /api/surveys                           → List active surveys (auth required)
GET    /api/surveys/:id                       → Survey with questions (auth required)
POST   /api/surveys/:id/respond               → Submit survey answers (auth required)
GET    /api/surveys/:id/my-response           → Get own response (auth required)
POST   /api/surveys                           → Create survey (admin only)
PUT    /api/surveys/:id                       → Update survey (admin only)
DELETE /api/surveys/:id                       → Delete survey (admin only)
```

### `routes/analytics.js`
```
POST   /api/analytics/event                   → Log a platform event (auth required)
GET    /api/analytics/dashboard               → Summary metrics (admin only)
GET    /api/analytics/users/:id               → User engagement (admin only)
GET    /api/analytics/content                 → Content performance (admin only)
GET    /api/analytics/survey/:id/results      → Survey results (admin only)
```

---

## Detailed Route Specifications

---

## SECTION A: Jobs Routes

---

### GET /api/jobs
**Public.** List active job listings with filters and pagination.

**Query params:**
- `type` — full-time | part-time | internship | freelance
- `location` — partial match (ILIKE)
- `skills` — comma-separated skills to filter by (e.g. `?skills=Python,SQL`)
- `search` — partial match on title or company
- `page` — default 1
- `limit` — default 20, max 100

**Logic:**
1. Default: only return `is_active = true` listings
2. For `skills` filter: `WHERE required_skills && $1::text[]` (PostgreSQL array overlap operator)
3. ORDER BY `created_at DESC`
4. Use window function for total count

**SQL pattern for skills filter:**
```sql
AND ($1::text[] IS NULL OR required_skills && $1::text[])
```

Pass skills as: `skills ? skills.split(',') : null`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Junior ML Engineer",
      "company": "TechCorp",
      "location": "Remote",
      "job_type": "full-time",
      "required_skills": ["Python", "TensorFlow", "SQL"],
      "salary_range": "₹4–6 LPA",
      "application_deadline": "2025-03-01",
      "is_active": true,
      "created_at": "2025-01-01T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 42 }
}
```

---

### GET /api/jobs/recommended
**Auth required.** Must be registered BEFORE `GET /api/jobs/:id`.

Return job listings matched to the current user's skills and interests.

**Logic:**
1. Fetch user's `user_interests` as interest array
2. Fetch user's `personalization_profiles.ai_scores` for any skill data (if exists)
3. SELECT jobs WHERE `required_skills && interests_array::text[]` (overlap)
4. Also match jobs WHERE `job_type = 'internship'` for students (if `req.user.role === 'student'`)
5. Exclude jobs the user has already applied to
6. ORDER BY overlap count descending (more skill matches = higher rank), LIMIT 10

**SQL:**
```sql
SELECT j.*,
  CARDINALITY(j.required_skills & $1::text[]) AS match_count
FROM job_listings j
WHERE j.is_active = true
  AND j.id NOT IN (
    SELECT job_id FROM job_applications WHERE user_id = $2
  )
  AND (
    j.required_skills && $1::text[]
    OR ($3 = 'student' AND j.job_type = 'internship')
  )
ORDER BY match_count DESC, j.created_at DESC
LIMIT 10
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "title": "Python Internship",
      "company": "DataCo",
      "job_type": "internship",
      "required_skills": ["Python", "pandas"],
      "match_count": 2,
      "match_reason": "Matches 2 of your skills"
    }
  ]
}
```

---

### GET /api/jobs/my-applications
**Auth required.** Must be registered BEFORE `GET /api/jobs/:id`.

Get the current user's job applications with job details.

**Logic:**
```sql
SELECT
  ja.id AS application_id,
  ja.status,
  ja.resume_url,
  ja.applied_at,
  j.id AS job_id,
  j.title,
  j.company,
  j.job_type,
  j.location
FROM job_applications ja
JOIN job_listings j ON ja.job_id = j.id
WHERE ja.user_id = $1
ORDER BY ja.applied_at DESC
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "application_id": 1,
      "status": "applied",
      "applied_at": "2025-01-10T10:00:00Z",
      "resume_url": "https://...",
      "job": {
        "id": 3,
        "title": "Junior Developer",
        "company": "TCS",
        "job_type": "full-time",
        "location": "Chennai"
      }
    }
  ]
}
```

---

### GET /api/jobs/:id
**Public.** Get full details of one job listing.

**Logic:**
1. SELECT job WHERE `id = :id` → 404 if not found
2. If authenticated, also check `job_applications` to include `hasApplied: true/false`
3. Check if deadline has passed: `is_expired = application_deadline < TODAY`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Junior ML Engineer",
    "company": "TechCorp",
    "description": "We are looking for a junior ML engineer...",
    "location": "Remote",
    "job_type": "full-time",
    "required_skills": ["Python", "TensorFlow", "SQL"],
    "salary_range": "₹4–6 LPA",
    "application_deadline": "2025-03-01",
    "apply_url": "https://techcorp.com/careers/apply",
    "is_active": true,
    "is_expired": false,
    "hasApplied": false,
    "created_at": "2025-01-01T10:00:00Z"
  }
}
```

---

### POST /api/jobs
**Auth required. Admin only.** Create a new job listing.

**Request body:**
```json
{
  "title": "string (required)",
  "company": "string (required)",
  "description": "string (optional)",
  "location": "string (optional)",
  "job_type": "full-time | part-time | internship | freelance (optional)",
  "required_skills": ["Python", "SQL"],
  "salary_range": "string (optional)",
  "application_deadline": "YYYY-MM-DD (optional)",
  "apply_url": "string (optional)"
}
```

**Validation:**
- `title` — required, non-empty
- `company` — required, non-empty
- `job_type` — optional, must be one of the allowed values if provided
- `application_deadline` — optional, valid date if provided
- `required_skills` — optional, must be array if provided

**Logic:** Verify admin. INSERT with `posted_by = req.user.id`. Return created listing.

**Response 201:** Created job listing object.

---

### PUT /api/jobs/:id
**Auth required. Admin only.** Update any field of a job listing (partial update).

**Request body (all optional):**
```json
{
  "title": "string",
  "company": "string",
  "description": "string",
  "location": "string",
  "job_type": "full-time | part-time | internship | freelance",
  "required_skills": ["skill1", "skill2"],
  "salary_range": "string",
  "application_deadline": "YYYY-MM-DD",
  "apply_url": "string",
  "is_active": "boolean"
}
```

**Logic:** Check exists → 404. Build partial UPDATE. Return updated row.

**Response 200:** Updated job listing object.

---

### DELETE /api/jobs/:id
**Auth required. Admin only.**

**Logic:** Check exists → 404. DELETE (applications removed by CASCADE).

**Response 200:**
```json
{ "success": true, "data": { "message": "Job listing deleted" } }
```

---

### POST /api/jobs/:id/apply
**Auth required.** Apply for a job listing.

**Request body:**
```json
{
  "resume_url": "string (required)",
  "cover_letter": "string (optional)"
}
```

**Validation:**
- `resume_url` — required, valid URL format

**Logic:**
1. Fetch job → 404 if not found
2. Check `job.is_active = true` → 400 `"This job listing is no longer active"`
3. Check deadline: if `application_deadline` is set and `< TODAY` → 400 `"Application deadline has passed"`
4. Check user hasn't already applied → 409 `"You have already applied for this job"`
5. INSERT into `job_applications` with `user_id = req.user.id`
6. Log a platform event: `event_type = 'job_apply'`, metadata `{ job_id, company }`

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "job_id": 3,
    "status": "applied",
    "resume_url": "https://...",
    "applied_at": "2025-01-10T10:00:00Z"
  }
}
```

---

### PATCH /api/jobs/applications/:id/status
**Auth required. Admin only.** Update application status.

**Request body:**
```json
{ "status": "applied | shortlisted | rejected | hired (required)" }
```

**Validation:**
- `status` — required, must be one of the allowed values

**Logic:**
1. Fetch application → 404 if not found
2. Verify admin → 403
3. UPDATE `job_applications` SET `status = $1` WHERE `id = :id`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "application_id": 1,
    "status": "shortlisted",
    "user_id": 2,
    "job_id": 3
  }
}
```

---

## SECTION B: Feedback Routes

---

### POST /api/feedback/content/:id
**Auth required.** Submit feedback for a content item.

**Request body:**
```json
{
  "rating": "integer 1-5 (required)",
  "comment": "string (optional)"
}
```

**Validation:**
- `rating` — required, integer between 1 and 5

**Logic:**
1. Verify content exists (SELECT from `content` WHERE `id = :id`) → 404
2. INSERT into `content_feedback` with `user_id = req.user.id`
3. ON CONFLICT (user_id, content_id) → 409 `"You have already submitted feedback. Use PUT to update it."`

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "content_id": 5,
    "rating": 4,
    "comment": "Very helpful and well explained",
    "created_at": "2025-01-10T10:00:00Z"
  }
}
```

---

### GET /api/feedback/content/:id
**Public.** Get aggregated feedback for a content item.

**Logic:**
```sql
SELECT
  ROUND(AVG(rating), 1) AS avg_rating,
  COUNT(*) AS total_reviews,
  COUNT(*) FILTER (WHERE rating = 5) AS five_star,
  COUNT(*) FILTER (WHERE rating = 4) AS four_star,
  COUNT(*) FILTER (WHERE rating = 3) AS three_star,
  COUNT(*) FILTER (WHERE rating = 2) AS two_star,
  COUNT(*) FILTER (WHERE rating = 1) AS one_star
FROM content_feedback
WHERE content_id = $1
```

Fetch recent comments separately (last 10):
```sql
SELECT cf.rating, cf.comment, u.name AS reviewer_name, cf.created_at
FROM content_feedback cf
JOIN users u ON cf.user_id = u.id
WHERE cf.content_id = $1 AND cf.comment IS NOT NULL
ORDER BY cf.created_at DESC
LIMIT 10
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "avg_rating": 4.3,
    "total_reviews": 47,
    "distribution": {
      "5": 20, "4": 15, "3": 8, "2": 3, "1": 1
    },
    "recent_comments": [
      {
        "rating": 5,
        "comment": "Very helpful!",
        "reviewer_name": "Darshan",
        "created_at": "2025-01-10T10:00:00Z"
      }
    ]
  }
}
```

---

### PUT /api/feedback/content/:id
**Auth required.** Update own existing feedback for a content item.

**Request body (all optional):**
```json
{
  "rating": "integer 1-5",
  "comment": "string"
}
```

**Logic:**
1. Find existing feedback WHERE `content_id = :id` AND `user_id = req.user.id` → 404 `"No feedback found. Submit feedback first."`
2. Build partial UPDATE
3. Return updated feedback

**Response 200:** Updated feedback object.

---

### DELETE /api/feedback/content/:id
**Auth required.** Delete own feedback for a content item.

**Logic:**
```sql
DELETE FROM content_feedback WHERE content_id = $1 AND user_id = $2
```

If no row deleted → 404 `"No feedback found for this content."`

**Response 200:**
```json
{ "success": true, "data": { "message": "Feedback deleted" } }
```

---

## SECTION C: Survey Routes

---

### GET /api/surveys
**Auth required.** List active surveys available to the current user.

**Logic:**
1. SELECT surveys WHERE `is_active = true`
2. Filter by date window: `(start_date IS NULL OR start_date <= TODAY) AND (end_date IS NULL OR end_date >= TODAY)`
3. For each survey, also check if the current user has already responded (subquery on `survey_responses` joined via `survey_questions`)
4. Include `has_responded: true/false` in each result

**SQL to check if user responded:**
```sql
SELECT EXISTS (
  SELECT 1 FROM survey_responses sr
  JOIN survey_questions sq ON sr.question_id = sq.id
  WHERE sq.survey_id = $1 AND sr.user_id = $2
) AS has_responded
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Term 1 Feedback Survey",
      "description": "Help us improve the platform",
      "end_date": "2025-02-28",
      "has_responded": false
    }
  ]
}
```

---

### GET /api/surveys/:id
**Auth required.** Get a survey with all its questions in order.

**Logic:**
```sql
SELECT sq.*, s.title AS survey_title, s.description AS survey_description
FROM survey_questions sq
JOIN surveys s ON sq.survey_id = s.id
WHERE sq.survey_id = $1
ORDER BY sq.order_index ASC
```

→ 404 if survey doesn't exist. Group questions under the survey in JavaScript.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Term 1 Feedback Survey",
    "description": "Help us improve the platform",
    "start_date": "2025-01-01",
    "end_date": "2025-02-28",
    "questions": [
      {
        "id": 1,
        "question": "How would you rate your overall experience?",
        "type": "rating",
        "options": null,
        "order_index": 1
      },
      {
        "id": 2,
        "question": "Which topics interest you most?",
        "type": "mcq",
        "options": ["AI & ML", "Web Development", "Data Science", "Design"],
        "order_index": 2
      },
      {
        "id": 3,
        "question": "Any other feedback?",
        "type": "text",
        "options": null,
        "order_index": 3
      }
    ]
  }
}
```

---

### POST /api/surveys/:id/respond
**Auth required.** Submit all answers for a survey in one request.

**Request body:**
```json
{
  "responses": [
    { "question_id": 1, "response": "5" },
    { "question_id": 2, "response": "AI & ML" },
    { "question_id": 3, "response": "Great platform, keep it up!" }
  ]
}
```

**Validation:**
- `responses` — required, non-empty array
- Each item must have `question_id` (integer) and `response` (string)

**Logic:**
1. Verify survey exists and is active → 404 / 400
2. Check user hasn't already responded to this survey:
   ```sql
   SELECT EXISTS (
     SELECT 1 FROM survey_responses sr
     JOIN survey_questions sq ON sr.question_id = sq.id
     WHERE sq.survey_id = $1 AND sr.user_id = $2
   )
   ```
   → 409 `"You have already responded to this survey"` if true
3. Verify all `question_id`s belong to this survey → 400 if any don't
4. Bulk INSERT into `survey_responses` inside a transaction:
   ```javascript
   const client = await pool.connect();
   await client.query('BEGIN');
   for (const r of responses) {
     await client.query(
       'INSERT INTO survey_responses (user_id, question_id, response) VALUES ($1, $2, $3)',
       [req.user.id, r.question_id, r.response]
     );
   }
   await client.query('COMMIT');
   ```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "message": "Survey submitted successfully",
    "responses_saved": 3
  }
}
```

---

### GET /api/surveys/:id/my-response
**Auth required.** Get the current user's responses for a specific survey.

**Logic:**
```sql
SELECT sq.question, sq.type, sq.order_index, sr.response, sr.submitted_at
FROM survey_responses sr
JOIN survey_questions sq ON sr.question_id = sq.id
WHERE sq.survey_id = $1 AND sr.user_id = $2
ORDER BY sq.order_index ASC
```

→ Return empty array if user hasn't responded yet (not 404).

**Response 200:**
```json
{
  "success": true,
  "data": {
    "survey_id": 1,
    "submitted_at": "2025-01-15T10:00:00Z",
    "responses": [
      { "question": "Rate your experience", "type": "rating", "response": "5", "order_index": 1 },
      { "question": "Which topic?", "type": "mcq", "response": "AI & ML", "order_index": 2 }
    ]
  }
}
```

---

### POST /api/surveys
**Auth required. Admin only.** Create a survey with questions in one request.

**Request body:**
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "start_date": "YYYY-MM-DD (optional)",
  "end_date": "YYYY-MM-DD (optional)",
  "questions": [
    {
      "question": "string (required)",
      "type": "mcq | text | rating | checkbox (required)",
      "options": ["option1", "option2"],
      "order_index": 1
    }
  ]
}
```

**Validation:**
- `title` — required
- `questions` — required, non-empty array
- Each question: `question` required, `type` required and one of the allowed values
- `options` — required if `type` is `mcq` or `checkbox`

**Logic:**
1. Verify admin → 403
2. INSERT survey in a transaction
3. Bulk INSERT all questions with `survey_id` from the created survey

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Term 2 Feedback Survey",
    "is_active": true,
    "questions_created": 5
  }
}
```

---

### PUT /api/surveys/:id
**Auth required. Admin only.** Update survey metadata (not questions — manage questions separately if needed).

**Request body (all optional):**
```json
{
  "title": "string",
  "description": "string",
  "is_active": "boolean",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD"
}
```

**Response 200:** Updated survey object.

---

### DELETE /api/surveys/:id
**Auth required. Admin only.** Delete survey (questions and responses CASCADE).

**Response 200:**
```json
{ "success": true, "data": { "message": "Survey deleted" } }
```

---

## SECTION D: Analytics Routes

---

### POST /api/analytics/event
**Auth required.** Log a platform event from the frontend. Should respond quickly.

**Request body:**
```json
{
  "event_type": "string (required)",
  "metadata": "object (optional)"
}
```

**Allowed event types (validate against this list):**
`login`, `logout`, `content_view`, `content_complete`, `job_apply`, `webinar_register`, `session_complete`, `study_plan_generate`, `quiz_complete`, `bookmark_add`, `search`, `profile_update`

**Logic:**
1. Validate `event_type` is in allowed list → 400 if not
2. INSERT into `platform_events` with `user_id = req.user.id`
3. Do NOT await anything else — respond immediately

**Response 200:**
```json
{ "success": true }
```

---

### GET /api/analytics/dashboard
**Auth required. Admin only.** Aggregated platform metrics for a date range.

**Query params:**
- `from` — YYYY-MM-DD, default: 30 days ago
- `to` — YYYY-MM-DD, default: today

**Logic — run these queries in parallel using `Promise.all`:**

```javascript
const [
  userStats,
  contentStats,
  jobStats,
  eventBreakdown,
  topContent
] = await Promise.all([
  // Total users + new signups in range
  pool.query(`
    SELECT
      COUNT(*) AS total_users,
      COUNT(*) FILTER (WHERE created_at BETWEEN $1 AND $2) AS new_signups
    FROM users
  `, [from, to]),

  // Content views and completions in range
  pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'content_view') AS content_views,
      COUNT(*) FILTER (WHERE event_type = 'content_complete') AS content_completions
    FROM platform_events
    WHERE created_at BETWEEN $1 AND $2
  `, [from, to]),

  // Job applications in range
  pool.query(`
    SELECT COUNT(*) AS job_applications
    FROM job_applications
    WHERE applied_at BETWEEN $1 AND $2
  `, [from, to]),

  // Daily Active Users (distinct users with any event per day)
  pool.query(`
    SELECT COUNT(DISTINCT user_id) AS daily_active_users
    FROM platform_events
    WHERE created_at >= NOW() - INTERVAL '1 day'
  `),

  // Top 5 most-viewed content items
  pool.query(`
    SELECT
      (metadata->>'content_id')::int AS content_id,
      c.title,
      COUNT(*) AS views
    FROM platform_events pe
    JOIN content c ON (pe.metadata->>'content_id')::int = c.id
    WHERE pe.event_type = 'content_view'
      AND pe.created_at BETWEEN $1 AND $2
    GROUP BY content_id, c.title
    ORDER BY views DESC
    LIMIT 5
  `, [from, to])
]);
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "date_range": { "from": "2025-01-01", "to": "2025-01-31" },
    "total_users": 1234,
    "new_signups": 87,
    "daily_active_users": 342,
    "content_views": 4521,
    "content_completions": 1203,
    "job_applications": 78,
    "top_content": [
      { "content_id": 3, "title": "Intro to ML", "views": 234 },
      { "content_id": 7, "title": "Python Basics", "views": 189 }
    ]
  }
}
```

---

### GET /api/analytics/users/:id
**Auth required. Admin only.** Individual user engagement timeline.

**Logic:**
```sql
SELECT
  event_type,
  metadata,
  created_at,
  DATE(created_at) AS date
FROM platform_events
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 100
```

Also fetch user basic info and compute summary stats.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": { "id": 2, "name": "Darshan", "role": "student", "created_at": "2025-01-01" },
    "summary": {
      "total_events": 48,
      "content_views": 22,
      "content_completions": 8,
      "logins": 15,
      "last_active": "2025-01-15T10:00:00Z"
    },
    "events": [
      {
        "event_type": "content_view",
        "metadata": { "content_id": 5 },
        "created_at": "2025-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

### GET /api/analytics/content
**Auth required. Admin only.** Content performance report.

**Logic:**
```sql
SELECT
  c.id,
  c.title,
  c.type,
  c.difficulty,
  COUNT(DISTINCT ucp.user_id) AS total_started,
  COUNT(DISTINCT ucp.user_id) FILTER (WHERE ucp.status = 'completed') AS total_completed,
  ROUND(
    COUNT(DISTINCT ucp.user_id) FILTER (WHERE ucp.status = 'completed')::numeric /
    NULLIF(COUNT(DISTINCT ucp.user_id), 0) * 100, 1
  ) AS completion_rate_percent,
  ROUND(AVG(cf.rating), 1) AS avg_rating,
  COUNT(cf.id) AS total_reviews
FROM content c
LEFT JOIN user_content_progress ucp ON c.id = ucp.content_id
LEFT JOIN content_feedback cf ON c.id = cf.content_id
GROUP BY c.id
ORDER BY total_started DESC
```

**Query params:** `page`, `limit` (default 20)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "title": "Intro to ML",
      "type": "video",
      "difficulty": "beginner",
      "total_started": 234,
      "total_completed": 180,
      "completion_rate_percent": 76.9,
      "avg_rating": 4.5,
      "total_reviews": 87
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45 }
}
```

---

### GET /api/analytics/survey/:id/results
**Auth required. Admin only.** Aggregated results for a specific survey.

**Logic:**
1. Fetch survey → 404 if not found
2. Fetch all questions for the survey
3. For each question, aggregate responses differently based on `type`:

```javascript
for (const question of questions) {
  const responses = await pool.query(
    'SELECT response FROM survey_responses WHERE question_id = $1',
    [question.id]
  );

  if (question.type === 'rating') {
    // Compute avg and distribution 1-5
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    responses.rows.forEach(r => {
      const val = parseInt(r.response);
      if (distribution[val] !== undefined) distribution[val]++;
      sum += val;
    });
    question.result = {
      avg: (sum / responses.rows.length).toFixed(1),
      distribution
    };
  } else if (question.type === 'mcq' || question.type === 'checkbox') {
    // Count occurrences of each option
    const distribution = {};
    responses.rows.forEach(r => {
      distribution[r.response] = (distribution[r.response] || 0) + 1;
    });
    question.result = { distribution };
  } else if (question.type === 'text') {
    // Return all text responses (up to 50)
    question.result = { responses: responses.rows.map(r => r.response).slice(0, 50) };
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "survey_id": 1,
    "title": "Term 1 Feedback Survey",
    "total_respondents": 152,
    "questions": [
      {
        "id": 1,
        "question": "Rate your overall experience",
        "type": "rating",
        "result": {
          "avg": "4.2",
          "distribution": { "1": 2, "2": 10, "3": 30, "4": 50, "5": 60 }
        }
      },
      {
        "id": 2,
        "question": "Which topic interests you?",
        "type": "mcq",
        "result": {
          "distribution": { "AI & ML": 80, "Web Development": 42, "Data Science": 30 }
        }
      },
      {
        "id": 3,
        "question": "Any other feedback?",
        "type": "text",
        "result": {
          "responses": ["Great platform!", "More Tamil content please", "Love the study planner"]
        }
      }
    ]
  }
}
```

---

## Implementation Notes

1. **Route order** — register specific named routes before parameterized ones:
   ```javascript
   router.get('/recommended', authenticate, recommendedJobs);
   router.get('/my-applications', authenticate, myApplications);
   router.get('/:id', getJobById);  // must come LAST
   ```

2. **PostgreSQL array overlap** — to filter jobs by skills:
   ```javascript
   // Convert comma-separated query param to array
   const skillsArray = req.query.skills ? req.query.skills.split(',').map(s => s.trim()) : null;
   // In SQL: WHERE required_skills && $1::text[]
   // Pass: skillsArray (node-postgres will serialize JS array to Postgres array)
   ```

3. **Deadline check in application:**
   ```javascript
   const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
   if (job.application_deadline && job.application_deadline < today) {
     return res.status(400).json({ success: false, error: 'Application deadline has passed' });
   }
   ```

4. **Survey transaction** — always use a client transaction for bulk survey response inserts so partial submissions don't corrupt data (see POST /api/surveys/:id/respond logic above).

5. **Analytics with Promise.all** — the dashboard runs 5 queries in parallel. Use `Promise.all` to avoid sequential waterfall:
   ```javascript
   const [result1, result2, result3] = await Promise.all([
     pool.query(query1, params1),
     pool.query(query2, params2),
     pool.query(query3, params3)
   ]);
   ```

6. **Date range defaults** for analytics:
   ```javascript
   const to   = req.query.to   || new Date().toISOString().split('T')[0];
   const from = req.query.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
   ```

7. **Platform event logging from other controllers** — when a user applies to a job (Module 5 itself) or completes a session, call a shared utility function to log the event so you don't have to import the full analytics controller:
   ```javascript
   // utils/logEvent.js
   const logEvent = async (pool, userId, eventType, metadata = {}) => {
     try {
       await pool.query(
         'INSERT INTO platform_events (user_id, event_type, metadata) VALUES ($1, $2, $3)',
         [userId, eventType, JSON.stringify(metadata)]
       );
     } catch (_) { /* never let analytics block main flow */ }
   };
   module.exports = logEvent;
   ```

8. **Express validator examples:**
   ```javascript
   // For POST /api/jobs
   body('title').notEmpty().withMessage('Title is required'),
   body('company').notEmpty().withMessage('Company is required'),
   body('job_type').optional().isIn(['full-time', 'part-time', 'internship', 'freelance']),
   body('required_skills').optional().isArray().withMessage('required_skills must be an array'),

   // For POST /api/analytics/event
   body('event_type').isIn([
     'login', 'logout', 'content_view', 'content_complete', 'job_apply',
     'webinar_register', 'session_complete', 'study_plan_generate',
     'quiz_complete', 'bookmark_add', 'search', 'profile_update'
   ]).withMessage('Invalid event type'),
   ```

9. **Error handling** — wrap all controllers:
   ```javascript
   } catch (err) {
     console.error(err);
     res.status(500).json({ success: false, error: 'Internal server error' });
   }
   ```
