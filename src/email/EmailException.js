module.exports = function EmailException() {
  this.message = 'email_sending_failure';
  this.status = 502;
};
