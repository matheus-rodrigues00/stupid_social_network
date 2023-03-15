const User = require('./User');
const bcrypt = require('bcryptjs');

const save = async (req) => {
  const { username, email, password } = req;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = {
    username,
    email,
    password: hashedPassword,
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
