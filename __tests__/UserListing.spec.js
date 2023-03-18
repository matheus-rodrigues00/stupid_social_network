const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const en = require('../locales/en/translation.json');
const ptBR = require('../locales/pt-BR/translation.json');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

beforeEach(async () => {
  await sequelize.sync({ force: true });
  await User.destroy({ truncate: true });
});

afterAll(async () => {
  await sequelize.sync({ force: true });
  return User.destroy({ truncate: true });
});

const getUsers = () => {
  return request(app).get('/api/users');
};

const default_test_user = {
  username: 'matheus_user',
  email: 'matheus@gmail.com',
  password: '#Abc1234',
};

const addUsers = async (actives, inactives) => {
  for (let i = 0; i < actives; i++) {
    const username = default_test_user.username + i;
    await User.create({
      username,
      email: username + '@gmail.com',
      password: default_test_user.password,
      is_active: true,
    });
  }
  for (let i = 0; i < inactives; i++) {
    const username = default_test_user.username + i;
    await User.create({
      username,
      email: username + '@gmail.com',
      password: default_test_user.password,
      is_active: false,
    });
  }
};

describe('Listing Users', () => {
  it('should return 200 OK', async () => {
    const res = await getUsers();
    expect(res.status).toBe(200);
  });
  it('should return a JSON object', async () => {
    const res = await getUsers();
    expect(res.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      total_pages: 0,
    });
  });
  it('should return 10 users even when there are more than 10 on database', async () => {
    await addUsers(11, 0);
    const res = await getUsers();
    expect(res.body.content.length).toBe(10);
  });
  it('should return 0 users when there are no active users on database', async () => {
    await addUsers(0, 11);
    const res = await getUsers();
    expect(res.body.content.length).toBe(0);
  });
  it('return sanitized users (without password)', async () => {
    await addUsers(1, 0);
    const res = await getUsers();
    const user = res.body.content[0];
    expect(user.password).toBeUndefined();
  });
  it('should return 2 total_pages when there are 11 active users on database', async () => {
    await addUsers(11, 0);
    const res = await getUsers();
    expect(res.body.total_pages).toBe(2);
  });
  // Now dealing with pagation
  it('should return 2 users on page 2 when there are 12 active users on database', async () => {
    await addUsers(12, 0);
    const res = await getUsers().query({ page: 2, size: 10 });
    expect(res.body.content.length).toBe(2);
  });
  it('should return first page when page is set to below 0', async () => {
    await addUsers(12, 0);
    const res = await getUsers().query({ page: -1, size: 10 });
    expect(res.body.page).toBe(0);
  });
  it('should return 5 users when size is set to 5 and there are 12 active users on database', async () => {
    await addUsers(12, 0);
    const res = await getUsers().query({ page: 1, size: 5 });
    expect(res.body.content.length).toBe(5);
  });
  it('should return 10 users when size is set to 15 and there are 12 active users on database', async () => {
    await addUsers(12, 0);
    const res = await getUsers().query({ page: 1, size: 15 });
    expect(res.body.content.length).toBe(10);
  });
  it('should return default values when page and size are not valid numbers', async () => {
    await addUsers(12, 0);
    const res = await getUsers().query({ page: 'abc', size: 'abc' });
    expect(res.body.page).toBe(0);
    expect(res.body.size).toBe(10);
  });
});

const getUser = (id, config = {}) => {
  const agent = request(app).get(`/api/users/${id}`);
  if (config.language) {
    agent.set('Accept-Language', config.language);
  }
  return agent;
};

describe('Getting User by Id', () => {
  it('should return 200 OK when user is found', async () => {
    await User.create({ ...default_test_user, is_active: true });
    const user = await User.findOne({ where: { username: default_test_user.username } });
    const res = await getUser(user.id);
    expect(res.status).toBe(200);
  });
  it('should return 404 NOT FOUND when user is not found', async () => {
    const res = await request(app).get(`/api/users/123`);
    expect(res.status).toBe(404);
  });
  it('should return a JSON object when user is found', async () => {
    const user = await User.create({ ...default_test_user, is_active: true });
    const res = await getUser(user.dataValues.id);
    expect(res.body).toEqual({
      id: user.id,
      username: user.username,
      email: user.email,
    });
  });
  it('It should return error when user is inactive', async () => {
    const user = await User.create({ ...default_test_user, is_active: false });
    const res = await getUser(user.dataValues.id);
    expect(res.status).toBe(404);
  });
  it.each`
    language   | message
    ${'en'}    | ${en.user_not_found}
    ${'pt-BR'} | ${ptBR.user_not_found}
  `('should return $message when language is $language', async ({ language, message }) => {
    const res = await getUser('123', { language });
    expect(res.body.message).toBe(message);
  });
  it("should return proper error body when user doesn't exist", async () => {
    const now = new Date().getTime();
    const res = await getUser('123');
    const error = res.body;
    expect(error.path).toBe('/api/users/123');
    expect(error.timestamp).toBeGreaterThan(now);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
  });
});
