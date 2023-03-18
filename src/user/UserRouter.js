const express = require('express');
const router = express.Router();
const UserService = require('./UserService');
const { check, validationResult } = require('express-validator');
const ValidationException = require('../error/ValidationExpection');
const pagination = require('./pagination');
const UserNotFoundException = require('./UserNotFoundException');

router.post(
  '/api/users',
  check('username')
    .notEmpty()
    .withMessage('username_null')
    .bail()
    .isLength({ min: 6, max: 32 })
    .withMessage('username_size')
    .bail()
    .custom(async (username) => {
      const user = await UserService.findByUsername(username);
      if (user) {
        throw new Error('username_inuse');
      }
    }),
  check('email')
    .notEmpty()
    .withMessage('email_null')
    .bail()
    .isEmail()
    .withMessage('email_invalid')
    .bail()
    .custom(async (email) => {
      const user = await UserService.findByEmail(email);
      if (user) {
        throw new Error('email_inuse');
      }
    }),
  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password_size')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])/)
    .withMessage('password_pattern'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }
    try {
      await UserService.save(req.body);
      return res.send({ message: req.t('user_created') });
    } catch (err) {
      return next(err);
    }
  }
);

router.get('/api/activate/:token', async (req, res, next) => {
  try {
    await UserService.activate(req.params.token);
    return res.send({ message: req.t('account_activation_success') });
  } catch (err) {
    next(err);
  }
});

router.get('/api/users', pagination, async (req, res, next) => {
  try {
    const { page, limit } = req.pagination;
    const users = await UserService.findAll(page, limit);
    return res.send(users);
  } catch (err) {
    next(err);
  }
});

router.get('/api/users/:id', async (req, res, next) => {
  try {
    const user = await UserService.findById(req.params.id);
    if (!user) {
      throw new UserNotFoundException();
    }
    return res.send(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
