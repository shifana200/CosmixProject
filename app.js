const express = require('express')
const app= express()
const env = require('dotenv').config()
const path = require('path');
const connectDB =require('./config/db')
const bodyParser = require('body-parser');
const User = require('./models/userSchema');
const session = require('express-session');
const passport = require('./config/passport')
const userRouter =require('./routes/userRouter')
const adminRouter = require('./routes/adminRouter')
const otpRoutes = require('./routes/otpRoutes');
const filterBlockedProducts = require('./middleware/filterblockedproducts'); // Adjust the path to your middleware
const checkBan= require("./middleware/checkban")
connectDB();


app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret : process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000

    }
}))

app.use(passport.initialize());
app.use(passport.session());
app.use(passport.authenticate('session'));


app.set('views',[path.join(__dirname, 'views/user'),path.join(__dirname, 'views/admin')]);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(checkBan)


app.use('/',userRouter)
app.use("/admin",adminRouter)

const preventCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');  // Don't store the cache
  res.setHeader('Pragma', 'no-cache');         // Disable caching for older HTTP versions
  res.setHeader('Expires', '0');               // Make the page expire immediately
  next(); // Continue to the next middleware or route handler
};

app.use('/admin', preventCache);




// Apply the middleware to all category routes
app.use(['/makeup', '/facecare', '/bodycare', '/shampoo', '/conditioner', '/serum'], filterBlockedProducts);

// Define your category routes
app.get('/makeup', (req, res) => {
    res.render('makeup', { products: req.products });
});

app.get('/facecare', (req, res) => {
    res.render('facecare', { products: req.products });
});

app.get('/bodycare', (req, res) => {
    res.render('bodycare', { products: req.products });
});

app.get('/shampoo', (req, res) => {
    res.render('shampoo', { products: req.products });
});

app.get('/conditioner', (req, res) => {
    res.render('conditioner', { products: req.products });
});

app.get('/serum', (req, res) => {
    res.render('serum', { products: req.products });
});



app.get('/api/products', async (req, res) => {
  try {
      const products = await Product.find();  // Fetch all products from DB
      res.json(products);  // Send the list of products as a response
  } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Database error' });
  }
});



app.get('/auth/status', (req, res) => {
  // Check if the user is logged in by checking the session
  if (req.session.user) {
    return res.json({ loggedIn: true });
  }
  return res.json({ loggedIn: false });
});

// Example login route (simplified)
app.post('/login', (req, res) => {
  // Authenticate the user (you can use real credentials check here)
  req.session.user = { username: 'user' };  // Set user in session upon login
  res.redirect('/');
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Failed to log out');
    }
    res.redirect('/');  // Redirect after logout
  });
});



app.listen(process.env.PORT, () => {
    console.log(`Server running at http://localhost:${process.env.PORT}`);
});

module.exports =app;