const express = require('express');
const router = express.Router();
const UserService = require('./UserService');
const { check, validationResult } = require('express-validator');
const ValidationException = require('../error/ValidationExpection');
const pagination = require('./pagination');
const UserNotFoundException = require('./UserNotFoundException');
const ForbiddenException = require('../error/ForbiddenException');
const passwordResetTokenValidator = require('../middleware/passwordResetTokenValidator');
const FileService = require('../file/FileService');

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
    const authenticated_user = req.authenticatedUser;
    const { page, limit } = req.pagination;
    const users = await UserService.findAll(page, limit, authenticated_user);
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

router.put(
  '/api/users/:id',
  check('avatar').custom(async (avatar) => {
    if (!avatar) {
      return true;
    }
    const buffer = Buffer.from(avatar, 'base64');
    const supported_type = await FileService.isSupportedFileType(buffer);
    if (!FileService.isLessThan2MB(buffer)) {
      throw new Error('profile_image_size');
    }
    if (!supported_type) {
      throw new Error('unsupported_image_type');
    }
    return true;
  }),
  async (req, res, next) => {
    const authenticated_user = req.authenticatedUser;

    if (!authenticated_user || authenticated_user.id != req.params.id) {
      return next(new ForbiddenException('forbidden_update'));
    }

    if (req.body.username) {
      const new_username = req.body.username;
      if (new_username.length < 4 || new_username.length > 32) {
        return next(new ValidationException([{ msg: 'username_size', param: 'username' }]));
      } else if (await UserService.findByUsername(new_username)) {
        return next(new ValidationException([{ msg: 'username_inuse', param: 'username' }]));
      }
    }
    const errros = validationResult(req);
    if (!errros.isEmpty()) {
      return next(new ValidationException(errros.array()));
    }
    const user = await UserService.update(req.params.id, req.body);
    return res.send(user);
  }
);

router.delete('/api/users/:id', async (req, res, next) => {
  const authenticated_user = req.authenticatedUser;
  if (!authenticated_user || authenticated_user.id != req.params.id) {
    return next(new ForbiddenException('forbidden_delete'));
  }
  await UserService.deleteUser(req.params.id);
  return res.send();
});

router.post('/api/password-reset', check('email').isEmail().withMessage('email_invalid'), async (req, res, next) => {
  const errors = validationResult(req);
  try {
    if (!errors.isEmpty()) {
      throw new ValidationException(errors.array());
    }
    await UserService.sendPasswordResetEmail(req.body.email);
    return res.send({ message: req.t('password_reset_email_sent') });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/api/password-reset',
  passwordResetTokenValidator,
  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password_size')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('password_pattern'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }
    await UserService.updatePassword(req.body.password_reset_token, req.body.password);
    res.send();
  }
);

module.exports = router;
