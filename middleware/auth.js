const User = require('../models/userSchema')


  



const userAuth = (req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
        .then(data=>{
            if(data && !data.isBlocked){
                next();
            }else{
                res.redirect('/login')
            }
        })
        .catch(error=>{
            console.log("Error in user auth middleware")
            res.status(500).send("Internal server error")
        })
    }else{
        res.redirect('/login')
    }
}

const adminAuth = (req,res,next)=>{
    User.findOne({isAdmin:true})
    .then(data=>{
        if(data){
            next();
        }else{
            res.redirect('/admin/login')
        }
    })
    .catch(error=>{
        console.log("error in adminauth middleware")
        res.status(500).send("internal server error")
    })
}


// const checkBlockedStatus = (req, res, next) => {
//     // Your logic to check if user is blocked
//     if (req.user && req.user.isBlocked) {
//       return res.redirect('/banPage');  // Redirect to ban page if user is blocked
//     }
//     next();  // Continue to the next middleware if the user is not blocked
//   };
  


module.exports = {
    userAuth,
    adminAuth,
  
    
}