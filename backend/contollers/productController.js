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

export function SaveProducts(req,res) { 

    if(!isAdmin(req)){    // admin kenek d kiyl check krno
        res.status(403).json({
            message: "You are not authorized to add a product" 
        })
        return
    }
    

    const product = new Product (

        req.body // product schema ek godk thiyen nis mehem dno. ethkot product schema ek thiye okkm dewl body eke thiyeno e dwl req ekk mgin gnno
);
        
        product.save().then(() => {
            res.json({
                message : "Products saved successfully",
            })
        }). catch(()=>{
            res.json({
                message : "Error saving Products"
            })
        })
        
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