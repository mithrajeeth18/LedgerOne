const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { createPenalty, getPenaltiesForLoan } = require('../controllers/penalty.controller');

router.use(verifyToken);

router.post('/', createPenalty);
router.get('/loan/:loanId', getPenaltiesForLoan);

module.exports = router;
