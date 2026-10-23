const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const v8 = require('v8');

const config = require('./config/config');
const { isConnected } = require('./config/db');
const AppError = require('./utils/AppError');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const insightRoutes = require('./routes/insightRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// 1. Production-grade Cross-Origin Resource Sharing (CORS)
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : config.corsOrigins;

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        if (config.env === 'development' || config.env === 'test') {
            if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
                return callback(null, true);
            }
        }
        return callback(new AppError(`Origin '${origin}' not allowed by CORS policy`, 403));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 2. Body & cookie parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// 3. Sensitive file blocker: Strictly reject requests to internal databases, config, logs, and backend source files
const SENSITIVE_FILE_PATTERN = /^\/(?:db\.json|\.env|\.git|server(\/|$)|backend(\/|$)|package.*\.json|.*\.log|.*\.bak)/i;
app.use((req, res, next) => {
    if (SENSITIVE_FILE_PATTERN.test(req.path)) {
        return next(new AppError(`Endpoint not found on this server: ${req.method} ${req.originalUrl}`, 404));
    }
    next();
});

// 4. API Service Root Endpoint (API-only deployment: frontend website is not served)
app.get('/', (req, res) => {
    res.status(200).json({
        service: 'Split Bro Backend API',
        status: 'online',
        health: '/api/health',
        documentation: 'Use Postman or Thunder Client to interact with /api endpoints.',
        version: '2.0.0'
    });
});

// 5. Diagnostics & Service Information
app.get('/api/health', (req, res) => {
    const heapStats = v8.getHeapStatistics();
    res.status(200).json({
        status: 'ok',
        service: 'Split Bro Backend API',
        environment: config.env,
        databaseConnected: isConnected(),
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        runtime: {
            nodeVersion: process.version,
            v8Version: process.versions.v8,
            platform: process.platform,
            entryDir: path.basename(__dirname),
            heapTotalMB: Number((heapStats.total_heap_size / (1024 * 1024)).toFixed(2)),
            heapUsedMB: Number((heapStats.used_heap_size / (1024 * 1024)).toFixed(2))
        }
    });
});

// 6. Mount REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/users', userRoutes);

// 7. 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
