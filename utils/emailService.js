const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.sendOTP = async (email, otp) => {
    try {
        await transporter.sendMail({
            from: `"Shadamon Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Ad Posting Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4F46E5;">Verify Your Identity</h2>
                    <p>You are attempting to post an ad on Shadamon. Please use the verification code below to confirm your identity.</p>
                    <div style="background-color: #F3F4F6; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
                        <h1 style="color: #111827; letter-spacing: 5px; margin: 0;">${otp}</h1>
                    </div>
                    <p style="color: #6B7280; font-size: 14px;">This code is valid for 5 minutes. If you did not request this code, please ignore this email.</p>
                </div>
            `
        });
        return true;
    } catch (error) {
        console.error("Email send failed:", error);
        return false;
    }
};
