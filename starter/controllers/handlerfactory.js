const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIfeatures = require('./../utils/apifeatures');

// This is a reusable delete controller. Instead of creating a separate delete function for every model (doc, User, Review, etc.), we pass the required Model as an argument.
// The returned function then uses that Model to find and delete the document.
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // Find the document using the ID received from the URL
    // and delete it from the database in a single operation.
    const doc = await Model.findByIdAndDelete(req.params.id);

    // If no document was found with this ID, findByIdAndDelete()
    // returns null, so we send a 404 error instead of returning success.
    if (!doc) {
      return next(new AppError('No document found with this ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document found with this ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        doc,
      },
    });
  });

exports.getOne = (Model, popOption) =>
  catchAsync(async (req, res, next) => {
    // what we did is that we might have populate options while we are getting the tour but some don't have that so for that we created this functionality where
    // if the popOption is there then populate the field and if it iw not there do not populate
    let query = Model.findById(req.params.id);
    if (popOption) query = query.populate(popOption); // with this populate we are just populating the virtual field which we defiend on the tourmodel
    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with this ID', 404));
    }

    res.status(200).json({
      status: 'success',

      data: {
        doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // to allow for nested get reviews on tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId }; // If the request comes through the nested route /tours/:tourId/reviews,req.params.tourId contains the Tour's ID from the URL.
    // We then use that ID as a filter so Review.find() returns only the reviews whose 'tour' field contains that Tour's ID. The 'tour' field in each Review stores the referenced Tour's ObjectId.

    // executing query
    const features = new APIfeatures(Model.find(filter), req.query)
      .filter()
      .search()
      .sort()
      .limitFeilds()
      .paginate();

    // how many documents match in total (skip and limit are not part of the conditions), so the React app can show "Page 1 of 2"
    const total = await Model.countDocuments(features.query.getQuery());
    const doc = await features.query;

    res.status(200).json({
      status: 'success',
      results: doc.length,
      total,
      data: {
        doc,
      },
    });
  });
