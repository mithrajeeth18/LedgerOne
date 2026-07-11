const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('../middleware/auth.middleware');
const { bulkImport } = require('../controllers/bulk.controller');

// 5 bulk import requests per hour per IP
const bulkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many import requests. Maximum 5 bulk imports per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(verifyToken);

router.post('/import', bulkLimiter, bulkImport);

module.exports = router;
