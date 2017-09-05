'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const parser = require('body-parser');

const db = require('./db');
const errorHandler = require('./error-handler');
const HookStore = require('./hooks');

const Models = require('./models');
const Auth = require('./auth');

const AccessTokenRouter = require('./routers/accesstoken');
const SettingsRouter = require('./routers/settings');
const CaseRouter = require('./routers/case');

module.exports = settings => {
  const api = express();

  db(settings);

  settings.hooks = HookStore(settings);

  Models(settings);

  api.use(cors());
  api.use(morgan('tiny'));

  api.use(parser.json({ limit: '20mb' }));

  api.use('/accesstoken', AccessTokenRouter(settings));

  api.use(Auth(settings));

  api.use('/settings', SettingsRouter(settings));
  api.use('/case(s)?', CaseRouter(settings));

  api.use((req, res, next) => {
    if (res.locals.data) {
      res.json(res.locals.data);
    } else {
      next();
    }
  });

  api.use((req, res, next) => {
    res.status(404);
    next(new Error('Not found'));
  });

  api.use(errorHandler(settings));

  return {
    hook: (event, hook) => {
      return settings.hooks.register(event, hook);
    },
    listen: (port) => {
      return api.listen(port);
    }
  };

};
