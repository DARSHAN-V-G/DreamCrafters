const prisma = require('../lib/prisma');

const isMentorRole = (role) => role === 'mentor' || role === 'educator';

// GET /api/educators
exports.listEducators = async (_req, res) => {
  try {
    const educators = await prisma.user.findMany({
      where: {
        role: { in: ['mentor', 'educator'] },
        isVerified: true,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        location: true,
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({ success: true, data: educators });
  } catch (err) {
    console.error('listEducators error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /api/mentor-requests
exports.createRequest = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, error: 'Only students can create mentor requests' });
    }

    const mentorId = Number(req.body.mentor_id);
    const topic = String(req.body.topic || '').trim();

    if (!Number.isInteger(mentorId)) {
      return res.status(400).json({ success: false, error: 'mentor_id is required' });
    }
    if (!topic) {
      return res.status(400).json({ success: false, error: 'topic is required' });
    }

    const mentor = await prisma.user.findUnique({
      where: { id: mentorId },
      select: { id: true, role: true },
    });

    if (!mentor || !isMentorRole(mentor.role)) {
      return res.status(404).json({ success: false, error: 'Educator not found' });
    }

    const existingPending = await prisma.mentorSession.findFirst({
      where: {
        studentId: req.user.id,
        mentorId,
        topic,
        status: 'requested',
      },
      select: { id: true },
    });

    if (existingPending) {
      return res.status(409).json({ success: false, error: 'You already have a pending request for this educator and topic' });
    }

    const created = await prisma.mentorSession.create({
      data: {
        studentId: req.user.id,
        mentorId,
        topic,
        status: 'requested',
      },
      include: {
        mentor: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('createRequest error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// GET /api/mentor-requests
exports.listRequests = async (req, res) => {
  try {
    const status = req.query.status;
    const where = {};

    if (status) {
      where.status = status;
    }

    if (req.user.role === 'student') {
      where.studentId = req.user.id;
    } else if (isMentorRole(req.user.role)) {
      where.mentorId = req.user.id;
    } else {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const requests = await prisma.mentorSession.findMany({
      where,
      include: {
        mentor: { select: { id: true, name: true, username: true } },
        student: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: requests });
  } catch (err) {
    console.error('listRequests error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /api/mentor-requests/:id/accept
exports.acceptRequest = async (req, res) => {
  try {
    if (!isMentorRole(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Only educators can accept requests' });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, error: 'Invalid request ID' });
    }

    const existing = await prisma.mentorSession.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    if (existing.mentorId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You can only manage your own requests' });
    }
    if (existing.status !== 'requested') {
      return res.status(400).json({ success: false, error: 'This request has already been handled' });
    }

    const updated = await prisma.mentorSession.update({
      where: { id },
      data: { status: 'accepted' },
      include: {
        mentor: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('acceptRequest error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PATCH /api/mentor-requests/:id/reject
exports.rejectRequest = async (req, res) => {
  try {
    if (!isMentorRole(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Only educators can reject requests' });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, error: 'Invalid request ID' });
    }

    const existing = await prisma.mentorSession.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    if (existing.mentorId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You can only manage your own requests' });
    }
    if (existing.status !== 'requested') {
      return res.status(400).json({ success: false, error: 'This request has already been handled' });
    }

    const updated = await prisma.mentorSession.update({
      where: { id },
      data: { status: 'rejected' },
      include: {
        mentor: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('rejectRequest error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// DELETE /api/mentor-requests/:id
exports.withdrawRequest = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, error: 'Only students can withdraw requests' });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, error: 'Invalid request ID' });
    }

    const existing = await prisma.mentorSession.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    if (existing.studentId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You can only withdraw your own requests' });
    }
    if (existing.status !== 'requested') {
      return res.status(400).json({ success: false, error: 'Cannot withdraw a request that has already been handled' });
    }

    await prisma.mentorSession.delete({ where: { id } });

    res.status(200).json({ success: true, data: { message: 'Request withdrawn' } });
  } catch (err) {
    console.error('withdrawRequest error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
