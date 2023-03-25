const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const Token = require('../src/auth/Token');
const sequelize = require('../src/config/database');
const bcrypt = require('bcryptjs');
const en = require('../locales/en/translation.json');
const ptBR = require('../locales/pt-BR/translation.json');

beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }
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
  mock_user.password = await bcrypt.hash(mock_user.password, 10);
  return await User.create(mock_user);
};

const authenticateUser = async (credentials, config = {}) => {
  const agent = request(app).post('/api/auth');
  if (config.lang) {
    agent.set('Accept-Language', config.lang);
  }
  return await agent.send(credentials);
};

const deleteUser = async (id, options = {}) => {
  const agent = request(app).delete('/api/users/' + id);
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  if (options.lang) {
    agent.set('Accept-Language', options.lang);
  }
  return await agent.send();
};

describe('User Delete', () => {
  it('should returns forbidden when request sent unauthorized', async () => {
    const res = await deleteUser(5);
    expect(res.status).toBe(403);
  });
  it.each`
    lang       | message
    ${'pt-BR'} | ${ptBR.forbidden_delete}
    ${'en'}    | ${en.forbidden_delete}
  `('returns error body with $message for unauthroized request when lang is $lang', async ({ lang, message }) => {
    const now = new Date().getTime();
    const res = await deleteUser(5, { lang });
    expect(res.body.path).toBe('/api/users/5');
    expect(res.body.timestamp).toBeGreaterThan(now);
    expect(res.body.message).toBe(message);
  });
  it('returns forbidden when delete request is sent with correct credentials but for different user', async () => {
    await addUser();
    await User.findOne({ where: { email: default_test_user.email } });
    const token = await authenticateUser(default_test_user);
    const res = await deleteUser(999, { token });
    expect(res.status).toBe(403);
  });
  it('reutrns 403 when token is not valid', async () => {
    await addUser();
    const user = await User.findOne({ where: { email: default_test_user.email } });

    const res = await deleteUser(user.id, { token: 'invalid_token' });
    expect(res.status).toBe(403);
  });
  it('returns 200 ok when delete request sent from authorized user', async () => {
    await addUser();
    const user = await User.findOne({ where: { email: default_test_user.email } });
    const res = await authenticateUser({
      email: default_test_user.email,
      password: default_test_user.password,
    });
    const token = res.body.token;

    const res2 = await deleteUser(user.id, { token });
    expect(res2.status).toBe(200);
  });
  it('deletes user from database when request sent from authorized user', async () => {
    await addUser();
    const user = await User.findOne({ where: { email: default_test_user.email } });
    const res = await authenticateUser({
      email: default_test_user.email,
      password: default_test_user.password,
    });
    const token = res.body.token;

    await deleteUser(user.id, { token });
    const deleted_user = await User.findOne({ where: { email: default_test_user.email } });
    expect(deleted_user).toBeNull();
  });
  it("should delete all user's tokens from database when user is deleted", async () => {
    await addUser();
    const user = await User.findOne({ where: { email: default_test_user.email } });
    let token = null;
    for (let i = 0; i < 5; i++) {
      const res = await authenticateUser({
        email: default_test_user.email,
        password: default_test_user.password,
      });
      if (!token) token = res.body.token;
    }
    await deleteUser(user.id, { token: token });

    const tokens_in_db = await Token.findAll({ where: { user_id: user.id } });
    expect(tokens_in_db.length).toBe(0);
  });
});
