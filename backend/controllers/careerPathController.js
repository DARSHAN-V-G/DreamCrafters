const prisma = require('../lib/prisma');

// ════════════════════════════════════════════
// GET /api/categories — Nested category tree
// ════════════════════════════════════════════
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany();

    // Build nested tree in JavaScript
    const map = {};
    const roots = [];

    categories.forEach((r) => {
      map[r.id] = { ...r, children: [] };
    });

    categories.forEach((r) => {
      if (r.parentId && map[r.parentId]) {
        map[r.parentId].children.push(map[r.id]);
      } else {
        roots.push(map[r.id]);
      }
    });

    res.json({ success: true, data: roots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// GET /api/career-paths — List career paths
// ════════════════════════════════════════════
exports.listCareerPaths = async (req, res) => {
  try {
    const { field, search } = req.query;

    const where = {};
    if (field) where.field = { contains: field, mode: 'insensitive' };
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const careerPaths = await prisma.careerPath.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const data = careerPaths.map((cp) => ({
      id: cp.id,
      title: cp.title,
      description: cp.description,
      field: cp.field,
      requiredSkills: cp.requiredSkills,
      avgSalaryRange: cp.avgSalaryRange,
      createdAt: cp.createdAt,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// GET /api/career-paths/:id — Career path with linked content
// ════════════════════════════════════════════
exports.getCareerPathById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid career path ID' });
    }

    const careerPath = await prisma.careerPath.findUnique({
      where: { id },
    });

    if (!careerPath) {
      return res.status(404).json({ success: false, error: 'Career path not found' });
    }

    // Shape response
    const data = {
      id: careerPath.id,
      title: careerPath.title,
      description: careerPath.description,
      field: careerPath.field,
      requiredSkills: careerPath.requiredSkills,
      avgSalaryRange: careerPath.avgSalaryRange,
      createdAt: careerPath.createdAt,
    };

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// POST /api/career-paths — Create career path (admin only)
// ════════════════════════════════════════════
exports.createCareerPath = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Admin only.' });
    }

    const { title, description, field, required_skills, avg_salary_range } = req.body;

    const careerPath = await prisma.careerPath.create({
      data: {
        title,
        description: description || null,
        field: field || null,
        requiredSkills: required_skills || [],
        avgSalaryRange: avg_salary_range || null,
      },
    });

    res.status(201).json({ success: true, data: careerPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// PUT /api/career-paths/:id — Update career path (admin only)
// ════════════════════════════════════════════
exports.updateCareerPath = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Admin only.' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid career path ID' });
    }

    const existing = await prisma.careerPath.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Career path not found' });
    }

    // Build partial update
    const updateData = {};
    const allowedFields = {
      title: 'title',
      description: 'description',
      field: 'field',
      required_skills: 'requiredSkills',
      avg_salary_range: 'avgSalaryRange',
    };

    for (const [bodyKey, prismaKey] of Object.entries(allowedFields)) {
      if (req.body[bodyKey] !== undefined) {
        updateData[prismaKey] = req.body[bodyKey];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const updated = await prisma.careerPath.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ════════════════════════════════════════════
// DELETE /api/career-paths/:id — Delete career path (admin only)
// ════════════════════════════════════════════
exports.deleteCareerPath = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Admin only.' });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid career path ID' });
    }

    const existing = await prisma.careerPath.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Career path not found' });
    }

    await prisma.careerPath.delete({ where: { id } });

    res.json({ success: true, data: { message: 'Career path deleted successfully' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};


