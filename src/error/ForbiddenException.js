module.exports = function ForbiddenException(msg) {
  this.status = 403;
  this.message = msg || 'forbidden';
};
