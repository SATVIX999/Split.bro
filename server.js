const http = require('http');
const path = require('path');
const v8 = require('v8');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const config = require('./server/src/config/config');
const { connectDB, disconnectDB, isConnected } = require('./server/src/config/db');

const authRoutes = require('./server/src/routes/authRoutes');
const groupRoutes = require('./server/src/routes/groupRoutes');
const expenseRoutes = require('./server/src/routes/expenseRoutes');
const settlementRoutes = require('./server/src/routes/settlementRoutes');
const insightRoutes = require('./server/src/routes/insightRoutes');
const userRoutes = require('./server/src/routes/userRoutes');

const { notFoundHandler, errorHandler } = require('./server/src/middleware/errorHandler');
const AppError = require('./server/src/utils/AppError');
const appEvents = require('./server/src/utils/eventEmitter');

const app = express();

app.use(cors({
    origin: (origin, callback) => {
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// Sensitive file blocker: Strictly reject requests to internal databases, config, logs, and backend source files
const SENSITIVE_FILE_PATTERN = /^\/(?:db\.json|\.env|\.git|server(\/|$)|package.*\.json|.*\.log|.*\.bak)/i;
app.use((req, res, next) => {
    if (SENSITIVE_FILE_PATTERN.test(req.path)) {
        return next(new AppError(`Endpoint not found on this server: ${req.method} ${req.originalUrl}`, 404));
    }
    next();
});

// Scoped static asset directories (strictly limited to /css, /js, and /assets)
app.use('/css', express.static(path.join(__dirname, 'Split-Bro', 'css')));
app.use('/js', express.static(path.join(__dirname, 'Split-Bro', 'js')));
app.use('/assets', express.static(path.join(__dirname, 'Split-Bro', 'assets')));

const ALLOWED_STATIC_PAGES = new Set([
    'index.html', 'login.html', 'signup.html', 'dashboard.html',
    'groups.html', 'addExpense.html', 'settlement.html', 'history.html',
    'insights.html', 'profile.html', 'about.html', 'contact.html', 'faq.html', 'test-api.html'
]);

app.get('/:page', (req, res, next) => {
    if (ALLOWED_STATIC_PAGES.has(req.params.page)) {
        if (req.params.page === 'test-api.html') return res.sendFile(path.join(__dirname, 'test-api.html'));
        return res.sendFile(path.join(__dirname, 'Split-Bro', req.params.page));
    }
    return next();
});

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
            entryFile: path.basename(__filename),
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

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/users', userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

let server;

async function startServer() {
    try {
        await connectDB();

        server = http.createServer(app);
        server.listen(config.port, () => {
            appEvents.emitNonBlocking('server:started', { port: config.port, env: config.env });
            console.log(`Split Bro Backend running in ${config.env.toUpperCase()} mode`);
            console.log(`API & Web URL : http://localhost:${config.port}`);
            console.log(`Health Check  : http://localhost:${config.port}/api/health`);
        });
    } catch (err) {
        console.error('Fatal error starting server:', err.message);
        console.warn('Starting HTTP server in offline-fallback mode (MongoDB will retry)...');

        server = http.createServer(app);
        server.listen(config.port, () => {
            console.log(`Split Bro Backend listening on http://localhost:${config.port} (DB disconnected)`);
        });
    }
}

const handleGracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Closing HTTP server and MongoDB connection...`);
    if (server) {
        server.close(async () => {
            await disconnectDB();
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]:', err);
    process.exit(1);
});

if (require.main === module) {
    startServer();
}

module.exports = app;
module.exports.app = app;
module.exports.startServer = startServer;
