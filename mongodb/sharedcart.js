const mongoose = require('mongoose');

// Message schema inside chat
const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Product item schema
const productSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: { type: Number, default: 1 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

// Shared cart schema
const sharedCartSchema = new mongoose.Schema({
  cartCode: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  items: [productSchema],
  chat: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const SharedCart = mongoose.model('SharedCart', sharedCartSchema);
module.exports = SharedCart;
