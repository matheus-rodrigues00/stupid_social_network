const User = require('./User');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const save = async (req) => {
  const { username, email, password } = req;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const activation_token = uuidv4();
  const user = {
    username,
    email,
    password: hashedPassword,
    activation_token,
  };

  User.create(user);
};

const findByEmail = async (email) => {
  return User.findOne({ where: { email: email } });
};

const findByUsername = async (username) => {
  return User.findOne({ where: { username: username } });
};

module.exports = {
  save,
  findByEmail,
  findByUsername,
};
