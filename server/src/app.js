const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const v8 = require('v8');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const config = require('./config/config');
const { connectDB, isConnected } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const insightRoutes = require('./routes/insightRoutes');
const userRoutes = require('./routes/userRoutes');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');

const app = express();

// 1. Strict CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes(origin)) {
            return callback(null, true);
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
const SENSITIVE_FILE_PATTERN = /^\/(?:db\.json|\.env|\.git|server(\/|$)|package.*\.json|.*\.log|.*\.bak)/i;
app.use((req, res, next) => {
    if (SENSITIVE_FILE_PATTERN.test(req.path)) {
        return next(new AppError(`Endpoint not found on this server: ${req.method} ${req.originalUrl}`, 404));
    }
    next();
});

// 4. Scoped static asset directories (strictly limited to /css, /js, and /assets)
// Receipts are accessed strictly via protected endpoint: GET /api/expenses/receipts/:filename
const legacyRootPath = path.resolve(__dirname, '../../');
const splitBroPath = path.join(legacyRootPath, 'Split-Bro');
const staticBaseDir = fs.existsSync(splitBroPath) ? splitBroPath : legacyRootPath;

app.use('/css', express.static(path.join(staticBaseDir, 'css')));
app.use('/js', express.static(path.join(staticBaseDir, 'js')));
app.use('/assets', express.static(path.join(staticBaseDir, 'assets')));

// 5. Whitelisted HTML pages only (never serve raw directories or non-whitelisted root files)
const ALLOWED_STATIC_PAGES = new Set([
    'index.html', 'login.html', 'signup.html', 'dashboard.html',
    'groups.html', 'addExpense.html', 'settlement.html', 'history.html',
    'insights.html', 'profile.html', 'about.html', 'contact.html', 'faq.html', 'test-api.html'
]);
app.get('/:page', (req, res, next) => {
    if (ALLOWED_STATIC_PAGES.has(req.params.page)) {
        const filePath = fs.existsSync(path.join(staticBaseDir, req.params.page))
            ? path.join(staticBaseDir, req.params.page)
            : path.join(legacyRootPath, req.params.page);
        return res.sendFile(filePath);
    }
    return next();
});

// 6. Diagnostics & Service Information
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

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Welcome to Split Bro Backend API!',
        documentation: '/api/health',
        version: '2.0.0'
    });
});

// 7. Mount REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/users', userRoutes);

// 8. 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
