const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema')
const fs = require('fs');
const path=require('path');
const sharp = require('sharp');




// Define the directory path
const productImagesDir = path.join('public', 'uploads', 'product-images');

// Check if the directory exists, and create it if not
if (!fs.existsSync(productImagesDir)) {
    fs.mkdirSync(productImagesDir, { recursive: true });
    console.log('Directory created:', productImagesDir);
}


const getaddProduct = async(req,res)=>{
    try {
        
        const category =await Category.find({isListed:true});
        console.log("))))))))))))))))))))")
        console.log(category)
        res.render('addproduct',{
            cat:category
        });
    } catch (error) {
        res.redirect('/pageError')
        
    }

}

const addProducts = async(req,res)=>{
    try {
        
        const products = req.body;
        
        
        const productExists = await Product.findOne({
            productName:products.productName,
        })

        if(!productExists){
            const images = [];
            if(req.files && req.files.length>0){
                for(let i=0;i<req.files.length;i++){
                    const originalImagePath = req.files[i].path;
                    const resizedImagePath = path.join('public','uploads','product-images',req.files[i].filename);
                    await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }

            const categoryId = await Category.findOne({name:products.category});
            if(!categoryId){
                return res.status(400).json({error:"Invalid category name"})
            }

            const newProduct = new Product({
                productName:products.productName,
                description:products.description,
                details:products.details,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salePrice:products.salePrice,
                createdOn:new Date(),
                quantity:products.quantity,
                productImage:images,
                status:'Available',

            })
            await newProduct.save();
            return res.redirect('/admin/productmanagement')
        }
        
    } catch (error) {
        
        console.error("Error saving product",error)
        return res.redirect('/PageError')
    }
}





const blockProduct = async(req,res)=>{
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect('/admin/productmanagement')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const unblockProduct = async (req,res)=>{
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{isBlocked:false})
        res.redirect('/admin/productmanagement')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}



const getProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Default to page 1 if no page is provided
        const limit = parseInt(req.query.limit) || 5; // Default to 10 items per page if no limit is provided
        const skip = (page - 1) * limit;

        // Query the products for the current page
        const products = await Product.find()
            .skip(skip)
            .limit(limit)
             .sort({ createdAt: -1 }) 
            .populate('category')

        // Calculate the total number of pages
        const totalItems = await Product.countDocuments();
        const totalPages = Math.ceil(totalItems / limit);

        
        // Pass the products, currentPage, totalPages, and limit to the EJS view
        res.render('productmanagement', {
            products,
            currentPage: page,
            totalPages: totalPages,
            limit: limit
        });console.log(products)

    } catch (error) {
        // If there's an error, redirect to a "Page Not Found" page
        res.redirect('/pageNotFound');
    }
};



const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id; // Ensure the ID is correctly received
        console.log("Product ID from query:", id);

        // Fetch the product details using the ID
        const product = await Product.findOne({ _id: id });


        // Fetch the list of categories for the dropdown
        const category = await Category.find({});

        // Render the form with the product and category data
        res.render('editProduct', {
            product: product, // Pass the product data
            cat: category     // Pass the category list
        });
    } catch (error) {
    
        res.redirect('/pageNotFound');
    }
};


const editProduct = async(req,res)=>{
    try {
        const id = req.params.id;
        const product = await Product.findOne({_id:id})

        const data = req.body;
        const existingProduct = await Product.findOne({
            productName:data.productName,
            _id:{$ne:id}
        })



        if(existingProduct){
            return res.status(400).json({error:"Product with this name already exists.Please try with another name"})
        }

        const images = [];
        if(req.files && req.files.length>0){
            for(let i=0;i<req.files.length;i++){
                images.push(req.files[i].filename)

                
            }
        }

        const updateFields = {
            productName:data.productName,
            description:data.description,
            category:product.category,
            regularPrice:data.regularPrice,
            salePrice:data.salePrice,
            quantity:data.quantity,

        }

        if(req.files.length>0){
            updateFields.$push={productImages:{$each:images}}
        }

        await Product.findByIdAndUpdate(id,updateFields,{new:true})
        res.redirect('/admin/productmanagement')

    } catch (error) {
        console.error(error)
        res.redirect('/pageError')
    }
}


const deleteSingleImage = async(req,res)=>{
    try {
        

        const {imageNameToServer,productIdToServer}= req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}})

        const imagePath = path.join('public','uploads','re-image',imageNameToServer)
        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`);
        }else{
            console.log(`Image ${imageNameToServer} not found`)
        }
        res.send({status:true});
    } catch (error) {
        res.redirect('/PageError')
    }
}

module.exports ={
    getaddProduct,
    addProducts, 
    blockProduct,
    unblockProduct,
    getProducts,
    getEditProduct,
    editProduct,
    deleteSingleImage,
   

}