const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlementController');
const { protect } = require('../middleware/auth');
const { validateSettlement } = require('../middleware/validator');

router.get('/', protect, settlementController.getSettlements);
router.get('/balances/:groupId', protect, settlementController.getBalancesAndSuggestions);
router.post('/', protect, validateSettlement, settlementController.createSettlement);

module.exports = router;
