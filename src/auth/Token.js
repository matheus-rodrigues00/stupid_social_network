const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const Model = Sequelize.Model;

class Token extends Model {}

Token.init(
  {
    token: {
      type: Sequelize.STRING,
    },
    user_id: {
      type: Sequelize.INTEGER,
    },
    last_used_at: {
      type: Sequelize.DATE,
    },
  },
  {
    sequelize,
    modelName: 'token',
    timestamps: false,
  }
);

module.exports = Token;
