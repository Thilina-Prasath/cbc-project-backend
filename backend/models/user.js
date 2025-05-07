import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    email : {
        type : String,
        required : true,  // database ekkk save wena hema kentm email ekk thiyenn on nis
        unique : true,     // usersla  denkt ekm email ekk thiyenn bari nis
    },
    firstName : {
        type : String,
        required : true,
    },
    lastName : {
        type : String,
        required : true,
    },
    password : {
        type : String,
        required : true,
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
    }
})

const User = mongoose.model("user", userSchema);

export default User;