
const Offer = require('../../models/offerSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')

const loadOfferManagement = async(req,res)=>{
    if(req.session.admin){
      try {
        const offers = await Offer.find().populate({ path: 'categoryOrProduct',
            select: 'name productName'}).sort({createdAt:-1})

          res.render('offermanagement',{offers})
      } catch (error) {
          res.redirect('/pageNotFound')
      }
  }
}

const addOffer =  async (req, res) => {
    try {
        


    const { offerName, offerType, categoryProduct, discountType, discountValue, startDate, endDate, description } = req.body;
    console.log("----------------",req.body)

    const newOffer = new Offer({
        name: offerName,               // Map offerName to name
        type: offerType,               // Map offerType to type
        categoryOrProduct: categoryProduct,  // Map categoryProduct to categoryOrProduct
        discountType: discountType,
        discountValue: discountValue,
        startDate: startDate,
        endDate: endDate,
        description: description,
    });

    
        await newOffer.save();
        return  res.redirect('/admin/offermanagement')
    } catch (err) {
        res.status(500).send('Error creating offer: ' + err.message);
    }
}

const getItems = async (req, res) => {
    try {
        const { type } = req.query;
        console.log("🔥 Selected Type:", type);

        let items = [];

        if (type === "Category") {
            items = await Category.find({}, "_id name");  
        } else if (type === "Product") {
            items = await Product.find({}, "_id productName");  

            // ✅ Rename `productName` to `name`
            items = items.map(item => ({
                _id: item._id,
                name: item.productName // ✅ Ensures consistency with category data
            }));
        } else {
            return res.status(400).json({ success: false, message: "Invalid type provided" });
        }

        console.log("✅ Fetched Items:", items);
        res.json({ success: true, items });

    } catch (error) {
        console.error("❌ Error fetching items:", error);
        res.status(500).json({ success: false, message: "Error fetching items" });
    }
};

const getOfferDetails = async (req, res) => {
    try {
        const offerId = req.params.id;
        const offer = await Offer.findById(offerId).populate('categoryOrProduct');

        if (!offer) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        res.json({ _id: offer._id,
            name: offer.name,
            type: offer.type,
            categoryOrProduct: offer.categoryOrProduct
                ? {
                      _id: offer.categoryOrProduct._id,
                      name: offer.categoryOrProduct.name || offer.categoryOrProduct.productName
                  }
                : null,
            discountType: offer.discountType,
            discountValue: offer.discountValue,
            startDate: offer.startDate,
            endDate: offer.endDate,
            description: offer.description});
    } catch (error) {
        res.status(500).json({ error: 'Error fetching offer details' });
    }
};


const updateOffer = async (req, res) => {
    try {
        const { offerId, editofferName, editofferType, editcategoryProduct, editdiscountType, editdiscountValue, startDate, endDate, editdescription } = req.body;

        const updatedOffer = await Offer.findByIdAndUpdate(offerId, {
            name: editofferName,
            type: editofferType,
            categoryOrProduct: editcategoryProduct,
            discountType: editdiscountType,
            discountValue: editdiscountValue,
            startDate: startDate,
            endDate: endDate,
            description: editdescription
        }, { new: true });

        if (!updatedOffer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        res.redirect('/admin/offerManagement');
    } catch (error) {
        res.status(500).send('Error updating offer: ' + error.message);
    }
};

const getCategoriesOrProducts = async (req, res) => {
    try {
        const type = req.query.type;
        let data = [];

        if (type === "Category") {
            data = await Category.find({}, "_id name");
        } else if (type === "Product") {
            data = await Product.find({}, "_id productName");
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Error fetching data" });
    }
};

const deleteOffer = async (req, res) => {
    try {
        const offerId = req.params.id;
        const deletedOffer = await Offer.findByIdAndDelete(offerId);

        if (!deletedOffer) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }

        res.json({ success: true, message: "Offer deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting offer: " + error.message });
    }
};




module.exports={
    loadOfferManagement,
    addOffer,getItems,getOfferDetails,
    updateOffer,getCategoriesOrProducts,deleteOffer,
    
}