const prisma = require('../lib/prisma');

const isMentorRole = (role) => role === 'mentor' || role === 'educator';

// ════════════════════════════════════════════
// GET /api/webinars — List upcoming webinars
// ════════════════════════════════════════════
exports.listWebinars = async (req, res) => {
  try {
    const { topic, from_date } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const fromDate = from_date ? new Date(from_date) : new Date();

    const where = {
      scheduledAt: { gte: fromDate },
    };
    if (topic) {
      where.topic = { contains: topic, mode: 'insensitive' };
    }

    const [webinars, total] = await Promise.all([
      prisma.webinar.findMany({
        where,
        include: {
          host: { select: { id: true, name: true } },
          _count: { select: { registrations: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        skip: offset,
        take: limit,
      }),
      prisma.webinar.count({ where }),
    ]);

    const data = webinars.map((w) => ({
      id: w.id,
      title: w.title,
      description: w.description,
      topic: w.topic,
      scheduledAt: w.scheduledAt,
      durationMinutes: w.durationMinutes,
      joinLink: w.joinLink,
      maxParticipants: w.maxParticipants,
      createdAt: w.createdAt,
      host_name: w.host ? w.host.name : null,
      registration_count: w._count.registrations,
      is_full:
        w.maxParticipants !== null &&
        w._count.registrations >= w.maxParticipants,
    }));

    res.json({
      success: true,
      data,
      pagination: { page, limit, total },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// GET /api/webinars/my-registrations — User's registered webinars
// ════════════════════════════════════════════
exports.getMyRegistrations = async (req, res) => {
  try {
    const registrations = await prisma.webinarRegistration.findMany({
      where: { userId: req.user.id },
      include: {
        webinar: {
          include: {
            host: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { webinar: { scheduledAt: 'asc' } },
    });

    const data = registrations.map((r) => ({
      ...r.webinar,
      host_name: r.webinar.host ? r.webinar.host.name : null,
      registered_at: r.registeredAt,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// GET /api/webinars/my-webinars — Educator's webinars
// ════════════════════════════════════════════
exports.getMyWebinars = async (req, res) => {
  try {
    if (!isMentorRole(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Only educators can view this endpoint' });
    }

    const webinars = await prisma.webinar.findMany({
      where: { hostId: req.user.id },
      include: {
        _count: { select: { registrations: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    const data = webinars.map((w) => ({
      ...w,
      registration_count: w._count.registrations,
      is_full:
        w.maxParticipants !== null &&
        w._count.registrations >= w.maxParticipants,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// GET /api/webinars/:id — Single webinar (optionalAuth)
// ════════════════════════════════════════════
exports.getWebinarById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid webinar ID' });
    }

    const webinar = await prisma.webinar.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, name: true } },
        _count: { select: { registrations: true } },
      },
    });

    if (!webinar) {
      return res.status(404).json({ success: false, error: 'Webinar not found' });
    }

    const registrationCount = webinar._count.registrations;
    const isFull =
      webinar.maxParticipants !== null &&
      registrationCount >= webinar.maxParticipants;

    let isRegistered = null;
    if (req.user) {
      const reg = await prisma.webinarRegistration.findUnique({
        where: {
          webinarId_userId: { webinarId: id, userId: req.user.id },
        },
      });
      isRegistered = !!reg;
    }

    res.json({
      success: true,
      data: {
        id: webinar.id,
        title: webinar.title,
        description: webinar.description,
        topic: webinar.topic,
        scheduledAt: webinar.scheduledAt,
        durationMinutes: webinar.durationMinutes,
        joinLink: webinar.joinLink,
        maxParticipants: webinar.maxParticipants,
        createdAt: webinar.createdAt,
        host: webinar.host,
        registration_count: registrationCount,
        is_full: isFull,
        isRegistered,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// POST /api/webinars — Create webinar (admin or mentor)
// ════════════════════════════════════════════
exports.createWebinar = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && !isMentorRole(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Access denied. Admin or mentor only.' });
    }

    const { title, description, scheduled_at, duration_minutes, join_link, topic, max_participants } = req.body;

    const webinar = await prisma.webinar.create({
      data: {
        title,
        description: description || null,
        hostId: req.user.id,
        scheduledAt: new Date(scheduled_at),
        durationMinutes: duration_minutes ? parseInt(duration_minutes) : null,
        joinLink: join_link || null,
        topic: topic || null,
        maxParticipants: max_participants ? parseInt(max_participants) : null,
      },
      include: {
        host: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: webinar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// PUT /api/webinars/:id — Update webinar (admin or host mentor)
// ════════════════════════════════════════════
exports.updateWebinar = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid webinar ID' });
    }

    const webinar = await prisma.webinar.findUnique({ where: { id } });
    if (!webinar) {
      return res.status(404).json({ success: false, error: 'Webinar not found' });
    }

    // Only admin or the host mentor can update
    if (req.user.role !== 'admin' && webinar.hostId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied. Admin or host only.' });
    }

    const updateData = {};
    const allowedFields = {
      title: 'title',
      description: 'description',
      scheduled_at: 'scheduledAt',
      duration_minutes: 'durationMinutes',
      join_link: 'joinLink',
      topic: 'topic',
      max_participants: 'maxParticipants',
    };

    for (const [bodyKey, prismaKey] of Object.entries(allowedFields)) {
      if (req.body[bodyKey] !== undefined) {
        let value = req.body[bodyKey];
        if (prismaKey === 'scheduledAt') value = new Date(value);
        if (prismaKey === 'durationMinutes' || prismaKey === 'maxParticipants') {
          value = parseInt(value);
        }
        updateData[prismaKey] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const updated = await prisma.webinar.update({
      where: { id },
      data: updateData,
      include: {
        host: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// DELETE /api/webinars/:id — Delete webinar (admin only)
// ════════════════════════════════════════════
exports.deleteWebinar = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid webinar ID' });
    }

    const webinar = await prisma.webinar.findUnique({ where: { id } });
    if (!webinar) {
      return res.status(404).json({ success: false, error: 'Webinar not found' });
    }

    // Admin can delete any webinar; educator can delete only own webinar.
    if (req.user.role !== 'admin' && webinar.hostId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied. Admin or host only.' });
    }

    await prisma.webinar.delete({ where: { id } });

    res.json({ success: true, data: { message: 'Webinar deleted successfully' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// POST /api/webinars/:id/register — Register for webinar (idempotent)
// ════════════════════════════════════════════
exports.registerForWebinar = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid webinar ID' });
    }

    // 1. Check webinar exists
    const webinar = await prisma.webinar.findUnique({
      where: { id },
      include: { _count: { select: { registrations: true } } },
    });
    if (!webinar) {
      return res.status(404).json({ success: false, error: 'Webinar not found' });
    }

    // 2. Check not past
    if (new Date(webinar.scheduledAt) <= new Date()) {
      return res.status(400).json({ success: false, error: 'Webinar has already passed' });
    }

    // 3. Check not full
    if (
      webinar.maxParticipants !== null &&
      webinar._count.registrations >= webinar.maxParticipants
    ) {
      return res.status(409).json({ success: false, error: 'Webinar is full' });
    }

    // 4. Upsert registration (idempotent)
    try {
      await prisma.webinarRegistration.create({
        data: { webinarId: id, userId: req.user.id },
      });
    } catch (err) {
      // P2002 = unique constraint violation → already registered
      if (err.code !== 'P2002') throw err;
    }

    res.json({ success: true, data: { message: 'Successfully registered for webinar' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// DELETE /api/webinars/:id/register — Cancel registration
// ════════════════════════════════════════════
exports.cancelRegistration = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid webinar ID' });
    }

    // 1. Check webinar exists
    const webinar = await prisma.webinar.findUnique({ where: { id } });
    if (!webinar) {
      return res.status(404).json({ success: false, error: 'Webinar not found' });
    }

    // 2. Check not past
    if (new Date(webinar.scheduledAt) <= new Date()) {
      return res.status(400).json({ success: false, error: 'Cannot cancel registration for a past webinar' });
    }

    // 3. Delete registration — if not found, 404
    const result = await prisma.webinarRegistration.deleteMany({
      where: { webinarId: id, userId: req.user.id },
    });

    if (result.count === 0) {
      return res.status(404).json({ success: false, error: 'You are not registered for this webinar' });
    }

    res.json({ success: true, data: { message: 'Registration cancelled successfully' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
