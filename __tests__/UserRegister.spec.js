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

  it('should not register a new user if username is null', async (done) => {
    const res = await request(app).post('/api/users').send({
      username: null,
      email: 'matheus@gmail.com',
      password: 'matheus123',
    });
    expect(res.status).toBe(400);
    done();
  });

  it('should not register a new user if email is null', async (done) => {
    const res = await request(app).post('/api/users').send({
      username: 'matheus_user',
      email: null,
      password: 'matheus123',
    });
    expect(res.status).toBe(400);
    done();
  });

  it('should not register if both email and username are null', async (done) => {
    const res = await request(app).post('/api/users').send({
      username: null,
      email: null,
      password: 'matheus123',
    });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.validationErrors).length).toBe(2);
    done();
  });

  it.each`
    field         | value
    ${'username'} | ${'Username is required!'}
    ${'email'}    | ${'Email is required!'}
    ${'password'} | ${'Password is required!'}
  `('should not register a new user if $field is null', async ({ field, value }) => {
    const c_user = { ...defaultTestUser };
    c_user[field] = null;
    const res = await createUser(c_user);
    console.log(res.body.validationErrors[field]);
    expect(res.body.validationErrors[field]).toBe(value);
  });
});
