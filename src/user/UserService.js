const User = require('./User');
const bcrypt = require('bcryptjs');
const EmailService = require('../email/EmailService');
const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const EmailException = require('../email/EmailException');
const InvalidTokenExpection = require('./InvalidTokenExpection');
const { randomString } = require('../shared/generator');
const NotFoundException = require('../error/NotFoundException');
const Token = require('../auth/Token');
const TokenService = require('../auth/TokenService');
const FileService = require('../file/FileService');

const save = async (req) => {
  const { username, email, password } = req;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = {
    username,
    email,
    password: hashedPassword,
    activation_token: randomString(16),
  };
  const transaction = await sequelize.transaction();
  await User.create(user, { transaction });
  try {
    if (process.env.SMTP_SERVICE_ACTIVE === '1') {
      await EmailService.sendAccountActivation(email, user.activation_token);
    }
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw new EmailException();
  }
};

const findByEmail = async (email) => {
  return User.findOne({ where: { email: email } });
};

const findByUsername = async (username) => {
  return User.findOne({ where: { username: username } });
};

const activate = async (token) => {
  const user = await User.findOne({ where: { activation_token: token } });
  if (!user) {
    throw new InvalidTokenExpection();
  }
  user.activation_token = null;
  user.is_active = true;
  await user.save();
};

const findAll = async (page = 1, limit = 10, authenticated_user) => {
  const offset = (page - 1) * limit;
  const users = await User.findAndCountAll({
    offset,
    limit,
    where: {
      is_active: true,
      id: {
        [Sequelize.Op.not]: authenticated_user ? authenticated_user.id : 0,
      },
    },
    attributes: ['id', 'username', 'email', 'avatar'],
  });
  return {
    content: users.rows,
    page: page,
    size: limit,
    total_pages: Math.ceil(users.count / limit),
  };
};

const findById = async (id) => {
  return User.findOne({ where: { id: id, is_active: true }, attributes: ['id', 'username', 'email', 'avatar'] });
};

const update = async (id, req) => {
  const user = await User.findOne({ where: { id: id } });
  user.username = req.username;

  if (req.avatar) {
    if (user.avatar) {
      await FileService.deleteProfileAvatar(user.avatar);
    }
    user.avatar = await FileService.saveProfileAvatar(req.avatar);
  }
  await user.save();
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
  };
};

const deleteUser = async (id) => {
  const user = await User.findOne({ where: { id: id } });
  await user.destroy();
};
const sendPasswordResetEmail = async (email) => {
  const user = await findByEmail(email);
  if (!user) {
    throw new NotFoundException('email_not_inuse');
  }
  const transaction = await sequelize.transaction();
  user.password_reset_token = randomString(16);
  await user.save({ transaction });
  try {
    if (process.env.SMTP_SERVICE_ACTIVE === '1') {
      await EmailService.sendPasswordReset(email, user.password_reset_token);
    }
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw new EmailException();
  }
};

const updatePassword = async (token, password) => {
  const user = await User.findOne({ where: { password_reset_token: token } });
  if (!user) {
    throw new InvalidTokenExpection();
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  user.password = hashedPassword;
  user.password_reset_token = null;
  user.is_active = true;
  user.activation_token = null;
  await user.save();
  await TokenService.clearTokens(user.id);
};

const findByPasswordResetToken = (token) => {
  return User.findOne({ where: { password_reset_token: token } });
};

module.exports = {
  save,
  findByEmail,
  findByUsername,
  activate,
  findAll,
  findById,
  update,
  deleteUser,
  sendPasswordResetEmail,
  updatePassword,
  findByPasswordResetToken,
};
