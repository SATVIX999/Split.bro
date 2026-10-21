const AppError = require('../utils/AppError');

function calculateShares(amount, splitType, participants, rawShares = {}) {
    if (!Array.isArray(participants) || participants.length === 0) {
        throw new AppError('At least one participant is required for splitting an expense', 400);
    }

    const totalAmount = Number(parseFloat(amount).toFixed(2));
    if (isNaN(totalAmount) || totalAmount <= 0) {
        throw new AppError('Expense amount must be a positive number', 400);
    }

    const calculatedShares = {};
    const count = participants.length;

    if (splitType === 'equal') {
        // Integer minor unit calculation to prevent rounding drift
        const totalCents = Math.round(totalAmount * 100);
        const baseShareCents = Math.floor(totalCents / count);
        let remainderCents = totalCents % count;

        participants.forEach((memberId) => {
            const extra = remainderCents > 0 ? 1 : 0;
            if (remainderCents > 0) remainderCents--;
            calculatedShares[memberId] = (baseShareCents + extra) / 100;
        });

    } else if (splitType === 'percentage') {
        let totalPercentage = 0;
        participants.forEach(memberId => {
            const pct = Number(rawShares[memberId] || 0);
            totalPercentage += pct;
        });

        if (Math.abs(totalPercentage - 100) > 0.1) {
            throw new AppError(`Total percentage must equal 100% (received ${totalPercentage.toFixed(1)}%)`, 400);
        }

        let allocatedCents = 0;
        const totalCents = Math.round(totalAmount * 100);

        participants.forEach((memberId, idx) => {
            if (idx === count - 1) {
                // Last participant receives exact remaining cents to ensure 100% match
                calculatedShares[memberId] = (totalCents - allocatedCents) / 100;
            } else {
                const pct = Number(rawShares[memberId] || 0);
                const shareCents = Math.round((totalCents * pct) / 100);
                allocatedCents += shareCents;
                calculatedShares[memberId] = shareCents / 100;
            }
        });

    } else if (splitType === 'custom') {
        let sumCustom = 0;
        participants.forEach(memberId => {
            const val = Number(parseFloat(rawShares[memberId] || 0).toFixed(2));
            if (val < 0) {
                throw new AppError(`Share for member ${memberId} cannot be negative`, 400);
            }
            calculatedShares[memberId] = val;
            sumCustom += val;
        });

        sumCustom = Number(sumCustom.toFixed(2));
        if (Math.abs(sumCustom - totalAmount) > 0.05) {
            throw new AppError(`Sum of custom shares (₹${sumCustom}) does not match expense amount (₹${totalAmount})`, 400);
        }

        // Reconcile minor penny difference into the first participant
        const diff = Number((totalAmount - sumCustom).toFixed(2));
        if (diff !== 0 && participants.length > 0) {
            calculatedShares[participants[0]] = Number((calculatedShares[participants[0]] + diff).toFixed(2));
        }

    } else {
        throw new AppError(`Unsupported split type: ${splitType}`, 400);
    }

    return calculatedShares;
}

module.exports = {
    calculateShares
};
