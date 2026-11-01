const mongoose = require('mongoose');
const catchAsync = require('./../utils/catchAsync');
const Booking = require('../models/bookingModel');
const Review = require('../models/reviewmodels');

// Numbers and chart data for the admin dashboard.
// User and Tour are taken from mongoose by name, so this file does not need to know their file names.
exports.getStats = catchAsync(async (req, res, next) => {
  const User = mongoose.model('User');
  const Tour = mongoose.model('Tour');

  // first day of the month, 11 months ago (so we show the last 12 months)
  const now = new Date();
  const since = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
  );

  const [users, tours, bookings, revenueResult, perTourRaw, monthlyRaw] =
    await Promise.all([
      User.countDocuments(),
      Tour.countDocuments(),
      Booking.countDocuments(),
      Booking.aggregate([
        { $group: { _id: null, revenue: { $sum: '$price' } } },
      ]),
      // how many bookings each tour has (top 8)
      Booking.aggregate([
        { $group: { _id: '$tour', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      // revenue per month (by the day the booking was made)
      Booking.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
            revenue: { $sum: '$price' },
          },
        },
      ]),
    ]);

  // aggregate gives an empty array when there are no bookings yet
  const revenue = revenueResult.length ? revenueResult[0].revenue : 0;

  // the aggregation only knows the tour ids, so we fetch the names separately
  const tourDocs = await Tour.find({
    _id: { $in: perTourRaw.map((x) => x._id) },
  }).select('name');
  const nameById = {};
  tourDocs.forEach((t) => {
    nameById[String(t._id)] = t.name;
  });
  const bookingsPerTour = perTourRaw.map((x) => ({
    name: nameById[String(x._id)] || 'Deleted tour',
    count: x.count,
  }));

  // always 12 entries, months without bookings get 0
  const monthlyRevenue = [];
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1),
    );
    const found = monthlyRaw.find(
      (x) => x._id.y === d.getUTCFullYear() && x._id.m === d.getUTCMonth() + 1,
    );
    monthlyRevenue.push({
      label: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      revenue: found ? found.revenue : 0,
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      stats: { users, tours, bookings, revenue },
      bookingsPerTour,
      monthlyRevenue,
    },
  });
});

// All reviews with the tour name, newest first, for the admin list.
// The tour is populated HERE and not in the review model, because the model's findOneAnd hook
// needs review.tour to stay a plain id (it is used to recalculate the tour's average rating).
exports.getReviewsList = catchAsync(async (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const [total, doc] = await Promise.all([
    Review.countDocuments(),
    Review.find()
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'tour', select: 'name' }),
  ]);

  res.status(200).json({
    status: 'success',
    results: doc.length,
    total,
    data: { doc },
  });
});
