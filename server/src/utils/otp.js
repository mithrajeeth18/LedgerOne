const crypto = require('crypto');

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

const getOTPExpiry = () => new Date(Date.now() + 10 * 60 * 1000);

module.exports = { generateOTP, getOTPExpiry };
