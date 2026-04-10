// backend/utils/mailer.js
const nodemailer = require("nodemailer");

const sendLinkEmail = async (toEmail, linkDetails) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `Sharda Associates <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `New PDF Link Created: ${linkDetails.name}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333;">
          <div style="max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #4f46e5; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Sharda Associates</h1>
            </div>
            
            <div style="padding: 30px;">
              <p style="font-size: 16px;">Hello Team,</p>
              <p style="font-size: 16px;">A new secure PDF link has been generated.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><b>📄 Document:</b> ${linkDetails.name}</p>
                <p style="margin: 5px 0;"><b>👤 Created By:</b> <span style="text-transform: capitalize;">${linkDetails.createdBy}</span></p>
                <p style="margin: 5px 0;"><b>🔑 Access User ID:</b> ${linkDetails.username}</p>
                <p style="margin: 5px 0;"><b>🔒 Password:</b> ${linkDetails.password}</p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${linkDetails.url}" 
                   style="background-color: #4f46e5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                   Open Secure PDF Link
                </a>
              </div>
              
              <p style="font-size: 12px; color: #6b7280; margin-top: 30px; text-align: center;">
                Note: This is an automated link. Please use the credentials mentioned above to log in.
              </p>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Mail sent with CreatedBy info!");
  } catch (error) {
    console.error("❌ Mail Error:", error);
  }
};

module.exports = sendLinkEmail;