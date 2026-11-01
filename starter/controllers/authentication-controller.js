// We will do most of the work like making a new user or dating user And authentication all sort of things in this authentication controller Open all the functions
// Related to the authentication Will come in this controller
// read lecture2understandall25,26,29 before

const crypto = require('crypto');
const { promisify } = require('util'); // so this is the destructuring and by this we are only requiring the promicify function
const jwt = require('jsonwebtoken');
const User = require('./../models/usermodels');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const signToken = (id) => {
  // this function will return the jwt token
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    // This is the syntax of creating the token we first push the paylad(just the data we want to put into the) then the secret and then the some options like callback and all
    expiresIn: process.env.JWT_EXPIRES_IN, //by the use of this fucntion the token will automatically expire in the specified time like auto log out
  });
};

const createSendToken = (user, ststusCode, res) => {
  // since we were repeating this code of creating the token and sending the response again and again so we made a function for that
  const token = signToken(user._id);

  // the cookie gets the secure flag only in production (HTTPS on the host), see the if below
  const cookieOption = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ), // this property will make it so that the browser or client in general will delete the cookie after it has expired we typed new Date
    // because that in js whenever we are specifying  a Date we need to write new Date
    httpOnly: true, // so this will make it so that the cookie cannot be accessed or modified in any way by the browser and it is important in order to prevent the cross
    // -site scripted attacks
  };

  if (process.env.NODE_ENV === 'production') cookieOption.secure = true; // so by this the cookie will only be sent on an encrypted connection So basically when we are using the HTTPS

  res.cookie('jwt', token, cookieOption);

  user.password = undefined; // so the password didn't appear in the output window while creating a document

  res.status(ststusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // const newUser = await User.create(req.body); // This piece is not reliable As anyone can specify the role as admin as the admin
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  }); // The difference is that we only allowed the data That we To be put in the new user so only this data can be set in the database when the user tries to signup so he/she can't put any other field

  // the link in the welcome email should open the React app's account page
  const clientUrl =
    process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
  const url = `${clientUrl}/me`;

  // a failing email must not break the signup: the user is already created
  try {
    await new Email(newUser, url).sendWelcome();
  } catch (err) {
    console.error('Welcome email could not be sent:', err.message);
  }

  createSendToken(newUser, 201, res);
});

// if the login is sucessfull which is only when the right login id and password are given then a jwt token is given to the user
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; // this is similar to this email = req.body.email and password = req.body.password because the variable name is similar to feild name

  // this login will have 3 parts these are as follows
  // 1) check if the email and password exists
  if (!email || !password) {
    return next(new AppError('Please pass the email and the password', 400));
  }
  // 2) check if the user exists and the password is correct
  const user = await User.findOne({ email: email }).select('+password'); // The reason we did password over here is that Because we The user that we get up this search Shows the
  //  password as well Cause we've marked password as note select in the model As you can see

  if (!user || !(await user.correctPassword(password, user.password))) {
    // above we are  using the instance function that we defined
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything is or send the JWT token back to the client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: 'success' });
};

// So what this function will do is that I am creating a middleware That will only allow the authenticator to users that means the users that have signed up or loggedin on my website
// Will only have access to Routes
exports.protect = catchAsync(async (req, res, next) => {
  // 1) get the JWT token and check if it's there
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError(
        'You are not logged in please login in first to get the access',
        401,
      ),
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // jwt.verify() verifies whether the token is valid using the JWT secret.promisify() converts its callback-based API into a Promise, so await
  // pauses here until verification finishes. If valid, the decoded payload (such as the user's ID which we set in the token making) is returned; otherwise, an error is thrown.

  // 3) check if user still exists
  const freshUser = await User.findById(decoded.id); //  now since the decoded have the payload so it contain the id as well so we can fetch out the id out of it
  if (!freshUser) {
    //  id the user no longer exist so we can pass this error
    return next(
      new AppError('The user belonging to this token no longer exist', 401),
    );
  }

  // 4) check if user changed password after the token was issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    // we can use the instance method on the document and the decoded being the payloas so it has the iat which is issued at as well
    return next(
      new AppError('the password was recently changed!please login again', 401),
    );
  }

  // if every step of the authentication was cleared them grant access to the protected route
  req.user = freshUser; // just putting the entire user data who is accessing the route into the request object
  next();
});

// we don't want normal users to excess every command like delete tour and all so we created this restricted to middleware which will only allow only specific roles user
// to access these unctionalities so that functionality is give below
exports.restrictTo = (...roles) => {
  // since we are not allowed to send the argument to the middleware so we created a wrapper function function which will return the middleware
  return (req, res, next) => {
    // this middleware will get the access to the roles parameter because there is a closure here and roles is the array here like this roles = [admin, lead-guide]
    if (!roles.includes(req.user.role)) {
      // since before this middleware the protect middleware is running so the user details will be saved in the req body as we did in the final lines of the protect middleware
      return next(
        new AppError(
          'You do not have the permission to perform this action',
          403,
        ),
      );
    }
    next(); // if it is admin or lead-guide then
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on the posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address!', 404));
  }

  // 2) generate the random reset token
  const resetToken = user.createPasswordResetToken();
  // We only update the reset token and its expiry, so we skip validation here.
  await user.save({ validateBeforeSave: false });

  // 3) send it to the user's email
  // The link now points to the React page, not the API.
  const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  try {
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    console.log(err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email, try again later',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) get the user based on the token `
  // In the forgot password Function we send our url with Reset token Now we get this token over here we encrypt it and then with the help of this encryption We try to
  // Find the user with that And we also checking that the reset token has not expired and for that we have read the query as usual as you can see
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2) If the token has not expired and there is a user set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save(); // we didn't turned off the validators because we want to validate
  // 3) update changedpasswordat property for the user
  // 4) log the user in ,send jwt
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) get users from the collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) check if the posted current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }
  // 3) If so update, password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findbyidandupdate will not work as intented as the middleware like presave and the validators containig this. will not work
  // 4) log user in, send JWT
  createSendToken(user, 200, res);
});
