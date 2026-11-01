const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belong to a tour!'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a User!'],
  },
  price: {
    type: Number,
    required: [true, 'Booking must have a Price!'],
  },
  // not "required": bookings made before this feature have no date and no seat
  startDate: {
    type: Date,
  },
  seatNumber: {
    type: Number,
  },
  // the Stripe payment this booking belongs to (so a refreshed page cannot create a second booking)
  stripeSessionId: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now, // no brackets, so every booking gets its own time
  },
  paid: {
    type: Boolean,
    default: true,
  },
});

// One seat of one date of one tour can be sold only once. This unique index is the "lock":
// if two people try to take the last seat at the same moment, the database lets only one of them in.
// partialFilterExpression: old bookings without date/seat are ignored by the index
bookingSchema.index(
  { tour: 1, startDate: 1, seatNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      startDate: { $exists: true },
      seatNumber: { $exists: true },
    },
  },
);

// A user can book a given date of a tour only once
bookingSchema.index(
  { user: 1, tour: 1, startDate: 1 },
  { unique: true, partialFilterExpression: { startDate: { $exists: true } } },
);

// One payment can create only one booking
bookingSchema.index(
  { stripeSessionId: 1 },
  {
    unique: true,
    partialFilterExpression: { stripeSessionId: { $type: 'string' } },
  },
);

bookingSchema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: 'name email' }).populate({
    path: 'tour',
    select: 'name',
  });

  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
