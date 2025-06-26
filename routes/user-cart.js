const User = require('../mongodb/userschema');
const Product = require('../mongodb/products');
const express = require('express')
const router = express.Router();
const cp = require('cookie-parser')
router.use(cp())
// Add to personal cart
router.get("/addtocart/:id", async (req, res) => {
  if (!req.cookies.token2) return res.render("login");

  try {
    const user = await User.findOne({ email: req.cookies.token2 });
    if (!user) return res.render("login");

    const existing = user.cart.find(item => item.productId.toString() === req.params.id);
    if (existing) {
      await User.updateOne(
        { email: req.cookies.token2, "cart.productId": req.params.id },
        {
          $inc: { "cart.$.quantity": 1, totalItems: 1 }
        }
      );
    } else {
      await User.updateOne(
        { email: req.cookies.token2 },
        {
          $push: { cart: { productId: req.params.id, quantity: 1 } },
          $inc: { totalItems: 1 }
        }
      );
    }

    const updatedUser = await User.findOne({ email: req.cookies.token2 });
    const products = await Product.find();

    res.render('ani', { products, count: updatedUser.totalItems || 0 });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).send('Error adding item to cart');
  }
});

// Personal cart
router.get('/cart', async (req, res) => {
  if (!req.cookies.token2) return res.redirect('/login');

  const user = await User.findOne({ email: req.cookies.token2 }).populate('cart.productId');
  const cartItems = user.cart.map(item => ({
    product: item.productId,
    quantity: item.quantity
  }));

  res.render('cart', { cartItems });
});

router.get('/deletecart', async (req, res) => {
  if (!req.cookies.token2) return res.redirect('/login');
  await User.updateOne({ email: req.cookies.token2 }, { $set: { cart: [], totalItems: 0 } });
  res.redirect('/');
});

router.get("/cart/remove/:id", async (req, res) => {
  if (!req.cookies.token2) return res.redirect('/login');
  await User.updateOne(
    { email: req.cookies.token2 },
    { $pull: { cart: { productId: req.params.id } } }
  );
  res.redirect('/cart');
});

module.exports = router;