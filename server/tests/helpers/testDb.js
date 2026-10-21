const mongoose = require('mongoose');
const os = require('os');

const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/splitbro_test';

const connectTestDb = async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(TEST_MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            driverInfo: { name: 'splitbro-jest', version: '1.0.0' },
            runtimeAdapters: { os }
        });
    }
};

const clearTestDb = async () => {
    if (mongoose.connection.readyState !== 0 && mongoose.connection.db) {
        const collections = await mongoose.connection.db.collections();
        for (const collection of collections) {
            await collection.deleteMany({});
        }
    }
};

const disconnectTestDb = async () => {
    if (mongoose.connection.readyState !== 0) {
        if (mongoose.connection.db) {
            await mongoose.connection.db.dropDatabase();
        }
        await mongoose.disconnect();
    }
};

module.exports = {
    connectTestDb,
    clearTestDb,
    disconnectTestDb,
    TEST_MONGO_URI
};
