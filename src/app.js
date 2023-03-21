const express = require('express');
const UserRouter = require('./user/UserRouter');
const AuthRouter = require('./auth/AuthRouter');
const tokenAuth = require('./middleware/tokenAuth');

const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
const errorHandler = require('./error/ErrorHandler');
const FileService = require('./file/FileService');

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      lookupHeader: 'accept-language',
    },
  });

FileService.createFolders();

const app = express();

app.use(middleware.handle(i18next));
app.use(express.json());
app.use(tokenAuth);
app.use(UserRouter);
app.use(AuthRouter);
app.use(errorHandler);

module.exports = app;
