const { calculateShares } = require('../../src/services/expenseService');
const AppError = require('../../src/utils/AppError');

describe('Unit Tests: Expense Share Calculations', () => {

    test('should calculate exact equal shares for even split', () => {
        const participants = ['U1', 'U2', 'U3', 'U4'];
        const shares = calculateShares(400, 'equal', participants);

        expect(shares).toEqual({
            U1: 100,
            U2: 100,
            U3: 100,
            U4: 100
        });

        const sum = Object.values(shares).reduce((a, b) => a + b, 0);
        expect(sum).toBe(400);
    });

    test('should allocate remainder cent to first participant without losing pennies (100 / 3)', () => {
        const participants = ['U1', 'U2', 'U3'];
        const shares = calculateShares(100, 'equal', participants);

        expect(shares).toEqual({
            U1: 33.34,
            U2: 33.33,
            U3: 33.33
        });

        const sum = Number(Object.values(shares).reduce((a, b) => a + b, 0).toFixed(2));
        expect(sum).toBe(100);
    });

    test('should calculate percentage splits correctly', () => {
        const participants = ['U1', 'U2'];
        const rawPercentages = { U1: 60, U2: 40 };

        const shares = calculateShares(500, 'percentage', participants, rawPercentages);
        expect(shares).toEqual({
            U1: 300,
            U2: 200
        });
    });

    test('should throw error if percentages do not sum to 100%', () => {
        const participants = ['U1', 'U2'];
        const rawPercentages = { U1: 50, U2: 40 }; // 90%

        expect(() => {
            calculateShares(500, 'percentage', participants, rawPercentages);
        }).toThrow(AppError);
    });

    test('should calculate custom exact amount splits', () => {
        const participants = ['U1', 'U2'];
        const rawShares = { U1: 350, U2: 150 };

        const shares = calculateShares(500, 'custom', participants, rawShares);
        expect(shares).toEqual({
            U1: 350,
            U2: 150
        });
    });

    test('should throw error if custom shares do not equal total amount', () => {
        const participants = ['U1', 'U2'];
        const rawShares = { U1: 300, U2: 100 }; // 400 != 500

        expect(() => {
            calculateShares(500, 'custom', participants, rawShares);
        }).toThrow(AppError);
    });

    test('should reject non-positive amounts', () => {
        expect(() => {
            calculateShares(0, 'equal', ['U1']);
        }).toThrow(AppError);

        expect(() => {
            calculateShares(-100, 'equal', ['U1']);
        }).toThrow(AppError);
    });

    test('should reject empty participants list', () => {
        expect(() => {
            calculateShares(100, 'equal', []);
        }).toThrow(AppError);
    });
});
