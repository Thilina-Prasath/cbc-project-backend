import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema({
    imageUrl: {
        type: String,
        required: true
    },
    targetLink: {
        type: String,
        default: "/"
    },
    isActive: {
        type: Boolean,
        default: true 
    }
}, { timestamps: true });

export default mongoose.model("banners", bannerSchema);