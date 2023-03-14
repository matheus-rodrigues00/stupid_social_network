const express = require('express');
const router = express.Router();
const UserService = require('./UserService');

router.post('/api/users', async (req, res) => {
  await UserService.save(req.body);
  return res.send({ message: 'User was registered successfully!' });
});

module.exports = router;
