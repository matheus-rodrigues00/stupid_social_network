const express = require('express');
const router = express.Router();
const UserService = require('../user/UserService');
const AuthException = require('./AuthException');
const ForbiddenException = require('./ForbiddenException');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');

router.post('/api/auth', check('email').isEmail(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AuthException());
    }
    const { email, password } = req.body;
    const user = await UserService.findByEmail(email);
    if (!user) {
      return next(new AuthException());
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return next(new AuthException());
    }
    if (!user.is_active) {
      return next(new ForbiddenException());
    }
    return res.send({
      ...user.toJSON(),
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
