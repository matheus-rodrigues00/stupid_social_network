const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcryptjs');
const en = require('../locales/en/translation.json');
const ptBR = require('../locales/pt-BR/translation.json');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

beforeEach(async () => {
  await User.destroy({ truncate: true });
});

const default_test_user = {
  username: 'matheus_user',
  email: 'matheus@gmail.com',
  password: '#Abc1234',
  is_active: true,
};

const addUser = async (user = { ...default_test_user }) => {
  const mock_user = { ...user };
  mock_user.password = await bcrypt.hash(mock_user.password, 10);
  return await User.create(mock_user);
};

const putUser = (id, body = {}, options = {}) => {
  const agent = request(app).put(`/api/users/${id}`);
  if (options.lang) {
    agent.set('Accept-Language', options.lang);
  }
  if (options.auth) {
    const { email, password } = options.auth;
    agent.auth(email, password);
  }
  return agent.send(body);
};

describe('User Update', () => {
  it('should return forbidden when no body is provided', async () => {
    const res = await putUser();
    expect(res.status).toBe(403);
  });
  it.each`
    lang       | message
    ${'en'}    | ${en.forbidden_update}
    ${'pt-BR'} | ${ptBR.forbidden_update}
  `('should return $message when unauthorized request and lang is $lang', async ({ lang, message }) => {
    const now = new Date().getTime();
    const res = await putUser(5, {}, { lang });
    expect(res.body.path).toBe('/api/users/5');
    expect(res.body.timestamp).toBeGreaterThan(now);
    expect(res.body.message).toBe(message);
  });
  it('returns forbidden when is sent with incorrect email', async () => {
    await addUser();
    const user = await User.findOne({ where: { email: default_test_user.email } });
    const res = await putUser(user.id, { email: 'wrong_email' });
    expect(res.status).toBe(403);
  });
  it('returns forbidden when update request is sent with incorrect password', async () => {
    await addUser();
    const user = await User.findOne({ where: { email: default_test_user.email } });
    const res = await putUser(user.id, { password: 'wrong_password' });
    expect(res.status).toBe(403);
  });
  it('returns forbidden when update is sent with same information', async () => {
    await addUser();
    const user = await User.findOne({ where: { email: default_test_user.email } });
    const res = await putUser(user.id, { ...default_test_user });
    expect(res.status).toBe(403);
  });
  it('returns forbidden for inactive user even tough the request is valid', async () => {
    await addUser({ ...default_test_user, is_active: false });
    const user = await User.findOne({ where: { email: default_test_user.email } });
    const res = await putUser(user.id, { ...default_test_user });
    expect(res.status).toBe(403);
  });
  it("returns 200 when update request is sent with correct information and user's active", async () => {
    await addUser({ ...default_test_user, is_active: true });
    const user = await User.findOne({ where: { email: default_test_user.email } });
    const valid_update = { username: 'new_username' };
    const res = await putUser(user.id, valid_update, {
      auth: {
        email: default_test_user.email,
        password: '#Abc1234',
      },
    });
    expect(res.status).toBe(200);
  });
  it("updates user's username when update request is sent with correct information and user's active", async () => {
    await addUser({ ...default_test_user, email: 'test2@gmail.com', is_active: true });
    const user = await User.findOne({ where: { email: 'test2@gmail.com' } });
    const valid_update = { username: 'new_username' };
    await putUser(user.id, valid_update, {
      auth: {
        email: 'test2@gmail.com',
        password: '#Abc1234',
      },
    });
    const in_db_user = await User.findOne({ where: { id: user.id } });
    expect(in_db_user.dataValues.username).toBe(valid_update.username);
  });
});
