const User = require('../../models/userSchema')


const customerInfo =async (req,res)=>{
    try {
        let search ="";
        if(req.query.search){
            search = req.query.search;

        }

        let page =1;
        if(req.query.page){
            page = req.query.page
        }

        const limit = 3
        const userData = await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+search+".*"}},
            ]
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec();

        const count = await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+search+".*"}},
            ]
        }).countDocuments();

        res.render('usermanagement')

    } catch (error) {
        
    }
}

const customerBlocked = async (req,res)=>{
    try {
        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/usermanagement')
    } catch (error) {
        
        res.redirect('/pageNotFound')
    }
}

const customerunBlocked = async (req,res)=>{

    try {
        let id = req.query.id;
        await User.updateOne({_id: id},{$set :{ isBlocked:false}});
        res.redirect('/admin/usermanagement')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const getUserDetails= async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId); // Assuming you have a User model

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Send the user data as JSON
        res.json({
            name: user.name,
            email: user.email,
            phone: user.phone,
            // Add more fields as needed
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


module.exports ={
    customerInfo,
    customerBlocked,
    customerunBlocked,
    getUserDetails
}