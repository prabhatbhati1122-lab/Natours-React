// Read understand all 22 before this and 39 too
const AppError = require('./../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.message.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0]; // So we have A message property in her error So to get the duplicate name From the inside of that error message
  // We are using this regex And that too the first Element of this rejux or this array that you will get from the regex
  const message = `Duplicate field value: ${value}. Please use another value`;

  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message); // So object.values Helps us To loop over Arrow objects And inside that object Means inside one single object
  // With the help of map We are Looping over that And finding Element.message

  const message = `Invalid input message :${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTerror = () =>
  new AppError('Invalid token please login again', 401);

const handleJWTExpiredError = () =>
  new AppError('Your login has expired please login agian', 401);

// Express is only an API now, so every error is sent back as JSON (the React app reads err.message)
const sendErrorDev = (err, res) => {
  // So if it's the developer side We want every single information about the error Where it is originated The problem is an all
  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // But if it's a production site that means user is using Then  We want our user friendly error
  if (err.isOperational) {
    // operational, trusted error: send message to the client
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  // programming or other unknown error don't leak error details
  console.error('Error ', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    return sendErrorDev(err, res);
  }

  // anything that is not "development" is handled like production, so the client always gets a response
  let error = { ...err };
  error.name = err.name;
  error.message = err.message;

  if (error.name === 'CastError') error = handleCastErrorDB(error); // so what we are doing here is that there might be some error which are mongoose side errors
  // like wrong name or id so to mark them as operational errors we are creating our own error bhy our error class and then it will be marked as operational and
  // then we will be senfing it

  if (error.code === 11000) error = handleDuplicateFieldsDB(error); //so what's happening over here is that when we are creating a dublicate field it is not marked as
  // a operational error so and it does'nt have any name property as well so we are using the code property and we are adding the operational error property as well
  // so the user sees a user friendly error
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);

  // till above the errors was related to the tours and now form below the we are setting errors related to the userauthentication

  if (error.name === 'JsonWebTokenError') error = handleJWTerror(); // so if the tokens payload has been tempered so then this error will be executed

  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  return sendErrorProd(error, res);
};
