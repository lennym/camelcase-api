const {AuthenticationClient, ManagementClient} = require('auth0');

module.exports = settings => {

  const AuthClient = new AuthenticationClient(settings.auth);

  return (req, res, next) => {
    if (req.method === 'GET') {
      return next();
    }

    let promise;

    if (req.user.sub.match(/@clients$/)) {
      const opts = {
        audience: `https://${settings.auth.domain}/api/v2/`,
        scope: 'read:clients'
      };
      promise = AuthClient.clientCredentialsGrant(opts)
        .then(token => {
          const ManageClient = new ManagementClient({
            token: token.access_token,
            domain: settings.auth.domain
          });

          const id = req.user.sub.split('@')[0];
          return ManageClient.clients.get({ client_id: id })
            .then(result => {
              return {
                id,
                name: result.name,
                type: 'api'
              };
            });
        });

    } else {
      const token = req.get('authorization').replace('Bearer', '').trim();
      promise = AuthClient.users.getInfo(token)
        .then(result => {
          result = JSON.parse(result);
          return {
            id: req.user.sub,
            name: result.name,
            type: 'user'
          };
        });
    }

    return promise
      .then(result => {
        req.user.meta = result;
      })
      .then(() => next())
      .catch(next)
  };
}

