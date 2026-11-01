const express = require('express');
const bookingController = require('./../controllers/booking-controller');
const authenticationController = require('./../controllers/authentication-controller');
const adminController = require('./../controllers/admin-controller');

const Router = express.Router();

// public, so also logged-out visitors see SOLD OUT. It has to stay ABOVE protect
Router.get('/availability', bookingController.getAvailability);

Router.use(authenticationController.protect);

Router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);
Router.post('/confirm', bookingController.confirmBooking);
Router.get('/my-tours', bookingController.getMyTours);

// everything below this line is only for admin and lead-guide
Router.use(authenticationController.restrictTo('admin', 'lead-guide'));

// dashboard numbers. It has to stay ABOVE '/:id', otherwise "admin-stats" would be read as an id
Router.get('/admin-stats', adminController.getStats);

Router.route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

Router.route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = Router;
