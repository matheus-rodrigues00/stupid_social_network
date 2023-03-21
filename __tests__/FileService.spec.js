const FileService = require('../src/file/FileService');
const fs = require('fs');
const path = require('path');
const config = require('config');

const { upload_dir, profile_dir } = config;

describe('createFolders', () => {
  it('creates upload folder', () => {
    FileService.createFolders();
    expect(fs.existsSync(upload_dir)).toBe(true);
  });
  it('creates profile folder under upload folder', () => {
    FileService.createFolders();
    const profileFolder = path.join('.', upload_dir, profile_dir);
    expect(fs.existsSync(profileFolder)).toBe(true);
  });
});
