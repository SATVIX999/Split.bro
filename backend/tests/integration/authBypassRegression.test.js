
function resolveFrontendPath(relativePath) {
    const p1 = path.join(__dirname, '../../../frontend', relativePath);
    if (fs.existsSync(p1)) return p1;
    const p2 = path.join(__dirname, '../../../', relativePath);
    if (fs.existsSync(p2)) return p2;
    return p1;
}
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../src/app');
const config = require('../../src/config/config');
const { connectTestDb, clearTestDb, disconnectTestDb } = require('../helpers/testDb');

describe('Security & Regression Tests: Group Authentication Guard & Bypass Prevention', () => {
    let validToken;
    const testUser = {
        name: 'Rohan Sharma',
        email: 'rohan.sharma@example.com',
        userId: 'ROHAN01',
        password: 'Password@123'
    };

    beforeAll(async () => {
        await connectTestDb();
    });

    beforeEach(async () => {
        await clearTestDb();
        const regRes = await request(app).post('/api/auth/register').send(testUser);
        validToken = regRes.body.token;
    });

    afterAll(async () => {
        await disconnectTestDb();
    });

    // 1. A logged-out user clicking Create Group is redirected to the login page.
    test('1. Frontend guard contract: index.html Create Group links require authentication and point to login when logged out', () => {
        const indexHtml = fs.readFileSync(resolveFrontendPath('index.html'), 'utf-8');
        const appJs = fs.readFileSync(resolveFrontendPath('js/app.js'), 'utf-8');

        // All group navigation links must carry the protected class
        const groupLinkRegex = /<a[^>]*href=["']groups\.html["'][^>]*>/gi;
        const matches = indexHtml.match(groupLinkRegex) || [];
        expect(matches.length).toBeGreaterThan(0);

        matches.forEach(tag => {
            expect(tag).toMatch(/class=["'][^"']*protected-group-link/);
        });

        // The handler must redirect to login.html with redirect parameter if unauthenticated
        expect(appJs).toMatch(/window\.location\.href\s*=\s*["']login\.html\?redirect=groups\.html["']/);
    });

    // 2. No group is created when the user is logged out.
    test('2. Backend rejects group creation when user is logged out (no Authorization header)', async () => {
        const res = await request(app)
            .post('/api/groups')
            .send({
                groupName: 'Unauthenticated Group',
                category: 'Trip',
                members: ['USER02']
            });

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/Authentication required/i);
    });

    // 3. Opening the Groups page directly while logged out redirects to login.
    test('3. Groups page frontend script enforces redirect to login.html when token/currentUser is absent', () => {
        const groupsJs = fs.readFileSync(resolveFrontendPath('js/groups.js'), 'utf-8');

        expect(groupsJs).toMatch(/if\s*\(!token\s*\|\|\s*!currentUser\)/);
        expect(groupsJs).toMatch(/window\.location\.href\s*=\s*["']login\.html\?redirect=groups\.html["']/);
    });

    // 4. An invalid or expired token does not authenticate the user.
    test('4. Backend rejects group creation with invalid or expired tokens', async () => {
        // Invalid token
        const invalidRes = await request(app)
            .post('/api/groups')
            .set('Authorization', 'Bearer invalid_signature_token_12345')
            .send({
                groupName: 'Invalid Token Group',
                category: 'Trip'
            });
        expect(invalidRes.status).toBe(401);
        expect(invalidRes.body.message).toMatch(/Invalid authentication token/i);

        // Expired token (signed with expired timestamp)
        const expiredToken = jwt.sign(
            { id: 'fake_id', userId: 'ROHAN01' },
            config.jwtSecret,
            { expiresIn: '-10s' }
        );

        const expiredRes = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${expiredToken}`)
            .send({
                groupName: 'Expired Token Group',
                category: 'Trip'
            });
        expect(expiredRes.status).toBe(401);
        expect(expiredRes.body.message).toMatch(/Session expired/i);
    });

    // 5. A failed login does not create a mock token or fall back to Mayur's account.
    test('5. Failed login returns 401 and does not issue mock tokens or Mayur Mittal credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                identifier: 'nonexistent@example.com',
                password: 'WrongPassword@123'
            });

        expect(res.status).toBe(401);
        expect(res.body.token).toBeUndefined();
        expect(res.body.user).toBeUndefined();

        const authJs = fs.readFileSync(resolveFrontendPath('js/auth.js'), 'utf-8');
        expect(authJs).not.toMatch(/splitbro_jwt_/);
        expect(authJs).not.toMatch(/fallbackUser.*MAYUR01/i);
    });

    // 6. A valid authenticated user can still access Groups and create a group.
    test('6. Valid authenticated user can create a group and creator is set to authenticated user', async () => {
        const res = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${validToken}`)
            .send({
                groupName: 'Weekend Trekkers',
                category: 'Trip',
                description: 'Western Ghats Trek',
                members: ['GUEST01']
            });

        expect(res.status).toBe(201);
        expect(res.body.group).toBeDefined();
        expect(res.body.group.groupName).toBe('Weekend Trekkers');
        expect(res.body.group.createdBy).toBe('ROHAN01');
    });

    // 7. The explicit Quick Demo Login button works only when the user intentionally clicks it.
    test('7. Quick Demo Login button is strictly tied to explicit click event listener', () => {
        const authJs = fs.readFileSync(resolveFrontendPath('js/auth.js'), 'utf-8');

        // Must attach to click event on btnQuickDemoLogin
        expect(authJs).toMatch(/btnQuickDemoLogin\.addEventListener\(["']click["']/);

        // Must not auto-trigger on DOMContentLoaded or module load
        expect(authJs).not.toMatch(/btnQuickDemoLogin\.click\(\)/);
        expect(authJs).not.toMatch(/btnQuickDemoLogin\(\)/);
    });

    // 8. The backend rejects group-creation requests without valid authentication (enforces req.user).
    test('8. Group controller strictly requires req.user and ignores spoofed createdBy parameter', async () => {
        // Attempt spoofing createdBy as MAYUR01 while authenticated as ROHAN01
        const res = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${validToken}`)
            .send({
                groupName: 'Spoof Test Group',
                createdBy: 'MAYUR01',
                createdByName: 'Mayur Mittal'
            });

        expect(res.status).toBe(201);
        // Backend must enforce req.user.userId regardless of what client passed in createdBy
        expect(res.body.group.createdBy).toBe('ROHAN01');
        expect(res.body.group.createdBy).not.toBe('MAYUR01');
    });

    // 9. Logout clears the relevant authentication state, and protected actions remain blocked afterward.
    test('9. Storage module clearAuthState purges token, currentUser, and smartSettleCurrentUser', () => {
        const storageModule = require(resolveFrontendPath('js/storage'));

        // Mock localStorage and sessionStorage
        const mockLocalStorage = {};
        const mockSessionStorage = {};
        global.localStorage = {
            getItem: (k) => mockLocalStorage[k] || null,
            setItem: (k, v) => { mockLocalStorage[k] = String(v); },
            removeItem: (k) => { delete mockLocalStorage[k]; },
            clear: () => { for (const k in mockLocalStorage) delete mockLocalStorage[k]; }
        };
        global.sessionStorage = {
            getItem: (k) => mockSessionStorage[k] || null,
            setItem: (k, v) => { mockSessionStorage[k] = String(v); },
            removeItem: (k) => { delete mockSessionStorage[k]; },
            clear: () => { for (const k in mockSessionStorage) delete mockSessionStorage[k]; }
        };

        // Set fake Mayur credentials
        mockLocalStorage.token = 'some_jwt_token';
        mockLocalStorage.currentUser = JSON.stringify({ userId: 'MAYUR01', name: 'Mayur Mittal' });
        mockLocalStorage.smartSettleCurrentUser = JSON.stringify({ userId: 'MAYUR01', name: 'Mayur Mittal' });

        expect(storageModule.isAuthenticated()).toBe(true);

        // Run clearAuthState
        storageModule.clearAuthState();

        expect(mockLocalStorage.token).toBeUndefined();
        expect(mockLocalStorage.currentUser).toBeUndefined();
        expect(mockLocalStorage.smartSettleCurrentUser).toBeUndefined();
        expect(storageModule.isAuthenticated()).toBe(false);
        expect(storageModule.getCurrentUser()).toBeNull();
    });

    // 10. Refreshing or navigating between pages does not automatically restore a fake logged-in session.
    test('10. Unauthenticated state with residual local user without token is rejected as unauthenticated', () => {
        const storageModule = require(resolveFrontendPath('js/storage'));

        // Simulate a scenario where a user object exists in localStorage but no token exists
        const mockStorage = {
            currentUser: JSON.stringify({ userId: 'MAYUR01', name: 'Mayur Mittal' }),
            smartSettleCurrentUser: JSON.stringify({ userId: 'MAYUR01', name: 'Mayur Mittal' })
        };
        global.localStorage = {
            getItem: (k) => mockStorage[k] || null,
            setItem: (k, v) => { mockStorage[k] = String(v); },
            removeItem: (k) => { delete mockStorage[k]; }
        };

        // When token is absent, getCurrentUser() must return null and isAuthenticated() must be false
        expect(storageModule.getAuthToken()).toBeNull();
        expect(storageModule.getCurrentUser()).toBeNull();
        expect(storageModule.isAuthenticated()).toBe(false);
    });
});
