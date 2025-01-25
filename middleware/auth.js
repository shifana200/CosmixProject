const User = require('../models/userSchema')


  



const userAuth = (req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
        .then(data=>{
            if(data && !data.isBlocked){
                next();
            }else{
                res.redirect('/signin')
            }
        })
        .catch(error=>{
            console.log("Error in user auth middleware")
            res.status(500).send("Internal server error")
        })
    }else{
        res.redirect('/signin')
    }
}

// const adminAuth = (req,res,next)=>{
//     User.findOne({   isAdmin:true})
//     .then(data=>{
//         if(data){
//             next();
//         }else{
//             res.redirect('/admin/login')
//         }
//     })
//     .catch(error=>{
//         console.log("error in adminauth middleware")
//         res.status(500).send("internal server error")
//     })
// }

let adminAuth = async (req, res, next) => {
    const adminRoutes = [
        '/admin/products',
        '/admin/usermanagement',
        '/admin/categorymanagement',
        '/admin/dashboard',
        
        '/admin/ordermanagement',
        '/admin/productmanagement'

    ];
    if (adminRoutes.includes(req.url)) {
        if (!req.session.loggedIn) {
            console.log("User not logged in. Redirecting to login page.");
            return res.redirect('/signin');  
        }
        const email = req.session.email;
        const user = await User.findOne({ email });
        console.log(user)
        if (user.isAdmin !== true) {
            console.log("User does not have admin privileges. Redirecting to unauthorized page.");
            return res.redirect('/home'); 
        }
    }

    return next();
};



 




module.exports = {
    userAuth,
    adminAuth,
  
    
}