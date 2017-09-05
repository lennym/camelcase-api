'use strict';

const mongoose = require('mongoose');
const hooks = require('../plugins/hooks');
const UserSchema = require('./user');

module.exports = settings => {

  const Comment = new mongoose.Schema({
    comment: {
      type: String,
      required: true
    },
    case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true
    },
    createdBy: {
      type: UserSchema(settings),
      required: true
    },
    metadata: Object,
    attachments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attachment'
    }]
  }, { timestamps: true });

  Comment.plugin(hooks, { hooks: settings.hooks, event: 'comment' });

  Comment.statics.getAllComments = function(query) {
    return CommentModel.find(query);
  }

  Comment.statics.createComment = function(data, user) {
    data.createdBy = user;
    return CommentModel.create(data);
  }

  const CommentModel = mongoose.model('Comment', Comment);

}