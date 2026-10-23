const { calculateBalances, simplifyDebts } = require('../../src/services/settlementService');

describe('Unit Tests: Settlement & Debt Simplification Algorithm', () => {

    test('should calculate correct zero net balances for an empty group', () => {
        const members = ['ALICE', 'BOB', 'CHARLIE'];
        const balances = calculateBalances(members, [], []);

        expect(balances).toEqual({
            ALICE: 0,
            BOB: 0,
            CHARLIE: 0
        });

        const suggestions = simplifyDebts(balances);
        expect(suggestions).toEqual([]);
    });

    test('should calculate balances for equal expense split', () => {
        const members = ['ALICE', 'BOB', 'CHARLIE'];
        // ALICE paid 300 for ALICE, BOB, CHARLIE (each share 100)
        const expenses = [
            {
                payerId: 'ALICE',
                amount: 300,
                shares: { ALICE: 100, BOB: 100, CHARLIE: 100 }
            }
        ];

        const balances = calculateBalances(members, expenses, []);
        expect(balances.ALICE).toBe(200);   // Paid 300 - consumed 100 = +200
        expect(balances.BOB).toBe(-100);    // Paid 0 - consumed 100 = -100
        expect(balances.CHARLIE).toBe(-100);// Paid 0 - consumed 100 = -100

        const suggestions = simplifyDebts(balances);
        expect(suggestions).toHaveLength(2);
        // Both BOB and CHARLIE should pay ALICE 100
        expect(suggestions).toEqual(
            expect.arrayContaining([
                { from: 'BOB', to: 'ALICE', amount: 100 },
                { from: 'CHARLIE', to: 'ALICE', amount: 100 }
            ])
        );
    });

    test('should resolve cyclic debts to zero transactions (A -> B -> C -> A)', () => {
        const members = ['ALICE', 'BOB', 'CHARLIE'];
        // ALICE paid 100 for BOB (BOB owes ALICE 100)
        // BOB paid 100 for CHARLIE (CHARLIE owes BOB 100)
        // CHARLIE paid 100 for ALICE (ALICE owes CHARLIE 100)
        const expenses = [
            { payerId: 'ALICE', amount: 100, shares: { BOB: 100 } },
            { payerId: 'BOB', amount: 100, shares: { CHARLIE: 100 } },
            { payerId: 'CHARLIE', amount: 100, shares: { ALICE: 100 } }
        ];

        const balances = calculateBalances(members, expenses, []);
        expect(balances.ALICE).toBe(0);
        expect(balances.BOB).toBe(0);
        expect(balances.CHARLIE).toBe(0);

        // Cyclic debts cancel out completely
        const suggestions = simplifyDebts(balances);
        expect(suggestions).toEqual([]);
    });

    test('should reduce transaction count in complex multi-party scenarios', () => {
        const members = ['A', 'B', 'C', 'D'];
        // Balances: A: +150, B: +50, C: -120, D: -80
        const balances = {
            A: 150,
            B: 50,
            C: -120,
            D: -80
        };

        const suggestions = simplifyDebts(balances);
        // Greedily:
        // C (-120) pays A (+150): 120 -> A needs 30 left
        // D (-80) pays A (+30): 30 -> D needs 50 left
        // D (-50) pays B (+50): 50 -> All balanced!
        expect(suggestions).toHaveLength(3);

        const totalTransferred = suggestions.reduce((sum, s) => sum + s.amount, 0);
        expect(totalTransferred).toBe(200);
    });

    test('should correctly update balances when settlement payments are applied', () => {
        const members = ['ALICE', 'BOB'];
        const expenses = [
            { payerId: 'ALICE', amount: 1000, shares: { ALICE: 500, BOB: 500 } }
        ];
        // BOB pays ALICE 300 towards the 500 debt
        const settlements = [
            { from: 'BOB', to: 'ALICE', amount: 300 }
        ];

        const balances = calculateBalances(members, expenses, settlements);
        expect(balances.ALICE).toBe(200); // 500 - 300 = 200
        expect(balances.BOB).toBe(-200);  // -500 + 300 = -200

        const suggestions = simplifyDebts(balances);
        expect(suggestions).toEqual([
            { from: 'BOB', to: 'ALICE', amount: 200 }
        ]);
    });

    test('should prevent precision drift on fractional divisions', () => {
        const members = ['A', 'B', 'C'];
        // Total 100 divided by 3: 33.34, 33.33, 33.33
        const expenses = [
            { payerId: 'A', amount: 100, shares: { A: 33.34, B: 33.33, C: 33.33 } }
        ];

        const balances = calculateBalances(members, expenses, []);
        expect(balances.A).toBe(66.66);
        expect(balances.B).toBe(-33.33);
        expect(balances.C).toBe(-33.33);

        const sum = balances.A + balances.B + balances.C;
        expect(Math.abs(sum)).toBeLessThan(0.01);
    });
});
