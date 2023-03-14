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
  it('should register a new user', (done) => {
    request(app)
      .post('/api/1.0/users')
      .send({
        username: 'matheus_user',
        email: 'matheus@gmail.com',
        password: 'matheus123',
      })
      .then((res) => {
        expect(res.status).toBe(200);
        done();
      });
  });

  it('return success message when registration is valid', (done) => {
    request(app)
      .post('/api/1.0/users')
      .send({
        username: 'matheus_user',
        email: 'matheus@gmail.com',
        password: 'matheus123',
      })
      .then((res) => {
        expect(res.body.message).toBe('User was registered successfully!');
        done();
      });
  });

  it('saves the user into the db', (done) => {
    request(app)
      .post('/api/1.0/users')
      .send({
        username: 'matheus_user',
        email: 'matheus@gmail.com',
        password: 'matheus123',
      })
      .then(() => {
        User.findOne({ where: { username: 'matheus_user' } }).then((user) => {
          expect(user).not.toBeNull();
          done();
        });
      });
  });
});
