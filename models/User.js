import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  age: {
    type: Number,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other']
  },
  Qualification: {
    type: String,
    required: true,
  },
  skinType: {
    type: String,
    required: true,
    enum: ['oily', 'dry', 'combination', 'normal', 'sensitive']
  },
  allergies: [{
    type: String,
    trim: true
  }],
  concerns: [{
    type: String,
    enum: [
      'pigmentation',
      'acne',
      'wrinkles',
      'dark_spots',
      'redness',
      'dryness',
      'oiliness',
      'pores',
      'dark_circles'
    ]
  }],
  otp: {
    code: String,
    expiresAt: Date
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });

export default mongoose.model('User', userSchema);