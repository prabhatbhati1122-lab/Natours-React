const mongoose = require('mongoose');
const User = require('./usermodels');
const Tour = require('./tourmodels');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'please give us your valuable feedback'],
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be above 0'],
      max: [5, 'Ratings must be below 5'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }, //so what these option mean is that each time when the data gets outputted as json or object we want the virtual function to be shown
  },
);

// populating the reviews with the tour and the user data and this is referencing as we are not embedding the data is real
reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });// if we wnated to put the tour name as well

  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); // now each combination of tour and user has always to be unique

// what this aggregation pipeline is used for is to claculate the number of reviews and calculate the avgRatings of a particular tour whcich we get thru tourId
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // it is a static middleware/method so it can be called on directly on model and this function takes a tour id which the tour belongs to
  const stats = await this.aggregate([
    // this here poits to the current model and the aggregate is called on the model directly
    {
      // the first step will be to select all the reviews that belongs to the current tour(the tour which i get thru the tour id whcih i get thru the argument)
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour', // this will match the reviews with the tour
        nRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' }, // so it will calculate the avg of this fiels for each document
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRatings,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', async function () {
  // this pints to the current review
  // At this point, the Review model has not been created yet because
  // mongoose.model('Review', reviewSchema) comes later in the code.
  // Therefore, instead of directly using the Review model, we use
  // this.constructor to access the model that this document belongs to
  await this.constructor.calcAverageRatings(this.tour);
});

// so what's happening here is that when a review is updated and deleted we then again want to calculate the avg and for that we will use this pre query and used regex
// findOneAnd as findbyid and delete is findoneand delete in actual
reviewSchema.pre(/^findOneAnd/, async function () {
  this.r = await this.findOne(); // `this` refers to the current query, so we execute it first with findOne() to retrieve the review document that is about to be updated or deleted.
  // so what happened above is that after we get the review thru this.findOne we saved it as a property in this so that we can retrieve it later in the post middleware
});

// this must be POST: only after the update/delete has really happened the new average is correct
reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does NOT work here, query has already executed
  if (this.r) await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
