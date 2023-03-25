const fs = require('fs');
const FileType = require('file-type');
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

const isLessThan2MB = (file) => {
  return file.length < 2 * 1024 * 1024;
};

const isSupportedFileType = async (buffer) => {
  const type = await FileType.fromBuffer(buffer);
  return !type ? false : type.mime === 'image/jpeg' || type.mime === 'image/png';
};

module.exports = { createFolders, saveProfileAvatar, deleteProfileAvatar, isLessThan2MB, isSupportedFileType };
