import mongoose from "mongoose"

const OTPSchema = mongoose.Schema({
    email : {
        require : true,
        type : String
    },
    otp : {
        require : true,
        type : Number
    }
})

const OTP = mongoose.model("OTP",OTPSchema)
export default OTP;