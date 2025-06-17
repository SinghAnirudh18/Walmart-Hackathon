const express = require('express');
const Product = require('./mongodb/products');
const path = require('path');
const cp = require('cookie-parser');
const mongodb = require('./mongodb/mongodbconn');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./mongodb/userschema'); // adjust path to your user model
const { Hash } = require('crypto');

const JWT_SECRET = 'yourSecretKey'; // ideally use env variable

const app = express();

app.use(cp()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set("view engine", 'ejs');

app.get('/', async (req, res) => {
  const products = await Product.find();
  console.log(products);
  res.render('ani', { products });
});

async function sanitizeProducts() {
  const products = await Product.find({});
  for (let product of products) {
    product.price = product.price || 0;
    product.averageRating = product.averageRating || 0;
    product.numReviews = product.numReviews || 0;
    await product.save();
  }
  console.log("All products sanitized");
}
sanitizeProducts();

app.get('/admin/products', (req, res) => {
  res.render('addproduct');
});

app.post('/admin/products', async (req, res) => {
  try {
    const {
      title, description, shortDescription, category, brand, tags,
      price, discountPrice, stockCount, thumbnail, images, weight,
      length, width, height, shippingCost, features, isFeatured
    } = req.body;
    console.log(req.body);
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

app.get('/product/:id', async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id });
  res.render("viewproduct", { product });
});

app.get("/delete/:id", async (req, res) => {
  const user = await Product.findOneAndDelete({ _id: req.params.id });
  const products = await Product.find();
  res.redirect("/");
});

app.get('/viewproduct/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send("Product not found");
    }
    res.render('viewproduct', { product });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching product details");
  }
});

app.get("/addtocart/:id", (req, res) => {
  if (!req.cookies.token2)
    res.render("login");
  else
    res.redirect("/");
});

app.get('/login', (req, res) => {
  res.render('login', {
    formType: 'login',
  });
});

app.get("/signup", (req, res) => {
  res.render('login', { formType: 'signup' });
});

app.post('/signup', async (req, res) =>{
    let { fullName, email, phone, password, dateOfBirth, gender } = req.body;

    bcrypt.genSalt(10, function (err, salt) {
      bcrypt.hash(password, salt, async function (err, hash) {
        let users = await User.create({
          fullName,
          email,
          phone,
          gender,
          dateOfBirth,
          passwordHash: hash
        });
        res.cookie("token2", email);
        res.redirect("/");
      });
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
