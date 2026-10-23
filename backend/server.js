const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { startServer, app } = require('./src/server');

if (require.main === module) {
    startServer();
}

module.exports = app;
