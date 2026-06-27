const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  getCustomers,
  getCustomersByGroup,
  createCustomer,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  getBinCustomers,
  restoreCustomer,
} = require('../controllers/customer.controller');

router.use(verifyToken);

router.get('/', getCustomers);
router.post('/', createCustomer);
router.get('/bin', getBinCustomers);
router.get('/group/:groupId', getCustomersByGroup);
router.get('/:id', getCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.post('/:id/restore', restoreCustomer);

module.exports = router;
