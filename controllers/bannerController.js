import Banner from "../models/banner.js";
import { isAdmin } from "./userController.js";

// 1. පාරිභෝගිකයාට සියලුම සක්‍රීය බැනර් පෙන්වීම (GET)
export async function getBanner(req, res) {
    try {
        const banners = await Banner.find({ isActive: true });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: "Error fetching banners", error: error.message });
    }
}

// 2. Admin විසින් අලුත් බැනර් එකක් එකතු කිරීම (POST)
export async function addBanner(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "You are not authorized" });
    }

    try {
        const newBanner = new Banner(req.body);
        await newBanner.save();
        res.status(201).json({ message: "Banner added successfully", banner: newBanner });
    } catch (error) {
        res.status(500).json({ message: "Error adding banner", error: error.message });
    }
}

// 3. Admin විසින් බැනර් එකක් මැකීම (DELETE)
export async function deleteBanner(req, res) {
    if (!isAdmin(req)) {
        return res.status(403).json({ message: "You are not authorized" });
    }

    try {
        await Banner.findByIdAndDelete(req.params.id);
        res.json({ message: "Banner deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting banner", error: error.message });
    }
}