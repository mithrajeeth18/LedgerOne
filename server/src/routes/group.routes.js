const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getBinGroups,
  restoreGroup,
  getGroupDashboard,
} = require('../controllers/group.controller');

router.use(verifyToken);

router.get('/', getGroups);
router.post('/', createGroup);
router.get('/bin', getBinGroups);
router.get('/:id/dashboard', getGroupDashboard); // <-- new dashboard endpoint
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);
router.post('/:id/restore', restoreGroup);

module.exports = router;
