const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { sendVerificationOTP, sendPasswordResetOTP } = require('../utils/email');

const ROLE = 'student';

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

const sanitizeStudent = (user) => ({
  id: user.id,
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role,
});

exports.requestStudentSignup = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingStudent = await prisma.user.findFirst({
      where: { email, role: ROLE },
    });

    if (existingStudent && existingStudent.isVerified) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    if (existingStudent) {
      await prisma.user.update({
        where: { id: existingStudent.id },
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

    await sendVerificationOTP(email, otp, 'student');

    return res.status(200).json({
      success: true,
      message: 'Verification OTP sent to your email',
    });
  } catch (err) {
    console.error('Student request signup failed:', err);
    return res.status(500).json({ error: 'Failed to process signup request' });
  }
};

exports.verifyStudentOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const student = await prisma.user.findFirst({
      where: {
        email,
        role: ROLE,
        emailVerificationOtp: otp,
        emailVerificationExpires: { gt: new Date() },
      },
      select: { email: true },
    });

    if (!student) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      email: student.email,
    });
  } catch (err) {
    console.error('Student OTP verification failed:', err);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

exports.completeStudentSignup = async (req, res) => {
  try {
    const { email, otp, name, username, password } = req.body;

    if (!email || !otp || !name || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const student = await prisma.user.findFirst({
      where: {
        email,
        role: ROLE,
        emailVerificationOtp: otp,
        emailVerificationExpires: { gt: new Date() },
      },
    });

    if (!student) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const existingUsername = await prisma.user.findFirst({ where: { username } });
    if (existingUsername && existingUsername.id !== student.id) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const updatedStudent = await prisma.user.update({
      where: { id: student.id },
      data: {
        name,
        username,
        passwordHash,
        isVerified: true,
        emailVerificationOtp: null,
        emailVerificationExpires: null,
      },
    });

    const token = generateToken(updatedStudent.id, updatedStudent.role);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      user: sanitizeStudent(updatedStudent),
    });
  } catch (err) {
    console.error('Complete student signup failed:', err);
    return res.status(500).json({ error: 'Failed to complete signup' });
  }
};

exports.loginStudent = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const student = await prisma.user.findFirst({
      where: { username, role: ROLE },
    });

    if (!student) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!student.isVerified) {
      return res.status(401).json({ error: 'Please verify your email first' });
    }

    const isPasswordValid = await bcrypt.compare(password, student.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(student.id, student.role);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      user: sanitizeStudent(student),
    });
  } catch (err) {
    console.error('Student login failed:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
};

exports.getStudentProfile = async (req, res) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
      },
    });

    if (!student || student.role !== ROLE) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ success: true, user: student });
  } catch (err) {
    console.error('Get student profile failed:', err);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
};

exports.updateStudentProfile = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const username = req.body.username?.trim();
    const location = req.body.location?.trim();

    if (!name && !username && location === undefined) {
      return res.status(400).json({ error: 'No profile fields provided' });
    }

    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true },
    });

    if (!student || student.role !== ROLE) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username) {
      const existingUsername = await prisma.user.findFirst({
        where: {
          username,
          id: { not: student.id },
        },
        select: { id: true },
      });

      if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    const updated = await prisma.user.update({
      where: { id: student.id },
      data: {
        ...(name ? { name } : {}),
        ...(username ? { username } : {}),
        ...(location !== undefined ? { location: location || null } : {}),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        location: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updated,
    });
  } catch (err) {
    console.error('Student update profile failed:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

exports.logoutStudent = async (req, res) => {
  try {
    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Student logout failed:', err);
    return res.status(500).json({ error: 'Logout failed' });
  }
};

exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const student = await prisma.user.findFirst({
      where: { email, role: ROLE, isVerified: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'No verified account found with this email' });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: student.id },
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
    console.error('Student password reset request failed:', err);
    return res.status(500).json({ error: 'Failed to send password reset OTP' });
  }
};

exports.verifyPasswordResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const student = await prisma.user.findFirst({
      where: {
        email,
        role: ROLE,
        passwordResetOtp: otp,
        passwordResetExpires: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!student) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (err) {
    console.error('Student password reset OTP verification failed:', err);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    const student = await prisma.user.findFirst({
      where: {
        email,
        role: ROLE,
        passwordResetOtp: otp,
        passwordResetExpires: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!student) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: student.id },
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
    console.error('Student reset password failed:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true, passwordHash: true },
    });

    if (!student || student.role !== ROLE) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, student.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: student.id },
      data: { passwordHash },
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err) {
    console.error('Student change password failed:', err);
    return res.status(500).json({ error: 'Failed to change password' });
  }
};
