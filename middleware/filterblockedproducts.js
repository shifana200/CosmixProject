const Product = require('../models/productSchema'); // Adjust the path to your Product model

const filterBlockedProducts = async (req, res, next) => {
    try {
        const pathToCategoryMap = {
            '/makeup': 'Makeup',
            '/facecare': 'Facecare',
            '/bodycare': 'Bodycare',
            '/shampoo': 'Shampoo',
            '/conditioner': 'Conditioner',
            '/serum': 'Serum'
        };

        // Map the current route to its corresponding category
        const category = pathToCategoryMap[req.path];

        if (!category) {
            // If the route doesn't match, move to the next middleware
            return next();
        }

        // Fetch products where isBlocked is false and the category matches
        const products = await Product.find({ isBlocked: false, category });

        // Attach the products to the request object
        req.products = products;

        next();
    } catch (error) {
        console.error('Error filtering products:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = filterBlockedProducts;
