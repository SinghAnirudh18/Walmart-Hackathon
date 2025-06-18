const express = require('express');
const Product = require('./mongodb/products');
const path = require('path');
const cp = require('cookie-parser');
const mongodb = require('./mongodb/mongodbconn');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./mongodb/userschema'); // adjust path to your user model
const Cart = require('./mongodb/cart')

const app = express();

app.use(cp()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set("view engine", 'ejs');

app.get('/', async (req, res) => {
  const products = await Product.find();
  let count = 0;

  if (req.cookies.token2) {
    const user = await User.findOne({ email: req.cookies.token2 });
    count = user?.totalItems || 0;
  }

  res.render('ani', { products, count });
});

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

// Remove duplicate route - keep only this one
app.get('/viewproduct/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send("Product not found");
    }
    
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

app.get("/delete/:id", async (req, res) => {
  await Product.findOneAndDelete({ _id: req.params.id });
  res.redirect("/");
});

app.get("/addtocart/:id", async (req, res) => {
  if (!req.cookies.token2) {
    return res.render("login");
  }
  
  try {
    // First, get the current user to check existing cart
    const user = await User.findOne({ email: req.cookies.token2 });
    if (!user) {
      return res.render("login");
    }

    // Check if product already exists in cart
    const existingCartItem = user.cart.find(item => 
      item.productId.toString() === req.params.id
    );

    if (existingCartItem) {
      // If product exists, increment quantity
      await User.findOneAndUpdate(
        { 
          email: req.cookies.token2,
          "cart.productId": req.params.id 
        },
        {
          $inc: { "cart.$.quantity": 1, totalItems: 1 }
        }
      );
    } else {
      // If product doesn't exist, add new item
      await User.findOneAndUpdate(
        { email: req.cookies.token2 },
        {
          $push: {
            cart: {
              productId: req.params.id,
              quantity: 1
            }
          },
          $inc: { totalItems: 1 }
        }
      );
    }

    // Get updated user data and redirect to home
    const updatedUser = await User.findOne({ email: req.cookies.token2 });
    const products = await Product.find();
    
    res.render('ani', { 
      products, 
      count: updatedUser.totalItems || 0 
    });

  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).send('Error adding item to cart');
  }
});

app.get('/login', (req, res) => {
  res.render('login', {
    formType: 'login',
  });
});

app.get("/signup", (req, res) => {
  res.render('login', { formType: 'signup' });
});

app.post('/signup', async (req, res) => {
  let { fullName, email, phone, password, dateOfBirth, gender } = req.body;

  bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash(password, salt, async function (err, hash) {
      let users = await User.create({
        fullName,
        email,
        phone,
        gender,
        dateOfBirth,
        passwordHash: hash,
        totalItems: 0 // Initialize totalItems to 0
      });
      res.cookie("token2", email);
      res.redirect("/");
    });
  });
});

// Add login route
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.render('login', { 
        formType: 'login', 
        error: 'Invalid email or password' 
      });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.render('login', { 
        formType: 'login', 
        error: 'Invalid email or password' 
      });
    }

    res.cookie("token2", email);
    res.redirect("/");
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Login error');
  }
});

// Add logout route
app.get('/logout', (req, res) => {
  res.clearCookie('token2');
  res.redirect('/');
});
app.get('/cart', async (req, res) => {
  if (!req.cookies.token2) return res.redirect('/login');

  const user = await User.findOne({ email: req.cookies.token2 }).populate('cart.productId');

  if (!user) return res.redirect('/login');

  const cartItems = user.cart.map(item => ({
    product: item.productId,
    quantity: item.quantity
  }));

  res.render('cart', { cartItems });
});
app.get('/deletecart', async (req, res) => {
  if (!req.cookies.token2) return res.redirect('/login');

  try {
    // Clear the cart and reset totalItems to 0
    await User.findOneAndUpdate(
      { email: req.cookies.token2 },
      {
        $set: { cart: [], totalItems: 0 }
      },
      { new: true }
    );

    res.redirect('/'); // or redirect to '/' if preferred
  } catch (err) {
    console.error("Error clearing cart:", err);
    res.status(500).send("Something went wrong while clearing the cart.");
  }
});
app.get("/cart/remove/:id",async (req,res)=>{
  if(!req.cookies.token2)return res.redirect('/login');
  const id=req.params.id;
  await User.findOneAndUpdate(
  { email: req.cookies.token2 }, // or {_id: userId}
  {
    $pull: {
      cart: { productId: req.params.id } // this removes the object with matching productId
    }
  },
  { new: true }
);
  res.redirect('/cart');
})
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});