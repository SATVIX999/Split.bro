const AppError = require('../utils/AppError');

function calculateBalances(members = [], expenses = [], settlements = []) {
    const balances = {};

    members.forEach(member => {
        const id = typeof member === 'object' && member !== null
            ? (member.memberId || member.userId)
            : String(member);
        if (id) balances[id] = 0;
    });

    expenses.forEach(expense => {
        const payer = expense.payerId;
        const amount = Number(expense.amount || 0);

        if (balances[payer] === undefined) {
            balances[payer] = 0;
        }
        balances[payer] += amount;

        const shares = expense.shares instanceof Map
            ? Object.fromEntries(expense.shares)
            : (expense.shares || {});

        Object.entries(shares).forEach(([memberId, shareAmount]) => {
            if (balances[memberId] === undefined) {
                balances[memberId] = 0;
            }
            balances[memberId] -= Number(shareAmount || 0);
        });
    });

    settlements.forEach(settlement => {
        const from = settlement.from;
        const to = settlement.to;
        const amount = Number(settlement.amount || 0);

        if (balances[from] === undefined) balances[from] = 0;
        if (balances[to] === undefined) balances[to] = 0;

        balances[from] += amount; // Debtor paid, balance increases
        balances[to] -= amount;   // Creditor received, balance decreases
    });

    Object.keys(balances).forEach(id => {
        balances[id] = Number(balances[id].toFixed(2));
        if (Math.abs(balances[id]) < 0.01) {
            balances[id] = 0;
        }
    });

    return balances;
}

function simplifyDebts(balances = {}) {
    const creditors = [];
    const debtors = [];

    Object.entries(balances).forEach(([memberId, balance]) => {
        if (balance > 0.01) {
            creditors.push({ memberId, amount: balance });
        } else if (balance < -0.01) {
            debtors.push({ memberId, amount: Math.abs(balance) });
        }
    });

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const transactions = [];
    let i = 0;
    let j = 0;

    while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];

        const settlementAmount = Math.min(creditor.amount, debtor.amount);
        const roundedAmount = Number(settlementAmount.toFixed(2));

        if (roundedAmount > 0) {
            transactions.push({
                from: debtor.memberId,
                to: creditor.memberId,
                amount: roundedAmount
            });
        }

        creditor.amount = Number((creditor.amount - roundedAmount).toFixed(2));
        debtor.amount = Number((debtor.amount - roundedAmount).toFixed(2));

        if (creditor.amount <= 0.01) i++;
        if (debtor.amount <= 0.01) j++;
    }

    return transactions;
}

function validateSettlement(from, to, amount, groupMembers = []) {
    if (!from || !to) {
        throw new AppError('Both debtor (from) and creditor (to) are required', 400);
    }
    if (from === to) {
        throw new AppError('A user cannot record a settlement with themselves', 400);
    }
    const parsedAmount = Number(parseFloat(amount).toFixed(2));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new AppError('Settlement amount must be greater than zero', 400);
    }

    if (groupMembers.length > 0) {
        const memberIds = groupMembers.map(m => typeof m === 'object' ? (m.memberId || m.userId) : String(m));
        if (!memberIds.includes(from)) {
            throw new AppError(`Payer '${from}' is not a member of this group`, 400);
        }
        if (!memberIds.includes(to)) {
            throw new AppError(`Recipient '${to}' is not a member of this group`, 400);
        }
    }

    return parsedAmount;
}

module.exports = {
    calculateBalances,
    simplifyDebts,
    validateSettlement
};
