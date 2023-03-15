const express = require('express');
const router = express.Router();
const UserService = require('./UserService');
const { check, validationResult } = require('express-validator');

router.post(
  '/api/users',
  check('username')
    .notEmpty()
    .withMessage('Username is required!')
    .bail()
    .isLength({ min: 6, max: 32 })
    .withMessage('Username must have min 4 and max 32 characters!')
    .bail()
    .custom(async (username) => {
      const user = await UserService.findByUsername(username);
      if (user) {
        throw new Error('Username already in use!');
      }
    }),
  check('email')
    .notEmpty()
    .withMessage('Email is required!')
    .bail()
    .isEmail()
    .withMessage('Email is not valid!')
    .bail()
    .custom(async (email) => {
      const user = await UserService.findByEmail(email);
      if (user) {
        throw new Error('Email already in use!');
      }
    }),
  check('password')
    .notEmpty()
    .withMessage('Password is required!')
    .bail()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long!')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character!'
    ),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = {};
      errors.array().forEach((e) => {
        validationErrors[e.param] = e.msg;
      });
      return res.status(400).send({ validationErrors: validationErrors });
    }
    await UserService.save(req.body);
    return res.send({ message: 'User was registered successfully!' });
  }
);

module.exports = router;
