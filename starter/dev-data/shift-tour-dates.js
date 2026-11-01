// run once from the starter folder:  node dev-data/shift-tour-dates.js
const dns = require('dns');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// same as in server.js: without this our network cannot resolve the mongodb+srv address
dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config({ path: './config.env' });
const Tour = require('../models/tourmodels');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

// move a date forward year by year until it is at least minDate
const shiftIntoFuture = (date, minDate) => {
  const d = new Date(date);
  while (d < minDate) d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d;
};

(async () => {
  await mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  });

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 30);

  const tours = await Tour.find();
  for (const tour of tours) {
    const newDates = tour.startDates
      .map((d) => shiftIntoFuture(d, minDate))
      .sort((a, b) => a - b);
    // eslint-disable-next-line no-await-in-loop
    await Tour.updateOne({ _id: tour._id }, { startDates: newDates });
    console.log(
      `${tour.name}: ${newDates.map((d) => d.toISOString().slice(0, 10)).join(', ')}`,
    );
  }

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
