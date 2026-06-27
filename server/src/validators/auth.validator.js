const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const forgotPinSchema = z.object({
  email: z.string().email(),
});

const verifyOTPSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

const resetPinSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPin: z.string().min(4).max(6),
});

const changePinSchema = z.object({
  currentPin: z.string().min(4),
  newPin: z.string().min(4).max(6),
});

const biometricSchema = z.object({
  enabled: z.boolean(),
});

module.exports = {
  loginSchema,
  forgotPinSchema,
  verifyOTPSchema,
  resetPinSchema,
  changePinSchema,
  biometricSchema,
};
