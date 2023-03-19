const TokenService = require('../auth/TokenService');

const tokenAuthentication = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.substring(7);
    try {
      const auth = await TokenService.verifyToken(token);
      req.authenticatedUser = auth;
    } catch (err) {}
  }
  next();
};

module.exports = tokenAuthentication;
