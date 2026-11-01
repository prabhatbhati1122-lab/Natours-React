// read understanda all 23

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

process.on('uncaughtException', (err) => {
  console.log('UNCOUGHT EXCEPTION!  Shutting down.....');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

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

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App runing on port ${port}...`);
});

// Teach time there is a unhandled rejection somewhere in our application the process object will emit an object Called unhandled rejection and we can subscribe to
// that event just like this
// And any promise rejection that might Note get cached in our application will be cached over here The below code
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDELER REJECTION! Shutting down.....');
  server.close(() => {
    process.exit(1);
  }); // in this process.exit we can pass two codes :0 => success ,1=> uncaught exception
});

// These uncut exception and unhandled rejection Events that you are listening to
