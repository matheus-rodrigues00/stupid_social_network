'use strict';
const bcrypt = require('bcryptjs');
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hash = await bcrypt.hash('#Abc123456', 10);
    await queryInterface.bulkInsert('users', [
      {
        username: 'admin',
        email: 'admin@localhost',
        password: hash,
        is_active: true,
        activation_token: null,
        password_reset_token: null,
        avatar: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
    const users = [];
    for (let i = 0; i < 10; i++) {
      const username = `user${i}`;
      const email = `user${i}@localhost`;
      const hash = await bcrypt.hash('#Abc123456', 10);
      users.push({
        username,
        email,
        password: hash,
        is_active: true,
        activation_token: null,
        password_reset_token: null,
        avatar: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
    await queryInterface.bulkInsert('users', users);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  },
};
