const request = require('supertest');
const app = require('../../src/app');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/testDb');

describe('Integration Tests: Authentication & Security APIs', () => {
    beforeAll(async () => {
        await connectTestDb();
    });

    beforeEach(async () => {
        await clearTestDb();
    });

    afterAll(async () => {
        await disconnectTestDb();
    });

    const testUser = {
        name: 'Rohan Sharma',
        email: 'rohan@example.com',
        userId: 'ROHAN01',
        password: 'Password@123'
    };

    test('POST /api/auth/register should successfully register a new user and return JWT', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.token).toBeDefined();
        expect(res.body.user).toBeDefined();
        expect(res.body.user.email).toBe(testUser.email);
        expect(res.body.user.userId).toBe(testUser.userId);
        expect(res.body.user.password).toBeUndefined(); // Password must not be returned
    });

    test('POST /api/auth/register should reject duplicate email with 409 Conflict', async () => {
        await request(app).post('/api/auth/register').send(testUser);

        const duplicateRes = await request(app)
            .post('/api/auth/register')
            .send({
                ...testUser,
                userId: 'ROHAN02' // Different userId, same email
            });

        expect(duplicateRes.status).toBe(409);
        expect(duplicateRes.body.message).toMatch(/already registered/i);
    });

    test('POST /api/auth/register should fail validation with short password (< 6 chars)', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                ...testUser,
                password: '123'
            });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/at least 6 characters/i);
    });

    test('POST /api/auth/login should authenticate with valid email and password', async () => {
        await request(app).post('/api/auth/register').send(testUser);

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                identifier: testUser.email,
                password: testUser.password
            });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.status).toBe('success');
        expect(loginRes.body.token).toBeDefined();
        expect(loginRes.body.user.userId).toBe(testUser.userId);
    });

    test('POST /api/auth/login should authenticate with userId as identifier', async () => {
        await request(app).post('/api/auth/register').send(testUser);

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                identifier: testUser.userId,
                password: testUser.password
            });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.status).toBe('success');
        expect(loginRes.body.token).toBeDefined();
    });

    test('POST /api/auth/login should reject invalid password with 401 Unauthorized', async () => {
        await request(app).post('/api/auth/register').send(testUser);

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                identifier: testUser.email,
                password: 'WrongPassword999'
            });

        expect(loginRes.status).toBe(401);
        expect(loginRes.body.message).toMatch(/Incorrect email\/User ID or password/i);
    });

    test('GET /api/auth/me should return user profile when authenticated with Bearer token', async () => {
        const regRes = await request(app).post('/api/auth/register').send(testUser);
        const token = regRes.body.token;

        const meRes = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(meRes.status).toBe(200);
        expect(meRes.body.status).toBe('success');
        expect(meRes.body.user.userId).toBe(testUser.userId);
    });

    test('GET /api/auth/me should reject request with 401 if token is missing', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });

    test('PATCH /api/auth/me should update user UPI ID and bio', async () => {
        const regRes = await request(app).post('/api/auth/register').send(testUser);
        const token = regRes.body.token;

        const updateRes = await request(app)
            .patch('/api/auth/me')
            .set('Authorization', `Bearer ${token}`)
            .send({
                bio: 'Trekker & Photographer',
                upiId: 'rohan@upi'
            });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.user.bio).toBe('Trekker & Photographer');
        expect(updateRes.body.user.upiId).toBe('rohan@upi');
    });

    test('CORS should allow whitelisted origin and reject unauthorized origin with 403', async () => {
        const allowedRes = await request(app)
            .get('/api/health')
            .set('Origin', 'http://localhost:3000');

        expect(allowedRes.status).toBe(200);
        expect(allowedRes.headers['access-control-allow-origin']).toBe('http://localhost:3000');

        const blockedRes = await request(app)
            .get('/api/health')
            .set('Origin', 'https://malicious-site.example.com');

        expect(blockedRes.status).toBe(403);
        expect(blockedRes.body.message).toMatch(/Not allowed by CORS/i);
    });

    test('Scoped static file serving should block sensitive server files while serving whitelisted HTML', async () => {
        const dbJsonRes = await request(app).get('/db.json');
        expect(dbJsonRes.status).toBe(404);

        const envRes = await request(app).get('/.env');
        expect(envRes.status).toBe(404);

        const serverSrcRes = await request(app).get('/server/src/app.js');
        expect(serverSrcRes.status).toBe(404);

        const serverEntryRes = await request(app).get('/server/src/server.js');
        expect(serverEntryRes.status).toBe(404);

        const packageJsonRes = await request(app).get('/package.json');
        expect(packageJsonRes.status).toBe(404);

        const loginHtmlRes = await request(app).get('/login.html');
        expect(loginHtmlRes.status).toBe(200);

        const dashboardHtmlRes = await request(app).get('/dashboard.html');
        expect(dashboardHtmlRes.status).toBe(200);
    });

    test('GET /api/users/search and /api/users/:userId should require authentication and escape regex safely', async () => {
        const unauthSearch = await request(app).get('/api/users/search?q=Rohan');
        expect(unauthSearch.status).toBe(401);

        const unauthProfile = await request(app).get('/api/users/ROHAN01');
        expect(unauthProfile.status).toBe(401);

        const regRes = await request(app).post('/api/auth/register').send(testUser);
        const token = regRes.body.token;

        const safeRegexSearch = await request(app)
            .get('/api/users/search?q=Rohan.*([+')
            .set('Authorization', `Bearer ${token}`);
        expect(safeRegexSearch.status).toBe(200);

        const validSearch = await request(app)
            .get('/api/users/search?q=Rohan')
            .set('Authorization', `Bearer ${token}`);
        expect(validSearch.status).toBe(200);
        expect(validSearch.body.users.length).toBe(1);
        expect(validSearch.body.users[0].userId).toBe('ROHAN01');
    });
});
