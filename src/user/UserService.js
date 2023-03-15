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

module.exports = {
  save,
};
