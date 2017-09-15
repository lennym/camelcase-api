'use strict';

const mongoose = require('mongoose');
const Router = require('express').Router;

module.exports = settings => {

  const router = Router({ mergeParams: true });
  const Search = mongoose.model('Search');
  const Case = mongoose.model('Case');

  router.get('/', (req, res, next) => {
    return Search.findOne({ 'user.id': req.user.sub })
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  router.post('/', (req, res, next) => {
    if (Array.isArray(req.body.state) && req.body.state.length === 0) {
      delete req.body.state;
    }
    return Search.saveSearch(req.body, req.user.meta)
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  return router;

};
