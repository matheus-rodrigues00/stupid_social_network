const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const Token = require('../src/auth/Token');
const en = require('../locales/en/translation.json');
const ptBR = require('../locales/pt-BR/translation.json');
const sequelize = require('../src/config/database');
const SMTPServer = require('smtp-server').SMTPServer;
const test = require('../config/test.json');
require('dotenv').config();

let lastMail,
  server,
  simulateSMTPFailure = false;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  if (process.env.NODE_ENV !== 'test') return;
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSMTPFailure) {
          const error = new Error('Invalid mailbox');
          error.responseCode = 502;
          return callback(error);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });
  await server.listen(test.mail.port, 'localhost');
  jest.setTimeout(60000);
});

beforeEach(async () => {
  simulateSMTPFailure = false;
  await User.destroy({
    truncate: {
      cascade: true,
    },
  });
});

afterAll(async () => {
  await server.close();
  jest.setTimeout(10000);
});

const default_test_user = {
  username: 'matheus_user',
  email: 'matheus@gmail.com',
  password: '#Abc1234',
  is_active: true,
};

const addUser = async () => {
  const mock_user = { ...default_test_user };
  return await User.create(mock_user);
};

const postPasswordReset = (email = 'matheus@mail.com', config = {}) => {
  const agent = request(app).post('/api/password-reset');
  if (config.lang) {
    agent.set('Accept-Language', config.lang);
  }
  return agent.send({ email });
};

describe('Password Reset', () => {
  it('returns 200 when a password reset request is sent for a known e-mail', async () => {
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.status).toBe(200);
  });
  it.each`
    lang       | message
    ${'pt-BR'} | ${ptBR.password_reset_email_sent}
    ${'en'}    | ${en.password_reset_email_sent}
  `(
    'returns success body with $message for known email for password reset request when lang is $lang',
    async ({ lang, message }) => {
      const user = await addUser();
      const response = await postPasswordReset(user.email, { lang });
      expect(response.body.message).toBe(message);
    }
  );

  it('creates a token for password reset', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const user_in_db = await User.findByPk(user.id);
    expect(user_in_db.password_reset_token).not.toBeNull();
  });

  it('returns 404 when a password reset request is sent for unknown e-mail', async () => {
    const response = await postPasswordReset();
    expect(response.status).toBe(404);
  });

  it.each`
    lang       | message
    ${'pt-BR'} | ${ptBR.email_not_inuse}
    ${'en'}    | ${en.email_not_inuse}
  `(
    'returns error body with $message for unknown email for password reset request when lang is $lang',
    async ({ lang, message }) => {
      const response = await postPasswordReset('invalid@mail.com', { lang });
      expect(response.body.message).toBe(message);
    }
  );

  it.each`
    lang       | message
    ${'pt-BR'} | ${ptBR.validation_failure}
    ${'en'}    | ${en.validation_failure}
  `(
    'returns 400 with validation error response having $message when request does not have valid email and lang is $lang',
    async ({ lang, message }) => {
      const response = await postPasswordReset('invalid_email', { lang });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(message);
    }
  );
});

describe('Email Sending', () => {
  it('sends a password reset email with password_reset_token', async () => {
    if (process.env.SMTP_SERVICE_ACTIVE === '1') {
      const user = await addUser();
      await postPasswordReset(user.email);
      const user_in_db = await User.findByPk(user.id);
      expect(lastMail).toContain(user_in_db.password_reset_token);
      expect(lastMail).toContain(user_in_db.email);
    }
  });
  it('returns 502 Bad Gateway when sending email fails', async () => {
    if (process.env.SMTP_SERVICE_ACTIVE === '1') {
      simulateSMTPFailure = true;
      const user = await addUser();
      const response = await postPasswordReset(user.email);
      expect(response.status).toBe(502);
    }
  });

  it.each`
    lang       | message
    ${'pt-BR'} | ${ptBR.email_sending_failure}
    ${'en'}    | ${en.email_sending_failure}
  `('returns $message when lang is set as $lang after e-mail failure', async ({ lang, message }) => {
    if (process.env.SMTP_SERVICE_ACTIVE === '1') {
      simulateSMTPFailure = true;
      const user = await addUser();
      const response = await postPasswordReset(user.email, { lang: lang });
      expect(response.body.message).toBe(message);
    }
  });
});

const putPasswordReset = (password_reset_token, password, config = {}) => {
  const agent = request(app).put('/api/password-reset');
  if (config.lang) {
    agent.set('Accept-Language', config.lang);
  }
  return agent.send({ password_reset_token, password });
};

describe('Password Update', () => {
  it('returns 403 when password update request does not have the valid password reset token', async () => {
    const response = await putPasswordReset('invalid_token', 'new_password');
    expect(response.status).toBe(403);
  });

  it.each`
    lang       | message
    ${'pt-BR'} | ${ptBR.unauthroized_password_reset}
    ${'en'}    | ${en.unauthroized_password_reset}
  `(
    'returns error body with $message when lang is set to $lang after trying to update with invalid token',
    async ({ lang, message }) => {}
  );

  it('returns 403 when password update request with invalid password pattern and the reset token is invalid', async () => {
    const response = await putPasswordReset('invalid_token', 'new_password');
    expect(response.status).toBe(403);
  });

  it('returns 400 when trying to update with invalid password and the reset token is valid', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const user_in_db = await User.findByPk(user.id);
    const response = await putPasswordReset(user_in_db.password_reset_token, 'invalid_password');
    expect(response.status).toBe(400);
  });

  it.each`
    lang       | value              | message
    ${'en'}    | ${null}            | ${en.password_null}
    ${'en'}    | ${'P4ssw'}         | ${en.password_size}
    ${'en'}    | ${'alllowercase'}  | ${en.password_pattern}
    ${'en'}    | ${'ALLUPPERCASE'}  | ${en.password_pattern}
    ${'en'}    | ${'1234567890'}    | ${en.password_pattern}
    ${'en'}    | ${'lowerandUPPER'} | ${en.password_pattern}
    ${'en'}    | ${'lower4nd5667'}  | ${en.password_pattern}
    ${'en'}    | ${'UPPER44444'}    | ${en.password_pattern}
    ${'pt-BR'} | ${null}            | ${ptBR.password_null}
    ${'pt-BR'} | ${'P4ssw'}         | ${ptBR.password_size}
    ${'pt-BR'} | ${'alllowercase'}  | ${ptBR.password_pattern}
    ${'pt-BR'} | ${'ALLUPPERCASE'}  | ${ptBR.password_pattern}
    ${'pt-BR'} | ${'1234567890'}    | ${ptBR.password_pattern}
    ${'pt-BR'} | ${'lowerandUPPER'} | ${ptBR.password_pattern}
    ${'pt-BR'} | ${'lower4nd5667'}  | ${ptBR.password_pattern}
    ${'pt-BR'} | ${'UPPER44444'}    | ${ptBR.password_pattern}
  `(
    'returns password validation error $message when lang is set to $lang and the value is $value',
    async ({ lang, message, value }) => {
      const user = await addUser();
      await postPasswordReset(user.email);
      const user_in_db = await User.findByPk(user.id);
      const response = await putPasswordReset(user_in_db.password_reset_token, value, { lang });
      expect(response.body.validationErrors.password).toBe(message);
    }
  );

  it('returns 200 when valid password is sent with valid reset token', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const user_in_db = await User.findByPk(user.id);
    const response = await putPasswordReset(user_in_db.password_reset_token, 'ValidPassword123');
    expect(response.status).toBe(200);
  });

  it('updates the password in database when the request is valid', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const user_in_db = await User.findByPk(user.id);
    await putPasswordReset(user_in_db.password_reset_token, 'ValidPassword123');
    const updated_user = await User.findByPk(user.id);
    expect(updated_user.password).not.toBe(user.password);
  });

  it('activates and clears activation token if the account is inactive after valid password reset', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const user_in_db = await User.findByPk(user.id);
    await putPasswordReset(user_in_db.password_reset_token, 'ValidPassword123');
    const updated_user = await User.findByPk(user.id);
    expect(updated_user.is_active).toBe(true);
    expect(updated_user.activation_token).toBeFalsy();
  });

  it('clears all tokens of user after valid password reset', async () => {
    const user = await addUser();
    user.password_reset_token = '1234567890';
    await user.save();
    for (let i = 0; i < 5; i++) {
      await Token.create({
        user_id: user.id,
        token: '1234567890' + i,
        last_used_at: new Date(),
      });
    }
    await putPasswordReset(user.password_reset_token, 'ValidPassword123');
    const tokens = await Token.findAll({ where: { user_id: user.id } });
    expect(tokens.length).toBe(0);
  });
});
