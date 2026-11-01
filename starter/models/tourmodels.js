// read understandall10 before this and understand all 18,34,35
// And since we have changed the schema so the already Presented Documents will be affected as well So like some new information might be added and some field name will be changed

const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./usermodels');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      maxlength: [
        40,
        'A tour name must have less or equale then 40 characters',
      ], // This is also a validator which is Specifying that what should be the max length
      minlength: [
        10,
        'A tour name must have more or equale than 10 characters',
      ], // also a validator just the opposit of maxlength
      // validate: [validator.isAlpha, 'A tour name must only contain characters'], //  so this is also a custom validator that we inported from the validator lib. that we have imported
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must be assigned some diffultuy'],
      // enum: ['easy', 'medium', 'hard'], // This is also a validator And it is signifying that the difficulty can has only three values which are listed And we can Pause error message because it will be counted as a value as well In this particular one
      // so to avoid that we do
      enum: {
        values: ['easy', 'medium', 'hard'],
        message: ' Difficulty needs to be between easy medium hard',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1'], // This is the validator as well Which is stating that the minimum rating should be one It can't go any less than that
      max: [5, 'Rating must be below 5'],
      set: (val) => Math.round(val * 10) / 10, //  so to round of the point value into rounder point value like thsi 4.666666 = 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      // So what's happening is that We wanted Validator Which cheques that price discounts value should be less than price But there is no such Inbuilt
      // pellet data so we're making one by ourselves So in lecture 18 understand all The format is quite different Four prices count as you can see but here since we
      // wanted Validator by ourselves so that is why We first create a scheme object for this and inside the schema object we made a valid data and this validator will
      // return to If the condition is satisfied and return False if the condition is not satisfied
      type: Number,
      validate: {
        validator: function (val) {
          // this `validator` and `validate` is a reserverd field and for the function we are defining it has access to the value which is being inputted which is pricediscount
          return val < this.price; //  and over here the this keyword is refering to the current document while we are creating one so it won't work for the update keyword
        },
        message: 'Discount should be lower than actual price ',
      },
    },
    summary: {
      type: String,
      trim: true, // so this schematype option only works for the strings type and it will remove all the white space in the beggining and the end of the sting
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must  have a cover image'],
    },
    images: [String], // so we want the images to be a array of strings so that we can later read it from the readable file
    createdAt: {
      type: Date,
      default: Date.now, // NO brackets: Mongoose calls this function for every new document. With Date.now() the time was fixed once when the server started
      // select = false // Now because of this property We can Set the created at field but when we make a http request we won't be able to see Created at field
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // This object here is not a Schema object like usual instead it is an embedded object and in order to specify the geospatial data in mongodb we need to create a new
      //object and that object needs to have 2 field names coordinates(or array of numbers) and type (of type string and geomoty of point or some other geometry )
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'], // all the optins this field can take
      },
      coordinates: [Number], // we expect an array of number this array is the coordiats of the point with the longitude first and latitude second
      address: String,
      description: String,
    },
    locations: [
      // So this is how we create an embedded document in a different document we created a an array of field and then make the schema of it and by specifying the array
      // of objec this will create a brand new document inside of a document
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      // so here we are trying to implement the referencing for the users
      // so this guide only contains the reference so it will be populated by the guides/specified user informatin // only in the querry not in the actual database
      // we we demand for the information related to the that particular tour
      {
        type: mongoose.Schema.ObjectId, // this means is that The value stored here should be a MongoDB ObjectId.
        ref: 'User', // this is how we establish reference between datasets in mongoose so its like we created a relationship between both of the
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }, //so what these option mean is that each time when the data gets outputted as json or object we want the virtual function to be shown
  },
); // and we are able to pass the above options because in mongoose.schema we can not only pass the schema defination object but we can also send the schema option object

// tourSchema.index({ price: 1 }); // so what this is that when we it will set the price in the index and then if we query for the price then the entire document will not
//be searched instead since it is marked as index only this particular field will be queried inside the indexes and 1 mean is that sort in the assending order
// and this is called the single field index

tourSchema.index({ price: 1, ratingsAverage: -1 }); // and this is called the compound the index
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // we used this with StartLocation because we are mentioning a real location in a sphere like object or when we are
//mentioning a simple point on a 2 dimentional plane

tourSchema.virtual('durationWeeks').get(function () {
  // That's how we define a virtual Field And we are using a get function because every time we ask for some information from the Model This function will be called
  // For this particular virtual field will be called as well so this get is a getter  function and one more thing is that we can't use this virtual field in quary cause it is not actully part of the schema
  return this.duration / 7;
});

// this is virtual populate and with this we can pupulate the tour with the reviews, means we can get access to all the reviews for a certain tour but without keeping
//this array of ID's on the tour, so we can consider virtual populate like way of keeping that array of review id's on a tour but without persisting it to the database
// so it's like virtual fields but with populate
tourSchema.virtual('reviews', {
  // so the syntax is like this we type the schemaname and the virtual keyword the the field name and then some options
  ref: 'Review', // so the first option is the name of the model that we want to reference
  foreignField: 'tour', // so this the name of the field in the other model (Review model in this case) where the reference to the current model is saved
  localField: '_id',
}); // so this is how we connect the two models

// Document middleware
// by this pre it means it runs before an actual event and that event in this case is the save event so this function is called before the actual document is saved
tourSchema.pre('save', function (next) {
  // this pre middleware only works before the .save() and .create() not before insertMany
  this.slug = slugify(this.name, { lower: true }); // this here referse to the currently processed document
  next();
}); // and we can have multiple pre middlewares or the post middleware

// Query middleware
tourSchema.pre(/^find/, function (next) {
  // where() only adds the condition, find() would change the type of the query (for example a findOneAndUpdate)
  this.where({ secretTour: { $ne: true } });
  this.start = Date.now(); // we cna add a new field to the query object as well as we can like here
  next();
});

// so here is the middleware which will populate the query field specified by the user id
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: 'name photo role', // only what the website needs, so guides' emails never leave the server
  });

  next();
});

tourSchema.post(/^find/, function (docs, next) {
  // Since this middleware is executed after the query has been executed So this middleware has access to the documents that passed the query As well as the next
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  next();
});

// Aggregation middleware
tourSchema.pre('aggregate', function (next) {
  // in here the this represents the current aggregation object
  const things = this.pipeline()[0];
  if (!things || Object.keys(things)[0] !== '$geoNear') {
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); // So in our aggregation we added another Stage which says that If the secret tour is true don't select it And it will execute just Before the execution of that Aggregation pipeline
  }
  next();
});

const Tour = mongoose.model('Tour', tourSchema); // thats how we create a model

module.exports = Tour;
