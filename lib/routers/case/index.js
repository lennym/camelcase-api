'use strict';

const mongoose = require('mongoose');
const Router = require('express').Router;

const Tasks = require('./task');
const Comments = require('./comment');
const Activity = require('./activity');
const Attachment = require('./attachment');
const Watchers = require('./watchers');

module.exports = settings => {

  const router = Router();
  const Case = mongoose.model('Case');

  router.param('case', (req, res, next, reference) => {
    Case.getIdFromReference(reference)
      .then(id => {
        req.params.caseId = id;
        id ? next() : next('route');
      })
      .catch(next);
  });

  router.use((req, res, next) => {
    if (req.query.page && !isNaN(Number(req.query.page))) {
      req.page = Number(req.query.page);
      delete req.query.page;
    }
    next();
  });

  router.get('/', (req, res, next) => {
    Case.getCases(req.query, { page: req.page })
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  router.get('/watching', (req, res, next) => {
    Case.getCases({ 'watchers.id': req.user.sub }, { page: req.page, normalise: false })
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  router.post('/', (req, res, next) => {
    Case.createCase(req.body, req.user.meta)
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  router.get('/:case', (req, res, next) => {
    Case.getCase(req.params.case)
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  router.put('/:case', (req, res, next) => {
    Case.updateCase(req.params.case, req.body, req.user.meta)
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  router.use('/:case/task(s)?', Tasks(settings));
  router.use('/:case/comment(s)?', Comments(settings));
  router.use('/:case/activity', Activity(settings));
  router.use('/:case/attachment(s)?', Attachment(settings));
  router.use('/:case/watch', Watchers(settings));

  return router;

};
