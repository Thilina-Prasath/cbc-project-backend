import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    email : {
        type : String,
        required : true,  // database ekkk save wena hema kentm email ekk thiyenn on nis
        unique : true,     // usersla  denkt ekm email ekk thiyenn bari nis
    },
    firstName : {
        type : String,
        required : false,
    },
    lastName : {
        type : String,
        required : false,
    },
    password : {
        type : String,
        required : false,  // google login krn user kenek password ekk nathuw save wenna puluwan nis mehema dno
    },
    role : {
        type : String,
        required : true,
        default : "Customer",  // user kenek db eke role ekk nethuw save kloth auto e userwa customer kiyl save weno 
    },
    isBlocked : {
        type : Boolean,
        default : false,  // user kenek hdn kot uwa block wel thiyenn bane e nis mekt false dno
        required : true,
    },
    img : {
        type : String,
        default : "https://avatar.iran.liara.run/public/6",
        required : false,
    },
    provider : {
        type : String,
        default : "email",  
         
    },
    providerId : {
        type : String,
        required : false,
         
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    refreshToken: {
        type: String,
        required: false,  // delete user logout 
    },
    wishlist: [
        { type: String } // save productId
    ]
})

const User = mongoose.model("user", userSchema);

export default User;