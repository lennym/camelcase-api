const Case = require('./case');
const Task = require('./task');
const Comment = require('./comment');
const Attachment = require('./attachment');
const Activity = require('./activity');
const Search = require('./search');

module.exports = settings => {
  Case(settings);
  Task(settings);
  Comment(settings);
  Attachment(settings);
  Activity(settings);
  Search(settings);
};
