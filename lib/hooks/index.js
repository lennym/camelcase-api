const mongoose = require('mongoose');
const match = require('minimatch');
const {pick} = require('lodash');

module.exports = settings => {

  const hooks = {};
  let count = 0;

  const TYPES = {};

  function validate(hook) {
    if (typeof hook === 'function') {
      return true;
    }
    if (typeof hook.type === 'string') {
      if (!TYPES[hook.type]) {
        throw new Error(`Unrecognised hook type: ${hook.type}`);
      }
      if (!hook.args) {
        throw new Error(`Arguments must be provided for hook type: ${hook.type}`);
      }
      return true;
    }
    throw new Error('Unsupported hook format');
  }

  async function buildArg(event, obj, user) {
    const arg = {};
    const Case = mongoose.model('Case');
    const Task = mongoose.model('Task');
    const Comment = mongoose.model('Comment');
    const isCase = obj.schema === Case.schema;

    if (isCase) {
      arg.case = await Case.getCase(obj._id);
    } else if (obj.case) {
      arg.case = await Case.getCase(obj.case);
    }

    arg.event = event;
    arg.eventData = obj;
    arg.user = user;

    arg.addTask = task => {
      const data = Object.assign({}, task, { case: arg.case._id });
      return Task.createTask(data);
    };

    arg.comment = comment => {
      return arg.case.comment(comment, user);
    };

    arg.update = props => {
      return Case.updateCase(arg.case.reference, props, user);
    };

    return arg;
  }

  const Hooks = {
    handle: (type, handler) => {
      TYPES[type] = handler;
      return Hooks;
    },
    register: (event, hook) => {
      validate(hook);
      hook.priority = count++;
      hooks[event] = hooks[event] || [];
      hooks[event].push(hook);
    },
    invoke: (event, obj, user) => {

      const hooksToInvoke = Object.keys(hooks)
        .filter(e => match(event, e))
        .reduce((a, key) => a.concat(hooks[key]), [])
        .sort((a, b) => a.priority - b.priority);

      if (!hooksToInvoke.length) {
        return Promise.resolve();
      }

      return buildArg(event, obj, user).then(prop => {

        return hooksToInvoke.reduce((promise, hook) => {
          return promise
            .then(() => {
              return mongoose.model('Case').getCase(prop.case._id);
            })
            .then(model => prop.case = model)
            .then(() => {
              if (typeof hook === 'function') {
                return hook(prop);
              } else if (typeof TYPES[hook.type] === 'function') {
                return TYPES[hook.type](prop, hook.args);
              }
            });
        }, Promise.resolve());

      });

    }
  }

  Hooks.handle('task', (c, args) => c.addTask(args));

  Hooks.register('*', event => {

    const getMetadata = () => {
      if (event.event.match(/^task:/)) {
        return Object.assign({ task: event.eventData.task }, event.eventData.metadata);
      } else if (event.event === 'create') {
        return pick(event.eventData, Object.keys(settings.schema));
      } else if (event.event === 'comment') {
        return pick(event.eventData, ['comment']);
      } else if (event.event === 'attachment') {
        return pick(event.eventData, [ 'name', 'mimetype', '_id' ]);
      } else if (event.event.match(/^state:/)) {
        return pick(event.eventData, ['state']);
      }
      return null;
    };

    return mongoose.model('Activity').create({
      case: event.case._id,
      type: event.event,
      user: event.user,
      metadata: getMetadata()
    });

  });

  return Hooks;

}
