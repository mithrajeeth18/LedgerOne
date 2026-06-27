const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { createReminder, getReminders, deleteReminder } = require('../controllers/reminder.controller');

router.use(verifyToken);

router.post('/', createReminder);
router.get('/', getReminders);
router.delete('/:id', deleteReminder);

module.exports = router;
