const fs = require('fs');
const path = require('path');
const config = require('config');

const { upload_dir, profile_dir } = config;
const profileDirectory = path.join('.', upload_dir, profile_dir);

const files = fs.readdirSync(profileDirectory);
for (const file of files) {
  fs.unlinkSync(path.join(profileDirectory, file));
}
