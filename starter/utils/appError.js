class AppError extends Error {
  constructor(message, statusCode) {
    // this constructor method is called when an new object is made from this class
    super(message); // the Error is the parent overthere and what we are doing here is that wew here called the parent class and whatever we pass into it is the
    //message property

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'; // this starts with function will convert the status code to sting and then we will see if the
    //  if the statusCode starts with the 4 it's a fail and or with a 5 it's a error
    this.isOperational = true;

    Error.captureStackTrace(
      this,
      this.constructor,
    ); /* so this way when a new object is created, and a constructor function is called,then that function call is not 
    gonna appear in the stack trace, and will not pollute it. */
  }
}

module.exports = AppError;
