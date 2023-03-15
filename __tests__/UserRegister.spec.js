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

const defaultTestUser = {
  username: 'matheus_user',
  email: 'matheus@gmail.com',
  password: 'matheus123',
};

describe('User Register', () => {
  const createUser = (user) => {
    return request(app).post('/api/users').send(user);
  };

  it('should register a new user', async (done) => {
    const res = await createUser(defaultTestUser);
    expect(res.status).toBe(200);
    done();
  });

  it('return success message when registration is valid', async (done) => {
    const res = await createUser(defaultTestUser);
    expect(res.body.message).toBe('User was registered successfully!');
    done();
  });

  it('saves the user into the db', async (done) => {
    await createUser(defaultTestUser);
    User.findOne({ where: { username: 'matheus_user' } }).then((user) => {
      expect(user).not.toBeNull();
      done();
    });
  });

  it('hashes the password before saving it into the db', async (done) => {
    await createUser(defaultTestUser);
    User.findOne({ where: { username: 'matheus_user' } }).then((user) => {
      expect(user.password).not.toBe('matheus123');
      done();
    });
  });

  // Now I need to write tests to verify if the user fields are valid
  // I will write the tests for the username field
  it('should not register a new user if username is null', async (done) => {
    const res = await request(app).post('/api/users').send({
      username: null,
      email: 'matheus@gmail.com',
      password: 'matheus123',
    });
    expect(res.status).toBe(400);
    done();
  });

  // Now I have to test if the email is valid
  it('should not register a new user if email is null', async (done) => {
    const res = await request(app).post('/api/users').send({
      username: 'matheus_user',
      email: null,
      password: 'matheus123',
    });
    expect(res.status).toBe(400);

    done();
  });

  // Now test for both

  it('should fail for both invalid, username and email', async (done) => {
    const res = await request(app).post('/api/users').send({
      username: null,
      email: null,
      password: 'matheus123',
    });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.validationErrors).length).toBe(2);
    done();
  });
});
