const User = require('../models/userSchema'); 

let checkBan = async (req, res, next) => {
  try {
    console.log(req.session)
    if (req.session.loggedIn) {
        console.log(req.session.userData)
      const email = req.session?.currentEmail || req.session?.userData?.email;

      
      if (!email) {
        console.log("No email found in session.");
        return res.redirect('/signin'); 
      }

      
      const user = await User.findOne({ email: email });

      
      if (user && user.isBlocked) {
        console.log(`User ${email} is blocked`);
        return res.render('banPage', {
          message: "Your account has been blocked. Please contact support.",
        });
      }
    }
    
    next();
  } catch (error) {
    console.error("Error in checkBan middleware:", error);
    res.status(500).send("Internal server error");
  }
};

module.exports = checkBan;
