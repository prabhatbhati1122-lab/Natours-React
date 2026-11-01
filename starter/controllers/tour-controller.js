// read understandall8 before this file and understandall11,12,13,14,15,20,21
// So what we did is that we remo The Jason file because we no longer need it As it was for testing only And we remove all the Code that was relying on That Jason file

const multer = require('multer');
const sharp = require('sharp');
const AppError = require('../utils/appError');
const Tour = require('./../models/tourmodels');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerfactory');

const multerStorage = multer.memoryStorage(); // and because of this the file will be stored in the common memory and we did this so that we can do the resizing more
// easily if it is required and that image will be stored as a buffer and it will be avilable at req.file.buffer

// This filter decides whether Multer should accept or reject the uploaded file.
const multerFilter = (req, file, cb) => {
  // Only allow files whose MIME type starts with "image".
  // Example: image/jpeg, image/png → allowed.
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    // Reject the file and pass an error to the error-handling middleware.
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

// Create the Multer middleware using our custom storage and file filter.
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // if no files were uploaded (for example a normal JSON request) there is nothing to resize
  if (!req.files) return next();

  // on create there is no tour id yet, so we use a placeholder in the file name
  const id = req.params.id || 'new';

  // 1) cover image
  if (req.files.imageCover) {
    req.body.imageCover = `tour-${id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/tours/${req.body.imageCover}`);
  }

  // 2) Images (map and not foreach, so that Promise.all can really wait for all of them and the order is kept)
  if (req.files.images) {
    req.body.images = await Promise.all(
      req.files.images.map(async (file, i) => {
        const filename = `tour-${id}-${Date.now()}-${i + 1}.jpeg`;

        await sharp(file.buffer)
          .resize(2000, 1333)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(`public/img/tours/${filename}`);

        return filename;
      }),
    );
  }

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.get_all_tours = factory.getAll(Tour);

exports.get_a_particular_tour = factory.getOne(Tour, { path: 'reviews' });

// the React app opens a tour by its slug (/tour/the-forest-hiker), and it does not know the id
exports.getTourBySlug = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate(
    'reviews',
  );

  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }

  res.status(200).json({ status: 'success', data: { data: tour } });
});

exports.create_tour = factory.createOne(Tour);

exports.update_tour = factory.updateOne(Tour);

exports.delete_tour = factory.deleteOne(Tour); // deleteOne is a generic delete controller, so we pass the Tour model to it to create a controller specifically for deleting Tour documents.

exports.getTourStats = catchAsync(async (req, res, next) => {
  // So you can understand aggregation As Regular query it's just that in aggregation we manipulate the data in couple of steps And those aggregation steps are below
  // So over here in this aggregate Array we will pass A number of stages And each element of this array will be a stage through which our document will go and each of the stage is a name
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }, // so the first stage is match which is like a simple filter query what we used to do in the normal mongodb
    },
    {
      $group: {
        // so the second stage is group which as the name suggests groups the documents together using accumulators
        _id: { $toUpper: '$difficulty' }, // this is the first parameter which is id and we specify the parameter thru which we want to group by Say over here we specified Difficulty
        // so Tours with difficulty Easy will be grouped together and with medium will be grouped together and with the hard will be grouped together and then
        // we can do all sort of stuff with those groups; and here it is null because we want everyone in a sigle group and then we can calculagte the stetistics for all of the tours together

        numTours: { $sum: 1 }, // so when each document goes by this aggregation this field will add 1 to itself
        avgRating: { $avg: '$ratingsAverage' }, // So after grouping the documents we are trying to Find Average rating of average ratings And we are using this with the help of avg operatior and we specified a new field to store that
        avgPrice: { $avg: '$price' }, // now here we are calculating the avg price of the grouped ; btw this syntax for calculating avg and all is for aggragation pipeline just
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        numRatings: { $sum: '$ratingsQuantity' },
      },
    },
    {
      $sort: { avgPrice: 1 }, // so by the help of this stage we will be able to sort the groups with the specified fields but we needs to use the new names that we have defined above
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  // So what Particular Method is doing is that suppose  Our App Needs Data like It wants to cheque Which Has how many
  // Tours scheduled for it So this method or functionality will help us With for that we use aggregation over here
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates', // In our tours each tour have three starting sets at three different months of an year so by the help of this function A single tour
      //  will appear Three times But with one single starting date array it will only have one element So what this particular stage does is that it A particular
      //  To who was having three starting Is now divided into three tool with everything same but instead of three starting rate there is just single 1 element and
      //  one starting data
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, // So this month operator will extract out the month Out of these Dates and The operator Has ID set as month so that means it will group the Tours by month
        numTourStarts: { $sum: 1 }, // so for each document it will add one to this field of a particular group
        tours: { $push: '$name' }, // So Functionality will push the name of the As well For That particular group So that along with the number of Tour in each month We have the name of the tour as well
      },
    },
    {
      $addFields: { month: '$_id' }, // So this particular Stage thus has its name suggest it adds the field so we are adding the field month and we are setting its value as whatever the value id does
    },
    {
      $project: {
        _id: 0, // So what this product state does is that Whosoever Has a code zero as for Field name wont be shown
      },
    },
    {
      $sort: { numTourStarts: -1 }, // -1 suggests that sort in descending order
    },
    {
      $limit: 6, // so here we are fixing the number of results to be shown as 6
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// so what this will do is that it will select the tours within a particular radius of the location we specifu thru our parsms and for that we use the
// geoWithIn and what it does that it selects geometries within a boundry GEOJSON geometry and. The 2dSpere and a 2d index supports $geoWithin
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(','); // so it willsplit the latlng with the comma and then the lat lng will be stored in the particular variable
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; // consverting the radius of the earh into the radians unit

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longigtude in the format lat,lng',
        400,
      ),
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  }); // this geoWithin finds a document within a certain geometry

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(','); // so it willsplit the latlng with the comma and then the lat lng will be stored in the particular variable

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longigtude in the format lat,lng',
        400,
      ),
    );
  }

  // Remember wheenever we need to do the calculation and all the stuff go with aggregeation which is called on the model only
  const distances = await Tour.aggregate([
    // for geospetial aggregation there is only one single stage and that is called the geonear
    {
      $geoNear: {
        // this is the only geospatial aggregation pipeline stage that only exists and keep this always as the first one in geospatial pipelien
        //and this geonear must have altleast one field with a geospatial index

        near: {
          // this is a geojson type
          // this is the point from which to calculate the distance with
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance', // this is the name of field that will be created where all the distaces from the starting point will be listed
        distanceMultiplier: multiplier, // this field allows us to multiply a partiular number with distances
      },
    },
    {
      $project: {
        // this will allow only these fields to be shown in the output
        name: 1,
        distance: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
