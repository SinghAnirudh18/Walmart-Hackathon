const express = require('express')
const Product = require('./mongodb/products')
const path = require('path')
const app = express();

app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname,'public')));
app.set("view engine",'ejs')
app.get('/',async (req,res)=>{
    const products = await Product.find();
    console.log(products)
    res.render('index',{ products })
})

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
  res.render('product');
});

app.post('/admin/products', async (req, res) => {
  try {
    const {
      title, description, shortDescription, category, brand, tags,
      price, discountPrice, stockCount, thumbnail, images, weight,
      length, width, height, shippingCost, isFeatured
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
      dimensions: {
        length, width, height
      },
      shippingCost,
      isFeatured: !!isFeatured
    });

    await product.save();
    res.send("Product added successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving product");
  }
});
app.listen(3000)
