require('dotenv').config();
const { randomString } = require('../shared/generator');
const Token = require('./Token');

const generateToken = async (user) => {
  const token = randomString(32);
  await Token.create({
    token: token,
    userId: user.id,
  });
  return token;
};

const verifyToken = async (token) => {
  const tokenInDB = await Token.findOne({ where: { token: token } });
  const userId = tokenInDB.userId;
  return { id: userId };
};

module.exports = {
  generateToken,
  verifyToken,
};
