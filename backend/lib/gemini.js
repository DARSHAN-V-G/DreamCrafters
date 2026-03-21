const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);

/**
 * Generate a personalized study plan using Gemini AI.
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

  const prompt = `You are an expert AI study planner for an educational platform called DreamCrafters.

A student needs a personalized study plan. Generate a detailed, structured study plan based on the information below.

## Student Profile
- **Goal**: ${goal}
- **Date range**: ${startDate} to ${endDate}
- **Daily study hours**: ${dailyHours} hours/day
- **Difficulty preference**: ${preferences.difficultyPreference || 'medium'}
- **Preferred language**: ${preferences.preferredLanguage || 'English'}
- **Learning style**: ${preferences.learningStyle || 'not specified'}
- **Interests**: ${interests.length > 0 ? interests.join(', ') : 'not specified'}

## Available Content Items
${contentItems.length > 0
    ? contentItems.map(c => `- ID: ${c.id}, Title: "${c.title}", Difficulty: ${c.difficulty}, Duration: ${c.durationMinutes || 60} min, Type: ${c.type}`).join('\n')
    : 'No pre-existing content available. Generate session titles based on the student\'s goal and interests.'}

## Rules
1. Schedule sessions ONLY within the date range ${startDate} to ${endDate} (inclusive).
2. Schedule at most ${dailyHours} session(s) per day (each session is approximately 60 minutes).
3. Skip weekends (Saturday and Sunday) to give the student rest days — UNLESS the total days are very few (less than 14 days), in which case you may use weekends too.
4. Assign each session a \`content_id\` from the available content items above. If no content matches or the list is empty, set \`content_id\` to null and create a descriptive session title based on the goal.
5. Assign priority based on difficulty: advanced = 3 (high), intermediate = 2 (medium), beginner = 1 (low).
6. Assign \`scheduled_time\` as "HH:MM" in 24-hour format. Spread sessions throughout the day starting from "09:00", incrementing by the duration of each session.
7. Order sessions logically — start with foundational/beginner content and progress to advanced.
8. The plan title should be concise and descriptive, e.g., "Study Plan — {goal}".

## Output Format
Return ONLY a valid JSON object with this exact structure (no extra text, no markdown):

{
  "title": "Study Plan — <concise goal summary>",
  "sessions": [
    {
      "content_id": <number or null>,
      "title": "<session title>",
      "scheduled_date": "YYYY-MM-DD",
      "scheduled_time": "HH:MM",
      "duration_minutes": <number>,
      "priority": <1 | 2 | 3>,
      "notes": "<optional brief note or null>"
    }
  ]
}`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
    },
  });

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Parse the JSON response
  const parsed = JSON.parse(responseText);

  // Validate structure
  if (!parsed.title || !Array.isArray(parsed.sessions)) {
    throw new Error('AI returned an invalid study plan structure');
  }

  // Validate and sanitize each session
  parsed.sessions = parsed.sessions.map((s, i) => {
    if (!s.title || !s.scheduled_date || !s.duration_minutes) {
      throw new Error(`AI returned an invalid session at index ${i}`);
    }

    // Ensure content_id is valid or null
    const contentId = s.content_id && Number.isInteger(s.content_id) ? s.content_id : null;

    // Validate content_id exists in our content list
    const validContentIds = new Set(contentItems.map(c => c.id));
    const finalContentId = contentId && validContentIds.has(contentId) ? contentId : null;

    return {
      content_id: finalContentId,
      title: String(s.title).substring(0, 255),
      scheduled_date: s.scheduled_date,
      scheduled_time: s.scheduled_time || null,
      duration_minutes: Math.max(5, Math.min(480, parseInt(s.duration_minutes) || 60)),
      priority: [1, 2, 3].includes(s.priority) ? s.priority : 2,
      notes: s.notes || null,
    };
  });

  // Ensure title is within limits
  parsed.title = String(parsed.title).substring(0, 255);

  return parsed;
}

module.exports = { generateStudyPlan };
