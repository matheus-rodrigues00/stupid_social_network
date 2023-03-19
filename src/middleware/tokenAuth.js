const TokenService = require('../auth/TokenService');
const UserService = require('../user/UserService');

const tokenAuthentication = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.substring(7);
    try {
      const auth = await TokenService.verifyToken(token);
      // I'm getting only the id of the user, not the whole user object
      //   const user = await UserService.findById(auth.id);
      req.authenticatedUser = auth;
    } catch (err) {}
  }
  next();
};

module.exports = tokenAuthentication;
