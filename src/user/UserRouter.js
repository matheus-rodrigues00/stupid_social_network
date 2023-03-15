const express = require('express');
const router = express.Router();
const UserService = require('./UserService');

const validateUsername = (req, res, next) => {
  if (!req.body.username) {
    req.validationErrors = {
      ...req.validationErrors,
      username: 'Username is required!',
    };
  }
  next();
};

const validateEmail = (req, res, next) => {
  if (!req.body.email) {
    req.validationErrors = {
      ...req.validationErrors,
      email: 'Email is required!',
    };
  }
  next();
};

router.post('/api/users', validateUsername, validateEmail, async (req, res) => {
  await UserService.save(req.body);
  if (req.validationErrors) {
    const response = {
      validationErrors: req.validationErrors,
    };
    return res.status(400).send(response);
  }
  return res.send({ message: 'User was registered successfully!' });
});

module.exports = router;
