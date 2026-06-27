const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  markPayment,
  updatePayment,
  getTodayPayments,
  syncPayments,
  getPaymentsForLoan,
} = require('../controllers/payment.controller');

router.use(verifyToken);

router.post('/', markPayment);
router.get('/today', getTodayPayments);
router.post('/sync', syncPayments);
router.get('/loan/:loanId', getPaymentsForLoan);
router.put('/:id', updatePayment);

module.exports = router;
