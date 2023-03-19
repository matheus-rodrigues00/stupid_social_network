require('dotenv').config();
const app = require('./src/app');
const sequelize = require('./src/config/database');
const TokenService = require('./src/auth/TokenService');

sequelize.sync({ force: true });

TokenService.scheduleCleanup();

app.listen(3000, () => console.log('app is running!'));
