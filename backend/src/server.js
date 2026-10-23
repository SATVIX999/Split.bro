const http = require('http');
const app = require('./app');
const config = require('./config/config');
const { connectDB, disconnectDB } = require('./config/db');

let server;

function startServer() {
    if (server && server.listening) {
        return Promise.resolve(server);
    }
    const host = '0.0.0.0';
    return new Promise(async (resolve) => {
        try {
            await connectDB();

            server = http.createServer(app);
            server.listen(config.port, host, () => {
                console.log(`Split Bro Backend running in ${config.env.toUpperCase()} mode`);
                console.log(`API URL: http://localhost:${config.port}`);
                console.log(`Health:  http://localhost:${config.port}/api/health`);
                resolve(server);
            });
        } catch (err) {
            console.error('Fatal error starting server:', err.message);
            console.warn('Server starting in offline-fallback mode (database reconnection will retry)...');

            // Start server anyway so status/health routes and informative error messages can be returned
            server = http.createServer(app);
            server.listen(config.port, host, () => {
                console.log(`Split Bro Backend listening on http://localhost:${config.port} (DB disconnected)`);
                resolve(server);
            });
        }
    });
}

const handleGracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    if (server) {
        server.close(async () => {
            console.log('HTTP server closed.');
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

module.exports = { startServer, app };
