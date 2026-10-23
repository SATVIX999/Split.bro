/**
 * Split Bro - Jest Test Configuration
 */

module.exports = {
    testEnvironment: 'node',
    testTimeout: 30000,
    testMatch: [
        '**/backend/tests/**/*.test.js',
        '**/tests/**/*.test.js',
        '**/server/tests/**/*.test.js'
    ],
    verbose: true,
    clearMocks: true,
    detectOpenHandles: true,
    forceExit: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        '(backend|server)/src/**/*.js',
        '!(backend|server)/src/scripts/**',
        '!(backend|server)/src/server.js'
    ]
};
