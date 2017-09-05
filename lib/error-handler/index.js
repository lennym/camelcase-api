
const getErrorType = error => {
  let isValidationError = false;
  if (error.errors) {
    isValidationError = Object.keys(error.errors).reduce((isValError, key) => {
      return isValError && error.errors[key].$isValidatorError;
    }, true)
  }
  if (isValidationError) {
    return 'validation';
  }
  return 'unknown';
};

const getErrorMetadata = (error, type) => {
  if (type === 'validation') {
    return Object.keys(error.errors).reduce((map, key) => {
      const err = error.errors[key];
      map[key] = {
        type: err.kind,
        message: getValidationMessage(err)
      };
      return map;
    }, {});
  }
  return error.metadata;
};

const getValidationMessage = error => {
  if (error.kind === 'required') {
    return 'This field is required';
  }
  return 'This field is invalid';
};

const getStatusCode = (error, type, status) => {
  if (type === 'validation') {
    return 400;
  } else if (status > 399) {
    return status
  }
  return 500;
};

module.exports = settings => (err, req, res, next) => {

  const type = getErrorType(err);
  const metadata = getErrorMetadata(err, type);
  const status = getStatusCode(err, type, res.statusCode);

  if (status !== 404) {
    console.error(err);
  }

  res.status(status);

  res.json({
    status,
    message: err.message,
    type,
    metadata,
    stack: res.statusCode === 500 && err.stack
  });
};
