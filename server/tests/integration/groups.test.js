const request = require('supertest');
const app = require('../../src/app');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/testDb');

describe('Integration Tests: Groups API', () => {
    let authToken;
    const testUser = {
        name: 'Arjun Verma',
        email: 'arjun@example.com',
        userId: 'ARJUN01',
        password: 'Password@123'
    };

    beforeAll(async () => {
        await connectTestDb();
    });

    beforeEach(async () => {
        await clearTestDb();
        const regRes = await request(app).post('/api/auth/register').send(testUser);
        authToken = regRes.body.token;
    });

    afterAll(async () => {
        await disconnectTestDb();
    });

    test('POST /api/groups should create a new group with creator as first member', async () => {
        const res = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupName: 'Manali Trip 2026',
                category: 'Trip',
                description: 'Mountain getaway',
                members: ['KAVYA01', 'DEV01']
            });

        expect(res.status).toBe(201);
        expect(res.body.group).toBeDefined();
        expect(res.body.group.groupName).toBe('Manali Trip 2026');
        expect(res.body.group.groupCode).toBeDefined();
        expect(res.body.group.createdBy).toBe('ARJUN01');
        // Creator + 2 additional members = 3 members
        expect(res.body.group.members.length).toBe(3);
    });

    test('GET /api/groups should list groups where user is a member', async () => {
        // Create 2 groups
        await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ groupName: 'Group Alpha' });

        await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ groupName: 'Group Beta' });

        const listRes = await request(app)
            .get('/api/groups')
            .set('Authorization', `Bearer ${authToken}`);

        expect(listRes.status).toBe(200);
        expect(Array.isArray(listRes.body)).toBe(true);
        expect(listRes.body.length).toBe(2);
    });

    test('GET /api/groups/:id should return complete group details', async () => {
        const createRes = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ groupName: 'Flatmates 304', category: 'Home' });

        const groupId = createRes.body.group.groupId;

        const detailRes = await request(app)
            .get(`/api/groups/${groupId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(detailRes.status).toBe(200);
        expect(detailRes.body.groupId).toBe(groupId);
        expect(detailRes.body.groupName).toBe('Flatmates 304');
        expect(detailRes.body.expenses).toBeDefined();
        expect(detailRes.body.settledPayments).toBeDefined();
    });

    test('POST /api/groups/join should allow a member to join using group code', async () => {
        // Create group with user 1
        const createRes = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ groupName: 'Goa Holiday' });

        const groupCode = createRes.body.group.groupCode;

        // Register user 2
        const user2Res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Neha Gupta',
                email: 'neha@example.com',
                userId: 'NEHA01',
                password: 'Password@123'
            });
        const user2Token = user2Res.body.token;

        // User 2 joins using groupCode
        const joinRes = await request(app)
            .post('/api/groups/join')
            .set('Authorization', `Bearer ${user2Token}`)
            .send({ groupCode });

        expect(joinRes.status).toBe(200);
        expect(joinRes.body.message).toMatch(/joined/i);

        // Verify group now has 2 members
        const groupRes = await request(app)
            .get(`/api/groups/${createRes.body.group.groupId}`)
            .set('Authorization', `Bearer ${user2Token}`);

        expect(groupRes.body.members.length).toBe(2);
        expect(groupRes.body.members.some(m => m.memberId === 'NEHA01')).toBe(true);
    });

    test('POST /api/groups/:id/members/guest should add a guest member', async () => {
        const createRes = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ groupName: 'Dinner Club' });

        const groupId = createRes.body.group.groupId;

        const guestRes = await request(app)
            .post(`/api/groups/${groupId}/members/guest`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ name: 'Guest Friend Dave' });

        expect([200, 201]).toContain(guestRes.status);
        expect(guestRes.body.group.members.some(m => m.name === 'Guest Friend Dave' && m.type === 'guest')).toBe(true);
    });

    test('PUT /api/groups/:id should update group name and description', async () => {
        const createRes = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ groupName: 'Old Title' });

        const groupId = createRes.body.group.groupId;

        const updateRes = await request(app)
            .put(`/api/groups/${groupId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                groupName: 'Updated New Title',
                description: 'New Description 2026'
            });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.group.groupName).toBe('Updated New Title');
        expect(updateRes.body.group.description).toBe('New Description 2026');
    });

    test('DELETE /api/groups/:id should delete group when initiated by creator', async () => {
        const createRes = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ groupName: 'To Be Deleted' });

        const groupId = createRes.body.group.groupId;

        const delRes = await request(app)
            .delete(`/api/groups/${groupId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(delRes.status).toBe(200);

        // Verify group is 404 now
        const fetchRes = await request(app)
            .get(`/api/groups/${groupId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(fetchRes.status).toBe(404);
    });

    test('GET /api/groups/:id should populate creatorProfile and enforce group member authorization', async () => {
        const createRes = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ groupName: 'Populate & Auth Group' });

        const groupId = createRes.body.group.groupId;

        const detailRes = await request(app)
            .get(`/api/groups/${groupId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(detailRes.status).toBe(200);
        expect(detailRes.body.creatorProfile).toBeDefined();
        expect(detailRes.body.creatorProfile.userId).toBe('ARJUN01');
        expect(detailRes.body.creatorProfile.email).toBe('arjun@example.com');

        // Register non-member user
        const outsiderRes = await request(app).post('/api/auth/register').send({
            name: 'Outsider Vikram',
            email: 'vikram@example.com',
            userId: 'VIKRAM01',
            password: 'Password@123'
        });
        const outsiderToken = outsiderRes.body.token;

        // Non-member cannot view group (403)
        const forbiddenGet = await request(app)
            .get(`/api/groups/${groupId}`)
            .set('Authorization', `Bearer ${outsiderToken}`);
        expect(forbiddenGet.status).toBe(403);

        // Non-member cannot update group (403)
        const forbiddenPut = await request(app)
            .put(`/api/groups/${groupId}`)
            .set('Authorization', `Bearer ${outsiderToken}`)
            .send({ groupName: 'Hijacked Group' });
        expect(forbiddenPut.status).toBe(403);
    });
});
