const Category = require('../../models/categorySchema')

const CategoryInfo = async(req,res)=>{
    try {
        const  page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page-1)*limit;

        const categoryData = await Category.find({})
        
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }) ;

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);
        res.render('categorymanagement',{
            cat:categoryData,
            currentPage:page,
            totalPages:totalPages,
            totalCategories:totalCategories
        })
    } catch (error) {
        
        console.error(error);
        res.redirect('/pageNotFound')
    }
}

const addCategory = async(req,res)=>{
    const {name,description}=req.body;
    try {
        const existingCategory = await Category.findOne({ name: { $regex: `^${name}$`, $options: 'i' }});
        if(existingCategory){
            return res.status(400).json({error:"Category already exists"})
        }

        const newCategory = new Category({
            name,
            description
        })
        await newCategory.save();
        return res.json({message:"Category added successfully"})
    } catch (error) {
        return res.status(500).json({error:"Internal server error"})
    }
}

const getListCategory = async(req,res)=>{
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}})
        res.redirect('/admin/categorymanagement')
        
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}


const getUnlistCategory = async(req,res)=>{
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect('/admin/categorymanagement')
        
    } catch (error) {
        res.redirect('/pageNotFound');
    }


}

// Update Category Route
const updateCategory =async (req, res) => {
    const { categoryId, name, description } = req.body;
  
    // Find and update the category in the database
    Category.findByIdAndUpdate(categoryId, { name, description }, { new: true })
      .then(updatedCategory => {
        res.json(updatedCategory);
      })
      .catch(err => {
        res.status(500).send('Error updating category');
      });
  }
  


module.exports={
    CategoryInfo,
    addCategory,
     getListCategory,
     getUnlistCategory,
     updateCategory,
}