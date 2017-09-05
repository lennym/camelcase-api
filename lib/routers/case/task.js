'use strict';

const mongoose = require('mongoose');
const Router = require('express').Router;

module.exports = settings => {

  const router = Router({ mergeParams: true });
  const Task = mongoose.model('Task');

  router.get('/', (req, res, next) => {
    Task.getTasks({ case: req.params.caseId })
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  router.get('/:id', (req, res, next) => {
    Task.getTask(req.params.id)
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  router.post('/', (req, res, next) => {
    req.body.case = req.params.caseId;
    Task.createTask(req.body)
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  router.put('/:task', (req, res, next) => {
    Task.updateTask(req.params.task, req.body, req.user.meta)
      .then(data => {
        res.locals.data = data;
        next();
      })
      .catch(next);
  });

  return router;

};
