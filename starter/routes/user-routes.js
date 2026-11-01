// Read understandall lecture 40 before this to understand more about molter

const express = require('express');

const userController = require('./../controllers/user-controller');
const authenticateController = require('./../controllers/authentication-controller');

const Router = express.Router();

Router.post('/signup', authenticateController.signup);
Router.post('/login', authenticateController.login);
Router.get('/logout', authenticateController.logout);

Router.post('/forgotPassword', authenticateController.forgotPassword);
Router.patch('/resetPassword/:token', authenticateController.resetPassword);

Router.use(authenticateController.protect); // so what we did here is that we know that this ROUTER is also a middleware so in the order they appear also matters so
// after this middleware all the middleware afterwords like updatemypassword,/me,/updateme,/deleteme... are protected so there is no need to write authenticationcontroller
//.protect to everyone now since the above function is unprotected as we don't wont protection for them but when a middleware/route is called which is below this
//middleware this particular route will be called first so the protection is done here
//so now we can remove the authenticationController.protect from the below code
``;
Router.patch('/updateMyPassword', authenticateController.updatePassword);

Router.get('/me', userController.getMe, userController.get_single_user);

Router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
Router.delete('/deleteMe', userController.deleteMe);

Router.use(authenticateController.restrictTo('admin')); // same reason as for the authcontroller.protect now it will restrict the normal users from accesing the below
//routes

Router.route('/')
  .get(userController.get_all_users)
  .post(userController.create_user);

Router.route('/:id')
  .get(userController.get_single_user)
  .patch(userController.update_user)
  .delete(userController.delete_user);

module.exports = Router;

// Router.get('/me', userController.getMe, userController.get_single_user);

// upload.single('photo') is Multer middleware.
//
// "single" means that we expect ONE file from this request.
// 'photo' is the name of the form field containing the file.
//
// Example from the HTML form:
// <input type="file" name="photo">
//
// Multer processes the multipart/form-data request.
// The normal text fields are made available through req.body,
// while information about the uploaded file is available through req.file.
//
// Multer also saves the uploaded file in the destination
// we specified above: public/img/users.
//
// Flow:
//
// Form
//   ↓
// multipart/form-data
//   ↓
// upload.single('photo')
//   ↓
// Multer
//   ↓
// req.body  → normal fields like name/email
// req.file  → uploaded photo information
//
// After Multer finishes, the request moves to userController.updateMe.
// Router.patch('/updateMe', upload.single('photo'), userController.updateMe);
