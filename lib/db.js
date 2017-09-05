'use strict';

const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');

mongoose.Promise = Promise;

module.exports = settings => {
  const connection = mongoose.connect(settings.db, { useMongoClient: true });
  autoIncrement.initialize(connection);
};
