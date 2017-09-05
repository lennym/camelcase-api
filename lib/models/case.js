'use strict';

const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const hooks = require('../plugins/hooks');
const UserSchema = require('./user');

module.exports = settings => {

  const DefaultSchema = {
    state: {
      type: String,
      default: settings.defaultState
    },
    reference: {
      type: Number,
      required: true
    },
    createdBy: {
      type: UserSchema(settings),
      required: true
    }
  };

  const CustomSchema = settings.schema;

  const Case = new mongoose.Schema(Object.assign({}, CustomSchema, DefaultSchema), { timestamps: true });

  Case.plugin(autoIncrement.plugin, {
      model: 'Case',
      field: 'reference',
      startAt: 1000,
      incrementBy: Math.ceil(20 * Math.random())
  });

  Case.plugin(hooks, { hooks: settings.hooks, event: 'create' });

  Case.virtual('isOpen').get(function() {
    return !!settings.states[this.state].next;
  });

  Case.virtual('openTasks').get(function() {
    const tasks = this.tasks || [];
    return tasks.filter(task => !task.complete && task.state === this.state).length;
  });

  Case.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'case'
  });

  Case.virtual('comments', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'case'
  });

  Case.virtual('attachments', {
    ref: 'Attachment',
    localField: '_id',
    foreignField: 'case'
  });

  Case.statics.getCase = function(id) {
    let query;
    if (mongoose.Types.ObjectId.isValid(id.toString())) {
      query = { _id: id };
    } else {
      query = { reference: id };
    }
    return CaseModel.findOne(query)
      .populate({
        path: 'comments',
        options: { sort: 'createdAt' },
        populate: { path: 'attachments' }
      })
      .populate('tasks')
      .populate('attachments')
      .then(model => model.toJSON({ virtuals: true }));
  }

  Case.statics.getCases = function(query) {
    return CaseModel.find(query)
      .sort('createdAt')
      .populate({ path: 'comments', options: { sort: 'createdAt' } })
      .populate('tasks')
      .populate('attachments')
      .then(models => models.map(model => model.toJSON({ virtuals: true })));
  }

  Case.statics.createCase = function(data, user) {
    data.createdBy = user;
    return CaseModel.create(data);
  }

  Case.statics.updateCase = function(id, data, user) {
    const query = { reference: id };
    return CaseModel.findOne(query)
      .then(model => {
        const old = model.get('state');
        if (data.state && old !== data.state) {
          const hook = `state:${old}:${data.state}`;
          return settings.hooks.invoke(`${hook}`, Object.assign({}, data, { case: model._id }), user)
            .then(() => model)
        }
        return model;
      })
      .then(model => {
        return model.set(data).save();
      })
      .then(model => {
        if (data.comment) {
          return model.comment(data.comment, user, { state: model.state });
        }
        return model;
      })
      .then(model => CaseModel.getCase(model.reference));
  }

  Case.statics.getIdFromReference = function(id) {
    if (isNaN(parseInt(id, 10))) {
      return Promise.resolve();
    }
    const query = { reference: id };
    return CaseModel.findOne(query)
      .then(result => result && result._id);
  }

  Case.methods.comment = function(comment, user, metadata) {
    return mongoose.model('Comment').createComment({
      comment,
      case: this._id,
      metadata
    }, user)
    .then(() => this);
  }

  const CaseModel = mongoose.model('Case', Case);

}