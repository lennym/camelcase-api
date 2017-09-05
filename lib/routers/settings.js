'use strict';

const Router = require('express').Router;

module.exports = settings => {

  const router = Router();

  router.get('/', async (req, res, next) => {
    res.locals.data = {
      states: settings.states,
      title: settings.title,
      schema: settings.schema
    };
    next();
  });

  return router;

};

