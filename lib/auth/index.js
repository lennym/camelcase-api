const jwt = require('./jwt');
const lookup = require('./lookup');

module.exports = settings => [
  jwt(settings),
  lookup(settings)
];
