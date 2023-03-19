const sequelize = require('../src/config/database');
const Token = require('../src/auth/Token');

const TokenService = require('../src/auth/TokenService');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await Token.destroy({ truncate: true });
});

describe('Scheduled Token Cleanup', () => {
  it('clears the expired token with scheduled task', async () => {
    jest.useFakeTimers();
    const token = 'test-token';
    const eight_days_ago = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await Token.create({
      token: token,
      last_used_at: eight_days_ago,
    });

    TokenService.scheduleCleanup();
    jest.advanceTimersByTime(60 * 60 * 1000 + 5000);
    const token_in_db = await Token.findOne({ where: { token: token } });
    expect(token_in_db).toBeNull();
  });
});
