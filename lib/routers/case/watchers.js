'use strict';

const mongoose = require('mongoose');
const Router = require('express').Router;

module.exports = settings => {

  const Case = mongoose.model('Case');
  const router = Router({ mergeParams: true });

  router.put('/', (req, res, next) => {
    Case.findOne({ _id: req.params.caseId })
      .then(model => model.subscribe(req.user.meta))
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  router.delete('/', (req, res, next) => {
    Case.findOne({ _id: req.params.caseId })
      .then(model => model.unsubscribe(req.user.meta))
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  return router;

};
