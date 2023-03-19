require('dotenv').config();
const { randomString } = require('../shared/generator');
const Token = require('./Token');

const generateToken = async (user) => {
  const token = randomString(32);
  await Token.create({
    token: token,
    user_id: user.id,
  });
  return token;
};

const verifyToken = async (token) => {
  const tokenInDB = await Token.findOne({ where: { token: token } });
  const user_id = tokenInDB.user_id;
  return { id: user_id };
};

const invalidateToken = async (token) => {
  await Token.destroy({ where: { token } });
};

module.exports = {
  generateToken,
  verifyToken,
  invalidateToken,
};
