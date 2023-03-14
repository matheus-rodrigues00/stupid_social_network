const Sequelize = require('sequelize');
const is_dev = process.env.NODE_ENV !== 'production';
const config = require('config');

const db_config = config.get('database');

if (is_dev) {
  const sequelize = new Sequelize(db_config.database, db_config.username, db_config.password, {
    dialect: db_config.dialect,
    storage: db_config.storage,
    logging: db_config.logging,
  });

  module.exports = sequelize;
}
