const mongoose = require('mongoose');

// Mongoose Connection
const mongoURI = "mongodb+srv://anirudhsing308:qwerty12345@cluster0.feo95lg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI, {
  
})
  .then(() => {
    console.log("Database connected");
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });


// Review Schema
const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  rating: Number,
  comment: String,
  date: { type: Date, default: Date.now }
});

// Image Schema
const imageSchema = new mongoose.Schema({
  url: String,
  alt: String
});

// Variant Schema (for size/color-based products)
const variantSchema = new mongoose.Schema({
  color: String,
  size: String,
  price: Number,
  stockCount: Number
});

// Main Product Schema
const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  shortDescription: String,
  category: { type: String, required: true },
  brand: String,
  tags: [String],

  price: { type: Number, required: true, default:0 },
  discountPrice: Number,
  inStock: { type: Boolean, default: true },
  stockCount: { type: Number, default: 0 },

  averageRating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  reviews: [reviewSchema],

  images: [imageSchema],
  thumbnail: String,

  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  shippingCost: Number,

  variants: [variantSchema],
  features:{type:Array},
  isFeatured: { type: Boolean, default: false },
  soldCount: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
