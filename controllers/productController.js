import Order from "../models/order.js";
import Product from "../models/product.js";
import { isAdmin } from "./userController.js";

export async function getProducts(req,res){
    // Product.find().then(
    //     (data) => {
    //         res.json(data);
    //         }
    // )

    // }

    try{
        if(isAdmin(req)){
            const product = await Product.find()  //Product.find ekn Product tik hoyl e tik Product ekt pawaral ew backend ekt ywn ek krnne,admin kenek nm eyt okkm product details penn on.
            res.json(product)
        }else{
            const product = await Product.find({isAvailable : true})  //Product.find ekn Product tik hoyl e tik Product ekt pawaral ew backend ekt ywn ek krnne,admin kenek newei nm e kiynne user kenek nm isAvailable:false kiyl thiyn ew penne true kiyl thiyen ew peno.
            res.json(product)
        }
        
    }catch(err){             // error ekk awoth mekt yno
        res.json({
            message:"failed to get products",
            error:err
        })
    }
}

export async function SaveProducts(req,res) { 

    if(!isAdmin(req)){    // admin kenek d kiyl check krno
        return res.status(403).json({
            message: "You are not authorized to add a product" 
        });
    }
    
    try {
        const product = new Product(req.body);
        
        await product.save();
        
        res.status(201).json({
            message : "Product saved successfully",
        });

    } catch (err) {
        console.error("Database Save Error: ", err); 
        
        res.status(400).json({
            message : "Error saving Product",
            error: err.message
        });
    }
}


//product delete krn widiy

export async function deleteProduct(req,res) {  //admin kenek nm withri delete krnn plwn

    if(!isAdmin(req)){    
        res.status(403).json({
            message: "You are not authorized to add a product" 
        })
        return
    }
    try{
    await Product.deleteOne({productId : req.params.productId})
    res.json({
        message : "product deleted succeessfully"
    })
    }catch(err){
    res.status(500).json({
        message : "Failed to delete product",
        error : err
    })
}}


export async function updateProduct(req,res) {  //admin kenek nm withri delete krnn plwn

    if(!isAdmin(req)){    
        res.status(403).json({
            message: "You are not authorized to add a product" 
        })
        return
    }

    const productId = req.params.productId   //productId ek hoygnno
    const updatingData = req.body  //update krnn on ew body eke ewno post req ekk widiyt

    try{
        await Product.updateOne(
            {productId : productId} ,     // mekedi wenne api para metars haraha ewl thiyen productId ek withri update krnne
            updatingData              //update krnn on data
        )
        res.json({
            message : "product update succeessfully"
        })
        }catch(err){
        res.status(500).json({
            message : "Internal server error",
            error : err
        })
}}

export async function getProductById(req,res) {  //admin kenek nm withri delete krnn plwn

    const productId = req.params.productId;   //para metar wlin en productid ek gnno

    try{
        const product = await Product.findOne(   //e proctid ekt adl details db ekn gnno
            {productId:productId}
        )

        if(product ==null){
            res.status(404).json({         //ehm product ekk db eke ndd blno.nethtn mek penno
              message : "product not found"
            })
            return
        }
        if(product.isAvailable){        //product ek availabled kiyl blno
            res.json(product)             //product ek availabled nm e product eke details front ekt ywno
        }else{                 // product ek available nththn saha blno den meya admin kenekd kiyl
            if(!isAdmin(req)){
                res.status(404).json({      
                    message : "product not found"  // admin nown kenek productid ekn produt blnn try kloth eyt mek penn on
                })
                return
            }else{         //ey admin kenek nm eyt prodct ek peno
                res.json(product);
            }
        }


    }catch(err){
    res.status(500).json({
        message : "Internal server error",
        error : err
    })
}}

export async function searchProducts(req,res){
    const searchQuery = req.params.query
    try{
        const products = await Product.find({
            $or:[
                {name :  {$regex : searchQuery, $options : "i"}},           // $options : "i" capital simple blnn ep kiyl kiynne
                {altNames : {$elemMatch : {$regex : searchQuery, $options : "i"}}}      // $elemMatch element eken element cheak krnn kiyl kiynne
            ],
            isAvailable : true
        })
        res.json(products)
    }catch(err){
        res.status(500).json({
            message : "Internal server error",
            error : err
        })
    }
}

export async function getProductsByCategory(req,res){
    try {
        const categoryName = req.params.category;
        
        const products = await Product.find({ category: categoryName });
        
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Error fetching products by category", error: error.message });
    }
}

// Get product by Barcode
export async function getProductByBarcode(req, res) {
    try {
        const barcode = req.params.barcode;
        const product = await Product.findOne({ barcode: barcode });

        if (!product) {
            return res.status(404).json({ message: "Product not found for this barcode" });
        }

        if (Number(product.stock) <= 0 || !product.isAvailable) {
            return res.status(400).json({ message: "Out of stock!" });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: "Error scanning product", error: error.message });
    }
}

