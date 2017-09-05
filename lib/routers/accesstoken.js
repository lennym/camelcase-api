'use strict';

const Router = require('express').Router;
const { AuthenticationClient } = require('auth0');

module.exports = settings => {

  const router = Router();

  router.post('/', (req, res, next) => {
    const opts = Object.assign({
      domain: settings.auth.domain
    }, req.body);
    const client = new AuthenticationClient(opts);
    client.clientCredentialsGrant({
      audience: settings.auth.audience
    }, function (err, response) {
      if (err) {
        return next(err);
      }
      res.json(response);
    });
  });

  return router;

};
