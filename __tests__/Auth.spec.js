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

const logoutUser = async (token) => {
  const agent = request(app).post('/api/auth/logout');
  agent.set('Authorization', `Bearer ${token}`);
  return await agent.send();
};

const putUser = (id, body = {}, options = {}) => {
  const agent = request(app).put(`/api/users/${id}`);
  if (options.lang) {
    agent.set('Accept-Language', options.lang);
  }
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send(body);
};

describe('Authentication', () => {
  it('should return 200 when credentials are valid', async () => {
    await addUser();
    const res = await request(app).post('/api/auth').send({
      email: default_test_user.email,
      password: default_test_user.password,
    });
    expect(res.status).toBe(200);
  });

  it('should return 401 when credentials are invalid', async () => {
    await addUser();
    const res = await authenticateUser({ ...default_test_user, password: 'wrong_password' });
    expect(res.status).toBe(401);
  });

  it("shouldn't return the proper body when there's an error", async () => {
    const now = new Date().getTime();
    await addUser();
    const res = await authenticateUser({ ...default_test_user, password: 'wrong_password' });
    const error = res.body;
    expect(error.path).toBe('/api/auth');
    expect(error.timestamp).toBeGreaterThan(now);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
  });

  it.each`
    lang       | message
    ${'en'}    | ${en.auth_failed}
    ${'pt-BR'} | ${ptBR.auth_failed}
  `('should return $message when language is $lang', async ({ lang, message }) => {
    await addUser();
    const res = await authenticateUser({ ...default_test_user, password: 'wrong_password' }, { lang });
    expect(res.body.message).toBe(message);
  });

  it("should return 401 when email doesn't exist", async () => {
    const res = await authenticateUser({ ...default_test_user, email: 'invalid_email@mail.com' });
    expect(res.status).toBe(401);
  });

  it('should return id, username, avatar and token when credentials are valid', async () => {
    await addUser();
    const res = await authenticateUser({ ...default_test_user });
    // check the properties of res.body.content
    expect(Object.keys(res.body)).toEqual(['id', 'username', 'avatar', 'token']);
  });
});

describe('Logout', () => {
  it('should return 200 when token is valid', async () => {
    await addUser();
    const res = await authenticateUser({ ...default_test_user });
    const token = res.body.token;
    const logout_res = await logoutUser(token);
    expect(logout_res.status).toBe(200);
  });

  it('should remove token from database when token is valid', async () => {
    await addUser();
    const res = await authenticateUser({ ...default_test_user });
    const token = res.body.token;
    const db_token_before = await Token.findOne({ where: { token: token } });
    expect(db_token_before).not.toBeNull();
    await logoutUser(token);
    const db_token = await Token.findOne({ where: { token } });
    expect(db_token).toBeNull();
  });

  it('should return 401 when token is invalid', async () => {
    await addUser();
    const res = await authenticateUser({ ...default_test_user });
    const token = res.body.token;
    await Token.destroy({ where: { token } });
    const logout_res = await logoutUser(token);
    expect(logout_res.status).toBe(401);
  });
});

describe('Token Expiring', () => {
  it('returns 403 when token is older than 1 week', async () => {
    await addUser();
    const user = await User.findOne({ where: { username: default_test_user.username } });
    const test_token = 'test_token1';
    const one_week_ago = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await Token.create({ token: test_token, user_id: user.user_id, last_used_at: one_week_ago });
    const put_res = await putUser(user.id, { username: 'new_username' }, { token: test_token });
    expect(put_res.status).toBe(403);
  });
  it('refreshes last_used_at when unexpired token is used', async () => {
    await addUser();
    const user = await User.findOne({ where: { username: default_test_user.username } });
    const test_token = 'test_token2';
    const four_days_ago = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await Token.create({ token: test_token, user_id: user.user_id, last_used_at: four_days_ago });
    await putUser(user.id, { username: 'new_username' }, { token: test_token });
    const db_token = await Token.findOne({ where: { token: test_token } });
    expect(db_token.last_used_at.getTime()).toBeGreaterThan(four_days_ago.getTime());
  });
  it('refreshes last_used_at when unexpired token is used for unauthenticated endpoint', async () => {
    await addUser();
    const user = await User.findOne({ where: { username: default_test_user.username } });
    const test_token = 'test_token3';
    const four_days_ago = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await Token.create({ token: test_token, user_id: user.user_id, last_used_at: four_days_ago });
    const right_before = new Date(Date.now() - 1);
    await putUser(user.id, { username: 'new_username' }, { token: test_token });
    const db_token = await Token.findOne({ where: { token: test_token } });
    expect(db_token.last_used_at.getTime()).toBeGreaterThan(right_before.getTime());
  });
});
