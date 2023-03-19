const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const Token = require('../src/auth/Token');
const sequelize = require('../src/config/database');
const bcrypt = require('bcryptjs');
const en = require('../locales/en/translation.json');
const ptBR = require('../locales/pt-BR/translation.json');

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

  it('should return id, username and token when credentials are valid', async () => {
    const user = await addUser();
    const res = await authenticateUser({ ...default_test_user });
    expect(res.body).toEqual({
      id: user.id,
      username: user.username,
      token: expect.any(String),
    });
  });
});

describe('Logout', () => {
  it('should return 200 when token is valid', async () => {
    const user = await addUser();
    const res = await authenticateUser({ ...default_test_user });
    const token = res.body.token;
    const logout_res = await logoutUser(token);
    expect(logout_res.status).toBe(200);
  });

  it('should remove token from database when token is valid', async () => {
    const user = await addUser();
    const res = await authenticateUser({ ...default_test_user });
    const token = res.body.token;
    const db_token_before = await Token.findOne({ where: { token: token } });
    expect(db_token_before).not.toBeNull();
    await logoutUser(token);
    const db_token = await Token.findOne({ where: { token } });
    expect(db_token).toBeNull();
  });

  it('should return 401 when token is invalid', async () => {
    const user = await addUser();
    const res = await authenticateUser({ ...default_test_user });
    const token = res.body.token;
    await Token.destroy({ where: { token } });
    const logout_res = await logoutUser(token);
    expect(logout_res.status).toBe(401);
  });
});
