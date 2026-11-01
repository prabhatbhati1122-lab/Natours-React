const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/error-controller');
const tourRouter = require('./routes/tour-Routes');
const userRouter = require('./routes/user-routes');
const reviewRouter = require('./routes/review-Routes');
const bookingRouter = require('./routes/booking-Routes');
const bookingController = require('./controllers/booking-controller');

const app = express();

const isProd = process.env.NODE_ENV === 'production';

// React build folder (client/dist). Only used in production.
const clientDist = path.join(__dirname, '..', 'client', 'dist');

// Hosts like Render/Railway put a proxy in front of the app.
// Without this, req.ip is the proxy's IP and the rate limiter counts everyone together.
if (isProd) {
  app.set('trust proxy', 1);
}

// 1) Global middlewares

// Set security HTTP headers (CSP written for the React build + Mapbox GL)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        scriptSrc: ["'self'", 'blob:'],
        workerSrc: ["'self'", 'blob:'],
        childSrc: ["'self'", 'blob:'],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.mapbox.com'],
        connectSrc: ["'self'", 'https://*.mapbox.com'],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        // So the production build can also be tested on http://localhost
        upgradeInsecureRequests: null,
      },
    },
  }),
);

// Serving static files (after helmet, so these responses also get the security headers)
app.use(express.static(path.join(__dirname, 'public'))); // /img/... tour and user images
if (isProd) {
  app.use(express.static(clientDist)); // React build: index.html + /assets/...
}

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from the same IP on /api
const limiter = rateLimit({
  max: isProd ? 100 : 1000,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour',
});
app.use('/api', limiter);

// Stripe webhook. It must come BEFORE express.json(), because Stripe's signature check needs the raw body (a Buffer), not parsed JSON
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout,
);

// Body parser, reading data from body into req.body
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 2) API routes
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// 3) React app (production only)
// Any GET that is not /api or /img gets index.html, so React Router handles
// pages like /tour/the-forest-hiker or /my-tours on refresh.
if (isProd) {
  app.get(/^\/(?!api\/|img\/).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 4) Everything else is a 404 (unknown /api routes, non-GET requests)
app.all('*', (req, res, next) => {
  next(new AppError(`can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
