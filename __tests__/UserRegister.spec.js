const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

const SMTPServer = require('smtp-server').SMTPServer;

let lastMail,
  server,
  simulateSMTPFailure = false;

beforeAll(async () => {
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
  await sequelize.sync({ force: true });
});

beforeEach(() => {
  simulateSMTPFailure = false;
  return User.destroy({ truncate: true });
});

afterAll(async () => {
  await server.close();
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
  it('should register a new user', async () => {
    const res = await createUser(defaultTestUser);
    expect(res.status).toBe(200);
  });

  it('return success message when registration is valid', async () => {
    const res = await createUser(defaultTestUser);
    expect(res.body.message).toBe('User was registered successfully!');
  });

  it('saves the user into the db', async () => {
    await createUser(defaultTestUser);
    const user = await User.findOne({ where: { username: defaultTestUser.username } });
    expect(user).not.toBeNull();
  });

  it('hashes the password before saving it into the db', async () => {
    await createUser(defaultTestUser);
    const user = await User.findOne({ where: { username: defaultTestUser.username } });
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
    email_sending_failure: 'Email sending failed!',
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

  it('should not register a new user if email is already in use', async () => {
    await createUser(defaultTestUser);
    const res = await createUser(defaultTestUser);
    expect(res.body.validationErrors.email).toBe('Email already in use!');
  });

  it('should not register a new user if username is already in use', async () => {
    await createUser(defaultTestUser);
    const res = await createUser(defaultTestUser);
    expect(res.body.validationErrors.username).toBe('Username already in use!');
  });

  it('should create a new user in inactive mode', async () => {
    await createUser(defaultTestUser);
    const user = await User.findOne({ where: { username: defaultTestUser.username } });
    expect(user.is_active).toBe(false);
  });

  it('should create a new user in inactive mode even when is_active is set to true in the request body', async () => {
    await createUser({ ...defaultTestUser, is_active: true });
    const user = await User.findOne({ where: { username: defaultTestUser.username } });
    expect(user.is_active).toBe(false);
  });

  it('should create a new user with an activation token', async () => {
    await createUser(defaultTestUser);
    const user = await User.findOne({ where: { username: defaultTestUser.username } });
    expect(user.activation_token).not.toBe(null);
  });

  it('should send an email with the activation token', async () => {
    await createUser(defaultTestUser);
    const user = await User.findOne({ where: { username: defaultTestUser.username } });
    expect(lastMail).toContain(user.email);
    expect(lastMail).toContain(user.activation_token);
  });

  it('returns 502 Bad Gateway when sending email fails', async () => {
    simulateSMTPFailure = true;
    const res = await createUser(defaultTestUser);
    expect(res.status).toBe(502);
  });

  it("shouldn't save user in database if sending email fails", async () => {
    simulateSMTPFailure = true;
    await createUser(defaultTestUser);
    const user = await User.findOne({ where: { username: defaultTestUser.username } });
    expect(user).toBe(null);
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
    email_sending_failure: 'Falha ao enviar o e-mail de ativação!',
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
    console.debug(res.body);
    expect(res.body.validationErrors.email).toBe(international_error_messages.email_inuse);
  });

  it('should return this error message ${international_error_messages.email_sending_failure} if sending email fails', async () => {
    simulateSMTPFailure = true;
    const res = await createUser(defaultTestUser, { lang: 'pt-BR' });
    expect(res.body.message).toBe(international_error_messages.email_sending_failure);
  });
});

const activateUser = async (token, config = {}) => {
  const agent = request.agent(app).post(`/api/activate/${token}`);
  if (config.lang) agent.set('Accept-Language', config.lang);
  return agent;
};
describe('Account activation', () => {
  it('activates when token sent is valid', async () => {
    await createUser(defaultTestUser);
    const user = await User.findOne({ where: { username: defaultTestUser.username } });
    const res = await activateUser(user.activation_token);
    expect(res.status).toBe(200);
  });
  it("removes token from table when it's valid", async () => {
    await createUser(defaultTestUser);
    const user = await User.findOne({ where: { username: defaultTestUser.username } });
    await activateUser(user.activation_token);
    // I'm gonna have to check if the token is null;
    const userAfterActivation = await User.findOne({ where: { username: defaultTestUser.username } });
    expect(userAfterActivation.activation_token).toBe(null);
  });
  it("doesn't activate the user when token is invalid", async () => {
    await createUser(defaultTestUser);
    await activateUser('invalid_token');
    const user = await User.findOne({ where: { username: defaultTestUser.username } });
    expect(user.is_active).toBeFalsy();
  });
  it('returns error when token is invalid', async () => {
    await createUser(defaultTestUser);
    const res = await activateUser('invalid_token');
    expect(res.status).toBe(400);
  });
  it.each`
    lang       | status       | value
    ${'pt-BR'} | ${'correct'} | ${'Conta ativada com sucesso!'}
    ${'en'}    | ${'correct'} | ${'Account activated successfuly!'}
    ${'pt-BR'} | ${'wrong'}   | ${'Conta já foi ativada ou token inválido.'}
    ${'en'}    | ${'wrong'}   | ${'Account already active or invalid token.'}
  `('should send correct messages based on internationalization', async ({ lang, status, value }) => {
    await createUser(defaultTestUser, { lang });
    let user = await User.findOne({ where: { username: defaultTestUser.username } });
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
