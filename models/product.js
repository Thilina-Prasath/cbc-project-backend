import mongoose from "mongoose";

const productSchema = mongoose.Schema(
    {
        productId : {
            type : String,
            required : true, // aniwaryen productId ekk thiyenn on kiyl kiynne
            unique : true       // productid thiyenn plwn eki dekk thiyenn ba kiyl kiynne
        },
        name : {
            type : String,
            required : true  
        },
        altNames : [
            {type : String}
        ],
        description : {
            type : String,
            required : true
        },
        images : [
            {type : String}
        ],
        labelledPrice : {
            type : String,
            required : true
        },
        price : {
            type : String,
            required : true
        },
        stock : {
            type : String,
            required : true
        },
        isAvailable : {
            type : Boolean,
            required : true,
            default : true
        },
    }
)

const Product = mongoose.model("products", productSchema)

export default Product;