const multer = require('multer');
const sharp = require('sharp');
const AppError = require('./../utils/appError');
const User = require('./../models/usermodels');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerfactory');

// // We are configuring where and how Multer will store the uploaded files.
// const multerStorage = multer.diskStorage({
//   // This function tells Multer the folder where the uploaded file should be stored.
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },

//   // This function decides the name that the uploaded file will get.
//   filename: (req, file, cb) => {
//     // Get the file extension from the MIME type.
//     // Example: "image/jpeg" → "jpeg"
//     const ext = file.mimetype.split('/')[1];

//     // Give the file a unique name using the user's ID + current timestamp.
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

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

// Multer is a middleware used to handle multipart/form-data,
// which is the type of form data used when we want to upload files.
//
// Here, "dest" tells Multer where to store the uploaded file.
// So when a user uploads a photo, Multer will save that file
// inside this folder: public/img/users

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObject = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObject[el] = obj[el];
  });

  return newObject;
};

// exports.get_all_users = catchAsync(async (req, res, next) => {
//   const users = await User.find();

//   res.status(200).json({
//     status: 'success',
//     result: users.length,
//     data: {
//       users,
//     },
//   });
// });

exports.get_all_users = factory.getAll(User);

exports.getMe = (req, res, next) => {
  // so what we did here is that from this getMe function we want the current logged in user's info but with getOne handlerfactory
  // function we only get the info when we pass the id thru params and to handle that we created this middleware that will set this req.params.id field even though it
  // is not there so that we could use this getOne function
  req.params.id = req.user.id;
  next();
};

// this updateme is for currently authenticated user
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if users POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates please use /updateMyPassword',
        400,
      ),
    );
  }
  // 2) Filtered out the unwanted fields name that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true, // so that it gives new object after updation
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(200).json({
    status: 'success',
    data: null,
  });
});

exports.get_single_user = factory.getOne(User);

exports.create_user = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined yet please use Signup insead',
  });
};

// do not update the password with this one
exports.update_user = factory.updateOne(User);

exports.delete_user = factory.deleteOne(User);
