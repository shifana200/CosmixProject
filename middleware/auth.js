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


  


module.exports = {
    userAuth,
    adminAuth,
  
    
}