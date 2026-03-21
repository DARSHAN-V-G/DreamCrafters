# Dream Crafters — Module 4: Chatbot & Guidance Engine
## Implementation Prompt

---

## Your Task
Implement the **Chatbot & Guidance Engine** backend module for the Dream Crafters platform using the stack and spec below. This module handles the AI chatbot conversations and the human mentor session workflow.

---

## Tech Stack
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL using `node-postgres` (`pg` package)
- **Auth**: JWT middleware already implemented in `middleware/auth.js` — import `authenticate` and `authorize` from it. It attaches `req.user = { id, role }`.
- **Validation**: `express-validator` on all POST/PUT/PATCH routes
- **File structure**:
  ```
  routes/chatbot.js
  routes/mentorship.js
  controllers/chatbotController.js
  controllers/mentorshipController.js
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

**HTTP status codes:**
- `200` — OK
- `201` — Created
- `400` — Bad input
- `401` — Not authenticated
- `403` — Forbidden (wrong role or not a participant)
- `404` — Not found
- `409` — Conflict
- `500` — Internal server error

---

## Database Tables for This Module

### `chat_sessions`
```sql
CREATE TABLE chat_sessions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_type  VARCHAR(50) DEFAULT 'general',  -- general | career | study | navigation
  started_at    TIMESTAMP DEFAULT NOW(),
  ended_at      TIMESTAMP,                       -- NULL means session is still active
  context       JSONB                            -- persistent AI context state
);
```

### `chat_messages`
```sql
CREATE TABLE chat_messages (
  id          SERIAL PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL,    -- user | bot
  message     TEXT NOT NULL,
  metadata    JSONB,                   -- { intent, confidence, quick_replies[] }
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### `mentor_sessions`
```sql
CREATE TABLE mentor_sessions (
  id                SERIAL PRIMARY KEY,
  mentor_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status            VARCHAR(20) DEFAULT 'requested',
  -- requested | accepted | rejected | completed | cancelled
  scheduled_at      TIMESTAMP,           -- set when mentor accepts
  duration_minutes  INTEGER DEFAULT 60,
  topic             VARCHAR(255),
  meet_link         TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);
```

### `mentor_feedback`
```sql
CREATE TABLE mentor_feedback (
  id            SERIAL PRIMARY KEY,
  session_id    INTEGER NOT NULL REFERENCES mentor_sessions(id) ON DELETE CASCADE,
  from_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating        INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE (session_id, from_user_id)
);
```

---

## Routes to Implement

### `routes/chatbot.js`
```
POST   /api/chat/sessions                        → Start a new chat session
GET    /api/chat/sessions                        → List user's past sessions
GET    /api/chat/sessions/:id/messages           → Get messages in a session
POST   /api/chat/sessions/:id/messages           → Send message, get bot reply
PATCH  /api/chat/sessions/:id/end                → End a session
DELETE /api/chat/sessions/:id                    → Delete session + messages
```

All chatbot routes require `authenticate`.

### `routes/mentorship.js`
```
GET    /api/mentors                              → List mentors (public)
GET    /api/mentors/:id                          → Mentor profile + stats (public)
POST   /api/mentor-sessions                      → Request a session (student)
GET    /api/mentor-sessions                      → List sessions (student sees own, mentor sees assigned)
GET    /api/mentor-sessions/:id                  → Session details
PATCH  /api/mentor-sessions/:id/accept           → Mentor accepts
PATCH  /api/mentor-sessions/:id/reject           → Mentor rejects
PATCH  /api/mentor-sessions/:id/complete         → Mark completed
PATCH  /api/mentor-sessions/:id/cancel           → Cancel (student or mentor)
POST   /api/mentor-sessions/:id/feedback         → Submit feedback after session
GET    /api/mentor-sessions/:id/feedback         → Get feedback for a session
```

Mentorship routes: `GET /api/mentors` and `GET /api/mentors/:id` are public. All others require `authenticate`.

---

## Detailed Route Specifications

---

## SECTION A: Chatbot Routes

---

### POST /api/chat/sessions
**Auth required.** Start a new chat session.

**Request body:**
```json
{ "session_type": "general | career | study | navigation (default: general)" }
```

**Validation:**
- `session_type` — optional, must be one of: general, career, study, navigation

**Logic:**
1. INSERT into `chat_sessions` with `user_id = req.user.id`
2. Return created session

**Response 201:**
```json
{
  "success": true,
  "data": {
    "session_id": 12,
    "session_type": "general",
    "started_at": "2025-01-01T10:00:00Z",
    "ended_at": null
  }
}
```

---

### GET /api/chat/sessions
**Auth required.** List all chat sessions for the current user.

**Logic:**
```sql
SELECT
  cs.*,
  COUNT(cm.id) AS message_count,
  MAX(cm.created_at) AS last_message_at,
  (
    SELECT message FROM chat_messages
    WHERE session_id = cs.id
    ORDER BY created_at DESC LIMIT 1
  ) AS last_message_preview
FROM chat_sessions cs
LEFT JOIN chat_messages cm ON cs.id = cm.session_id
WHERE cs.user_id = $1
GROUP BY cs.id
ORDER BY cs.started_at DESC
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "session_id": 12,
      "session_type": "career",
      "started_at": "2025-01-01T10:00:00Z",
      "ended_at": "2025-01-01T10:20:00Z",
      "message_count": 6,
      "last_message_preview": "You might enjoy a career in Software Engineering..."
    }
  ]
}
```

---

### GET /api/chat/sessions/:id/messages
**Auth required.** Get all messages in a session, oldest first.

**Logic:**
1. Verify session exists AND `session.user_id = req.user.id` → 404 if not found, 403 if not owner
2. SELECT all messages WHERE `session_id = :id` ORDER BY `created_at ASC`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "role": "user",
      "message": "What career should I choose?",
      "metadata": null,
      "created_at": "2025-01-01T10:00:00Z"
    },
    {
      "id": 2,
      "role": "bot",
      "message": "Based on your interests in technology, here are some great career paths for you...",
      "metadata": {
        "intent": "career_guidance",
        "confidence": 0.91,
        "quick_replies": ["Show tech careers", "Tell me about engineering", "What skills do I need?"]
      },
      "created_at": "2025-01-01T10:00:02Z"
    }
  ]
}
```

---

### POST /api/chat/sessions/:id/messages
**Auth required.** Send a user message and receive a bot reply.

**Request body:**
```json
{ "message": "string (required)" }
```

**Validation:**
- `message` — required, non-empty string, max 1000 characters

**Logic:**
1. Verify session exists AND `session.user_id = req.user.id` → 404/403
2. Check `session.ended_at IS NULL` → 400 `"This session has ended. Start a new session."` if already ended
3. INSERT user message into `chat_messages` with `role = 'user'`
4. Fetch the last 10 messages from this session for context
5. Detect intent from the message (see Intent Detection below)
6. Generate a bot reply based on intent + session_type + user profile (see Bot Reply Logic below)
7. INSERT bot reply into `chat_messages` with `role = 'bot'` and metadata
8. Update `chat_sessions.context` JSONB with latest detected intent and topic

**Intent Detection (implement as a function `detectIntent(message)`):**
```javascript
const intents = {
  career_guidance: ['career', 'job', 'profession', 'future', 'work', 'field', 'path'],
  study_help: ['study', 'learn', 'course', 'content', 'video', 'material', 'topic'],
  navigation: ['where', 'how to', 'find', 'go to', 'show me', 'navigate', 'page'],
  greeting: ['hi', 'hello', 'hey', 'good morning', 'good evening', 'namaste'],
  motivation: ['sad', 'stressed', 'tired', 'can\'t', 'difficult', 'hard', 'help me'],
  mentorship: ['mentor', 'guidance', 'expert', 'talk to', 'session', 'connect'],
  webinar: ['webinar', 'workshop', 'event', 'session', 'join', 'attend'],
  fallback: []
};

function detectIntent(message) {
  const lower = message.toLowerCase();
  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return { intent, confidence: 0.85 };
    }
  }
  return { intent: 'fallback', confidence: 0.5 };
}
```

**Bot Reply Logic (implement as a function `generateBotReply(intent, sessionType, userMessage, context)`):**

The bot reply is generated based on intent. Fetch relevant data from DB where needed:

| Intent | Bot Action | Quick Replies |
|---|---|---|
| `greeting` | Return a welcome message mentioning the platform features | ["Explore careers", "Find content", "Talk to a mentor"] |
| `career_guidance` | Query `career_paths` table, return top 3 matching the user's interests | ["Tell me more", "Show content for this", "Find a mentor"] |
| `study_help` | Query `content` table filtered by user interests, return top 3 | ["Bookmark this", "Track my progress", "Find more"] |
| `navigation` | Return guidance on how to navigate to the relevant platform section | ["Go to dashboard", "Open study planner", "View webinars"] |
| `motivation` | Return an encouraging message with a tip to use the study planner | ["Open study planner", "Talk to a mentor", "View my progress"] |
| `mentorship` | Explain how to request a mentor, return count of available mentors | ["Browse mentors", "Request a session"] |
| `webinar` | Query `webinars` table, return next 2 upcoming webinars | ["Register now", "View all webinars"] |
| `fallback` | Return a generic help message listing what the bot can do | ["Career guidance", "Find content", "Talk to a mentor"] |

For `career_guidance` example:
```javascript
// Fetch user interests
const interests = await pool.query('SELECT interest FROM user_interests WHERE user_id = $1', [userId]);
// Fetch matching career paths
const careers = await pool.query(
  'SELECT id, title, field FROM career_paths WHERE field ILIKE ANY($1) LIMIT 3',
  [interests.rows.map(r => `%${r.interest}%`)]
);
const careerList = careers.rows.map(c => `• ${c.title} (${c.field})`).join('\n');
const reply = `Based on your interests, here are some great career paths:\n${careerList}\n\nWould you like to know more about any of these?`;
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "userMessage": {
      "id": 5,
      "role": "user",
      "message": "What career should I choose?",
      "created_at": "2025-01-01T10:05:00Z"
    },
    "botReply": {
      "id": 6,
      "role": "bot",
      "message": "Based on your interests in technology, here are some great career paths:\n• Software Engineer (Technology)\n• Data Scientist (Technology)\n• AI/ML Engineer (Technology)\n\nWould you like to know more about any of these?",
      "metadata": {
        "intent": "career_guidance",
        "confidence": 0.91,
        "quick_replies": ["Tell me more", "Show content for this", "Find a mentor"]
      },
      "created_at": "2025-01-01T10:05:01Z"
    }
  }
}
```

---

### PATCH /api/chat/sessions/:id/end
**Auth required.** End an active chat session.

**Logic:**
1. Verify session exists AND `session.user_id = req.user.id`
2. Check `session.ended_at IS NULL` → 400 `"Session is already ended"` if already closed
3. UPDATE `chat_sessions` SET `ended_at = NOW()` WHERE `id = :id`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "session_id": 12,
    "ended_at": "2025-01-01T10:20:00Z",
    "message": "Chat session ended"
  }
}
```

---

### DELETE /api/chat/sessions/:id
**Auth required.** Delete a session and all its messages.

**Logic:**
1. Verify session belongs to `req.user.id`
2. DELETE FROM `chat_sessions` WHERE `id = :id` (CASCADE removes messages)

**Response 200:**
```json
{ "success": true, "data": { "message": "Chat session deleted" } }
```

---

## SECTION B: Mentorship Routes

---

### GET /api/mentors
**Public.** List all active mentors with their avg rating and session count.

**Query params:**
- `field` — filter by interest/field (ILIKE match against user_interests)
- `topic` — keyword search in interests
- `page` — default 1
- `limit` — default 20

**Logic:**
```sql
SELECT
  u.id,
  u.name,
  u.location,
  u.profile_pic_url,
  ROUND(AVG(mf.rating), 1) AS avg_rating,
  COUNT(DISTINCT ms.id) FILTER (WHERE ms.status = 'completed') AS completed_sessions,
  ARRAY_AGG(DISTINCT ui.interest) FILTER (WHERE ui.interest IS NOT NULL) AS interests,
  COUNT(*) OVER() AS total_count
FROM users u
LEFT JOIN mentor_sessions ms ON u.id = ms.mentor_id
LEFT JOIN mentor_feedback mf ON ms.id = mf.session_id
LEFT JOIN user_interests ui ON u.id = ui.user_id
WHERE u.role = 'mentor' AND u.is_active = true
GROUP BY u.id
ORDER BY avg_rating DESC NULLS LAST
LIMIT $1 OFFSET $2
```

Apply `field`/`topic` filter with HAVING or subquery on `user_interests`.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "Dr. Karpagam",
      "location": "Coimbatore",
      "profile_pic_url": null,
      "avg_rating": 4.8,
      "completed_sessions": 23,
      "interests": ["AI", "career guidance", "data science"]
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 12 }
}
```

---

### GET /api/mentors/:id
**Public.** Get a single mentor's profile with full stats.

**Logic:**
1. Verify user exists with `role = 'mentor'` → 404 if not
2. Fetch avg rating, completed session count, interests
3. Fetch last 3 completed sessions' feedback comments (if any, for reviews display)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Dr. Karpagam",
    "location": "Coimbatore",
    "profile_pic_url": null,
    "avg_rating": 4.8,
    "completed_sessions": 23,
    "interests": ["AI", "career guidance"],
    "recent_reviews": [
      { "rating": 5, "comment": "Very helpful and knowledgeable!", "created_at": "2025-01-10" },
      { "rating": 4, "comment": "Good session, learned a lot", "created_at": "2025-01-05" }
    ]
  }
}
```

---

### POST /api/mentor-sessions
**Auth required. Student only.**

Request a mentorship session with a mentor.

**Request body:**
```json
{
  "mentor_id": "integer (required)",
  "topic": "string (required)",
  "preferred_time": "ISO timestamp (optional, hint for mentor)"
}
```

**Validation:**
- `mentor_id` — required, integer
- `topic` — required, non-empty string, max 255 chars

**Logic:**
1. Verify `req.user.role === 'student'` → 403 `"Only students can request mentorship sessions"`
2. Verify mentor exists with `role = 'mentor'` and `is_active = true` → 404
3. Check the student doesn't already have a `requested` or `accepted` session with this mentor → 409 `"You already have an active session request with this mentor"`
4. INSERT into `mentor_sessions` with `status = 'requested'`, `student_id = req.user.id`

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "mentor_id": 5,
    "student_id": 2,
    "topic": "Career in AI — where to start?",
    "status": "requested",
    "created_at": "2025-01-01T10:00:00Z"
  }
}
```

---

### GET /api/mentor-sessions
**Auth required.** List sessions — students see their own, mentors see sessions assigned to them.

**Query params:**
- `status` — filter by status (requested | accepted | rejected | completed | cancelled)
- `page` — default 1
- `limit` — default 20

**Logic:**
```javascript
let query;
if (req.user.role === 'mentor') {
  // Mentor: sessions where mentor_id = req.user.id
  query = `SELECT ms.*, u.name AS student_name FROM mentor_sessions ms
           JOIN users u ON ms.student_id = u.id
           WHERE ms.mentor_id = $1`;
} else {
  // Student: sessions where student_id = req.user.id
  query = `SELECT ms.*, u.name AS mentor_name FROM mentor_sessions ms
           JOIN users u ON ms.mentor_id = u.id
           WHERE ms.student_id = $1`;
}
// Append status filter and ORDER/LIMIT/OFFSET
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "topic": "Career in AI",
      "status": "accepted",
      "scheduled_at": "2025-01-15T14:00:00Z",
      "duration_minutes": 60,
      "meet_link": "https://meet.google.com/abc-xyz",
      "mentor_name": "Dr. Karpagam",
      "created_at": "2025-01-01T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5 }
}
```

---

### GET /api/mentor-sessions/:id
**Auth required.** Get full session details.

**Logic:**
1. Fetch session
2. Verify `session.student_id = req.user.id` OR `session.mentor_id = req.user.id` → 403 if neither
3. Join mentor name and student name

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "topic": "Career in AI",
    "status": "accepted",
    "scheduled_at": "2025-01-15T14:00:00Z",
    "duration_minutes": 60,
    "meet_link": "https://meet.google.com/abc-xyz",
    "mentor": { "id": 5, "name": "Dr. Karpagam" },
    "student": { "id": 2, "name": "Darshan" },
    "created_at": "2025-01-01T10:00:00Z"
  }
}
```

---

### PATCH /api/mentor-sessions/:id/accept
**Auth required. Mentor only.**

Accept a session request and provide timing details.

**Request body:**
```json
{
  "scheduled_at": "ISO timestamp (required, must be future)",
  "meet_link": "string (optional)",
  "duration_minutes": "integer (optional, default: 60)"
}
```

**Validation:**
- `scheduled_at` — required, valid future timestamp
- `duration_minutes` — optional, positive integer

**Logic:**
1. Fetch session → 404 if not found
2. Verify `session.mentor_id = req.user.id` → 403 `"You are not the mentor for this session"`
3. Verify `session.status = 'requested'` → 400 `"Session is not in a requestable state"`
4. UPDATE `mentor_sessions` SET `status = 'accepted'`, `scheduled_at`, `meet_link`, `duration_minutes`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "accepted",
    "scheduled_at": "2025-01-15T14:00:00Z",
    "meet_link": "https://meet.google.com/abc-xyz",
    "duration_minutes": 60
  }
}
```

---

### PATCH /api/mentor-sessions/:id/reject
**Auth required. Mentor only.**

Reject a session request.

**Logic:**
1. Fetch session → 404
2. Verify `session.mentor_id = req.user.id` → 403
3. Verify `session.status = 'requested'` → 400 `"Can only reject sessions that are in requested status"`
4. UPDATE SET `status = 'rejected'`

**Response 200:**
```json
{ "success": true, "data": { "id": 1, "status": "rejected" } }
```

---

### PATCH /api/mentor-sessions/:id/complete
**Auth required. Mentor or Student.**

Mark a session as completed.

**Logic:**
1. Fetch session → 404
2. Verify `session.mentor_id = req.user.id` OR `session.student_id = req.user.id` → 403
3. Verify `session.status = 'accepted'` → 400 `"Only accepted sessions can be marked as completed"`
4. UPDATE SET `status = 'completed'`

**Response 200:**
```json
{ "success": true, "data": { "id": 1, "status": "completed" } }
```

---

### PATCH /api/mentor-sessions/:id/cancel
**Auth required. Mentor or Student.**

Cancel a session (before it happens).

**Logic:**
1. Fetch session → 404
2. Verify participant → 403
3. Verify `session.status` is `requested` or `accepted` → 400 `"Cannot cancel a completed or already cancelled session"`
4. UPDATE SET `status = 'cancelled'`

**Response 200:**
```json
{ "success": true, "data": { "id": 1, "status": "cancelled" } }
```

---

### POST /api/mentor-sessions/:id/feedback
**Auth required. Student or Mentor.** Submit feedback after a session.

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
1. Fetch session → 404
2. Verify `req.user.id` is student or mentor in this session → 403
3. Verify `session.status = 'completed'` → 400 `"Feedback can only be submitted for completed sessions"`
4. INSERT into `mentor_feedback` with `from_user_id = req.user.id`
5. ON CONFLICT (session_id, from_user_id) → 409 `"You have already submitted feedback for this session"`

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "session_id": 1,
    "rating": 5,
    "comment": "Very helpful and knowledgeable mentor!",
    "created_at": "2025-01-16T10:00:00Z"
  }
}
```

---

### GET /api/mentor-sessions/:id/feedback
**Auth required.** Get all feedback for a session.

**Logic:**
1. Fetch session → 404
2. Verify participant → 403
3. SELECT from `mentor_feedback` WHERE `session_id = :id`, join with `users` for `from_user_id` name

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "rating": 5,
      "comment": "Very helpful!",
      "from": { "id": 2, "name": "Darshan", "role": "student" },
      "created_at": "2025-01-16T10:00:00Z"
    }
  ]
}
```

---

## Implementation Notes

1. **Session ownership check pattern** — use this reusable helper to avoid repetition:
   ```javascript
   const getSessionAndVerifyOwner = async (sessionId, userId, pool) => {
     const result = await pool.query(
       'SELECT * FROM chat_sessions WHERE id = $1',
       [sessionId]
     );
     if (!result.rows[0]) throw { status: 404, message: 'Chat session not found' };
     if (result.rows[0].user_id !== userId) throw { status: 403, message: 'Access denied' };
     return result.rows[0];
   };
   ```

2. **Mentor session participant check** — always check both mentor_id and student_id:
   ```javascript
   const isMentor   = session.mentor_id === req.user.id;
   const isStudent  = session.student_id === req.user.id;
   if (!isMentor && !isStudent) {
     return res.status(403).json({ success: false, error: 'Access denied' });
   }
   ```

3. **Chatbot context update** — after each message exchange, persist the context to support future intent continuity:
   ```javascript
   await pool.query(
     'UPDATE chat_sessions SET context = $1 WHERE id = $2',
     [JSON.stringify({ last_intent: intent, last_topic: detectedTopic }), sessionId]
   );
   ```

4. **Bot reply timing** — always INSERT the user message first, generate the bot reply, then INSERT the bot reply. Never batch both inserts — if the bot logic fails, the user message should still be saved.

5. **Mentor list performance** — the GROUP BY + aggregation query can be slow with many rows. Add these indexes:
   ```sql
   CREATE INDEX idx_mentor_sessions_mentor_id ON mentor_sessions(mentor_id);
   CREATE INDEX idx_mentor_feedback_session_id ON mentor_feedback(session_id);
   CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
   ```

6. **Duplicate session request check:**
   ```sql
   SELECT id FROM mentor_sessions
   WHERE student_id = $1 AND mentor_id = $2 AND status IN ('requested', 'accepted')
   LIMIT 1
   ```

7. **Express validator for feedback:**
   ```javascript
   body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
   ```

8. **Error handling** — wrap all controllers:
   ```javascript
   } catch (err) {
     if (err.status) return res.status(err.status).json({ success: false, error: err.message });
     console.error(err);
     res.status(500).json({ success: false, error: 'Internal server error' });
   }
   ```
