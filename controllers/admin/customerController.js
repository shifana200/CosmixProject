const User = require('../../models/userSchema')


// const customerInfo =async (req,res)=>{
//     try {
//         let search ="";
//         if(req.query.search){
//             search = req.query.search;

//         }

//         let page =1;
//         if(req.query.page){
//             page = req.query.page
//         }

//         const limit = 3
//         const userData = await User.find({
//             isAdmin:false,
//             $or:[
//                 {name:{$regex:".*"+search+".*"}},
//                 {email:{$regex:".*"+search+".*"}},
//             ]
//         })
//         .limit(limit*1)
//         .skip((page-1)*limit)
//         .exec();

//         const count = await User.find({
//             isAdmin:false,
//             $or:[
//                 {name:{$regex:".*"+search+".*"}},
//                 {email:{$regex:".*"+search+".*"}},
//             ]
//         }).countDocuments();

//         res.render('usermanagement')

//     } catch (error) {
        
//     }
// }

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || ""; // Default search to empty string
        let page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = 3;

        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        });

        res.render('usermanagement', {
            data: userData,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            searchQuery: search
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


const searchUsers = async (req, res) => {
    try {
        let search = req.query.search || "";
        const users = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        });

        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};



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

// const searchUser =  async (req, res) => {
//     const search = req.query.search;

//     try {
//         let users;

//         if (search) {
//             users = await User.find({
//                 $or: [
//                     { name: { $regex: search, $options: "i" } },
//                     { email: { $regex: search, $options: "i" } }
//                 ]
//             });
//         } else {
//             users = await User.find(); // Fetch all users if no search
//         }

//         res.json(users);
//     } catch (error) {
//         res.status(500).json({ message: "Server error" });
//     }
// }


const searchUser = async (req, res) => {
    try {
        const query = req.query.query;
        if (!query) {
            return res.json([]);
        }

        // Search in username and email fields (case insensitive)
        const users = await User.find({
            $or: [
                { name: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } }
            ]
        });

        res.json(users);
    } catch (error) {
        console.error("Error searching users:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports ={
    customerInfo,
    customerBlocked,
    customerunBlocked,
    getUserDetails,searchUser,
}