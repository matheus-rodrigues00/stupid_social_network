const request = require('supertest');
const app = require('../src/app');
const fs = require('fs');
const path = require('path');
const config = require('config');

const { upload_dir, profile_dir } = config;
const profile_folder = path.join('.', upload_dir, profile_dir);

describe('Profile Images', () => {
  const copyFile = () => {
    const filePath = path.join('.', '__tests__', 'resources', 'test_avatar.png');
    const stored_file_name = 'test-file';
    const targetPath = path.join(profile_folder, stored_file_name);
    fs.copyFileSync(filePath, targetPath);
    return stored_file_name;
  };

  it("returns 404 when file doesn't exist", async () => {
    const res = await request(app).get('/api/files/invalid-file');
    expect(res.status).toBe(404);
  });
  it('returns 200 when file exists', async () => {
    const stored_file_name = copyFile();
    const res = await request(app).get(`/images/${stored_file_name}`);
    expect(res.status).toBe(200);
  });
  it('returns one year cache-control header when file exists', async () => {
    const stored_file_name = copyFile();
    const res = await request(app).get(`/images/${stored_file_name}`);
    expect(res.header['cache-control']).toBe('public, max-age=31536000');
  });
});
