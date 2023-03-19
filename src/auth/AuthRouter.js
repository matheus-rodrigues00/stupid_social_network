const express = require('express');
const router = express.Router();
const UserService = require('../user/UserService');
const AuthException = require('./AuthException');
const ForbiddenException = require('../error/ForbiddenException');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const TokenService = require('./TokenService');
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
    const token = await TokenService.generateToken(user);
    return res.send({
      id: user.id,
      username: user.username,
      token,
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/api/auth/logout', async (req, res, next) => {
  const authorization = req.headers.authorization;
  try {
    const token = authorization.split(' ')[1];
    const token_exists = await TokenService.verifyToken(token);
    if (!token_exists) {
      return next(new AuthException());
    }
    await TokenService.invalidateToken(token);
    return res.send();
  } catch (err) {
    return next(new AuthException());
  }
});

module.exports = router;
