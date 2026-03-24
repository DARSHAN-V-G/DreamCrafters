const prisma = require('../lib/prisma');
const { generateStudyPlan } = require('../lib/gemini');

// ════════════════════════════════════════════
// STUDY PLANS
// ════════════════════════════════════════════

// POST /api/study-plans/generate — AI generates a study plan
exports.generatePlan = async (req, res) => {
  try {
    const { goal, start_date, end_date, daily_hours, career_path_id } = req.body;

    // Calculate end date (default 90 days)
    const startDate = new Date(start_date);
    let endDate = end_date ? new Date(end_date) : new Date(startDate);
    if (!end_date) {
      endDate.setDate(endDate.getDate() + 90);
    }
    const endDateStr = endDate.toISOString().split('T')[0];

    // Fetch user preferences
    const preferences = await prisma.userLearningPreference.findUnique({
      where: { userId: req.user.id },
    });

    // Fetch user interests
    const interests = prisma.userInterest
      ? await prisma.userInterest.findMany({
          where: { userId: req.user.id },
          select: { interest: true },
        })
      : [];
    const interestNames = interests.map(i => i.interest);

    // No content items to fetch as the Content module is removed.
    let contentItems = [];

    // Call Gemini AI to generate the plan
    const aiPlan = await generateStudyPlan({
      goal,
      startDate: start_date,
      endDate: endDateStr,
      dailyHours: daily_hours,
      contentItems,
      preferences: {
        difficultyPreference: preferences?.difficultyPreference || 'medium',
        preferredLanguage: preferences?.preferredLanguage || 'English',
        learningStyle: preferences?.learningStyle || null,
      },
      interests: interestNames,
    });

    // Create plan + sessions in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.studyPlan.create({
        data: {
          userId: req.user.id,
          title: aiPlan.title,
          goal,
          startDate: new Date(start_date),
          endDate: new Date(endDateStr),
          status: 'active',
          generatedBy: 'ai',
        },
      });

      // Bulk create sessions
      if (aiPlan.sessions.length > 0) {
        await tx.studySession.createMany({
          data: aiPlan.sessions.map(s => ({
            planId: plan.id,
            title: s.title,
            scheduledDate: new Date(s.scheduled_date),
            scheduledTime: s.scheduled_time ? new Date(`1970-01-01T${s.scheduled_time}:00Z`) : null,
            durationMinutes: s.duration_minutes,
            status: 'pending',
            priority: s.priority,
            notes: s.notes,
          })),
        });
      }

      return plan;
    });

    res.status(201).json({
      success: true,
      data: {
        plan: {
          id: result.id,
          title: result.title,
          goal: result.goal,
          start_date: result.startDate,
          end_date: result.endDate,
          status: result.status,
          generated_by: result.generatedBy,
        },
        sessions_created: aiPlan.sessions.length,
      },
    });
  } catch (err) {
    console.error('generatePlan error:', err);
    if (err.status === 429 || err.statusCode === 429 || err.message?.includes('429') || err.message?.includes('rate limit') || err.message?.includes('quota')) {
      return res.status(429).json({ success: false, error: 'AI rate limit exceeded. Please wait a minute and try again.' });
    }
    if (err.status === 401 || err.statusCode === 401 || err.message?.includes('API key')) {
      return res.status(503).json({ success: false, error: 'AI service misconfigured. Please check the GROQ_API_KEY in .env.' });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /api/study-plans — List user's study plans
exports.listPlans = async (req, res) => {
  try {
    const { status } = req.query;

    const where = { userId: req.user.id };
    if (status) where.status = status;

    const plans = await prisma.studyPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        sessions: { select: { status: true } },
      },
    });

    const data = plans.map(plan => {
      const total = plan.sessions.length;
      const completed = plan.sessions.filter(s => s.status === 'completed').length;
      return {
        id: plan.id,
        title: plan.title,
        goal: plan.goal,
        status: plan.status,
        start_date: plan.startDate,
        end_date: plan.endDate,
        generated_by: plan.generatedBy,
        progress: {
          total,
          completed,
          percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
        created_at: plan.createdAt,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('listPlans error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /api/study-plans/:id — Get one plan with all sessions
exports.getPlan = async (req, res) => {
  try {
    const planId = parseInt(req.params.id);

    const plan = await prisma.studyPlan.findUnique({
      where: { id: planId },
      include: {
        sessions: {
          orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
        },
      },
    });

    if (!plan) return res.status(404).json({ success: false, error: 'Study plan not found' });
    if (plan.userId !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });

    const total = plan.sessions.length;
    const completed = plan.sessions.filter(s => s.status === 'completed').length;
    const missed = plan.sessions.filter(s => s.status === 'missed').length;
    const pending = plan.sessions.filter(s => s.status === 'pending').length;

    res.status(200).json({
      success: true,
      data: {
        id: plan.id,
        title: plan.title,
        goal: plan.goal,
        start_date: plan.startDate,
        end_date: plan.endDate,
        status: plan.status,
        generated_by: plan.generatedBy,
        progress: {
          total,
          completed,
          missed,
          pending,
          percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
        sessions: plan.sessions.map(s => ({
          id: s.id,
          title: s.title,
          scheduled_date: s.scheduledDate,
          scheduled_time: s.scheduledTime,
          duration_minutes: s.durationMinutes,
          status: s.status,
          priority: s.priority,
          notes: s.notes,
          completed_at: s.completedAt,
        })),
        created_at: plan.createdAt,
      },
    });
  } catch (err) {
    console.error('getPlan error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /api/study-plans — Manually create a plan
exports.createPlan = async (req, res) => {
  try {
    const { title, goal, start_date, end_date } = req.body;

    const plan = await prisma.studyPlan.create({
      data: {
        userId: req.user.id,
        title,
        goal: goal || null,
        startDate: new Date(start_date),
        endDate: end_date ? new Date(end_date) : null,
        status: 'active',
        generatedBy: 'user',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: plan.id,
        title: plan.title,
        goal: plan.goal,
        start_date: plan.startDate,
        end_date: plan.endDate,
        status: plan.status,
        generated_by: plan.generatedBy,
        created_at: plan.createdAt,
      },
    });
  } catch (err) {
    console.error('createPlan error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PUT /api/study-plans/:id — Update a plan
exports.updatePlan = async (req, res) => {
  try {
    const planId = parseInt(req.params.id);

    const existing = await prisma.studyPlan.findUnique({ where: { id: planId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Study plan not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });

    const updateData = {};
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.goal !== undefined) updateData.goal = req.body.goal;
    if (req.body.end_date !== undefined) updateData.endDate = new Date(req.body.end_date);
    if (req.body.status !== undefined) updateData.status = req.body.status;

    const plan = await prisma.studyPlan.update({
      where: { id: planId },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      data: {
        id: plan.id,
        title: plan.title,
        goal: plan.goal,
        start_date: plan.startDate,
        end_date: plan.endDate,
        status: plan.status,
        generated_by: plan.generatedBy,
        updated_at: plan.updatedAt,
      },
    });
  } catch (err) {
    console.error('updatePlan error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// DELETE /api/study-plans/:id — Delete a plan
exports.deletePlan = async (req, res) => {
  try {
    const planId = parseInt(req.params.id);

    const existing = await prisma.studyPlan.findUnique({ where: { id: planId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Study plan not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });

    await prisma.studyPlan.delete({ where: { id: planId } });

    res.status(200).json({ success: true, data: { message: 'Study plan deleted successfully' } });
  } catch (err) {
    console.error('deletePlan error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// PROGRESS & SESSIONS
// ════════════════════════════════════════════

// GET /api/study-plans/:id/progress — Completion stats
exports.getPlanProgress = async (req, res) => {
  try {
    const planId = parseInt(req.params.id);

    const plan = await prisma.studyPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ success: false, error: 'Study plan not found' });
    if (plan.userId !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });

    const sessions = await prisma.studySession.findMany({
      where: { planId },
      select: { scheduledDate: true, status: true },
    });

    const total = sessions.length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const missed = sessions.filter(s => s.status === 'missed').length;
    const pending = sessions.filter(s => s.status === 'pending').length;

    // Weekly summary — group by ISO week
    const weeklyMap = {};
    sessions.forEach(s => {
      const d = new Date(s.scheduledDate);
      const jan4 = new Date(d.getFullYear(), 0, 4);
      const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 86400000);
      const weekNum = Math.ceil((dayOfYear + jan4.getDay() + 1) / 7);
      const weekKey = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      if (!weeklyMap[weekKey]) weeklyMap[weekKey] = { week: weekKey, completed: 0, missed: 0, total: 0 };
      weeklyMap[weekKey].total++;
      if (s.status === 'completed') weeklyMap[weekKey].completed++;
      if (s.status === 'missed') weeklyMap[weekKey].missed++;
    });

    // Daily summary
    const dailyMap = {};
    sessions.forEach(s => {
      const dateStr = new Date(s.scheduledDate).toISOString().split('T')[0];
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, total: 0, completed: 0, missed: 0 };
      dailyMap[dateStr].total++;
      if (s.status === 'completed') dailyMap[dateStr].completed++;
      if (s.status === 'missed') dailyMap[dateStr].missed++;
    });

    res.status(200).json({
      success: true,
      data: {
        total_sessions: total,
        completed,
        missed,
        pending,
        completion_percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        weekly_summary: Object.values(weeklyMap).sort((a, b) => a.week.localeCompare(b.week)),
        daily_summary: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)),
      },
    });
  } catch (err) {
    console.error('getPlanProgress error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /api/study-plans/:id/sessions — List sessions for a plan
exports.listSessions = async (req, res) => {
  try {
    const planId = parseInt(req.params.id);
    const { date, status } = req.query;

    const plan = await prisma.studyPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ success: false, error: 'Study plan not found' });
    if (plan.userId !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });

    const where = { planId };
    if (date) where.scheduledDate = new Date(date);
    if (status) where.status = status;

    const sessions = await prisma.studySession.findMany({
      where,
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
    });

    res.status(200).json({
      success: true,
      data: sessions.map(s => ({
        id: s.id,
        plan_id: s.planId,
        title: s.title,
        scheduled_date: s.scheduledDate,
        scheduled_time: s.scheduledTime,
        duration_minutes: s.durationMinutes,
        status: s.status,
        priority: s.priority,
        notes: s.notes,
        completed_at: s.completedAt,
      })),
    });
  } catch (err) {
    console.error('listSessions error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /api/study-plans/:id/sessions — Add a session manually
exports.addSession = async (req, res) => {
  try {
    const planId = parseInt(req.params.id);

    const plan = await prisma.studyPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ success: false, error: 'Study plan not found' });
    if (plan.userId !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });

    const { title, scheduled_date, scheduled_time, duration_minutes, content_id, priority } = req.body;

    const session = await prisma.studySession.create({
      data: {
        planId,
        title,
        scheduledDate: new Date(scheduled_date),
        scheduledTime: scheduled_time ? new Date(`1970-01-01T${scheduled_time}:00Z`) : null,
        durationMinutes: duration_minutes,
        priority: priority || 2,
        status: 'pending',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: session.id,
        plan_id: session.planId,
        title: session.title,
        scheduled_date: session.scheduledDate,
        scheduled_time: session.scheduledTime,
        duration_minutes: session.durationMinutes,
        status: session.status,
        priority: session.priority,
      },
    });
  } catch (err) {
    console.error('addSession error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /api/study-sessions/:id/complete — Mark session as completed
exports.completeSession = async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { notes } = req.body;

    // Find session + verify ownership
    const session = await prisma.studySession.findUnique({
      where: { id: sessionId },
      include: { plan: { select: { userId: true } } },
    });

    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    if (session.plan.userId !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });
    if (session.status === 'completed') return res.status(400).json({ success: false, error: 'Session is already completed' });

    const updateData = {
      status: 'completed',
      completedAt: new Date(),
    };
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.studySession.update({
      where: { id: sessionId },
      data: updateData,
    });

    // Content progress tracking removed as the Content module is removed.

    res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        completed_at: updated.completedAt,
        notes: updated.notes,
      },
    });
  } catch (err) {
    console.error('completeSession error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /api/study-sessions/:id/reschedule — Reschedule a session
exports.rescheduleSession = async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { new_date, new_time, reason } = req.body;

    const session = await prisma.studySession.findUnique({
      where: { id: sessionId },
      include: { plan: { select: { userId: true } } },
    });

    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    if (session.plan.userId !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });
    if (session.status === 'completed') return res.status(400).json({ success: false, error: 'Cannot reschedule a completed session' });

    const result = await prisma.$transaction(async (tx) => {
      // Log the reschedule
      const rescheduleLog = await tx.studySessionReschedule.create({
        data: {
          sessionId,
          oldDate: session.scheduledDate,
          newDate: new Date(new_date),
          reason: reason || 'user_request',
        },
      });

      // Update the session
      const updated = await tx.studySession.update({
        where: { id: sessionId },
        data: {
          scheduledDate: new Date(new_date),
          scheduledTime: new_time ? new Date(`1970-01-01T${new_time}:00Z`) : session.scheduledTime,
          status: 'rescheduled',
        },
      });

      return { updated, rescheduleLog };
    });

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: result.updated.id,
          scheduled_date: result.updated.scheduledDate,
          scheduled_time: result.updated.scheduledTime,
          status: result.updated.status,
        },
        reschedule_log: {
          old_date: result.rescheduleLog.oldDate,
          new_date: result.rescheduleLog.newDate,
          reason: result.rescheduleLog.reason,
        },
      },
    });
  } catch (err) {
    console.error('rescheduleSession error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /api/study-sessions/auto-reschedule — AI reschedules all missed sessions
exports.autoReschedule = async (req, res) => {
  try {
    const { plan_id } = req.body;
    const planId = parseInt(plan_id);

    const plan = await prisma.studyPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ success: false, error: 'Study plan not found' });
    if (plan.userId !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });

    // Fetch missed sessions
    const missedSessions = await prisma.studySession.findMany({
      where: { planId, status: 'missed' },
      orderBy: { scheduledDate: 'asc' },
    });

    if (missedSessions.length === 0) {
      return res.status(200).json({ success: true, data: { rescheduled_count: 0, sessions: [] } });
    }

    // Get user daily hours preference
    const prefs = await prisma.userLearningPreference.findUnique({
      where: { userId: req.user.id },
      select: { dailyStudyHours: true },
    });
    const dailyHours = prefs?.dailyStudyHours || 2;

    // Get all future sessions grouped by date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureSessions = await prisma.studySession.findMany({
      where: {
        planId,
        status: { not: 'missed' },
        scheduledDate: { gte: today },
      },
      select: { scheduledDate: true },
    });

    // Count sessions per date
    const dateCountMap = {};
    futureSessions.forEach(s => {
      const dateStr = new Date(s.scheduledDate).toISOString().split('T')[0];
      dateCountMap[dateStr] = (dateCountMap[dateStr] || 0) + 1;
    });

    // Calculate the end boundary
    const planEnd = plan.endDate || new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

    const rescheduledResults = [];

    await prisma.$transaction(async (tx) => {
      for (const session of missedSessions) {
        // Find next available day
        let checkDate = new Date(Math.max(today.getTime(), new Date(plan.startDate).getTime()));

        while (checkDate <= planEnd) {
          const dateStr = checkDate.toISOString().split('T')[0];
          const currentCount = dateCountMap[dateStr] || 0;

          if (currentCount < dailyHours) {
            // Found a slot
            dateCountMap[dateStr] = currentCount + 1;

            await tx.studySessionReschedule.create({
              data: {
                sessionId: session.id,
                oldDate: session.scheduledDate,
                newDate: new Date(dateStr),
                reason: 'ai',
              },
            });

            await tx.studySession.update({
              where: { id: session.id },
              data: {
                scheduledDate: new Date(dateStr),
                status: 'rescheduled',
              },
            });

            rescheduledResults.push({
              id: session.id,
              title: session.title,
              old_date: session.scheduledDate,
              new_date: dateStr,
            });

            break;
          }

          checkDate.setDate(checkDate.getDate() + 1);
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        rescheduled_count: rescheduledResults.length,
        sessions: rescheduledResults,
      },
    });
  } catch (err) {
    console.error('autoReschedule error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// DELETE /api/study-sessions/:id — Delete a session
exports.deleteSession = async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);

    const session = await prisma.studySession.findUnique({
      where: { id: sessionId },
      include: { plan: { select: { userId: true } } },
    });

    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    if (session.plan.userId !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });

    await prisma.studySession.delete({ where: { id: sessionId } });

    res.status(200).json({ success: true, data: { message: 'Session deleted' } });
  } catch (err) {
    console.error('deleteSession error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// PERSONALIZATION
// ════════════════════════════════════════════

// GET /api/personalization/profile — Get personalization profile
exports.getProfile = async (req, res) => {
  try {
    const profile = await prisma.personalizationProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        careerPath: { select: { id: true, title: true, field: true } },
      },
    });

    if (!profile) {
      return res.status(200).json({
        success: true,
        data: {
          exists: false,
          recommended_career: null,
          strengths: [],
          areas_to_improve: [],
          ai_scores: null,
          last_assessed_at: null,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        exists: true,
        recommended_career: profile.careerPath || null,
        strengths: profile.strengths,
        areas_to_improve: profile.areasToImprove,
        ai_scores: profile.aiScores,
        last_assessed_at: profile.lastAssessedAt,
      },
    });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /api/personalization/assess — Submit quiz, update profile
exports.assess = async (req, res) => {
  try {
    const { quiz_answers } = req.body;

    // ── Scoring Map ──
    // Each question_id maps answers to category scores
    const scoringMap = {
      1: { A: { technology: 3, science: 1 }, B: { arts: 3, business: 1 }, C: { business: 3, healthcare: 1 }, D: { healthcare: 3, science: 2 } },
      2: { A: { science: 3, technology: 2 }, B: { business: 3, arts: 1 }, C: { arts: 3, healthcare: 1 }, D: { technology: 3, science: 1 } },
      3: { A: { technology: 3, business: 2 }, B: { healthcare: 3, science: 2 }, C: { science: 3, technology: 1 }, D: { arts: 3, business: 2 } },
      4: { A: { business: 3, technology: 1 }, B: { science: 3, arts: 1 }, C: { healthcare: 3, business: 2 }, D: { technology: 3, science: 2 } },
      5: { A: { arts: 3, technology: 1 }, B: { technology: 3, business: 2 }, C: { business: 3, healthcare: 1 }, D: { science: 3, arts: 2 } },
    };

    // Sum category scores
    const categoryScores = { technology: 0, arts: 0, science: 0, business: 0, healthcare: 0 };

    quiz_answers.forEach(({ question_id, answer }) => {
      const qMap = scoringMap[question_id];
      if (qMap && qMap[answer]) {
        Object.entries(qMap[answer]).forEach(([category, score]) => {
          categoryScores[category] += score;
        });
      }
    });

    // Find top category
    const maxScore = Math.max(...Object.values(categoryScores));
    const topCategory = Object.entries(categoryScores).sort((a, b) => b[1] - a[1])[0][0];

    // Find matching career path
    const matchedCareer = await prisma.careerPath.findFirst({
      where: { field: { contains: topCategory, mode: 'insensitive' } },
      select: { id: true, title: true, field: true },
    });

    // Determine strengths (>70% of max) and weaknesses (<40% of max)
    const maxPossible = maxScore || 1; // avoid division by zero
    const strengths = Object.entries(categoryScores)
      .filter(([, score]) => score / maxPossible >= 0.7)
      .map(([cat]) => cat);
    const areasToImprove = Object.entries(categoryScores)
      .filter(([, score]) => score / maxPossible < 0.4)
      .map(([cat]) => cat);

    // Build AI scores
    const totalPossible = Object.keys(scoringMap).length * 3; // max 3 points per question
    const aptitude = Math.round((maxScore / totalPossible) * 100);
    const interestMatch = Math.round((categoryScores[topCategory] / totalPossible) * 100);

    // Calculate consistency from past sessions
    const sessionStats = await prisma.studySession.aggregate({
      where: { plan: { userId: req.user.id } },
      _count: { id: true },
    });
    const completedCount = await prisma.studySession.count({
      where: { plan: { userId: req.user.id }, status: 'completed' },
    });
    const consistency = sessionStats._count.id > 0
      ? Math.round((completedCount / sessionStats._count.id) * 100)
      : 50; // default for new users

    const aiScores = { aptitude, interest_match: interestMatch, consistency };

    // Upsert personalization profile
    await prisma.personalizationProfile.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        recCareerPathId: matchedCareer?.id || null,
        strengths,
        areasToImprove: areasToImprove,
        aiScores,
        lastAssessedAt: new Date(),
      },
      update: {
        recCareerPathId: matchedCareer?.id || null,
        strengths,
        areasToImprove: areasToImprove,
        aiScores,
        lastAssessedAt: new Date(),
      },
    });

    // Delete old recommendations and generate fresh ones
    await prisma.aiRecommendation.deleteMany({ where: { userId: req.user.id } });

    const recommendations = [];

    // Career recommendation
    if (matchedCareer) {
      recommendations.push({
        userId: req.user.id,
        type: 'career',
        recommendationData: {
          career_path_id: matchedCareer.id,
          title: matchedCareer.title,
          reason: `Best match based on your quiz results (${interestMatch}% interest match)`,
        },
      });
    }

    // Content recommendation
    const topContent = await prisma.content.findFirst({
      where: {
        category: { name: { contains: topCategory, mode: 'insensitive' } },
      },
      select: { id: true, title: true },
    });
    if (topContent) {
      recommendations.push({
        userId: req.user.id,
        type: 'content',
        recommendationData: {
          content_id: topContent.id,
          title: topContent.title,
          reason: `Matches your interest in ${topCategory} and your current difficulty preference`,
        },
      });
    }

    // Study time recommendation
    const suggestedHours = aptitude >= 70 ? 3 : aptitude >= 40 ? 2 : 1;
    recommendations.push({
      userId: req.user.id,
      type: 'study_time',
      recommendationData: {
        suggested_daily_hours: suggestedHours,
        reason: `Based on your aptitude score (${aptitude}%) and past completion rate (${consistency}%)`,
      },
    });

    if (recommendations.length > 0) {
      await prisma.aiRecommendation.createMany({ data: recommendations });
    }

    res.status(200).json({
      success: true,
      data: {
        recommended_career: matchedCareer || null,
        strengths,
        areas_to_improve: areasToImprove,
        ai_scores: aiScores,
        recommendations_generated: recommendations.length,
      },
    });
  } catch (err) {
    console.error('assess error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// RECOMMENDATIONS
// ════════════════════════════════════════════

// GET /api/recommendations — Get AI recommendations
exports.getRecommendations = async (req, res) => {
  try {
    const { type } = req.query;

    const where = {
      userId: req.user.id,
      isAccepted: null, // Only unacted-on
    };
    if (type) where.type = type;

    const recommendations = await prisma.aiRecommendation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: recommendations.map(r => ({
        id: r.id,
        type: r.type,
        recommendation_data: r.recommendationData,
        is_accepted: r.isAccepted,
        created_at: r.createdAt,
      })),
    });
  } catch (err) {
    console.error('getRecommendations error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /api/recommendations/:id/accept — Accept a recommendation
exports.acceptRecommendation = async (req, res) => {
  try {
    const recId = parseInt(req.params.id);

    const rec = await prisma.aiRecommendation.findUnique({ where: { id: recId } });
    if (!rec) return res.status(404).json({ success: false, error: 'Recommendation not found' });
    if (rec.userId !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });

    await prisma.aiRecommendation.update({
      where: { id: recId },
      data: { isAccepted: true },
    });

    let actionTaken = 'Recommendation accepted';

    // Trigger side effects based on type
    if (rec.type === 'content' && rec.recommendationData?.content_id) {
      await prisma.userContentProgress.upsert({
        where: {
          userId_contentId: {
            userId: req.user.id,
            contentId: rec.recommendationData.content_id,
          },
        },
        create: {
          userId: req.user.id,
          contentId: rec.recommendationData.content_id,
          status: 'not_started',
          progressPercent: 0,
        },
        update: {},
      });
      actionTaken = 'Content added to your learning list';
    } else if (rec.type === 'career' && rec.recommendationData?.career_path_id) {
      await prisma.personalizationProfile.upsert({
        where: { userId: req.user.id },
        create: {
          userId: req.user.id,
          recCareerPathId: rec.recommendationData.career_path_id,
          strengths: [],
          areasToImprove: [],
        },
        update: {
          recCareerPathId: rec.recommendationData.career_path_id,
        },
      });
      actionTaken = 'Career path updated in your profile';
    } else if (rec.type === 'study_time' && rec.recommendationData?.suggested_daily_hours) {
      await prisma.userLearningPreference.upsert({
        where: { userId: req.user.id },
        create: {
          userId: req.user.id,
          dailyStudyHours: rec.recommendationData.suggested_daily_hours,
        },
        update: {
          dailyStudyHours: rec.recommendationData.suggested_daily_hours,
        },
      });
      actionTaken = 'Daily study hours updated';
    }

    res.status(200).json({
      success: true,
      data: {
        id: recId,
        type: rec.type,
        is_accepted: true,
        action_taken: actionTaken,
      },
    });
  } catch (err) {
    console.error('acceptRecommendation error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /api/recommendations/:id/dismiss — Dismiss a recommendation
exports.dismissRecommendation = async (req, res) => {
  try {
    const recId = parseInt(req.params.id);

    const rec = await prisma.aiRecommendation.findUnique({ where: { id: recId } });
    if (!rec) return res.status(404).json({ success: false, error: 'Recommendation not found' });
    if (rec.userId !== req.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });

    await prisma.aiRecommendation.update({
      where: { id: recId },
      data: { isAccepted: false },
    });

    res.status(200).json({
      success: true,
      data: { id: recId, is_accepted: false },
    });
  } catch (err) {
    console.error('dismissRecommendation error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
