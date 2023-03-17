const transporter = require('../config/emailTransporter');
const nodemailer = require('nodemailer');

const sendAccountActivation = async (email, token) => {
  const info = await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: email,
    subject: 'Account Activation',
    html: `
    <div>
      <b>Please click below link to activate your account</b>
    </div>
    <div>
      <a href="http://localhost:3000/api/activate/${token}">Activate</a>
    </div>
    `,
  });
  if (process.env.NODE_ENV === 'development') console.log('Message sent: %s', nodemailer.getTestMessageUrl(info));
};

module.exports = { sendAccountActivation };
