const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  appPin: { type: String, default: null },
  biometricEnabled: { type: Boolean, default: false },
  otpCode: { type: String, default: null },
  otpExpiry: { type: Date, default: null },
}, { timestamps: true });

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.appPin;
  delete obj.otpCode;
  delete obj.otpExpiry;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
