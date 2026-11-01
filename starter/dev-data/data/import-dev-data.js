// so overhere we are writign a script whcih is completely independent of the app we are building and we it will only run once and
// the reason we are building this is so that we can put our json data into our database

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' }); // Load the environment variables from config.env into process.env.
// This gives the script access to values such as DATABASE and DATABASE_PASSWORD.
const dns = require('dns');
const fs = require('fs');
const Tour = require('./../../models/tourmodels');
const Review = require('./../../models/reviewmodels');
const User = require('./../../models/usermodels');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

// connecting the hosted db with the app
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then((con) => {
    console.log('DB connection successful');
  })
  .catch((err) => {
    console.log(err);
  });

// READ JSON FILE
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'),
);

// Import data into DB

const importData = async () => {
  try {
    await Tour.create(tours); // the create object also accepts an array and for the it will create a new document for each object element in array
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('Data successfully loaded!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// Delte data from the DB
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();

    console.log('Data Successfully deleated');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
// process.argv contains the arguments passed from the command line.
// We use these arguments to decide whether to import or delete data.
