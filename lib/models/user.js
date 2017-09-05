'use strict';

const mongoose = require('mongoose');

module.exports = settings => {

  const User = new mongoose.Schema({
    type: {
      type: String,
      enum: ['api', 'user'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    id: {
      type: String,
      required: true
    }
  });

  return User;

};
