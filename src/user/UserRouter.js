const express = require('express');
const router = express.Router();
const UserService = require('./UserService');
const { check, validationResult } = require('express-validator');

router.post(
  '/api/users',
  check('password').notEmpty().withMessage('Password is required!'),
  check('username').notEmpty().withMessage('Username is required!'),
  check('email').notEmpty().withMessage('Email is required!'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors.array());
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
