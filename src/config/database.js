const Sequelize = require('sequelize');
const is_dev = process.env.NODE_ENV !== 'production';

if (is_dev) {
  const db_user = process.env.DB_USER;
  const db_pass = process.env.DB_PASS;
  const sequelize = new Sequelize('stupid_sn', db_user, db_pass, {
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false,
  });

  module.exports = sequelize;
}
