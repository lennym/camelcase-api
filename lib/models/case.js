'use strict';

const crypto = require('crypto');

const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const paginate = require('mongoose-paginate');
const hooks = require('../plugins/hooks');
const UserSchema = require('./user');


module.exports = settings => {

  const normaliseQuery = q => {
    const query = Object.keys(q).reduce((map, key) => {
      if (q[key]) {
        if (settings.schema[key] && settings.schema[key].type === String) {
          return Object.assign(map, { [key]: new RegExp(`^${q[key]}`, 'i') });
        }
        return Object.assign(map, { [key]: q[key] });
      }
      return map;
    }, {});
    if (query.reference) {
      query.reference = parseInt(query.reference, 10);
    }
    return query;
  }

  const getQueryHash = q => {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(q));
    return hash.digest('hex');
  }

  const User = UserSchema(settings);

  const DefaultSchema = {
    state: {
      type: String,
      enum: Object.keys(settings.states),
      default: settings.defaultState
    },
    reference: {
      type: Number,
      required: true
    },
    watchers: [User],
    createdBy: {
      type: User,
      required: true
    }
  };

  const CustomSchema = settings.schema;

  const Case = new mongoose.Schema(Object.assign({}, CustomSchema, DefaultSchema), { timestamps: true });

  Case.plugin(paginate);

  Case.plugin(autoIncrement.plugin, {
      model: 'Case',
      field: 'reference',
      startAt: 1000,
      incrementBy: Math.ceil(20 * Math.random())
  });

  Case.plugin(hooks, { hooks: settings.hooks, event: 'create' });

  if (!settings.schema.displayName) {
    if (typeof settings.displayName === 'function') {
      Case.virtual('displayName').get(function () {
        return settings.displayName(this);
      });
    } else if (typeof settings.displayName === 'string' && settings.schema[settings.displayName]) {
      Case.virtual('displayName').get(function () {
        return this[settings.displayName];
      });
    } else if (settings.schema.name) {
      Case.virtual('displayName').get(function () {
        return this.name;
      });
    }
  }

  Case.virtual('isOpen').get(function() {
    if (!settings.states[this.state]) {
      return false;
    }
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

  Case.statics.getCases = function(query, options) {
    const id = getQueryHash(query);
    if (options && options.normalise !== false) {
      query = normaliseQuery(query);
    }
    options = options || {};
    options.page = options.page || 1;
    return CaseModel.paginate(query, {
      page: options.page,
      sort: 'createdAt',
      populate: [
        'tasks',
        'attachments',
        { path: 'comments', options: { sort: 'createdAt' } }
      ]
    }).then(result => {
      result.id = id;
      result.cases = result.docs.map(model => model.toJSON({ virtuals: true }));
      delete result.docs;
      return result;
    });
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

  Case.methods.subscribe = function (user) {
    const watchers = this.get('watchers').filter(watcher => watcher.id !== user.id);
    watchers.push(user);
    this.set('watchers', watchers);
    return this.save();
  }

  Case.methods.unsubscribe = function (user) {
    const watchers = this.get('watchers').filter(watcher => watcher.id !== user.id);
    this.set('watchers', watchers);
    return this.save();
  }

  const CaseModel = mongoose.model('Case', Case);

}
