const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // so by require we then pass our secret key and then it will give us an stripe object that
// we can work with
const AppError = require('../utils/appError');
const Tour = require('./../models/tourmodels');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerfactory');
const Booking = require('../models/bookingModel');

// turns a string into a Date, or null if it is not a valid date
const parseDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// gives the money back. If it was already refunded (confirm + webhook running at the same moment), that is fine.
const refundPayment = async (session) => {
  try {
    await stripe.refunds.create({ payment_intent: session.payment_intent });
  } catch (err) {
    if (err.code !== 'charge_already_refunded') throw err;
  }
};

// Shared by confirmBooking (user comes back from Stripe) and webhookCheckout (Stripe tells us).
// Gives the paid session a seat. Returns { seatNumber, alreadyBooked? }.
// Throws AppError when the payment cannot get a seat (the payment is refunded when needed).
const createBookingFromSession = async (session) => {
  const sessionId = session.id;

  // this payment already has its booking (success page refreshed, or webhook came after confirm): nothing more to do
  const done = await Booking.findOne({ stripeSessionId: sessionId });
  if (done) return { seatNumber: done.seatNumber, alreadyBooked: true };

  const { tourId, userId } = session.metadata;
  const startDate = parseDate(session.metadata.startDate);
  if (!startDate) throw new AppError('This payment has no start date', 400);

  const tour = await Tour.findById(tourId);
  if (!tour) throw new AppError('No tour found with that ID', 404);

  const price = session.amount_total / 100;
  const takenSeats = new Set(
    await Booking.distinct('seatNumber', { tour: tourId, startDate }),
  );

  // Try the free seats one by one. If someone else grabs a seat at the same moment, the unique index
  // rejects our insert (error code 11000) and we simply try the next seat.
  for (let seat = 1; seat <= tour.maxGroupSize; seat += 1) {
    if (!takenSeats.has(seat)) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await Booking.create({
          tour: tourId,
          user: userId,
          startDate,
          seatNumber: seat,
          price,
          stripeSessionId: sessionId,
        });
        return { seatNumber: seat };
      } catch (err) {
        if (err.code !== 11000) throw err;

        // was it this very payment that already got its booking (confirmed twice at the same moment)?
        // eslint-disable-next-line no-await-in-loop
        const mine = await Booking.findOne({ stripeSessionId: sessionId });
        if (mine) return { seatNumber: mine.seatNumber, alreadyBooked: true };

        // not the seat that failed? then this user already has a seat on this date from another payment: give this payment back
        if (!/seatNumber/.test(err.message)) {
          // eslint-disable-next-line no-await-in-loop
          await refundPayment(session);
          throw new AppError(
            'You already have a seat on this date. This payment has been refunded.',
            409,
          );
        }
        // otherwise the seat was taken a moment ago by somebody else, go on with the next seat
      }
    }
  }

  // every seat was taken while the user was paying: give the money back
  await refundPayment(session);
  throw new AppError(
    'Sorry, the last seat was just taken. Your payment has been refunded.',
    409,
  );
};

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  if (!tour) return next(new AppError('No tour found with that ID', 404));

  // 2) check the chosen date (we never trust what the browser sends)
  const startDate = parseDate(req.query.date);
  if (!startDate) return next(new AppError('Please choose a start date', 400));

  const isTourDate = tour.startDates.some(
    (d) => d.getTime() === startDate.getTime(),
  );
  if (!isTourDate) {
    return next(new AppError('This tour does not start on that date', 400));
  }
  if (startDate <= new Date()) {
    return next(new AppError('This date has already passed', 400));
  }

  const taken = await Booking.countDocuments({ tour: tour.id, startDate });
  if (taken >= tour.maxGroupSize) {
    return next(new AppError('Sorry, this date is sold out', 409));
  }

  const alreadyMine = await Booking.countDocuments({
    user: req.user.id,
    tour: tour.id,
    startDate,
  });
  if (alreadyMine > 0) {
    return next(new AppError('You have already booked this date', 409));
  }

  const clientUrl =
    process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
  const niceDate = startDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  // 3) Create checkout session
  const session = await stripe.checkout.sessions.create({
    success_url: `${clientUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    metadata: {
      tourId: req.params.tourId,
      userId: req.user.id,
      startDate: startDate.toISOString(),
    },

    mode: 'payment',

    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(tour.price * 100),
          product_data: {
            name: `${tour.name} Tour`,
            description: `Starts ${niceDate}. ${tour.summary}`,
            images: [`https://natours.dev/img/tours/${tour.imageCover}`],
          },
        },
        quantity: 1,
      },
    ],
  });

  // 4) Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

// Called by the React app after Stripe redirects back. We ask Stripe (with our secret key) if the session was really paid,
// and then give the user a seat
exports.confirmBooking = catchAsync(async (req, res, next) => {
  const { sessionId } = req.body;
  if (!sessionId) return next(new AppError('Missing checkout session id', 400));

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    return next(new AppError('Payment was not completed', 400));
  }
  if (session.metadata.userId !== req.user.id) {
    return next(new AppError('This payment belongs to another account', 403));
  }

  const result = await createBookingFromSession(session);

  res.status(200).json({ status: 'success', data: result });
});

// Called by STRIPE itself (not by the browser), so it works even if the user closed the tab after paying.
// It needs the RAW body to check Stripe's signature, so app.js must mount it BEFORE express.json().
// Not wrapped in catchAsync: Stripe needs a plain answer (200 = got it, 400/500 = send again later)
exports.webhookCheckout = async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.payment_status === 'paid') {
      try {
        await createBookingFromSession(session);
      } catch (err) {
        // AppError = known outcome (for example sold out + refunded). Stripe should NOT retry that, so we still answer 200.
        // Any other error (database down...) gets 500 so Stripe retries later.
        if (!(err instanceof AppError)) {
          console.error('Webhook booking failed:', err.message);
          return res.status(500).send('Webhook handler failed');
        }
        console.log('Webhook booking not created:', err.message);
      }
    }
  }

  return res.status(200).json({ received: true });
};

// Public: how many seats are booked per tour and date. Only counts, no user data.
// /availability gives all tours, /availability?tour=<id> gives one tour
exports.getAvailability = catchAsync(async (req, res, next) => {
  const match = { startDate: { $exists: true } };

  if (req.query.tour) {
    if (!mongoose.isValidObjectId(req.query.tour)) {
      return next(new AppError('Invalid tour id', 400));
    }
    match.tour = new mongoose.Types.ObjectId(req.query.tour);
  }

  const booked = await Booking.aggregate([
    { $match: match },
    {
      $group: {
        _id: { tour: '$tour', startDate: '$startDate' },
        booked: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        tour: '$_id.tour',
        startDate: '$_id.startDate',
        booked: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    results: booked.length,
    data: { doc: booked },
  });
});

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) find all the bookings of this user and group their dates by tour
  const bookings = await Booking.find({ user: req.user.id });

  const datesByTour = {};
  bookings.forEach((b) => {
    if (!b.tour) return;
    const id = String(b.tour._id);
    if (!datesByTour[id]) datesByTour[id] = [];
    // old bookings (before the seats feature) have no startDate
    if (b.startDate) datesByTour[id].push(b.startDate);
  });

  // 2) find the tours of those bookings
  const tours = await Tour.find({ _id: { $in: Object.keys(datesByTour) } });

  // 3) attach the booked dates (oldest first) to every tour
  const doc = tours.map((tour) => {
    const obj = tour.toJSON();
    obj.bookedDates = (datesByTour[String(tour._id)] || []).sort(
      (a, b) => a - b,
    );
    return obj;
  });

  res.status(200).json({
    status: 'success',
    results: doc.length,
    data: { doc },
  });
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
