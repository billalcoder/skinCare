import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Index for faster queries
  },
  extractedText: {
    type: String,
    required: true,
    trim: true
  },
  productAnalysis: {
    type: String,
    required: true
  },
  aiResponse: {
    type: Object,
    required: true
  },
  metadata: {
    ingredients: [String],
    productType: String,
    brand: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    suitability: {
      type: String,
      enum: ['excellent', 'good', 'moderate', 'poor', 'unsuitable'],
      required: true
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // Index for sorting by date
  }
}, {
  timestamps: true
});

// Compound index for user-specific queries
historySchema.index({ userId: 1, timestamp: -1 });

// Static method for pagination
historySchema.statics.findByUserId = function(userId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .select('-__v');
};

// Static method for analytics
historySchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalAnalysis: { $sum: 1 },
        averageRating: { $avg: '$metadata.rating' },
        suitabilityBreakdown: {
          $push: '$metadata.suitability'
        }
      }
    }
  ]);
};

export default mongoose.model('History', historySchema);