# Split Bro — JavaScript Fundamentals & Asynchronous Programming

**Course:** Back End Engineering & Full-Stack Web Development  
**Module:** Modern JavaScript (ES6+), Higher-Order Functions & Asynchronous Architecture  
**Application Context:** Split Bro Shared-Expense Platform  

---

## 1. Overview of JavaScript Foundations in Split Bro

Split Bro leverages modern ECMAScript standards (ES6 through ES2023) for mathematical precision in expense distribution, clean state management, and reliable client-server communication. This document presents real patterns used in Split Bro demonstrating the university syllabus requirements.

---

## 2. ES6+ Core Language Features in Practice

### 2.1 Destructuring, Rest/Spread Operators, and Template Literals
In Split Bro, destructuring and spread operators prevent side effects and create immutable state snapshots.

```javascript
// Example from Split Bro Group and Expense Services:
const createExpensePayload = (rawFormData, currentUserId) => {
    // Object destructuring with defaults and renaming
    const {
        title,
        amount: rawAmount,
        category = 'Other',
        payerId = currentUserId,
        splitType,
        participants = [],
        ...extraMetadata // Rest operator collecting extra fields
    } = rawFormData;

    const amount = Number(parseFloat(rawAmount).toFixed(2));

    // Spread operator for immutable object creation
    return {
        title: title.trim(),
        amount,
        category,
        payerId,
        splitType,
        participants: [...new Set(participants)], // Array spread + Set for deduplication
        ...extraMetadata,
        createdAt: new Date().toISOString()
    };
};
```

---

## 3. Higher-Order Array Methods (`map`, `filter`, `reduce`, `forEach`)

Split Bro's business logic relies heavily on functional array operations rather than imperative for-loops to maintain algorithmic clarity and avoid mutation bugs.

### 3.1 `reduce()` for Net Balances and Category Aggregations
Calculating the net balance for each member across all group expenses:

```javascript
/**
 * Calculates net balance per member across expenses and recorded settlements.
 * @param {Array} members - List of group member IDs
 * @param {Array} expenses - List of group expense objects
 * @param {Array} settlements - List of completed settlement transactions
 * @returns {Object} Map of memberId -> netBalance (positive = owed money, negative = owes money)
 */
function calculateGroupBalances(members, expenses, settlements = []) {
    // 1. Initialize balances map using reduce
    const initialBalances = members.reduce((acc, member) => {
        const id = typeof member === 'object' ? member.memberId || member.userId : member;
        acc[id] = 0;
        return acc;
    }, {});

    // 2. Aggregate expenses using forEach and reduce
    const balancesWithExpenses = expenses.reduce((balances, expense) => {
        const { payerId, amount, shares } = expense;

        // Payer is credited the total amount they paid upfront
        if (balances[payerId] !== undefined) {
            balances[payerId] += amount;
        }

        // Each participant is debited their share
        Object.entries(shares).forEach(([memberId, shareAmount]) => {
            if (balances[memberId] !== undefined) {
                balances[memberId] -= shareAmount;
            }
        });

        return balances;
    }, { ...initialBalances });

    // 3. Reconcile recorded settlements
    const finalBalances = settlements.reduce((balances, settlement) => {
        const { from, to, amount } = settlement;
        if (balances[from] !== undefined) balances[from] += amount; // Debtor paid, balance improves
        if (balances[to] !== undefined) balances[to] -= amount;     // Creditor received, balance adjusts
        return balances;
    }, balancesWithExpenses);

    // Round all balances to 2 decimal places to eliminate floating point drift
    Object.keys(finalBalances).forEach(key => {
        finalBalances[key] = Math.round(finalBalances[key] * 100) / 100;
    });

    return finalBalances;
}
```

### 3.2 `filter()` and `map()` for Debt Simplification
Separating net creditors and debtors to feed into the debt simplification algorithm:

```javascript
function simplifyDebts(balances) {
    // map() and filter() to segregate and normalize creditors and debtors
    const creditors = Object.entries(balances)
        .filter(([, balance]) => balance > 0.01)
        .map(([memberId, balance]) => ({ memberId, amount: balance }))
        .sort((a, b) => b.amount - a.amount);

    const debtors = Object.entries(balances)
        .filter(([, balance]) => balance < -0.01)
        .map(([memberId, balance]) => ({ memberId, amount: Math.abs(balance) }))
        .sort((a, b) => b.amount - a.amount);

    const transactions = [];
    let i = 0;
    let j = 0;

    while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];
        const settlementAmount = Math.min(creditor.amount, debtor.amount);
        const roundedAmount = Math.round(settlementAmount * 100) / 100;

        transactions.push({
            from: debtor.memberId,
            to: creditor.memberId,
            amount: roundedAmount
        });

        creditor.amount = Math.round((creditor.amount - roundedAmount) * 100) / 100;
        debtor.amount = Math.round((debtor.amount - roundedAmount) * 100) / 100;

        if (creditor.amount <= 0.01) i++;
        if (debtor.amount <= 0.01) j++;
    }

    return transactions;
}
```

---

## 4. Storage Strategies: Local Storage vs Session Storage

Split Bro delineates between client-side persistence mechanisms according to security and lifecycle requirements:

| Storage Type | Split Bro Usage | Justification |
| :--- | :--- | :--- |
| **Local Storage** | UI Theme preference (`theme: 'dark'`), selected active group ID (`selectedGroupId`), collapsed sidebar state. | Persists across browser restarts without sensitive authorization exposure. |
| **Session Storage** | Temporary multi-step expense wizard draft (`expense_form_draft`), transient filter states. | Automatically wiped when the browser tab closes; prevents stale draft leakage on shared computers. |
| **HTTP-Only Cookies / Auth Context (In-Memory)** | JWT Access Token, User Session Profile. | Protected against XSS attacks; not stored permanently in plaintext storage. |

---

## 5. Asynchronous JavaScript Evolution: Callbacks, Promises, and Async/Await

### 5.1 Callback Pattern (Node.js style)
Demonstrated in the legacy fs module:
```javascript
const fs = require('fs');

function loadLegacyDatabase(callback) {
    fs.readFile('./db.json', 'utf8', (err, data) => {
        if (err) return callback(err, null);
        try {
            const parsed = JSON.parse(data);
            callback(null, parsed);
        } catch (parseErr) {
            callback(parseErr, null);
        }
    });
}
```

### 5.2 Promise Chaining Pattern (`.then()`, `.catch()`, `.finally()`)
Handling asynchronous operations with explicit chaining:
```javascript
function fetchGroupDetailsPromise(groupId) {
    return fetch(`/api/groups/${groupId}`)
        .then(response => {
            if (!response.ok) {
                return response.json().then(errData => {
                    throw new Error(errData.message || `HTTP ${response.status}`);
                });
            }
            return response.json();
        })
        .then(group => {
            console.log('Group loaded successfully:', group.groupName);
            return group;
        })
        .catch(error => {
            console.error('Promise rejection in fetchGroupDetails:', error.message);
            throw error;
        })
        .finally(() => {
            console.log('Fetch attempt completed');
        });
}
```

### 5.3 Modern `async/await` with `try/catch/finally`
The production standard implemented across Split Bro:
```javascript
async function submitExpenseAsync(expenseData, { onStart, onSuccess, onError, onComplete }) {
    if (typeof onStart === 'function') onStart();

    try {
        const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(expenseData)
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const errorMessage = data?.message || `Request failed with status ${response.status}`;
            const error = new Error(errorMessage);
            error.status = response.status;
            error.details = data;
            throw error;
        }

        if (typeof onSuccess === 'function') onSuccess(data);
        return data;
    } catch (err) {
        const normalizedError = err instanceof Error ? err : new Error('Network error occurred');
        if (typeof onError === 'function') onError(normalizedError);
        throw normalizedError;
    } finally {
        if (typeof onComplete === 'function') onComplete();
    }
}
```

---

## 6. Asynchronous UI States & Error Handling Guarantees

In modern web applications, every asynchronous request must guarantee:
1. **Loading State:** Disable submit buttons, display loading spinners to prevent duplicate double-submits.
2. **Success State:** Clear inputs, render dismissable toast alerts, update reactive state.
3. **Empty State:** When arrays return `[]`, display friendly instructions ("No expenses yet. Add your first expense above!").
4. **Error State:** Human-readable explanations on 4xx/5xx responses rather than silent UI freezes.
5. **Network Resilience:** Gracefully catch offline or aborted `AbortController` signals.

These principles are implemented in both the Vanilla JS controllers and the migrated React components.
