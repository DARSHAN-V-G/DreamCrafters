const prisma = require('../lib/prisma');

// ════════════════════════════════════════════
// GET /api/content — List content with filters
// ════════════════════════════════════════════
exports.listContent = async (req, res) => {
  try {
    const { type, category_id, difficulty, language, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    // Build dynamic where clause
    const where = {};
    if (type) where.type = type;
    if (category_id) where.categoryId = parseInt(category_id);
    if (difficulty) where.difficulty = difficulty;
    if (language) where.language = { contains: language, mode: 'insensitive' };
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      prisma.content.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.content.count({ where }),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: { page, limit, total },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// GET /api/content/recommended — AI-matched content
// ════════════════════════════════════════════
exports.getRecommended = async (req, res) => {
  try {
    // 1. Fetch user interests
    const interests = await prisma.userInterest.findMany({
      where: { userId: req.user.id },
    });

    // 2. Fetch completed content IDs
    const completedProgress = await prisma.userContentProgress.findMany({
      where: { userId: req.user.id, status: 'completed' },
      select: { contentId: true },
    });
    const completedIds = completedProgress.map((p) => p.contentId);

    // 3. Fetch difficulty preference
    const learningPref = await prisma.userLearningPreference.findUnique({
      where: { userId: req.user.id },
    });

    // 4. If no interests, return latest 20 content items
    if (!interests.length) {
      const latest = await prisma.content.findMany({
        where: completedIds.length ? { id: { notIn: completedIds } } : undefined,
        include: {
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return res.json({
        success: true,
        data: latest.map((item) => ({
          ...item,
          match_reason: 'Latest content',
        })),
      });
    }

    // 5. Build OR filter matching category name against each interest
    const interestNames = interests.map((i) => i.interest);
    const orConditions = interestNames.map((interest) => ({
      category: { name: { contains: interest, mode: 'insensitive' } },
    }));

    const where = {
      OR: orConditions,
    };
    if (completedIds.length) {
      where.id = { notIn: completedIds };
    }
    if (learningPref && learningPref.difficultyPreference) {
      where.difficulty = learningPref.difficultyPreference;
    }

    const recommended = await prisma.content.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Add match_reason to each item
    const data = recommended.map((item) => {
      const matchedInterest = interestNames.find(
        (interest) =>
          item.category &&
          item.category.name.toLowerCase().includes(interest.toLowerCase())
      );
      return {
        ...item,
        match_reason: matchedInterest
          ? `Matches your interest in ${matchedInterest}`
          : 'Recommended for you',
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// GET /api/content/bookmarks — User's bookmarked content
// ════════════════════════════════════════════
exports.getBookmarks = async (req, res) => {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: req.user.id },
      include: {
        content: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = bookmarks.map((b) => ({
      ...b.content,
      bookmarked_at: b.createdAt,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// GET /api/content/:id — Single content item (optionalAuth)
// ════════════════════════════════════════════
exports.getContentById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid content ID' });
    }

    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    let userProgress = null;
    let isBookmarked = null;

    if (req.user) {
      const progress = await prisma.userContentProgress.findUnique({
        where: {
          userId_contentId: { userId: req.user.id, contentId: id },
        },
        select: { status: true, progressPercent: true, lastAccessedAt: true },
      });
      userProgress = progress || null;

      const bookmark = await prisma.bookmark.findUnique({
        where: {
          userId_contentId: { userId: req.user.id, contentId: id },
        },
      });
      isBookmarked = !!bookmark;
    }

    res.json({
      success: true,
      data: {
        ...content,
        userProgress,
        isBookmarked,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// POST /api/content — Create content (admin only)
// ════════════════════════════════════════════
exports.createContent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Admin only.' });
    }

    const { title, description, type, url, thumbnail_url, category_id, difficulty, duration_minutes, is_offline_available, language } = req.body;

    // Verify category exists
    const category = await prisma.category.findUnique({ where: { id: parseInt(category_id) } });
    if (!category) {
      return res.status(400).json({ success: false, error: 'Category not found' });
    }

    const content = await prisma.content.create({
      data: {
        title,
        description: description || null,
        type,
        url: url || null,
        thumbnailUrl: thumbnail_url || null,
        categoryId: parseInt(category_id),
        difficulty: difficulty || 'beginner',
        durationMinutes: duration_minutes ? parseInt(duration_minutes) : null,
        isOfflineAvailable: is_offline_available || false,
        language: language || 'English',
        createdBy: req.user.id,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// PUT /api/content/:id — Update content (admin only)
// ════════════════════════════════════════════
exports.updateContent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Admin only.' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid content ID' });
    }

    // Check content exists
    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    // Build partial update data
    const updateData = {};
    const allowedFields = {
      title: 'title',
      description: 'description',
      type: 'type',
      url: 'url',
      thumbnail_url: 'thumbnailUrl',
      category_id: 'categoryId',
      difficulty: 'difficulty',
      duration_minutes: 'durationMinutes',
      is_offline_available: 'isOfflineAvailable',
      language: 'language',
    };

    for (const [bodyKey, prismaKey] of Object.entries(allowedFields)) {
      if (req.body[bodyKey] !== undefined) {
        let value = req.body[bodyKey];
        if (prismaKey === 'categoryId' || prismaKey === 'durationMinutes') {
          value = parseInt(value);
        }
        updateData[prismaKey] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const updated = await prisma.content.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// DELETE /api/content/:id — Delete content (admin only)
// ════════════════════════════════════════════
exports.deleteContent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Admin only.' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid content ID' });
    }

    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    await prisma.content.delete({ where: { id } });

    res.json({ success: true, data: { message: 'Content deleted successfully' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// PUT /api/content/:id/progress — Upsert progress
// ════════════════════════════════════════════
exports.updateProgress = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid content ID' });
    }

    // Check content exists
    const content = await prisma.content.findUnique({ where: { id } });
    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    const progressPercent = parseInt(req.body.progress_percent);
    let { status } = req.body;

    // Auto-derive status if not provided
    if (!status) {
      if (progressPercent === 0) status = 'not_started';
      else if (progressPercent === 100) status = 'completed';
      else status = 'in_progress';
    }

    const completedAt = status === 'completed' || progressPercent === 100 ? new Date() : null;
    const now = new Date();

    const progress = await prisma.userContentProgress.upsert({
      where: {
        userId_contentId: { userId: req.user.id, contentId: id },
      },
      update: {
        status,
        progressPercent,
        lastAccessedAt: now,
        completedAt,
      },
      create: {
        userId: req.user.id,
        contentId: id,
        status,
        progressPercent,
        lastAccessedAt: now,
        completedAt,
      },
    });

    res.json({
      success: true,
      data: {
        content_id: progress.contentId,
        status: progress.status,
        progress_percent: progress.progressPercent,
        last_accessed_at: progress.lastAccessedAt,
        completed_at: progress.completedAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// POST /api/content/:id/bookmark — Add bookmark (idempotent)
// ════════════════════════════════════════════
exports.addBookmark = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid content ID' });
    }

    // Check content exists
    const content = await prisma.content.findUnique({ where: { id } });
    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    try {
      await prisma.bookmark.create({
        data: { userId: req.user.id, contentId: id },
      });
    } catch (err) {
      // P2002 = unique constraint violation → already bookmarked, that's fine
      if (err.code !== 'P2002') throw err;
    }

    res.json({ success: true, data: { message: 'Content bookmarked' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// DELETE /api/content/:id/bookmark — Remove bookmark (idempotent)
// ════════════════════════════════════════════
exports.removeBookmark = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid content ID' });
    }

    // deleteMany won't throw if nothing found — makes it idempotent
    await prisma.bookmark.deleteMany({
      where: { userId: req.user.id, contentId: id },
    });

    res.json({ success: true, data: { message: 'Bookmark removed' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
