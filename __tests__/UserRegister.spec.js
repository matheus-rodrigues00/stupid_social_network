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

const createUser = (user = defaultTestUser, config = {}) => {
  const agent = request(app).post('/api/users');
  if (config.lang) {
    agent.set('Accept-Language', config.lang);
  }
  return agent.send(user);
};

describe('User Register', () => {
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

  const error_messages = {
    username_null: 'Username is required!',
    username_size: 'Username must have min 4 and max 32 characters!',
    email_null: 'Email is required!',
    email_invalid: 'Email is not valid!',
    password_null: 'Password is required!',
    password_size: 'Password must be at least 6 characters long!',
    password_pattern:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character!',
    email_inuse: 'Email is already in use!',
  };

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${error_messages.username_null}
    ${'username'} | ${'a'.repeat(3)}   | ${error_messages.username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${error_messages.username_size}
    ${'email'}    | ${null}            | ${error_messages.email_null}
    ${'email'}    | ${'mail.com'}      | ${error_messages.email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${error_messages.email_invalid}
    ${'email'}    | ${'user@mail'}     | ${error_messages.email_invalid}
    ${'password'} | ${null}            | ${error_messages.password_null}
    ${'password'} | ${'test1'}         | ${error_messages.password_size}
    ${'password'} | ${'alllowercase'}  | ${error_messages.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${error_messages.password_pattern}
    ${'password'} | ${'1234567890'}    | ${error_messages.password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${error_messages.password_pattern}
    ${'password'} | ${'lower4nd5667'}  | ${error_messages.password_pattern}
    ${'password'} | ${'UPPER44444'}    | ${error_messages.password_pattern}
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

describe('Internationalization', () => {
  const international_error_messages = {
    username_null: 'O nome de usuário é obrigatório!',
    username_size: 'O nome de usuário deve ter entre 4 e 32 caracteres!',
    email_null: 'O e-mail é obrigatório!',
    email_invalid: 'O e-mail não é válido!',
    password_null: 'A senha é obrigatória!',
    password_size: 'A senha deve ter pelo menos 6 caracteres!',
    password_pattern:
      'A senha deve conter pelo menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial!',
    email_inuse: 'O e-mail já está em uso!',
  };

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${international_error_messages.username_null}
    ${'username'} | ${'a'.repeat(3)}   | ${international_error_messages.username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${international_error_messages.username_size}
    ${'email'}    | ${null}            | ${international_error_messages.email_null}
    ${'email'}    | ${'mail.com'}      | ${international_error_messages.email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${international_error_messages.email_invalid}
    ${'email'}    | ${'user@mail'}     | ${international_error_messages.email_invalid}
    ${'password'} | ${null}            | ${international_error_messages.password_null}
    ${'password'} | ${'test1'}         | ${international_error_messages.password_size}
    ${'password'} | ${'alllowercase'}  | ${international_error_messages.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${international_error_messages.password_pattern}
    ${'password'} | ${'1234567890'}    | ${international_error_messages.password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${international_error_messages.password_pattern}
    ${'password'} | ${'lower4nd5667'}  | ${international_error_messages.password_pattern}
    ${'password'} | ${'UPPER44444'}    | ${international_error_messages.password_pattern}
  `('should register correctly based on internationalization', async ({ field, value, expectedMessage }) => {
    const c_user = { ...defaultTestUser };
    c_user[field] = value;
    const res = await createUser(c_user, { lang: 'pt-BR' });
    expect(res.body.validationErrors[field]).toBe(expectedMessage);
  });

  it('should return this error message ${international_error_messages.email_inuse} if email is already in use', async () => {
    await createUser(defaultTestUser);
    const res = await createUser(defaultTestUser, { lang: 'pt-BR' });
    expect(res.body.validationErrors.email).toBe(international_error_messages.email_inuse);
  });
});
