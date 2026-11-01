// read understandall9 before this

const express = require('express');
const tourController = require('./../controllers/tour-controller');
const authenticateController = require('./../controllers/authentication-controller');
// const reviewController = require('./../controllers/review-controller');
const reviewRouter = require('./../routes/review-Routes');

const Router = express.Router();

// Router.route('/:tourId/reviews').post(
//   // So what we were doing to create a new review is that we were manually Giving it ID of tour and a user id But with the help of this route
//   // It will fetch the user id From By itself As Use the protect middleware And since we are giving it a tour id as well so manually it will set the tour id to
//   authenticateController.protect,
//   authenticateController.restrictTo('user'),
//   reviewController.create_review,
// );
Router.use('/:tourId/reviews', reviewRouter); // so it means that if i see the route like this so use reviewRouter it's functionality is same as before we just

Router.route('/top-5-cheap').get(
  tourController.aliasTopTours,
  tourController.get_all_tours,
); // So what we did here is that suppose we want a new api in which if we want the top 5 cheap Tours that particular api request gives us that so instead of making a
//new Function callback function What it is did is that Since for this particular Requests we only need to manipulate The query or fields so Madam middleware
// manipulated the field And then we run the get old tool function and since we have manipulated the field or the query object when the get old tool function
// is called Those fields will Going through the Methods that we have described in that so indirectly we will get The top five cheaps after that

Router.route('/tour-stats').get(tourController.getTourStats);
Router.route('/monthly-plan/:year').get(
  authenticateController.protect,
  authenticateController.restrictTo('admin', 'lead-guide', 'guide'),
  tourController.getMonthlyPlan,
); // so by this function we will get how many tours starts each month of a specified year and notice
// that year is a variable parameter

// What this function will do is that it will find the all the tours starting position in a radius of the defined distance
Router.route('/tours-within/:distance/center/:latlng/unit/:unit').get(
  tourController.getToursWithin,
);

// What this will do is that it will find the distance of all the tours starting position
Router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

// the React app opens a tour by its slug (/tour/the-forest-hiker)
Router.route('/slug/:slug').get(tourController.getTourBySlug);

Router.route('/')
  // .get(authenticateController.protect, tourController.get_all_tours) // this .protect will stop the non authenticated user from opening these routes
  .get(tourController.get_all_tours) // the reason we did this here means that we removed thee protect middleware from here is that we want everyone to know what tours we have
  .post(
    authenticateController.protect,
    authenticateController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.create_tour,
  );

Router.route('/:id')
  .get(tourController.get_a_particular_tour)
  .patch(
    authenticateController.protect,
    authenticateController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.update_tour,
  )
  .delete(
    authenticateController.protect,
    authenticateController.restrictTo('admin', 'lead-guide'),
    tourController.delete_tour,
  );

module.exports = Router;
