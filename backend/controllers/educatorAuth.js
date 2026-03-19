const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { sendVerificationOTP, sendPasswordResetOTP } = require('../utils/email');

const ROLE = 'educator';

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

const sanitizeEducator = (user) => ({
  id: user.id,
  organizationName: user.name,
  username: user.username,
  email: user.email,
  role: user.role,
});

exports.requestEducatorSignup = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingEducator = await prisma.user.findFirst({
      where: { email, role: ROLE },
    });

    if (existingEducator && existingEducator.isVerified) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    if (existingEducator) {
      await prisma.user.update({
        where: { id: existingEducator.id },
        data: {
          emailVerificationOtp: otp,
          emailVerificationExpires: otpExpires,
        },
      });
    } else {
      const temporaryPasswordHash = await bcrypt.hash(`temporary_${Date.now()}`, 12);

      await prisma.user.create({
        data: {
          name: 'Pending',
          email,
          username: `temp_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          passwordHash: temporaryPasswordHash,
          role: ROLE,
          isVerified: false,
          emailVerificationOtp: otp,
          emailVerificationExpires: otpExpires,
        },
      });
    }

    await sendVerificationOTP(email, otp, 'educator');

    return res.status(200).json({
      success: true,
      message: 'Verification OTP sent to your email',
    });
  } catch (err) {
    console.error('Educator request signup failed:', err);
    return res.status(500).json({ error: 'Failed to process signup request' });
  }
};

exports.verifyEducatorOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const educator = await prisma.user.findFirst({
      where: {
        email,
        role: ROLE,
        emailVerificationOtp: otp,
        emailVerificationExpires: { gt: new Date() },
      },
      select: { email: true },
    });

    if (!educator) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      email: educator.email,
    });
  } catch (err) {
    console.error('Educator OTP verification failed:', err);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

exports.completeEducatorSignup = async (req, res) => {
  try {
    const { email, otp, organizationName, username, password } = req.body;

    if (!email || !otp || !organizationName || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const educator = await prisma.user.findFirst({
      where: {
        email,
        role: ROLE,
        emailVerificationOtp: otp,
        emailVerificationExpires: { gt: new Date() },
      },
    });

    if (!educator) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const existingUsername = await prisma.user.findFirst({ where: { username } });
    if (existingUsername && existingUsername.id !== educator.id) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const updatedEducator = await prisma.user.update({
      where: { id: educator.id },
      data: {
        name: organizationName,
        username,
        passwordHash,
        isVerified: true,
        emailVerificationOtp: null,
        emailVerificationExpires: null,
      },
    });

    const token = generateToken(updatedEducator.id, updatedEducator.role);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      user: sanitizeEducator(updatedEducator),
    });
  } catch (err) {
    console.error('Complete educator signup failed:', err);
    return res.status(500).json({ error: 'Failed to complete signup' });
  }
};

exports.loginEducator = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const educator = await prisma.user.findFirst({
      where: { username, role: ROLE },
    });

    if (!educator) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!educator.isVerified) {
      return res.status(401).json({ error: 'Please verify your email first' });
    }

    const isPasswordValid = await bcrypt.compare(password, educator.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(educator.id, educator.role);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      user: sanitizeEducator(educator),
    });
  } catch (err) {
    console.error('Educator login failed:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
};

exports.getEducatorProfile = async (req, res) => {
  try {
    const educator = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
      },
    });

    if (!educator || educator.role !== ROLE) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: educator.id,
        organizationName: educator.name,
        username: educator.username,
        email: educator.email,
        role: educator.role,
      },
    });
  } catch (err) {
    console.error('Get educator profile failed:', err);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
};

exports.logoutEducator = async (req, res) => {
  try {
    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Educator logout failed:', err);
    return res.status(500).json({ error: 'Logout failed' });
  }
};

exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const educator = await prisma.user.findFirst({
      where: { email, role: ROLE, isVerified: true },
    });

    if (!educator) {
      return res.status(404).json({ error: 'No verified account found with this email' });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: educator.id },
      data: {
        passwordResetOtp: otp,
        passwordResetExpires: otpExpires,
      },
    });

    await sendPasswordResetOTP(email, otp);

    return res.status(200).json({
      success: true,
      message: 'Password reset OTP sent to your email',
    });
  } catch (err) {
    console.error('Educator password reset request failed:', err);
    return res.status(500).json({ error: 'Failed to send password reset OTP' });
  }
};

exports.verifyPasswordResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const educator = await prisma.user.findFirst({
      where: {
        email,
        role: ROLE,
        passwordResetOtp: otp,
        passwordResetExpires: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!educator) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (err) {
    console.error('Educator password reset OTP verification failed:', err);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    const educator = await prisma.user.findFirst({
      where: {
        email,
        role: ROLE,
        passwordResetOtp: otp,
        passwordResetExpires: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!educator) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: educator.id },
      data: {
        passwordHash,
        passwordResetOtp: null,
        passwordResetExpires: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (err) {
    console.error('Educator reset password failed:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    const educator = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true, passwordHash: true },
    });

    if (!educator || educator.role !== ROLE) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, educator.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: educator.id },
      data: { passwordHash },
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err) {
    console.error('Educator change password failed:', err);
    return res.status(500).json({ error: 'Failed to change password' });
  }
};
