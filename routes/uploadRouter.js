import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const uploadRouter = express.Router();

// 1. S3 Client Initialize 
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// 2. Multer Configuration 
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 3. API Route
uploadRouter.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Please upload a file" });
        }

        const fileName = `${Date.now()}-${req.file.originalname}`;

        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

        res.status(200).json({
            message: "Image successfully uploaded to AWS S3!",
            imageUrl: imageUrl,
        });

    } catch (error) {
        console.error("S3 Upload Error: ", error);
        res.status(500).json({ error: "Failed to upload image" });
    }
});

export default uploadRouter;