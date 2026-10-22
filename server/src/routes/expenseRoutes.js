const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');
const { uploadReceipt, verifyReceiptContent } = require('../middleware/upload');
const { validateExpense } = require('../middleware/validator');

router.get('/', protect, expenseController.getExpenses);
router.get('/export/csv', protect, expenseController.exportExpensesCsv);
router.post('/scan-receipt', protect, uploadReceipt.single('receipt'), verifyReceiptContent, expenseController.scanReceipt);
router.get('/receipts/:filename', protect, expenseController.getReceipt);
router.post('/', protect, uploadReceipt.single('receipt'), verifyReceiptContent, validateExpense, expenseController.createExpense);
router.get('/:id', protect, expenseController.getExpenseById);
router.put('/:id', protect, uploadReceipt.single('receipt'), verifyReceiptContent, expenseController.updateExpense);
router.patch('/:id', protect, uploadReceipt.single('receipt'), verifyReceiptContent, expenseController.updateExpense);
router.delete('/:id', protect, expenseController.deleteExpense);

module.exports = router;
