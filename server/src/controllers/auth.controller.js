const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { generateOTP, getOTPExpiry } = require('../utils/otp');
const { sendOTPEmail } = require('../config/mailer');
const {
  loginSchema,
  forgotPinSchema,
  verifyOTPSchema,
  resetPinSchema,
  changePinSchema,
  biometricSchema,
} = require('../validators/auth.validator');

const signAccessToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

const signRefreshToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });

const login = asyncHandler(async (req, res) =>
{
  console.log('Login request body:', req.body); // Debugging line
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const { email, password } = parsed.data;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  console.log('Access Token:', accessToken); // Debugging line
  console.log('Refresh Token:', refreshToken);
  console.log('User:', user);   // Debugging line
  res.json({ accessToken, refreshToken, user });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const user = await User.findById(decoded.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });

  res.json({ accessToken: signAccessToken(user._id) });
});

const forgotPin = asyncHandler(async (req, res) => {
  const parsed = forgotPinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const { email } = parsed.data;
  const user = await User.findOne({ email });
  if (!user) return res.json({ message: 'If this email exists, an OTP has been sent' });

  const otp = generateOTP();
  user.otpCode = otp;
  user.otpExpiry = getOTPExpiry();
  await user.save();

  await sendOTPEmail(email, otp);
  res.json({ message: 'If this email exists, an OTP has been sent' });
});

const verifyOTP = asyncHandler(async (req, res) => {
  const parsed = verifyOTPSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const { email, otp } = parsed.data;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'Invalid OTP' });
  if (!user.otpCode || user.otpCode !== otp) return res.status(400).json({ error: 'Invalid OTP' });
  if (new Date() > user.otpExpiry) return res.status(400).json({ error: 'OTP has expired' });

  res.json({ valid: true });
});

const resetPin = asyncHandler(async (req, res) => {
  const parsed = resetPinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const { email, otp, newPin } = parsed.data;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'Invalid request' });
  if (!user.otpCode || user.otpCode !== otp) return res.status(400).json({ error: 'Invalid OTP' });
  if (new Date() > user.otpExpiry) return res.status(400).json({ error: 'OTP has expired' });

  user.appPin = await bcrypt.hash(newPin, parseInt(process.env.BCRYPT_ROUNDS, 10) || 12);
  user.otpCode = null;
  user.otpExpiry = null;
  await user.save();

  res.json({ message: 'PIN reset successfully' });
});

const logout = asyncHandler(async (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

const changePin = asyncHandler(async (req, res) => {
  const parsed = changePinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const { currentPin, newPin } = parsed.data;
  const user = await User.findById(req.user._id);
  if (!user.appPin) return res.status(400).json({ error: 'No PIN set. Use forgot PIN flow.' });

  const match = await bcrypt.compare(currentPin, user.appPin);
  if (!match) return res.status(401).json({ error: 'Current PIN is incorrect' });

  user.appPin = await bcrypt.hash(newPin, parseInt(process.env.BCRYPT_ROUNDS, 10) || 12);
  await user.save();
  res.json({ message: 'PIN changed successfully' });
});

const toggleBiometric = asyncHandler(async (req, res) => {
  const parsed = biometricSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { biometricEnabled: parsed.data.enabled },
    { new: true }
  );
  res.json({ biometricEnabled: user.biometricEnabled });
});

module.exports = { login, refresh, forgotPin, verifyOTP, resetPin, logout, getMe, changePin, toggleBiometric };
