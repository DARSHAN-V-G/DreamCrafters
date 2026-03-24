const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Generate a personalized study plan using Groq AI (openai/gpt-oss-20b).
 *
 * Uses Groq's strict structured outputs to guarantee valid JSON matching our DB schema.
 *
 * @param {object} context
 * @param {string} context.goal - The user's study goal
 * @param {string} context.startDate - YYYY-MM-DD
 * @param {string} context.endDate - YYYY-MM-DD
 * @param {number} context.dailyHours - Hours per day (1-8)
 * @param {Array}  context.contentItems - Available content [{id, title, difficulty, durationMinutes, type, category}]
 * @param {object} context.preferences - User prefs {difficultyPreference, preferredLanguage, learningStyle}
 * @param {Array}  context.interests - User interests [string]
 * @returns {Promise<{title: string, sessions: Array}>}
 */
async function generateStudyPlan(context) {
  const {
    goal,
    startDate,
    endDate,
    dailyHours,
    contentItems,
    preferences,
    interests,
  } = context;

  const systemPrompt = `You are an expert AI study planner for DreamCrafters, an educational platform. Generate personalized study plans. Always create practical, well-structured plans with sessions.`;

  const userPrompt = `Generate a study plan for this student:

## Student Profile
- Goal: ${goal}
- Date range: ${startDate} to ${endDate}
- Daily study hours: ${dailyHours} hours/day
- Difficulty preference: ${preferences.difficultyPreference || 'medium'}
- Language: ${preferences.preferredLanguage || 'English'}
- Learning style: ${preferences.learningStyle || 'not specified'}
- Interests: ${interests.length > 0 ? interests.join(', ') : 'general'}

## Rules
1. Sessions ONLY within ${startDate} to ${endDate}.
2. At most ${dailyHours} session(s) per day, each around 60 minutes.
3. Skip weekends unless total days < 14.
4. For content_id: use an ID from above if relevant, use 0 if no matching content.
5. For scheduled_time: use "HH:MM" 24h format starting from "09:00".
6. Priority: beginner=1, intermediate=2, advanced=3.
7. Order sessions logically — beginner to advanced.
8. Title format: "Study Plan: <short goal summary>".
9. notes: short helpful note for the session, or empty string if none.
10. Generate at least 5 sessions.`;

  const response = await groq.chat.completions.create({
    model: 'openai/gpt-oss-20b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'study_plan',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            sessions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {

                  title: { type: 'string' },
                  scheduled_date: { type: 'string' },
                  scheduled_time: { type: 'string' },
                  duration_minutes: { type: 'integer' },
                  priority: { type: 'integer' },
                  notes: { type: 'string' },
                },
                required: ['title', 'scheduled_date', 'scheduled_time', 'duration_minutes', 'priority', 'notes'],
                additionalProperties: false,
              },
            },
          },
          required: ['title', 'sessions'],
          additionalProperties: false,
        },
      },
    },
    temperature: 0.7,
  });

  const responseText = response.choices[0].message.content;
  const parsed = JSON.parse(responseText || '{}');

  // Validate structure
  if (!parsed.title || !Array.isArray(parsed.sessions)) {
    throw new Error('AI returned an invalid study plan structure');
  }

  // Sanitize each session
  parsed.sessions = parsed.sessions.map((s, i) => {
    if (!s.title || !s.scheduled_date || !s.duration_minutes) {
      throw new Error(`AI returned an invalid session at index ${i}`);
    }

    return {
      title: String(s.title).substring(0, 255),
      scheduled_date: s.scheduled_date,
      scheduled_time: s.scheduled_time || null,
      duration_minutes: Math.max(5, Math.min(480, parseInt(s.duration_minutes) || 60)),
      priority: [1, 2, 3].includes(s.priority) ? s.priority : 2,
      notes: s.notes || null,
    };
  });

  parsed.title = String(parsed.title).substring(0, 255);

  return parsed;
}

module.exports = { generateStudyPlan };
