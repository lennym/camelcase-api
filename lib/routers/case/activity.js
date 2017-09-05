'use strict';

const mongoose = require('mongoose');
const Router = require('express').Router;

module.exports = settings => {

  const router = Router({ mergeParams: true });
  const Activity = mongoose.model('Activity');

  router.get('/', (req, res, next) => {
    Activity.find({ case: req.params.caseId })
      .sort('createdAt')
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  return router;

};
