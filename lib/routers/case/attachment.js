'use strict';

const mongoose = require('mongoose');
const Router = require('express').Router;
const request = require('request');

module.exports = settings => {

  const Attachment = mongoose.model('Attachment');
  const router = Router({ mergeParams: true });

  router.get('/', (req, res, next) => {
    Attachment.getAttachments({ case: req.params.caseId })
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  router.get('/:id', (req, res, next) => {
    Attachment.getAttachment(req.params.id)
      .then(data => {
        if (!data || !data.url) {
          return next();
        }
        request.get(data.url).pipe(res);
      })
      .catch(next);
  });

  router.post('/', (req, res, next) => {
    req.body.case = req.params.caseId;
    return Attachment.createAttachments(req.body, req.user.meta)
      .then(results => {
        res.locals.data = results;
        next();
      })
      .catch(next);
  });

  return router;

};
