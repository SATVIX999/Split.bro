const request = require('supertest');
const app = require('../../src/app');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/testDb');

describe('Integration Tests: Settlements & Debt Simplification APIs', () => {
    let authToken;
    let groupId;
    const testUser = {
        name: 'Vikas Shah',
        email: 'vikas@example.com',
        userId: 'VIKAS01',
        password: 'Password@123'
    };

    beforeAll(async () => {
        await connectTestDb();
    });

    beforeEach(async () => {
        await clearTestDb();
        const regRes = await request(app).post('/api/auth/register').send(testUser);
        authToken = regRes.body.token;

        // Create group with 3 members: VIKAS01, ANANYA01, RISHI01
        const groupRes = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupName: 'Weekend Camping',
                members: ['ANANYA01', 'RISHI01']
            });
        groupId = groupRes.body.group.groupId;

        // VIKAS01 pays 3000 for VIKAS01, ANANYA01, RISHI01 (1000 each)
        await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupId,
                title: 'Camping Equipment',
                amount: 3000,
                category: 'Other',
                payerId: 'VIKAS01',
                splitType: 'equal',
                participants: ['VIKAS01', 'ANANYA01', 'RISHI01']
            });
    });

    afterAll(async () => {
        await disconnectTestDb();
    });

    test('GET /api/settlements/balances/:groupId should return calculated member balances and debt simplification', async () => {
        const res = await request(app)
            .get(`/api/settlements/balances/${groupId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.balances).toBeDefined();
        // VIKAS01 is owed 2000 (+2000)
        expect(res.body.balances.VIKAS01).toBe(2000);
        // ANANYA01 owes 1000 (-1000)
        expect(res.body.balances.ANANYA01).toBe(-1000);
        // RISHI01 owes 1000 (-1000)
        expect(res.body.balances.RISHI01).toBe(-1000);

        // Suggestions should tell ANANYA01 and RISHI01 to pay VIKAS01
        expect(res.body.suggestions).toHaveLength(2);
        expect(res.body.suggestions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ from: 'ANANYA01', to: 'VIKAS01', amount: 1000 }),
                expect.objectContaining({ from: 'RISHI01', to: 'VIKAS01', amount: 1000 })
            ])
        );
    });

    test('POST /api/settlements should record a settlement and update net balances', async () => {
        // ANANYA01 pays VIKAS01 1000
        const settleRes = await request(app)
            .post('/api/settlements')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupId,
                from: 'ANANYA01',
                to: 'VIKAS01',
                amount: 1000,
                paymentMethod: 'UPI',
                notes: 'Settled via GooglePay'
            });

        expect(settleRes.status).toBe(201);
        expect(settleRes.body.settlement).toBeDefined();
        expect(settleRes.body.settlement.amount).toBe(1000);

        // Check balances again: ANANYA01 balance should now be 0!
        const balanceRes = await request(app)
            .get(`/api/settlements/balances/${groupId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(balanceRes.body.balances.ANANYA01).toBe(0);
        expect(balanceRes.body.balances.VIKAS01).toBe(1000);
        // Only RISHI01 -> VIKAS01 suggestion should remain
        expect(balanceRes.body.suggestions).toHaveLength(1);
        expect(balanceRes.body.suggestions[0]).toMatchObject({
            from: 'RISHI01',
            to: 'VIKAS01',
            amount: 1000
        });
    });

    test('GET /api/settlements should list recorded settlement history for a group', async () => {
        // Record settlement
        await request(app)
            .post('/api/settlements')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupId,
                from: 'RISHI01',
                to: 'VIKAS01',
                amount: 500,
                paymentMethod: 'Cash'
            });

        const listRes = await request(app)
            .get(`/api/settlements?groupId=${groupId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(listRes.status).toBe(200);
        expect(listRes.body.count).toBe(1);
        expect(listRes.body.settlements[0].amount).toBe(500);
        expect(listRes.body.settlements[0].from).toBe('RISHI01');
    });

    test('Settlement endpoints should reject unauthenticated requests (401) and non-members (403)', async () => {
        // 401 without token
        const unauthRes = await request(app).get(`/api/settlements/balances/${groupId}`);
        expect(unauthRes.status).toBe(401);

        // Register outsider user
        const outsiderRes = await request(app).post('/api/auth/register').send({
            name: 'Outsider Dave',
            email: 'outsider_dave@example.com',
            userId: 'OUTSIDER_DAVE',
            password: 'Password@123'
        });
        const outsiderToken = outsiderRes.body.token;

        // 403 for outsider viewing balances
        const outsiderBalanceRes = await request(app)
            .get(`/api/settlements/balances/${groupId}`)
            .set('Authorization', `Bearer ${outsiderToken}`);
        expect(outsiderBalanceRes.status).toBe(403);

        // 403 for outsider trying to record settlement in this group
        const outsiderSettleRes = await request(app)
            .post('/api/settlements')
            .set('Authorization', `Bearer ${outsiderToken}`)
            .send({
                groupId,
                from: 'RISHI01',
                to: 'VIKAS01',
                amount: 100
            });
        expect(outsiderSettleRes.status).toBe(403);
    });
});

