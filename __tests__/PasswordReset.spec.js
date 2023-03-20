const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const en = require('../locales/en/translation.json');
const ptBR = require('../locales/pt-BR/translation.json');
const sequelize = require('../src/config/database');
beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({
    truncate: {
      cascade: true,
    },
  });
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
    console.log(response.body);
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
