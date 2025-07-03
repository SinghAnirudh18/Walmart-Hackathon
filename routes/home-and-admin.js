const express = require('express')
const router = express.Router();
const Product = require('../mongodb/products');
const User = require('../mongodb/userschema');
const cp = require('cookie-parser')
const csrf = require('csurf');
const {sortproducts} = require('./analyser')
router.use(cp())
router.use(csrf({ cookie: true }));
// Home route
router.get('/', async (req, res) => {
  const products = await Product.find();
  let count = 0;

  if (req.cookies.token2) {
    const user = await User.findOne({ email: req.cookies.token2,csrfToken: req.csrfToken()  });
    count = user?.totalItems || 0;
  }

  res.render('ani', { products, count,csrfToken: req.csrfToken()  });
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
router.get('/search',(req,res)=>{
  res.send(req.body);
})
 // Ensure your model is imported

router.post('/search', async (req, res) => {
  try {
    console.log("User Prompt:", req.body.prompt);

    const aiOutput = await sortproducts(req.body.prompt);
    console.log("AI Output:", JSON.stringify(aiOutput, null, 2));

    // Ensure AI output is an array
    if (!Array.isArray(aiOutput)) {
      return res.status(400).json({ error: "Invalid AI response format" });
    }

    // Fetch products from DB
    const matchedProducts = [];
    for (const productId of aiOutput) {
      const product = await Product.findById(productId);
      if (product) {
        matchedProducts.push(product);
      }
    }
    res.render('ani', {products:matchedProducts, count:0,csrfToken: req.csrfToken()  });
    
  } catch (error) {
    console.error("Error in /search:", error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});



module.exports = router;