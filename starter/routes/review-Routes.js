const express = require('express');
const reviewController = require('./../controllers/review-controller');
const authenticationController = require('./../controllers/authentication-controller');
const adminController = require('./../controllers/admin-controller');

const Router = express.Router({ mergeParams: true });

Router.use(authenticationController.protect);

// must come before '/:id', otherwise "my-reviews" would be read as an id
Router.get('/my-reviews', reviewController.getMyReviews);

// admin list with tour names. Also above '/:id', for the same reason
Router.get(
  '/admin-list',
  authenticationController.restrictTo('admin', 'lead-guide'),
  adminController.getReviewsList,
);

Router.route('/')
  .get(reviewController.get_all_reviews)
  .post(
    authenticationController.restrictTo('user'),
    reviewController.setTourUserId,
    reviewController.checkCanReview,
    reviewController.create_review,
  );

Router.route('/:id')
  .get(reviewController.get_review)
  .patch(
    authenticationController.restrictTo('user', 'admin'),
    reviewController.checkOwner,
    reviewController.limitUpdateFields,
    reviewController.updateReview,
  )
  .delete(
    authenticationController.restrictTo('user', 'admin'),
    reviewController.checkOwner,
    reviewController.deleteReview,
  );

module.exports = Router;
