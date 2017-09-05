const mongoose = require('mongoose');

module.exports = (schema, settings) => {

  schema.pre('save', function (next) {
    this._isNew = this.isNew;
    next();
  });

  schema.post('save', function (result, next) {
    Promise.resolve()
      .then(() => {
        if (this._isNew) {
          return settings.hooks.invoke(`${settings.event}`, result, result.createdBy);
        }
      })
      .then(() => next())
      .catch(next);
  });

};
