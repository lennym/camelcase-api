'use strict';

const crypto = require('crypto');

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

  router.get('/', (req, res, next) => {
    const options = {
      page: 1
    }
    if (req.query.page && !isNaN(Number(req.query.page))) {
      options.page = Number(req.query.page);
      delete req.query.page;
    }
    const query = Object.keys(req.query).reduce((map, key) => {
      if (req.query[key]) {
        if (settings.schema[key] && settings.schema[key].type === String) {
          return Object.assign(map, { [key]: new RegExp(req.query[key], 'i') });
        }
        return Object.assign(map, { [key]: req.query[key] });
      }
      return map;
    }, {});
    if (query.reference) {
      query.reference = parseInt(query.reference, 10);
    }
    Case.getCases(query, options)
      .then(data => {
        const hash = crypto.createHash('sha256');
        hash.update(JSON.stringify(req.query));
        data.id = hash.digest('hex');
        return data;
      })
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
