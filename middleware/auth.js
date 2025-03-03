const User = require('../models/userSchema')


  



// const userAuth = (req,res,next)=>{
//     if(req.session.user){
//         User.findById(req.session.user)
//         .then(data=>{
//             if(data && !data.isBlocked){
//                 next();
//             }else{
//                 res.redirect('/signin')
//             }
//         })
//         .catch(error=>{
//             console.log("Error in user auth middleware")
//             res.status(500).send("Internal server error")
//         })
//     }else{
//         res.redirect('/signin')
//     }
// }

const userAuth = (req, res, next) => {
    if (req.session.user) {
        User.findById(req.session.user)
            .then(data => {
                if (data && !data.isBlocked) {
                    next();
                } else {
                    res.redirect('/signin');
                }
            })
            .catch(error => {
                console.log("Error in user auth middleware");
                res.status(500).send("Internal server error");
            });
    } else {
        res.redirect('/signin'); // Prevent access if not logged in
    }
};


const adminAuth = async (req, res, next) => {
    const adminRoutes = [
        '/admin/products',
        '/admin/usermanagement',
        '/admin/categorymanagement',
        '/admin/dashboard',
        '/admin/ordermanagement',
        '/admin/productmanagement'
    ];

    if (adminRoutes.includes(req.url)) {
        // Ensure user is logged in
        if (!req.session.loggedIn || !req.session.email) {
            console.log("User not logged in. Redirecting to login page.");
            return res.redirect('/signin');  
        }

        try {
            const email = req.session.email;
            const user = await User.findOne({ email });

            if (!user) {
                console.log("User not found. Redirecting to login.");
                return res.redirect('/signin');
            }

            // Check if the user is an admin
            if (!user.isAdmin) {
                console.log("User does not have admin privileges. Redirecting to home.");
                return res.redirect('/home'); 
            }

            // Check if the user is blocked
            if (user.isBlocked) {
                console.log("User is blocked. Redirecting to login.");
                req.session.destroy(() => {
                    res.clearCookie("connect.sid", { path: "/" });
                    return res.redirect('/signin');
                });
            }

            next(); // Allow access if all conditions pass
        } catch (error) {
            console.error("Error in admin authentication:", error);
            res.status(500).send("Internal Server Error");
        }
    } else {
        next(); // If the route is not in the admin routes, proceed normally
    }
};



const preventBack = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '-1');

    // Allow all users to access the home page (public)
    if (req.path === '/') {
        return next();
    }

    // Allow logout to proceed normally
    if (req.path === '/logout') {
        return next();
    }

    // Prevent logged-in users from accessing signin & signup pages
    if (req.session.user) {
        if (req.path === '/signin' || req.path === '/signup' || req.path === '/verify') {
            return res.redirect('/');
        }
        return next(); // Allow other routes if logged in
    }

    if (req.session.isSignup) {
        if (req.path === '/verify') {
            return next();
        }
        return res.redirect('/verify'); // Redirect to OTP verification if trying to access other routes
    }

    // Allow unauthenticated users to access signin & signup
    if (req.path === '/signin' || req.path === '/signup') {
        return next();
    }

    // Redirect unauthenticated users to signin if trying to access protected pages
    return res.redirect('/signin');
};


module.exports = {
    userAuth,
    adminAuth,
  preventBack
    
}