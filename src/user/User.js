const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const Token = require('../auth/Token');
const Model = Sequelize.Model;

class User extends Model {}

User.init(
  {
    username: {
      type: Sequelize.STRING,
    },
    email: {
      type: Sequelize.STRING,
    },
    password: {
      type: Sequelize.STRING,
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    activation_token: {
      type: Sequelize.STRING,
    },
    password_reset_token: {
      type: Sequelize.STRING,
    },
    avatar: {
      type: Sequelize.STRING,
    },
  },
  {
    sequelize,
    modelName: 'user',
  }
);

User.hasMany(Token, { foreignKey: 'user_id' });

module.exports = User;
