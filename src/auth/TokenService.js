require('dotenv').config();
const { randomString } = require('../shared/generator');
const Token = require('./Token');
const Sequelize = require('sequelize');

const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

const generateToken = async (user) => {
  const token = randomString(32);
  await Token.create({
    token: token,
    user_id: user.id,
    last_used_at: Sequelize.literal('CURRENT_TIMESTAMP'),
  });
  return token;
};

const verifyToken = async (token) => {
  const one_week_ago = new Date(Date.now() - ONE_WEEK_IN_MS);
  const token_in_db = await Token.findOne({
    where: { token: token, last_used_at: { [Sequelize.Op.gt]: one_week_ago } },
  });
  token_in_db.last_used_at = new Date();
  await token_in_db.save();
  const user_id = token_in_db.user_id;
  return { id: user_id };
};

const scheduleCleanup = () => {
  setInterval(async () => {
    const one_week_ago = new Date(Date.now() - ONE_WEEK_IN_MS);
    await Token.destroy({ where: { last_used_at: { [Sequelize.Op.lt]: one_week_ago } } });
  }, 60 * 60 * 1000);
};

const invalidateToken = async (token) => {
  await Token.destroy({ where: { token } });
};

const clearTokens = async (user_id) => {
  await Token.destroy({
    where: {
      user_id,
    },
  });
};

module.exports = {
  generateToken,
  verifyToken,
  invalidateToken,
  scheduleCleanup,
  clearTokens,
};
