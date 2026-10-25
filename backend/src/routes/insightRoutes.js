const express = require('express');
const router = express.Router();
const insightController = require('../controllers/insightController');
const { protect } = require('../middleware/auth');

router.get('/group/:groupId', protect, insightController.getGroupInsights);
router.get('/user', protect, insightController.getUserInsights);


module.exports = router;

