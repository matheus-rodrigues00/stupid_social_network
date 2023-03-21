const UserService = require('../user/UserService');
const ForbiddenException = require('../error/ForbiddenException');

const passwordResetTokenValidator = async (req, res, next) => {
  const user = await UserService.findByPasswordResetToken(req.body.password_reset_token);
  if (!user) {
    return next(new ForbiddenException('unauthroized_password_reset'));
  }
  next();
};

module.exports = passwordResetTokenValidator;
