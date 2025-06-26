const express = require('express');
const router = express.Router();
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const User = require('../mongodb/userschema');
const SharedCart = require('../mongodb/sharedcart');
const Product = require('../mongodb/products');

// Middleware
router.use(cookieParser());
router.use(express.urlencoded({ extended: true }));
router.use(csurf({ cookie: true }));

// CSRF error handler
router.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    console.error('❌ CSRF token error:', err);
    return res.status(403).send('Invalid CSRF token. Please try again.');
  }
  next(err);
});

// Auth middleware
const requireAuth = async (req, res, next) => {
  try {
    if (!req.cookies.token2) return res.redirect('/login');
    const user = await User.findOne({ email: req.cookies.token2 });
    if (!user) return res.redirect('/login');
    req.user = user;
    next();
  } catch (err) {
    console.error('❌ Auth error:', err);
    res.status(500).send('Authentication failed');
  }
};

// Create cart
router.get('/shared-cart/create', requireAuth, async (req, res) => {
  try {
    const cartCode = uuidv4().slice(0, 8);
    const newCart = new SharedCart({
      cartCode,
      owner: req.user._id,
      members: [req.user._id],
      items: [],
      chat: []
    });
    await newCart.save();
    res.redirect('/shared-cart');
  } catch (err) {
    console.error('❌ Error creating cart:', err);
    res.status(500).send('Failed to create cart');
  }
});

// Join cart
router.post('/shared-cart/join', requireAuth, async (req, res) => {
  try {
    const { cartcode } = req.body;
    console.log('Joining cart with code:', cartcode);

    // Normalize cart code for case-insensitive matching
    const normalizedCartCode = cartcode.trim().toLowerCase();
    const cart = await SharedCart.findOneAndUpdate(
      { cartCode: { $regex: new RegExp(`^${normalizedCartCode}$`, 'i') }, members: { $ne: req.user._id } },
      { $addToSet: { members: req.user._id } },
      { new: true }
    );

    if (!cart) {
      console.error('❌ Cart not found or already joined:', normalizedCartCode);
      return res.status(404).send('Cart not found or you have already joined this cart.');
    }

    console.log('✅ User added to cart:', { cartCode: cart.cartCode, userId: req.user._id });
    res.redirect('/shared-cart'); // Redirect to shared-cart to show updated list
  } catch (err) {
    console.error('❌ Error joining cart:', err);
    res.status(500).send('Failed to join cart');
  }
});

// View all shared carts
router.get('/shared-cart', requireAuth, async (req, res) => {
  try {
    const sharedCarts = await SharedCart.find({ members: req.user._id }).populate('items.product');
    console.log('Fetched shared carts:', sharedCarts.map(cart => cart.cartCode));
    res.render('sharedcart', {
      sharedCartCode: null,
      sharedCartItems: [],
      chatMessages: [],
      sharedCarts,
      selectedProduct: null,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('❌ Error fetching carts:', err);
    res.status(500).send('Failed to fetch shared carts');
  }
});

// View specific cart
router.get('/sharedcart/view/:cartCode', requireAuth, async (req, res) => {
  const { cartCode } = req.params;

  try {
    const cart = await SharedCart.findOne({ cartCode }).populate('items.product');
    if (!cart) return res.status(404).send('Cart not found');

    const sharedCarts = await SharedCart.find({ members: req.user._id });

    // Recommendation logic
    let recommended = [];
    try {
      // Only generate recommendations if the cart has at least one item
      if (cart.items.length > 0) {
        // Extract categories from products in the current cart
        const cartProductIds = cart.items.map(item => item.product._id);
        const cartProducts = await Product.find({ _id: { $in: cartProductIds } });
        const categories = cartProducts.map(product => product.category).filter(Boolean);

        if (categories.length > 0) {
          // Recommend products from the same categories, excluding those already in the cart
          recommended = await Product.find({
            category: { $in: categories },
            _id: { $nin: cartProductIds }
          }).limit(8);
        }
      }
    } catch (err) {
      console.error('❌ Error fetching recommendations:', err);
      // No recommendations on error
      recommended = [];
    }

    res.render('sharedcart-view', {
      cartItems: cart.items,
      cartCode,
      sharedCarts,
      recommended,
      userId: req.user._id.toString(),
      username: req.user.fullName || req.user.email,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('❌ Error viewing cart:', err);
    res.status(500).send('Failed to load cart');
  }
});

// Add product
router.post('/shared-cart/add', requireAuth, async (req, res) => {
  const { cartCode, productId } = req.body;
  try {
    console.log('Adding to cart:', { cartCode, productId });
    const cart = await SharedCart.findOne({ cartCode });
    if (!cart) {
      console.error('❌ Cart not found:', cartCode);
      return res.status(404).send('Cart not found');
    }

    const product = await Product.findById(productId);
    if (!product) {
      console.error('❌ Product not found:', productId);
      return res.status(404).send('Product not found');
    }

    const item = cart.items.find(i => i.product.toString() === productId);
    if (item) item.quantity++;
    else cart.items.push({ product: product._id, quantity: 1 });

    await cart.save();
    console.log('✅ Product added to cart:', cartCode);
    res.redirect(`/sharedcart/view/${cartCode}`);
  } catch (err) {
    console.error('❌ Add error:', err);
    res.status(500).send('Failed to add product to cart');
  }
});

// Remove product
router.post('/sharedcart/remove/:cartCode', requireAuth, async (req, res) => {
  const { cartCode } = req.params;
  const { productId } = req.body;
  try {
    const cart = await SharedCart.findOne({ cartCode });
    if (!cart) return res.status(404).send('Cart not found');

    cart.items = cart.items.filter(i => i.product.toString() !== productId);
    await cart.save();
    res.redirect(`/sharedcart/view/${cartCode}`);
  } catch (err) {
    console.error('❌ Remove error:', err);
    res.status(500).send('Failed to remove product from cart');
  }
});

// Delete cart (owner only)
router.post('/shared-cart/delete/:cartCode', requireAuth, async (req, res) => {
  try {
    const cart = await SharedCart.findOne({ cartCode: req.params.cartCode });
    if (!cart) return res.status(404).send('Cart not found');
    if (!cart.owner.equals(req.user._id)) return res.status(403).send('Only the cart owner can delete this cart');

    await SharedCart.deleteOne({ _id: cart._id });
    res.redirect('/shared-cart');
  } catch (err) {
    console.error('❌ Delete error:', err);
    res.status(500).send('Failed to delete cart');
  }
});

// Chat view integrated in view
router.get('/chat/:cartCode', requireAuth, async (req, res) => {
  try {
    const cart = await SharedCart.findOne({ cartCode: req.params.cartCode });

    if (!cart) return res.status(404).send('Cart not found');

    const sharedCarts = await SharedCart.find({ members: req.user._id });

    res.render('sharedcart-view', {
      cartItems: cart.items, 
      cartCode: cart.cartCode,
      sharedCarts,
      userId: req.user._id.toString(),
      username: req.user.fullName || req.user.email,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('❌ Chat error:', err);
    res.status(500).send('Failed to access chat');
  }
});


router.get('/choose-shared-cart/:productId', async (req, res) => {
  try {
    if (!req.cookies.token2) {
      console.error('❌ No token2 cookie found');
      return res.redirect('/login');
    }

    const user = await User.findOne({ email: req.cookies.token2 });
    if (!user) {
      console.error('❌ No user found for email:', req.cookies.token2);
      return res.redirect('/login');
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
      console.error('❌ Invalid productId:', req.params.productId);
      return res.status(400).send('Invalid product ID');
    }

    const product = await Product.findById(req.params.productId);
    if (!product) {
      console.error('❌ Product not found for ID:', req.params.productId);
      return res.status(404).send('Product not found');
    }

    const sharedCarts = await SharedCart.find({ members: user._id });

    console.log('Rendering choose-shared-cart with:', {
      productId: req.params.productId,
      sharedCartsCount: sharedCarts.length,
      selectedProduct: product.title || 'Unknown'
    });

    res.render('sharedcart', {
      sharedCartCode: null,
      sharedCartItems: [],
      chatMessages: [],
      sharedCarts,
      selectedProduct: product,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('❌ Error in choose-shared-cart:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;