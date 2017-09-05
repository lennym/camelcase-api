'use strict';

const mongoose = require('mongoose');
const UserSchema = require('./user');

module.exports = settings => {

  const Activity = new mongoose.Schema({
    type: {
      type: String,
      required: true
    },
    case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true
    },
    user: {
      type: UserSchema(settings),
      required: true
    },
    metadata: Object
  }, { timestamps: true });

  const ActivityModel = mongoose.model('Activity', Activity);

}
