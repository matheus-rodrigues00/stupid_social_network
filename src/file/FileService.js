const fs = require('fs');
const path = require('path');
const config = require('config');
const { randomString } = require('../shared/generator');
const { upload_dir, profile_dir } = config;
const profile_folder = path.join('.', upload_dir, profile_dir);

const createFolders = () => {
  if (!fs.existsSync(upload_dir)) {
    fs.mkdirSync(upload_dir);
  }
  if (!fs.existsSync(profile_folder)) {
    fs.mkdirSync(profile_folder);
  }
};

const saveProfileAvatar = async (avatar) => {
  const filename = randomString(32);
  const filepath = path.join(profile_folder, filename);
  await fs.promises.writeFile(filepath, avatar, 'base64');
  return filename;
};

const deleteProfileAvatar = async (filename) => {
  const filepath = path.join(profile_folder, filename);
  await fs.promises.unlink(filepath);
};

module.exports = { createFolders, saveProfileAvatar, deleteProfileAvatar };
