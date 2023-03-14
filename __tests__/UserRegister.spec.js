const request = require('supertest');
const app = require('../src/app');

describe('User Register', () => {
  it('should register a new user', (done) => {
    request(app)
      .post('/api/1.0/users')
      .send({
        username: 'test_user',
        email: 'test@gmail.com',
        password: 'test123',
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
        username: 'test_user',
        email: 'test@gmail.com',
        password: 'test123',
      })
      .then((res) => {
        expect(res.body.message).toBe('User was registered successfully!');
        done();
      });
  });
});
