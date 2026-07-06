const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  getLoansForCustomer,
  getLoan,
  createLoan,
  closeLoan,
  rolloverLoan,
  markOverdue,
  editLoan,
} = require('../controllers/loan.controller');

router.use(verifyToken);

router.get('/customer/:customerId', getLoansForCustomer);
router.post('/', createLoan);
router.get('/:id', getLoan);
router.put('/:id/close', closeLoan);
router.post('/:id/rollover', rolloverLoan);
router.put('/:id/overdue', markOverdue);
router.put('/:id/edit', editLoan);

module.exports = router;
