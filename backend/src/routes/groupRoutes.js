const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const { validateGroup } = require('../middleware/validator');

router.get('/', protect, groupController.getGroups);
router.post('/', protect, validateGroup, groupController.createGroup);
router.post('/join', protect, groupController.joinGroupByCode);
router.get('/:id', protect, groupController.getGroupById);
router.put('/:id', protect, groupController.updateGroup);
router.patch('/:id', protect, groupController.updateGroup);
router.delete('/:id', protect, groupController.deleteGroup);
router.post('/:id/members/guest', protect, groupController.addGuestMember);

module.exports = router;
