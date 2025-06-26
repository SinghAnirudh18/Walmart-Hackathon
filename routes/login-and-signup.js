const express = require('express')
const router = express.Router();
const Product = require('../mongodb/products');
const User = require('../mongodb/userschema');
const bcrypt = require('bcrypt');
const cp = require('cookie-parser')
router.use(cp())
// Auth
router.get('/login', (req, res) => {
  res.render('login', { formType: 'login' });
});

router.get("/signup", (req, res) => {
  res.render('login', { formType: 'signup' });
});

router.post('/signup', async (req, res) => {
  let { fullName, email, phone, password, dateOfBirth, gender } = req.body;
  bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash(password, salt, async function (err, hash) {
      await User.create({
        fullName,
        email,
        phone,
        gender,
        dateOfBirth,
        passwordHash: hash,
        totalItems: 0
      });
      res.cookie("token2", email);
      res.redirect("/");
    });
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.render('login', { formType: 'login', error: 'Invalid email or password' });

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return res.render('login', { formType: 'login', error: 'Invalid email or password' });

  res.cookie("token2", email);
  res.redirect("/");
});

router.get('/logout', (req, res) => {
  res.clearCookie('token2');
  res.redirect('/');
});
module.exports = router;