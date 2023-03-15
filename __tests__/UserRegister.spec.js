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
  password: '#Abc1234',
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
      expect(user.password).not.toBe('#Abc1234');
      done();
    });
  });

  it('should not register a new user if username is null', async (done) => {
    const res = await request(app).post('/api/users').send({
      username: null,
      email: 'matheus@gmail.com',
      password: '#Abc1234',
    });
    expect(res.status).toBe(400);
    done();
  });

  it('should not register a new user if email is null', async (done) => {
    const res = await request(app).post('/api/users').send({
      username: 'matheus_user',
      email: null,
      password: '#Abc1234',
    });
    expect(res.status).toBe(400);
    done();
  });

  it('should not register if both email and username are null', async (done) => {
    const res = await request(app).post('/api/users').send({
      username: null,
      email: null,
      password: '#Abc1234',
    });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.validationErrors).length).toBe(2);
    done();
  });

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${'Username is required!'}
    ${'username'} | ${'a'.repeat(3)}   | ${'Username must have min 4 and max 32 characters!'}
    ${'username'} | ${'a'.repeat(33)}  | ${'Username must have min 4 and max 32 characters!'}
    ${'email'}    | ${null}            | ${'Email is required!'}
    ${'email'}    | ${'mail.com'}      | ${'Email is not valid!'}
    ${'email'}    | ${'user.mail.com'} | ${'Email is not valid!'}
    ${'email'}    | ${'user@mail'}     | ${'Email is not valid!'}
    ${'password'} | ${null}            | ${'Password is required!'}
    ${'password'} | ${'test1'}         | ${'Password must be at least 6 characters long!'}
    ${'password'} | ${'alllowercase'}  | ${'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character!'}
    ${'password'} | ${'ALLUPPERCASE'}  | ${'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character!'}
    ${'password'} | ${'1234567890'}    | ${'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character!'}
    ${'password'} | ${'lowerandUPPER'} | ${'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character!'}
    ${'password'} | ${'lower4nd5667'}  | ${'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character!'}
    ${'password'} | ${'UPPER44444'}    | ${'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character!'}
  `('should not register a new user if $field is null', async ({ field, value, expectedMessage }) => {
    const c_user = { ...defaultTestUser };
    c_user[field] = value;
    const res = await createUser(c_user);
    expect(res.body.validationErrors[field]).toBe(expectedMessage);
  });

  it('should not register a new user if email is already in use', async (done) => {
    await createUser(defaultTestUser);
    const res = await createUser(defaultTestUser);
    expect(res.body.validationErrors.email).toBe('Email already in use!');
    done();
  });

  it('should not register a new user if username is already in use', async (done) => {
    await createUser(defaultTestUser);
    const res = await createUser(defaultTestUser);
    expect(res.body.validationErrors.username).toBe('Username already in use!');
    done();
  });
});
