const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcryptjs');
const en = require('../locales/en/translation.json');
const ptBR = require('../locales/pt-BR/translation.json');
const fs = require('fs');
const path = require('path');
const config = require('config');
const { upload_dir, profile_dir } = config;
const profile_directory = path.join('.', upload_dir, profile_dir);

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});

const default_test_user = {
  username: 'matheus_user',
  email: 'matheus@gmail.com',
  password: '#Abc1234',
  is_active: true,
};

const readFileAsBase64 = () => {
  const file = fs.readFileSync(path.join('.', '__tests__', 'resources', 'test_avatar.png'));
  return Buffer.from(file).toString('base64');
};

const auth = async (options = {}) => {
  let token;
  if (options.auth) {
    const res = await request(app).post('/api/auth').send(options.auth);
    token = res.body.token;
  }
  return token;
};

const addUser = async (user = { ...default_test_user }) => {
  const mock_user = { ...user };
  mock_user.password = await bcrypt.hash(mock_user.password, 10);
  return await User.create(mock_user);
};

const putUser = (id, body = {}, options = {}) => {
  const agent = request(app).put(`/api/users/${id}`);
  if (options.lang) {
    agent.set('Accept-Language', options.lang);
  }
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send(body);
};

describe('User Update', () => {
  it('should return forbidden when no body is provided', async () => {
    const res = await putUser();
    expect(res.status).toBe(403);
  });
  it.each`
    lang       | message
    ${'en'}    | ${en.forbidden_update}
    ${'pt-BR'} | ${ptBR.forbidden_update}
  `('should return $message when unauthorized request and lang is $lang', async ({ lang, message }) => {
    const now = new Date().getTime();
    const res = await putUser(5, {}, { lang });
    expect(res.body.path).toBe('/api/users/5');
    expect(res.body.timestamp).toBeGreaterThan(now);
    expect(res.body.message).toBe(message);
  });
  it('returns forbidden when is sent with incorrect email', async () => {
    await addUser();
    const user = await User.findOne({ where: { email: default_test_user.email } });
    const res = await putUser(user.id, { email: 'wrong_email' });
    expect(res.status).toBe(403);
  });
  it('returns forbidden when update request is sent with incorrect password', async () => {
    await addUser();
    const user = await User.findOne({ where: { email: default_test_user.email } });
    const res = await putUser(user.id, { password: 'wrong_password' });
    expect(res.status).toBe(403);
  });
  it('returns forbidden when update is sent with same information', async () => {
    await addUser();
    const user = await User.findOne({ where: { email: default_test_user.email } });
    const res = await putUser(user.id, { ...default_test_user });
    expect(res.status).toBe(403);
  });
  it('returns forbidden for inactive user even tough the request is valid', async () => {
    await addUser({ ...default_test_user, is_active: false });
    const user = await User.findOne({ where: { email: default_test_user.email } });
    const res = await putUser(user.id, { ...default_test_user });
    expect(res.status).toBe(403);
  });
  it("returns 200 when update request is sent with correct information and user's active", async () => {
    await addUser({ ...default_test_user, is_active: true });
    const user = await User.findOne({ where: { email: default_test_user.email } });
    const token = await auth({
      auth: {
        email: default_test_user.email,
        password: '#Abc1234',
      },
    });
    const valid_update = { username: 'new_username' };
    const res = await putUser(user.id, valid_update, { token });
    expect(res.status).toBe(200);
  });
  it("updates user's username when update request is sent with correct information and user's active", async () => {
    await addUser({ ...default_test_user, email: 'test2@gmail.com', is_active: true });
    const user = await User.findOne({ where: { email: 'test2@gmail.com' } });
    const valid_update = { username: 'new_username' };
    const token = await auth({
      auth: {
        email: 'test2@gmail.com',
        password: '#Abc1234',
      },
    });
    await putUser(user.id, valid_update, {
      token,
    });
    const in_db_user = await User.findOne({ where: { id: user.id } });
    expect(in_db_user.dataValues.username).toBe(valid_update.username);
  });
  it('returns 403 when token is not valid', async () => {
    await addUser({ ...default_test_user, is_active: true });
    const user = await User.findOne({ where: { email: default_test_user.email } });
    const res = await putUser(user.id, { username: 'new_username' }, 'invalid_token');
    expect(res.status).toBe(403);
  });
  it("should save user's avatar when update request is sent with correct information and user's active", async () => {
    await addUser({ ...default_test_user, is_active: true });
    const file_base64 = readFileAsBase64();
    const user = await User.findOne({ where: { email: default_test_user.email } });
    const valid_update = { username: 'user_updated', avatar: file_base64 };
    await putUser(user.id, valid_update, {
      token: await auth({
        auth: {
          email: default_test_user.email,
          password: default_test_user.password,
        },
      }),
    });
    const in_db_user = await User.findOne({ where: { id: user.id } });
    expect(in_db_user.dataValues.avatar).not.toBe(null);
  });
  it("should save user avatar when avatar is sent with update request and user's active", async () => {
    const file_base64 = readFileAsBase64();
    await addUser({ ...default_test_user, is_active: true });
    const valid_update = { avatar: file_base64 };
    const user = await User.findOne({ where: { email: default_test_user.email } });
    await putUser(user.id, valid_update, {
      token: await auth({
        auth: {
          email: default_test_user.email,
          password: default_test_user.password,
        },
      }),
    });
    const in_db_user = await User.findOne({ where: { id: user.id } });
    const profile_image_path = path.join(profile_directory, in_db_user.dataValues.avatar);
    expect(fs.existsSync(profile_image_path)).toBe(true);
  });

  it("should remove the old avatar when user's avatar is updated", async () => {
    const file_base64 = readFileAsBase64();
    await addUser({ ...default_test_user, is_active: true });
    const valid_update = { avatar: file_base64 };
    const user = await User.findOne({ where: { email: default_test_user.email } });

    const res = await putUser(user.id, valid_update, {
      token: await auth({
        auth: {
          email: default_test_user.email,
          password: default_test_user.password,
        },
      }),
    });
    const first_image = res.body.avatar;
    await putUser(user.id, valid_update, {
      token: await auth({
        auth: {
          email: default_test_user.email,
          password: default_test_user.password,
        },
      }),
    });

    const profile_image_path = path.join(profile_directory, first_image);
    expect(fs.existsSync(profile_image_path)).toBe(false);
  });

  it.each`
    lang       | value             | message
    ${'en'}    | ${'usr'}          | ${en.username_size}
    ${'en'}    | ${'a'.repeat(33)} | ${en.username_size}
    ${'pt-BR'} | ${'usr'}          | ${ptBR.username_size}
    ${'pt-BR'} | ${'a'.repeat(33)} | ${ptBR.username_size}
  `(
    'returns bad request with $message when username is updated with $value when lang is set as $lang',
    async ({ lang, value, message }) => {
      await addUser({ ...default_test_user, is_active: true });
      const user = await User.findOne({ where: { email: default_test_user.email } });
      const invalid_update = { username: value };
      const res = await putUser(user.id, invalid_update, {
        token: await auth({
          auth: {
            email: default_test_user.email,
            password: default_test_user.password,
          },
        }),
        lang,
      });
      expect(res.status).toBe(400);
      expect(res.body.validationErrors.username).toBe(message);
    }
  );
  it('should returns 200 when image size is exactly 2mb', async () => {
    const file_with200mb = 'a'.repeat(1024 * 1024 * 2);
    const base64 = Buffer.from(file_with200mb).toString('base64');
    const user = await addUser({ ...default_test_user, is_active: true });
    const valid_update = { image: base64 };
    const res = await putUser(user.id, valid_update, {
      token: await auth({
        auth: {
          email: default_test_user.email,
          password: default_test_user.password,
        },
      }),
    });
    expect(res.status).toBe(200);
  });
  it('should returns 400 when image size exceeds 2mb', async () => {
    const file_with200mb = 'a'.repeat(1024 * 1024 * 2) + 'a';
    const base64 = Buffer.from(file_with200mb).toString('base64');
    const user = await addUser({ ...default_test_user, is_active: true });
    const valid_update = { avatar: base64 };
    const res = await putUser(user.id, valid_update, {
      token: await auth({
        auth: {
          email: default_test_user.email,
          password: default_test_user.password,
        },
      }),
    });
    expect(res.status).toBe(400);
  });
  it('keeps the old image after user only updates username', async () => {
    const file_base64 = readFileAsBase64();
    const user = await addUser({ ...default_test_user, is_active: true, avatar: file_base64 });
    const valid_update = { username: 'updated-user' };
    const res = await putUser(user.id, valid_update, {
      token: await auth({
        auth: {
          email: default_test_user.email,
          password: default_test_user.password,
        },
      }),
    });
    const in_db_user = await User.findOne({ where: { id: user.id } });
    expect(in_db_user.dataValues.avatar).toBe(res.body.avatar);
  });
  it.each`
    lang       | message
    ${'pt-BR'} | ${ptBR.profile_image_size}
    ${'en'}    | ${en.profile_image_size}
  `('returns $message when file size exceeds 2mb when lang is $lang', async ({ lang, message }) => {
    const file_with200mb = 'a'.repeat(1024 * 1024 * 2) + 'a';
    const base64 = Buffer.from(file_with200mb).toString('base64');
    const user = await addUser({ ...default_test_user, is_active: true });
    const valid_update = { avatar: base64 };
    const res = await putUser(user.id, valid_update, {
      token: await auth({
        auth: {
          email: default_test_user.email,
          password: default_test_user.password,
        },
      }),
      lang,
    });
    expect(res.status).toBe(400);
    expect(res.body.validationErrors.avatar).toBe(message);
  });
});
