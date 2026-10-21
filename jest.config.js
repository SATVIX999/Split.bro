/**
 * Split Bro - Jest Test Configuration
 */

module.exports = {
    testEnvironment: 'node',
    testTimeout: 30000,
    testMatch: ['**/server/tests/**/*.test.js'],
    verbose: true,
    clearMocks: true,
    detectOpenHandles: true,
    forceExit: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'server/src/**/*.js',
        '!server/src/scripts/**',
        '!server/src/server.js'
    ]
};
