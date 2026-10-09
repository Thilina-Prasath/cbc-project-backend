// Common wrapper - used by all templates
function baseTemplate(content) {
    return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #18181b; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 900;">
                Crystal Beauty Clear
            </h1>
        </div>
        <div style="padding: 30px;">
            ${content}
        </div>
        <div style="background: #FAF7F2; padding: 20px; text-align: center; color: #71717a; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Crystal Beauty Clear. All rights reserved.</p>
            <p style="margin: 5px 0 0;">This is an automated email, please do not reply.</p>
        </div>
    </div>
    `;
}

// 1. Password Reset OTP Template
export function passwordResetTemplate(otp) {
    return baseTemplate(`
        <h2 style="color: #18181b;">Reset Your Password</h2>
        <p style="color: #52525b; line-height: 1.6;">
            We received a request to reset your password. Use the OTP below to proceed. This code is valid for 5 minutes.
        </p>
        <div style="background: #FAF7F2; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #9b6b43;">
                ${otp}
            </span>
        </div>
        <p style="color: #a1a1aa; font-size: 13px;">
            If you didn't request this, please ignore this email or contact support.
        </p>
    `);
}

// 2. Email Verification Template
export function emailVerificationTemplate(verificationLink, firstName) {
    return baseTemplate(`
        <h2 style="color: #18181b;">Verify Your Email</h2>
        <p style="color: #52525b; line-height: 1.6;">
            Hi ${firstName || "there"}, thanks for signing up! Please verify your email address to activate your account.
        </p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background: #18181b; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 900; display: inline-block;">
                Verify Email
            </a>
        </div>
        <p style="color: #a1a1aa; font-size: 13px;">
            This link expires in 24 hours. If you didn't create this account, please ignore this email.
        </p>
    `);
}

// 3. Order Confirmation Template
export function orderConfirmationTemplate(order) {
    const itemsHtml = order.items.map(item => `
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #f4f4f5;">
                <div style="display: flex; align-items: center;">
                    ${item.image ? `<img src="${item.image}" alt="${item.name}" width="50" height="50" style="border-radius: 8px; object-fit: cover; margin-right: 12px;" />` : ""}
                    <div>
                        <p style="margin: 0; font-weight: 700; color: #18181b;">${item.name}</p>
                        <p style="margin: 0; color: #71717a; font-size: 13px;">Qty: ${item.quantity}</p>
                    </div>
                </div>
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #f4f4f5; text-align: right; color: #18181b; font-weight: 700;">
                Rs. ${(item.price * item.quantity).toLocaleString()}
            </td>
        </tr>
    `).join("");

    return baseTemplate(`
        <h2 style="color: #18181b;">Order Confirmed! 🎉</h2>
        <p style="color: #52525b; line-height: 1.6;">
            Hi ${order.customerName}, thank you for your order. We're getting it ready for shipment.
        </p>
        <div style="background: #FAF7F2; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #71717a; font-size: 13px;">Order ID</p>
            <p style="margin: 0; color: #18181b; font-weight: 900; font-size: 16px;">#${order.orderId}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
            ${itemsHtml}
            <tr>
                <td style="padding: 16px 0 0; font-weight: 900; color: #18181b;">Total</td>
                <td style="padding: 16px 0 0; text-align: right; font-weight: 900; color: #9b6b43; font-size: 18px;">
                    Rs. ${order.total.toLocaleString()}
                </td>
            </tr>
        </table>
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f4f4f5;">
            <p style="margin: 0; color: #71717a; font-size: 13px;">Shipping Address</p>
            <p style="margin: 4px 0 0; color: #18181b;">${order.shippingAddress}</p>
        </div>
    `);
}

// 4. Payment Receipt Template
export function paymentReceiptTemplate(payment) {
    return baseTemplate(`
        <h2 style="color: #18181b;">Payment Receipt</h2>
        <p style="color: #52525b; line-height: 1.6;">
            Hi ${payment.customerName}, we've successfully received your payment. Here's your receipt.
        </p>
        <div style="border: 1px solid #f4f4f5; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #71717a;">Receipt No.</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #18181b;">${payment.receiptId}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #71717a;">Order ID</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #18181b;">#${payment.orderId}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #71717a;">Payment Method</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #18181b;">${payment.method}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #71717a;">Date</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #18181b;">
                        ${new Date(payment.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0 0; color: #18181b; font-weight: 900; font-size: 16px;">Amount Paid</td>
                    <td style="padding: 12px 0 0; text-align: right; font-weight: 900; color: #16a34a; font-size: 18px;">
                        Rs. ${payment.amount.toLocaleString()}
                    </td>
                </tr>
            </table>
        </div>
        <p style="color: #a1a1aa; font-size: 13px;">
            Keep this receipt for your records. For any billing queries, contact our support team.
        </p>
    `);
}