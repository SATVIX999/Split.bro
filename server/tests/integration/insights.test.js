const request = require('supertest');
const app = require('../../src/app');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/testDb');

describe('Integration Tests: Analytics & Insights APIs', () => {
    let authToken;
    let groupId;
    const testUser = {
        name: 'Sneha Roy',
        email: 'sneha@example.com',
        userId: 'SNEHA01',
        password: 'Password@123'
    };

    beforeAll(async () => {
        await connectTestDb();
    });

    beforeEach(async () => {
        await clearTestDb();
        const regRes = await request(app).post('/api/auth/register').send(testUser);
        authToken = regRes.body.token;

        const groupRes = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupName: 'Kerala Trip',
                members: ['MANOJ01']
            });
        groupId = groupRes.body.group.groupId;

        // Create 2 expenses with different categories
        await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupId,
                title: 'Houseboat Booking',
                amount: 6000,
                category: 'Hotel',
                payerId: 'SNEHA01',
                participants: ['SNEHA01', 'MANOJ01']
            });

        await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupId,
                title: 'Traditional Feast',
                amount: 2000,
                category: 'Food',
                payerId: 'SNEHA01',
                participants: ['SNEHA01', 'MANOJ01']
            });
    });

    afterAll(async () => {
        await disconnectTestDb();
    });

    test('GET /api/insights/group/:groupId should aggregate group spending and category breakdown', async () => {
        const res = await request(app)
            .get(`/api/insights/group/${groupId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.totalExpenses).toBe(8000);
        expect(res.body.expenseCount).toBe(2);
        expect(res.body.categoryBreakdown).toBeDefined();

        // Check categories: Hotel = 6000, Food = 2000
        const hotelCat = res.body.categoryBreakdown.find(c => c.category === 'Hotel');
        const foodCat = res.body.categoryBreakdown.find(c => c.category === 'Food');
        expect(hotelCat.total).toBe(6000);
        expect(foodCat.total).toBe(2000);
    });

    test('GET /api/insights/user should calculate user financial metrics', async () => {
        const res = await request(app)
            .get('/api/insights/user')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        // SNEHA01 paid 8000 in total
        expect(res.body.totalPaidUpfront).toBe(8000);
        // SNEHA01 share is half (4000)
        expect(res.body.totalShareOwed).toBe(4000);
        // Net balance = +4000
        expect(res.body.netBalance).toBe(4000);
    });

    test('GET /api/insights/group/:groupId should reject unauthenticated requests (401) and non-members (403)', async () => {
        // 401 without token
        const unauthRes = await request(app).get(`/api/insights/group/${groupId}`);
        expect(unauthRes.status).toBe(401);

        // Register outsider
        const outsiderRes = await request(app).post('/api/auth/register').send({
            name: 'Outsider Emma',
            email: 'outsider_emma@example.com',
            userId: 'OUTSIDER_EMMA',
            password: 'Password@123'
        });
        const outsiderToken = outsiderRes.body.token;

        // 403 for non-member
        const outsiderRes2 = await request(app)
            .get(`/api/insights/group/${groupId}`)
            .set('Authorization', `Bearer ${outsiderToken}`);
        expect(outsiderRes2.status).toBe(403);
    });
});

