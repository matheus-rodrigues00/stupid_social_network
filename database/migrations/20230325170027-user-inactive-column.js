'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transatcion = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        'users',
        'is_active',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        },
        { transaction: transatcion }
      );
      await queryInterface.addColumn(
        'users',
        'activation_token',
        {
          type: Sequelize.STRING,
        },
        { transaction: transatcion }
      );

      await queryInterface.addColumn(
        'users',
        'password_reset_token',
        {
          type: Sequelize.STRING,
        },
        { transaction: transatcion }
      );

      await queryInterface.addColumn(
        'users',
        'avatar',
        {
          type: Sequelize.STRING,
        },
        { transaction: transatcion }
      );

      transatcion.commit();
    } catch (error) {
      transatcion.rollback();
    }
  },

  async down(queryInterface, Sequelize) {
    const transatcion = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('users', 'is_active', { transaction: transatcion });
      await queryInterface.removeColumn('users', 'activation_token', { transaction: transatcion });
      await queryInterface.removeColumn('users', 'password_reset_token', { transaction: transatcion });
      await queryInterface.removeColumn('users', 'avatar', { transaction: transatcion });
      await transatcion.commit();
    } catch (error) {
      await transatcion.rollback();
    }
  },
};
