const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcryptjs');

beforeAll(async () => {
  await sequelize.sync();
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

describe('Example', () => {
  it('should be true', () => {
    expect(true).toBe(true);
  });

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
    ${'en'}    | ${'Invalid credentials'}
    ${'pt-BR'} | ${'Credenciais inválidas'}
  `('should return $message when language is $lang', async ({ lang, message }) => {
    await addUser();
    const res = await authenticateUser({ ...default_test_user, password: 'wrong_password' }, { lang });
    expect(res.body.message).toBe(message);
  });

  it("should return 401 when email doesn't exist", async () => {
    const res = await authenticateUser({ ...default_test_user, email: 'invalid_email@mail.com' });
    expect(res.status).toBe(401);
  });
});
