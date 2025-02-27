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
    const name =req.body.name;
    const description = req.body.description;

    console.log("pppppppppppppppppppppppppppppppppp")
    console.log(req.body)
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

const updateCategory = async (req, res) => {
    const { categoryId, name, description } = req.body;
  
    try {
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') }, 
        _id: { $ne: categoryId }, 
      });
  
      if (existingCategory) {
        
        return res.status(400).json({ success: false, message: 'Category already exists' });
      }
  
      
      const updatedCategory = await Category.findByIdAndUpdate(
        categoryId,
        { name, description },
        { new: true } 
      );
  
      if (!updatedCategory) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
  
      
      res.json({ success: true, message: 'Category updated successfully', category: updatedCategory });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Error updating category' });
    }
  };
  
  
  const searchCategory =  async (req, res) => {
    try {
        const query = req.query.query;
        let categories;

        if (query) {
            categories = await Category.find({
                name: { $regex: query, $options: "i" } 
            });
        } else {
            categories = await Category.find();
        }

        res.json(categories);
    } catch (error) {
        console.error("Error searching categories:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}


module.exports={
    CategoryInfo,
    addCategory,
     getListCategory,
     getUnlistCategory,
     updateCategory,
     searchCategory,
}