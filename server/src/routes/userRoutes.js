const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/search', protect, userController.searchUsers);
router.get('/:userId', protect, userController.getUserProfile);

module.exports = router;
