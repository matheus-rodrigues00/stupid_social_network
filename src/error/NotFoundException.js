module.exports = function NotFoundException(msg) {
  this.status = 404;
  this.message = msg || 'Not Found';
};
