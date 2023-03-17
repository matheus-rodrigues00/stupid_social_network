const nodemailer = require('nodemailer');
const config = require('config');
const mail_config = config.get('mail');
const transporter = nodemailer.createTransport({
  ...mail_config,
});

module.exports = transporter;
