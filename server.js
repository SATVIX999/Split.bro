const http = require('http');
const app = require('./server/src/app');
const config = require('./server/src/config/config');
const { connectDB, disconnectDB } = require('./server/src/config/db');
const appEvents = require('./server/src/utils/eventEmitter');

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
