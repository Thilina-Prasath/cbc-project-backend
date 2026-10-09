import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

// Generic sender function - sent everyemail
export async function sendEmail({ to, subject, html }) {
    try {
        const info = await transport.sendMail({
            from: `"Crystal Beauty Clear" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log("Email sent:", info.messageId);
        return { success: true };
    } catch (error) {
        console.error("Email sending failed:", error);
        return { success: false, error: error.message };
    }
}