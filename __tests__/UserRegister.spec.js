const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(() => {
  return sequelize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: true });
});

describe('User Register', () => {
  const createDefaultUser = () => {
    return request(app).post('/api/users').send({
      username: 'matheus_user',
      email: 'matheus@gmail.com',
      password: 'matheus123'
    });
  };

  it('should register a new user', async (done) => {
    const res = await createDefaultUser();
    expect(res.status).toBe(200);
    done();
  });

  it('return success message when registration is valid', async (done) => {
    const res = await createDefaultUser();
    expect(res.body.message).toBe('User was registered successfully!');
    done();
  });

  it('saves the user into the db', async (done) => {
    await createDefaultUser();
    User.findOne({ where: { username: 'matheus_user' } }).then((user) => {
      expect(user).not.toBeNull();
      done();
    });
  });

  it('hashes the password before saving it into the db', async (done) => {
    await createDefaultUser();
    User.findOne({ where: { username: 'matheus_user' } }).then((user) => {
      expect(user.password).not.toBe('matheus123');
      done();
    });
  });
});
