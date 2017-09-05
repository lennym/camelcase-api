'use strict';

const mongoose = require('mongoose');

const UserSchema = require('./user');

const Document = require('mongoose/lib/browserDocument');
const {mapValues} = require('lodash');

module.exports = settings => {

  const Task = new mongoose.Schema({
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    state: {
      type:String,
      enum: Object.keys(settings.states),
      required: true
    },
    description: String,
    complete: {
      type: Boolean,
      default: false
    },
    case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true
    },
    form: Object,
    metadata: Object,
    completedBy: {
      type: UserSchema(settings)
    }
  }, { timestamps: true });

  Task.statics.getTask = function(id) {
    const query = { _id: id };
    return TaskModel.findOne(query);
  }

  Task.statics.getTasks = function(query) {
    return TaskModel.find(query);
  }

  Task.statics.createTask = function(data) {
    return TaskModel.create(data);
  }

  Task.methods.validateMetadata = function(meta) {
    if (this.form) {
      const scheme = Object.keys(this.form).reduce((s, key) => {
        s[key] = Object.assign({}, this.form[key]);
        if (!s[key].type) {
          s[key].type = String;
        }
        return s;
      }, {});
      const Schema = new mongoose.Schema(scheme);
      const doc = new Document(mapValues(meta, val => val || null), Schema);
      return new Promise((resolve, reject) => {
        doc.validate(err => err ? reject(err) : resolve());
      }).then(() => this);
    }
    return this;
  }

  Task.statics.updateTask = function(id, data, user) {
    let old;
    return TaskModel.findOne({ _id: id })
      .then(model => {
        old = model.get('complete');
        return model;
      })
      .then(model => {
        return model.validateMetadata(data.metadata);
      })
      .then(model => {
        if (data.complete && old !== data.complete && model.id) {
          const meta = Object.assign({}, data, { case: model.case, task: model.name });
          return settings.hooks.invoke(`task:${model.id}`, meta, user)
            .then(() => model)
        }
        return model;
      })
      .then(model => {
        if (data.complete && old !== data.complete) {
          data.completedBy = user;
        }
        return model.set(data).save();
      })
      .then(model => {
        if (data.comment) {
          return mongoose.model('Comment').createComment({
            comment: data.comment,
            case: model.case,
            metadata: {
              task: {
                _id: model._id,
                id: model.id,
                name: model.name
              }
            }
          }, user)
          .then(() => model);
        }
        return model;
      });
  }

  const TaskModel = mongoose.model('Task', Task);

}
