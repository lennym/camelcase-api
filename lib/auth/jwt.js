const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

module.exports = settings => {

  // Authentication middleware. When used, the
  // access token must exist and be verified against
  // the Auth0 JSON Web Key Set
  const checkJwt = jwt({
    // Dynamically provide a signing key
    // based on the kid in the header and
    // the singing keys provided by the JWKS endpoint.
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://${settings.auth.domain}/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer.
    audience: settings.auth.audience,
    issuer: `https://${settings.auth.domain}/`,
    algorithms: ['RS256']
  });

  return checkJwt;

}