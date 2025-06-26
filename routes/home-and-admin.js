const express = require('express')
const router = express.Router();
const Product = require('../mongodb/products');
const User = require('../mongodb/userschema');
const cp = require('cookie-parser')
router.use(cp())
// Home route
router.get('/', async (req, res) => {
  const products = await Product.find();
  let count = 0;

  if (req.cookies.token2) {
    const user = await User.findOne({ email: req.cookies.token2 });
    count = user?.totalItems || 0;
  }

  res.render('ani', { products, count });
});

// Admin product page
router.get('/admin/products', (req, res) => {
  res.render('addproduct');
});

router.post('/admin/products', async (req, res) => {
  try {
    const {
      title, description, shortDescription, category, brand, tags,
      price, discountPrice, stockCount, thumbnail, images, weight,
      length, width, height, shippingCost, features, isFeatured
    } = req.body;

    const product = new Product({
      title,
      description,
      shortDescription,
      category,
      brand,
      tags: tags.split(',').map(tag => tag.trim()),
      price,
      discountPrice,
      stockCount,
      thumbnail,
      images: images.split(',').map(img => ({ url: img.trim(), alt: title })),
      weight,
      dimensions: { length, width, height },
      shippingCost,
      features,
      isFeatured: !!isFeatured
    });

    await product.save();
    res.send("Product added successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving product");
  }
});

// View product
router.get('/viewproduct/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send("Product not found");

    let count = 0;
    if (req.cookies.token2) {
      const user = await User.findOne({ email: req.cookies.token2 });
      count = user?.totalItems || 0;
    }

    res.render('viewproduct', { product, count });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching product details");
  }
});

// Delete product
router.get("/delete/:id", async (req, res) => {
  await Product.findOneAndDelete({ _id: req.params.id });
  res.redirect("/");
});

module.exports = router;