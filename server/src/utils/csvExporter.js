const { Transform } = require('stream');

function createExpenseCsvTransform() {
    let isHeaderWritten = false;

    return new Transform({
        objectMode: true,
        transform(expense, encoding, callback) {
            let chunk = '';
            if (!isHeaderWritten) {
                chunk += 'Expense ID,Date,Title,Category,Amount (INR),Paid By,Split Type,Participants,Receipt\n';
                isHeaderWritten = true;
            }

            const participantsStr = Array.isArray(expense.participants) 
                ? expense.participants.join('; ') 
                : '';
            const receiptStr = expense.receiptUrl ? expense.receiptUrl : 'None';
            const dateStr = expense.date ? new Date(expense.date).toISOString().split('T')[0] : '';

            const cleanTitle = (expense.title || '').replace(/"/g, '""');
            const cleanPayer = (expense.payerName || expense.payerId || '').replace(/"/g, '""');

            chunk += `"${expense.expenseId}","${dateStr}","${cleanTitle}","${expense.category}",${expense.amount},"${cleanPayer}","${expense.splitType}","${participantsStr}","${receiptStr}"\n`;

            callback(null, chunk);
        }
    });
}

module.exports = {
    createExpenseCsvTransform
};
