const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const en = require('../locales/en/translation.json');
const ptBR = require('../locales/pt-BR/translation.json');
require('dotenv').config();
const SMTPServer = require('smtp-server').SMTPServer;

let lastMail,
  server,
  simulateSMTPFailure = false;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  if (process.env.NODE_ENV !== 'test') return;
  jest.setTimeout(60000);
  // This is necessary because the firsts tests can thrown timeout when the server is not ready yet,
  // sqlite throws errors when trying to connect to the db for too long.
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSMTPFailure) {
          const error = new Error('Invalid mailbox');
          error.responseCode = 502;
          return callback(error);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });

  await server.listen(8587, 'localhost');
});

beforeEach(async () => {
  await sequelize.sync({ force: true });
  simulateSMTPFailure = false;
  return await User.destroy({ truncate: { cascade: true } });
});

afterAll(async () => {
  await server.close();
  return User.destroy({ truncate: true });
});

const default_test_user = {
  username: 'matheus_user',
  email: 'matheus@gmail.com',
  password: '#Abc1234',
};

const createUser = (user = default_test_user, config = {}) => {
  const agent = request(app).post('/api/users');
  if (config.lang) {
    agent.set('Accept-Language', config.lang);
  }
  return agent.send(user);
};

describe('User Register', () => {
  it('should register a new user', async () => {
    const res = await createUser(default_test_user);
    expect(res.status).toBe(200);
  });

  it('return success message when registration is valid', async () => {
    const res = await createUser(default_test_user);
    expect(res.body.message).toBe(en.user_created);
  });

  it('saves the user into the db', async () => {
    await createUser(default_test_user);
    const user = await User.findOne({ where: { username: default_test_user.username } });
    expect(user).not.toBeNull();
  });

  it('hashes the password before saving it into the db', async () => {
    await createUser(default_test_user);
    const user = await User.findOne({ where: { username: default_test_user.username } });
    expect(user.password).not.toBe('#Abc1234');
  });

  it('should not register a new user if username is null', async () => {
    const res = await request(app).post('/api/users').send({
      username: null,
      email: 'matheus@gmail.com',
      password: '#Abc1234',
    });
    expect(res.status).toBe(400);
  });

  it('should not register a new user if email is null', async () => {
    const res = await request(app).post('/api/users').send({
      username: 'matheus_user',
      email: null,
      password: '#Abc1234',
    });
    expect(res.status).toBe(400);
  });

  it('should not register if both email and username are null', async () => {
    const res = await request(app).post('/api/users').send({
      username: null,
      email: null,
      password: '#Abc1234',
    });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.validationErrors).length).toBe(2);
  });

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${en.username_null}
    ${'username'} | ${'a'.repeat(3)}   | ${en.username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${en.username_size}
    ${'email'}    | ${null}            | ${en.email_null}
    ${'email'}    | ${'mail.com'}      | ${en.email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${en.email_invalid}
    ${'email'}    | ${'user@mail'}     | ${en.email_invalid}
    ${'password'} | ${null}            | ${en.password_null}
    ${'password'} | ${'test1'}         | ${en.password_size}
    ${'password'} | ${'alllowercase'}  | ${en.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${en.password_pattern}
    ${'password'} | ${'1234567890'}    | ${en.password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${en.password_pattern}
    ${'password'} | ${'lower4nd5667'}  | ${en.password_pattern}
    ${'password'} | ${'UPPER44444'}    | ${en.password_pattern}
  `('should not register a new user if $field is null', async ({ field, value, expectedMessage }) => {
    const c_user = { ...default_test_user };
    c_user[field] = value;
    const res = await createUser(c_user);
    expect(res.body.validationErrors[field]).toBe(expectedMessage);
  });

  it('should not register a new user if email is already in use', async () => {
    await createUser(default_test_user);
    const res = await createUser(default_test_user);
    expect(res.body.validationErrors.email).toBe(en.email_inuse);
  });

  it('should not register a new user if username is already in use', async () => {
    await createUser(default_test_user);
    const res = await createUser(default_test_user);
    expect(res.body.validationErrors.username).toBe(en.username_inuse);
  });

  it('should create a new user in inactive mode', async () => {
    await createUser(default_test_user);
    const user = await User.findOne({ where: { username: default_test_user.username } });
    expect(user.is_active).toBe(false);
  });

  it('should create a new user in inactive mode even when is_active is set to true in the request body', async () => {
    await createUser({ ...default_test_user, is_active: true });
    const user = await User.findOne({ where: { username: default_test_user.username } });
    expect(user.is_active).toBe(false);
  });

  it('should create a new user with an activation token', async () => {
    await createUser(default_test_user);
    const user = await User.findOne({ where: { username: default_test_user.username } });
    expect(user.activation_token).not.toBe(null);
  });

  it('should send an email with the activation token', async () => {
    if (process.env.NODE_ENV === 'development') {
      await createUser(default_test_user);
      const user = await User.findOne({ where: { username: default_test_user.username } });
      expect(lastMail).toContain(user.email);
    }
  });

  it('returns 502 Bad Gateway when sending email fails', async () => {
    if (process.env.NODE_ENV === 'development') {
      simulateSMTPFailure = true;
      const res = await createUser(default_test_user);
      expect(res.status).toBe(502);
    }
  });

  it("shouldn't save user in database if sending email fails", async () => {
    if (process.env.NODE_ENV === 'development') {
      simulateSMTPFailure = true;
      await createUser(default_test_user);
      const user = await User.findOne({ where: { username: default_test_user.username } });
      expect(user).toBe(null);
    }
  });
});

it('returns Validation Failure if username is null', async () => {
  const res = await createUser({
    username: null,
    email: default_test_user.email,
    password: default_test_user.password,
  });
  expect(res.body.message).toBe(en.validation_failure);
});

describe('Internationalization', () => {
  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${ptBR.username_null}
    ${'username'} | ${'a'.repeat(3)}   | ${ptBR.username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${ptBR.username_size}
    ${'email'}    | ${null}            | ${ptBR.email_null}
    ${'email'}    | ${'mail.com'}      | ${ptBR.email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${ptBR.email_invalid}
    ${'email'}    | ${'user@mail'}     | ${ptBR.email_invalid}
    ${'password'} | ${null}            | ${ptBR.password_null}
    ${'password'} | ${'test1'}         | ${ptBR.password_size}
    ${'password'} | ${'alllowercase'}  | ${ptBR.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${ptBR.password_pattern}
    ${'password'} | ${'1234567890'}    | ${ptBR.password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${ptBR.password_pattern}
    ${'password'} | ${'lower4nd5667'}  | ${ptBR.password_pattern}
    ${'password'} | ${'UPPER44444'}    | ${ptBR.password_pattern}
  `('should register correctly based on internationalization', async ({ field, value, expectedMessage }) => {
    const c_user = { ...default_test_user };
    c_user[field] = value;
    const res = await createUser(c_user, { lang: 'pt-BR' });
    expect(res.body.validationErrors[field]).toBe(expectedMessage);
  });

  it('returns ${international_error_messages.validation_failure} if username is null', async () => {
    const res = await createUser(
      {
        username: null,
        email: default_test_user.email,
        password: default_test_user.password,
      },
      { lang: 'pt-BR' }
    );
    expect(res.body.message).toBe(ptBR.validation_failure);
  });

  it('should return this error message ${international_error_messages.email_inuse} if email is already in use', async () => {
    await createUser(default_test_user);
    const res = await createUser(default_test_user, { lang: 'pt-BR' });
    expect(res.body.validationErrors.email).toBe(ptBR.email_inuse);
  });

  it('should return this error message ${international_error_messages.email_sending_failure} if sending email fails', async () => {
    if (process.env.NODE_ENV === 'development') {
      simulateSMTPFailure = true;
      const res = await createUser(default_test_user, { lang: 'pt-BR' });
      expect(res.body.message).toBe(ptBR.email_sending_failure);
    }
  });
});

const activateUser = async (token, config = {}) => {
  const agent = request.agent(app).get(`/api/activate/${token}`);
  if (config.lang) agent.set('Accept-Language', config.lang);
  return agent;
};
describe('Account activation', () => {
  it('activates when token sent is valid', async () => {
    await createUser(default_test_user);
    const user = await User.findOne({ where: { username: default_test_user.username } });
    const res = await activateUser(user.activation_token);
    expect(res.status).toBe(200);
  });
  it("removes token from table when it's valid", async () => {
    await createUser(default_test_user);
    const user = await User.findOne({ where: { username: default_test_user.username } });
    await activateUser(user.activation_token);
    const userAfterActivation = await User.findOne({ where: { username: default_test_user.username } });
    expect(userAfterActivation.activation_token).toBe(null);
  });
  it("doesn't activate the user when token is invalid", async () => {
    await createUser(default_test_user);
    await activateUser('invalid_token');
    const user = await User.findOne({ where: { username: default_test_user.username } });
    expect(user.is_active).toBeFalsy();
  });
  it('activates the user when token is valid', async () => {
    await createUser(default_test_user);
    const user = await User.findOne({ where: { username: default_test_user.username } });
    await activateUser(user.activation_token);
    const userAfterActivation = await User.findOne({ where: { username: default_test_user.username } });
    expect(userAfterActivation.is_active).toBeTruthy();
  });

  it('returns error when token is invalid', async () => {
    await createUser(default_test_user);
    const res = await activateUser('invalid_token');
    expect(res.status).toBe(400);
  });
  it.each`
    lang       | status       | value
    ${'pt-BR'} | ${'correct'} | ${ptBR.account_activation_success}
    ${'en'}    | ${'correct'} | ${en.account_activation_success}
    ${'pt-BR'} | ${'wrong'}   | ${ptBR.account_activation_failure}
    ${'en'}    | ${'wrong'}   | ${en.account_activation_failure}
  `('should send correct messages based on internationalization', async ({ lang, status, value }) => {
    await createUser(default_test_user, { lang });
    let user = await User.findOne({ where: { username: default_test_user.username } });
    let res;

    if (status === 'correct') {
      res = await activateUser(user.activation_token, { lang });
      expect(res.body.message).toBe(value);
      return;
    } else {
      res = await activateUser('invalid_token', { lang });
      expect(res.body.message).toBe(value);
    }
  });
});

describe('Error Model', () => {
  it('returns path, timestamp, message and validationErrors in the response body', async () => {
    const res = await activateUser('invalid_token');
    expect(res.body).toHaveProperty('path');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('validationErrors');
  });
  it('returns path, timestamp and message when request fails', async () => {
    // token invalid
    const res = await activateUser('invalid_token');
    expect(res.body).toHaveProperty('path');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('message');
  });
  it('returns correct path in error body', async () => {
    const res = await activateUser('invalid_token');
    expect(res.body.path).toBe('/api/activate/invalid_token');
  });
  it('returns timestamp in milliseconds within the last 5 seconds when request fails', async () => {
    const now = new Date().getTime();
    const five_seconds_later = now + 5000;
    const res = await activateUser('invalid_token');
    expect(res.body.timestamp).toBeLessThanOrEqual(five_seconds_later);
    expect(res.body.timestamp).toBeGreaterThanOrEqual(now);
  });
});
