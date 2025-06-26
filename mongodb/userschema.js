const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  fullName: String,
  phone: String,
  street: String,
  city: String,
  state: String,
  postalCode: String,
  country: String,
  isDefault: { type: Boolean, default: false }
}, { _id: false });

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: { type: Number, default: 1 },
  price: Number
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: String,
  products: [cartItemSchema],
  totalAmount: Number,
  orderStatus: { type: String, default: 'Processing' },
  paymentStatus: { type: String, default: 'Pending' },
  orderedAt: { type: Date, default: Date.now },
  deliveryAddress: addressSchema
}, { _id: false });

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  passwordHash: { type: String, required: true },

  profileImage: { type: String, default: '/images/default-user.png' },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Other' },
  dateOfBirth: { type: Date },

  addresses: [addressSchema],
  cart: [cartItemSchema],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  orders: [orderSchema],

  isAdmin: { type: Boolean, default: false },
  totalItems: { type: Number, default: 0 },

  // ✅ Add this part
  interactions: [{
    type: {
      type: String,
      enum: ['view', 'click', 'add-to-cart'],
      required: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product', // ✅ Important for populate
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});



const User = mongoose.model('User', userSchema);
module.exports = User;
