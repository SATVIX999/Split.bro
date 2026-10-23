const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../../src/app');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/testDb');

describe('Integration Tests: Expenses & Receipt Uploads API', () => {
    let authToken;
    let groupId;
    const testUser = {
        name: 'Tarun Rao',
        email: 'tarun@example.com',
        userId: 'TARUN01',
        password: 'Password@123'
    };

    beforeAll(async () => {
        await connectTestDb();
    });

    beforeEach(async () => {
        await clearTestDb();
        // Register user
        const regRes = await request(app).post('/api/auth/register').send(testUser);
        authToken = regRes.body.token;

        // Create group with 2 members
        const groupRes = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupName: 'Goa Roadtrip',
                members: ['PRIYA01']
            });
        groupId = groupRes.body.group.groupId;
    });

    afterAll(async () => {
        await disconnectTestDb();
    });

    test('POST /api/expenses should record an expense with equal split', async () => {
        const res = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupId,
                title: 'Beachside Cafe Lunch',
                amount: 1400,
                category: 'Food',
                payerId: 'TARUN01',
                splitType: 'equal',
                participants: ['TARUN01', 'PRIYA01']
            });

        expect(res.status).toBe(201);
        expect(res.body.expense).toBeDefined();
        expect(res.body.expense.title).toBe('Beachside Cafe Lunch');
        expect(res.body.expense.amount).toBe(1400);
        expect(res.body.expense.shares).toEqual({
            TARUN01: 700,
            PRIYA01: 700
        });
    });

    test('POST /api/expenses should support multipart receipt image upload via Multer', async () => {
        // Create dummy PNG buffer
        const testImagePath = path.join(__dirname, 'test-receipt.png');
        fs.writeFileSync(testImagePath, Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082', 'hex'));

        try {
            const res = await request(app)
                .post('/api/expenses')
                .set('Authorization', `Bearer ${authToken}`)
                .field('groupId', groupId)
                .field('title', 'Fuel Refill with Receipt')
                .field('amount', '2200')
                .field('category', 'Transport')
                .field('payerId', 'TARUN01')
                .field('splitType', 'equal')
                .field('participants[]', 'TARUN01')
                .field('participants[]', 'PRIYA01')
                .attach('receipt', testImagePath);

            expect(res.status).toBe(201);
            expect(res.body.expense.receiptUrl).toBeDefined();
            expect(res.body.expense.receiptOriginalName).toBe('test-receipt.png');

            // Verify the receipt can be fetched via GET receipt endpoint
            const receiptFilename = path.basename(res.body.expense.receiptUrl);
            const receiptFetchRes = await request(app)
                .get(`/api/expenses/receipts/${receiptFilename}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(receiptFetchRes.status).toBe(200);

            // Verify unauthenticated receipt access returns 401
            const unauthReceiptRes = await request(app)
                .get(`/api/expenses/receipts/${receiptFilename}`);
            expect(unauthReceiptRes.status).toBe(401);

            // Register outsider user
            const outsiderRes = await request(app).post('/api/auth/register').send({
                name: 'Outsider Bob',
                email: 'outsider@example.com',
                userId: 'OUTSIDER01',
                password: 'Password@123'
            });
            const outsiderToken = outsiderRes.body.token;

            // Verify outsider (non-member) cannot access receipt (403)
            const outsiderReceiptRes = await request(app)
                .get(`/api/expenses/receipts/${receiptFilename}`)
                .set('Authorization', `Bearer ${outsiderToken}`);
            expect(outsiderReceiptRes.status).toBe(403);
        } finally {
            if (fs.existsSync(testImagePath)) {
                fs.unlinkSync(testImagePath);
            }
        }
    });

    test('POST /api/expenses should reject spoofed files failing binary magic bytes validation', async () => {
        const spoofedFilePath = path.join(__dirname, 'spoofed-script.png');
        fs.writeFileSync(spoofedFilePath, '<?php echo "malicious script payload"; ?>');

        try {
            const res = await request(app)
                .post('/api/expenses')
                .set('Authorization', `Bearer ${authToken}`)
                .field('groupId', groupId)
                .field('title', 'Spoofed Receipt Attempt')
                .field('amount', '500')
                .field('category', 'Other')
                .field('payerId', 'TARUN01')
                .field('splitType', 'equal')
                .field('participants[]', 'TARUN01')
                .attach('receipt', spoofedFilePath);

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/magic byte|content does not match/i);
        } finally {
            if (fs.existsSync(spoofedFilePath)) {
                fs.unlinkSync(spoofedFilePath);
            }
        }
    });

    test('GET /api/expenses should reject unauthenticated requests and non-member access', async () => {
        // 401 without auth token
        const noAuthRes = await request(app).get(`/api/expenses?groupId=${groupId}`);
        expect(noAuthRes.status).toBe(401);

        // Register outsider user
        const outsiderRes = await request(app).post('/api/auth/register').send({
            name: 'Outsider Charlie',
            email: 'outsider_charlie@example.com',
            userId: 'OUTSIDER_CHARLIE',
            password: 'Password@123'
        });
        const outsiderToken = outsiderRes.body.token;

        // 403 for non-member
        const outsiderRes2 = await request(app)
            .get(`/api/expenses?groupId=${groupId}`)
            .set('Authorization', `Bearer ${outsiderToken}`);
        expect(outsiderRes2.status).toBe(403);
    });

    test('GET /api/expenses should filter by groupId and search keyword', async () => {
        // Create 2 expenses
        await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupId,
                title: 'Highway Toll',
                amount: 350,
                category: 'Transport',
                payerId: 'TARUN01',
                participants: ['TARUN01', 'PRIYA01']
            });

        await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupId,
                title: 'Resort Stay',
                amount: 8000,
                category: 'Hotel',
                payerId: 'TARUN01',
                participants: ['TARUN01', 'PRIYA01']
            });

        const listRes = await request(app)
            .get(`/api/expenses?groupId=${groupId}&search=Toll`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(listRes.status).toBe(200);
        expect(listRes.body.count).toBe(1);
        expect(listRes.body.expenses[0].title).toBe('Highway Toll');
    });

    test('GET /api/expenses/export/csv should stream CSV data with correct headers', async () => {
        // Add expense
        await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupId,
                title: 'Scuba Diving Tour',
                amount: 5500,
                category: 'Activities',
                payerId: 'TARUN01',
                participants: ['TARUN01', 'PRIYA01']
            });

        const csvRes = await request(app)
            .get(`/api/expenses/export/csv?groupId=${groupId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(csvRes.status).toBe(200);
        expect(csvRes.headers['content-type']).toMatch(/text\/csv/);
        expect(csvRes.text).toContain('Expense ID,Date,Title,Category,Amount (INR)');
        expect(csvRes.text).toContain('Scuba Diving Tour');
    });

    test('DELETE /api/expenses/:id should remove expense', async () => {
        const createRes = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupId,
                title: 'Cancelable Expense',
                amount: 500,
                payerId: 'TARUN01',
                participants: ['TARUN01']
            });

        const expenseId = createRes.body.expense.expenseId;

        const delRes = await request(app)
            .delete(`/api/expenses/${expenseId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(delRes.status).toBe(200);

        // Verify expense no longer exists
        const fetchRes = await request(app)
            .get(`/api/expenses/${expenseId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(fetchRes.status).toBe(404);
    });

    test('GET /api/expenses/:id should return populated payerProfile and groupDetails', async () => {
        const createRes = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupId,
                title: 'Populated Expense Check',
                amount: 600,
                payerId: 'TARUN01',
                participants: ['TARUN01', 'PRIYA01']
            });

        const expenseId = createRes.body.expense.expenseId;

        const detailRes = await request(app)
            .get(`/api/expenses/${expenseId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(detailRes.status).toBe(200);
        expect(detailRes.body.expense.payerProfile).toBeDefined();
        expect(detailRes.body.expense.payerProfile.userId).toBe('TARUN01');
        expect(detailRes.body.expense.groupDetails).toBeDefined();
        expect(detailRes.body.expense.groupDetails.groupName).toBe('Goa Roadtrip');
    });

    test('POST /api/expenses should reject payerId or participants who are not members of the group', async () => {
        const res = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupId,
                title: 'Invalid Participant Expense',
                amount: 500,
                payerId: 'TARUN01',
                participants: ['TARUN01', 'RANDOM_NON_MEMBER']
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/not a member of this group/i);
    });
});
