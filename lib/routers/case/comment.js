'use strict';

const mongoose = require('mongoose');
const Router = require('express').Router;

module.exports = settings => {

  const Comment = mongoose.model('Comment');
  const router = Router({ mergeParams: true });

  router.get('/', (req, res, next) => {
    Comment.getComments({ case: req.params.caseId })
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  router.post('/', (req, res, next) => {
    req.body.case = req.params.caseId;
    Comment.createComment(req.body, req.user.meta)
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  return router;

};
