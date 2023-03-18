module.exports = function AuthException() {
  this.status = 401;
  this.message = 'auth_failed';
};
