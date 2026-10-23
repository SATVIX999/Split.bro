const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, 'backend/.env') });

const { startServer, app } = require('./backend/src/server');

if (require.main === module) {
    startServer();
}

module.exports = app;
