const express = require('express');

const app = express();

module.exports = app;

app.post('/api/1.0/users', (req, res) => {
  //   res.status(200).send();
  res.status(200).send({ message: 'User was registered successfully!' });
});
