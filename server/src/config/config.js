const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const env = process.env.NODE_ENV || 'development';

function validateConfig(targetEnv = env, envVars = process.env) {
    if (targetEnv === 'production') {
        if (!envVars.JWT_SECRET || envVars.JWT_SECRET === 'splitbro_super_secure_jwt_secret_dev_key_2026') {
            throw new Error('[Security Exception] In production, JWT_SECRET must be explicitly set with a strong, private cryptographic key (minimum 32 characters).');
        }
        if (envVars.JWT_SECRET.length < 32) {
            throw new Error('[Security Exception] In production, JWT_SECRET must be at least 32 characters long.');
        }
        if (!envVars.MONGO_URI) {
            throw new Error('[Configuration Exception] In production, MONGO_URI must be explicitly set.');
        }
    }
    return true;
}

validateConfig();

const defaultCorsOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5501',
    'http://127.0.0.1:5501',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];

const config = {
    env,
    port: parseInt(process.env.PORT || '3000', 10),
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/splitbro',
    jwtSecret: process.env.JWT_SECRET || 'splitbro_super_secure_jwt_secret_dev_key_2026',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    uploadDir: path.resolve(__dirname, '../../uploads'),
    receiptsDir: path.resolve(__dirname, '../../uploads/receipts'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || `${5 * 1024 * 1024}`, 10), // 5MB
    corsOrigins: process.env.CORS_ORIGIN 
        ? Array.from(new Set([...process.env.CORS_ORIGIN.split(',').map(s => s.trim()), ...defaultCorsOrigins]))
        : defaultCorsOrigins,
    validateConfig
};

module.exports = config;
