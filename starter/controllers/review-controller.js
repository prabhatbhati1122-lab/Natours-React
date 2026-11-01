const AppError = require('../utils/appError');
const Review = require('../models/reviewmodels');
const Booking = require('../models/bookingModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerfactory');

exports.get_all_reviews = factory.getAll(Review);

// Build a clean body: the user always comes from the login (never from the browser),
// and only the fields a user may send are kept
exports.setTourUserId = (req, res, next) => {
  req.body = {
    review: req.body.review,
    rating: req.body.rating,
    tour: req.params.tourId || req.body.tour,
    user: req.user.id,
  };
  next();
};

// Only users who have booked this tour can review it, and only once
exports.checkCanReview = catchAsync(async (req, res, next) => {
  if (!req.body.tour)
    return next(new AppError('Please tell us which tour', 400));

  const booked = await Booking.countDocuments({
    user: req.user.id,
    tour: req.body.tour,
  });
  if (booked === 0) {
    return next(
      new AppError('You can only review tours that you have booked', 403),
    );
  }

  const already = await Review.countDocuments({
    user: req.user.id,
    tour: req.body.tour,
  });
  if (already > 0) {
    return next(new AppError('You have already reviewed this tour', 409));
  }

  next();
});

// A user can change or delete only his own review (admin can touch any)
exports.checkOwner = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError('No review found with that ID', 404));

  const ownerId = review.user && String(review.user._id);
  if (req.user.role !== 'admin' && ownerId !== String(req.user.id)) {
    return next(new AppError('You can only change your own reviews', 403));
  }

  next();
});

// On update only the text and the rating may change (not tour or user)
exports.limitUpdateFields = (req, res, next) => {
  const allowed = {};
  if (req.body.review !== undefined) allowed.review = req.body.review;
  if (req.body.rating !== undefined) allowed.rating = req.body.rating;
  req.body = allowed;
  next();
};

exports.getMyReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ user: req.user.id })
    .populate({ path: 'tour', select: 'name slug imageCover' })
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: { doc: reviews },
  });
});

exports.get_review = factory.getOne(Review);
exports.create_review = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
