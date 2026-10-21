const mongoose = require('mongoose');
const config = require('./config');

let isConnected = false;

const connectDB = async (customUri = null) => {
    const uri = customUri || config.mongoUri;

    if (isConnected) {
        return mongoose.connection;
    }

    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            runtimeAdapters: { os: require('os') }
        });

        isConnected = true;
        console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host} / database: ${conn.connection.name}`);
        return conn.connection;
    } catch (error) {
        isConnected = false;
        console.error(`[MongoDB Connection Error] Failed to connect to ${uri}: ${error.message}`);
        console.warn(`[MongoDB Guidance] Please ensure MongoDB is running locally (e.g. 'mongod' or 'docker run -p 27017:27017 mongo') or configure MONGO_URI in .env with your MongoDB Atlas connection string.`);
        // Re-throw so caller (server bootstrap or tests) can handle appropriately
        throw error;
    }
};

const disconnectDB = async () => {
    if (isConnected) {
        await mongoose.disconnect();
        isConnected = false;
        console.log('[MongoDB] Disconnected gracefully.');
    }
};

mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('[MongoDB] Connection lost.');
});

mongoose.connection.on('error', (err) => {
    console.error('[MongoDB Runtime Error]:', err.message);
});

module.exports = {
    connectDB,
    disconnectDB,
    isConnected: () => isConnected
};
