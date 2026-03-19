const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'DC_Admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'DC_Admin!123';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@dreamcrafters.com';

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role,
});

exports.loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    let admin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (!admin) {
      admin = await prisma.user.create({
        data: {
          name: 'System Administrator',
          username: ADMIN_USERNAME,
          email: ADMIN_EMAIL,
          passwordHash: adminPasswordHash,
          role: 'admin',
          isVerified: true,
        },
      });
    } else if (admin.role !== 'admin' || admin.username !== ADMIN_USERNAME) {
      admin = await prisma.user.update({
        where: { id: admin.id },
        data: {
          role: 'admin',
          username: ADMIN_USERNAME,
          isVerified: true,
        },
      });
    }

    const token = generateToken(admin.id, admin.role);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      user: sanitizeUser(admin),
    });
  } catch (err) {
    console.error('Admin login failed:', err);
    return res.status(500).json({ error: 'Admin login failed' });
  }
};

exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
      },
    });

    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ error: 'Admin not found' });
    }

    return res.status(200).json({ success: true, user: admin });
  } catch (err) {
    console.error('Get admin profile failed:', err);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
};

exports.logoutAdmin = async (req, res) => {
  try {
    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Admin logout failed:', err);
    return res.status(500).json({ error: 'Logout failed' });
  }
};
