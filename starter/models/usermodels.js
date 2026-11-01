// read understandall30,37 before

const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A User must register with a name'],
  },
  email: {
    type: String,
    required: [true, 'A User must gave their email'],
    unique: true,
    lowercase: true, // This is not a valid data it will just convert the email into lower case
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'], // this validator only allows a certain type of roles to be filled in the user
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please Provide a Password'],
    minlength: 8,
    select: false, // by this the password will not be shown when we do a get all req or any particular request
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your Passward'],
    validate: {
      // this is only going to wrok for SAVE and CREATE  so that's why we are updating a user we have to use the save as well
      // As previously told this is how we make the custom Validator We use the keyword validate and insider we pass the validator Which is a function And
      // We pass the string That should be given if the validation is failed
      validator: function (el) {
        return el === this.password; // if it returns true the validator is passed and false then it is not passed and then we can make the certain document
      },
      message: 'Password and PasswordConfirm are not same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    // by this property we will set whether a user is active or not and since while making an account it is automatically set as true
    type: Boolean,
    default: true,
    select: false,
  },
});

// the reaason we commented out this part is that  because in ourjsonfile of users the data is already encrypted

// // So what we are doing over here is that We don't want our password to be shown openly in the database as well So we are encrypting the Password In this middleware
// userSchema.pre('save', async function (next) {
//   if (!this.isModified('password'))
//     // so we have an method on all document which we can use if a certain feild has been modified
//     return next(); // So what we did over here is that we are saying that if password is the Field which is not been modified Then just return from this middleware and move to the next middleware

//   // over here we are using await because hash is a async function
//   this.password = await bcrypt.hash(this.password, 12); // so this is how the encryption is done by using the bcrypt we pass the password and then we passs then pass
//   // the cost parameter And this will encrypt our password

//   this.passwordConfirm = undefined; // After the confirmation has been done like we have confirmed that confirm password and password are same so we don't want to
//   // confirm password to be in the database showing anymore So we remove it or delete that field When we delete a field Assign  it as undefined

//   next();
// });
// // After the password has been changed we are setting the password change at property a new value
// userSchema.pre('save', function (next) {
//   if (!this.isModified('password') || this.isNew) return next();

//   this.passwordChangedAt = Date.now() - 1000;
//   next();
// });

userSchema.pre(/^find/, function (next) {
  // so this querymiddleware will to every query that starts with find and for that we used a regular expression
  // and this is query middleware so this points to current query
  this.find({ active: { $ne: false } });
  next();
});

// The below method Will be used to cheque whether the password Given by the candidate and the password which is saved is Same or not And It is done by Encrypting the
//  password given by the user In the login And then cheque the encrypted password with the initial encrypted password that we used while signing And the reason
// We encrypted this password as well The candidate Given one Because the initial password while we give while Sign in Was already encrypted
userSchema.methods.correctPassword = async function (
  // And the way we have defined this function Is an instant method So it will be Available for all the userdocuments
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword); // This will return true or false Based on Whether candidate password and user password are same or not
};

// another instance method
// so this method will check whether the user has changed the password or not if it does then
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // this JWTTimestamp is in the payload and it tell that when the token was issued

  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    console.log(this.passwordChangedAt, JWTTimestamp);
    return JWTTimestamp < changedTimestamp;
  }

  return false; // by this false means that the password is not changes since when the timestamp was issued
};

// this is also an instance method which will be accessed by all the documents of this model
// So it will be used when we Using Method of chain password This partic Instance will be used to create the Token Note the Json token but the random string that we are generating in that function
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex'); // This will Give us a random 32 size string with hexadecimal And the reason we are using it It's because
  // When the user is trying to create a new password We will send this token to him And then with the help of this he can create a new password

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  // so the syntax of this encryption is this crypto.createHash(sha256 algorith).update(the string we want to encrypt).digest('hex')

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // as here we are specifying that in what time the passwordresettoken should be valid

  return resetToken; // cause this is what we are going to send with the email
};

const User = mongoose.model('User', userSchema); // model creation

module.exports = User;
