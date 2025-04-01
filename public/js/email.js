const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'your-email@example.com',
    pass: process.env.EMAIL_PASS || 'your-password'
  }
});

// Send email to winner
async function sendWinnerEmail(email, name, prize) {
  if (!email) {
    console.warn('No email provided for winner, skipping email');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: '"Easter Game" <noreply@yourcompany.com>',
      to: email,
      subject: "Congratulations! You've won an Easter prize!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h1 style="color: #6200ea; text-align: center;">Happy Easter, ${name}!</h1>
          <p style="font-size: 16px; line-height: 1.5;">Congratulations! You've just won a wonderful prize in our Easter game:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h2 style="color: #e91e63; margin: 0;">${prize}</h2>
          </div>
          <p style="font-size: 16px; line-height: 1.5;">Our commercial team will contact you soon with details on how to redeem your prize.</p>
          <p style="font-size: 16px; line-height: 1.5;">Thank you for participating in our game and Happy Easter!</p>
          <div style="text-align: center; margin-top: 30px; color: #757575; font-size: 14px;">
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      `
    });
    
    console.log('Winner email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending winner email:', error);
    throw error;
  }
}

// Send email to commercial department
async function sendCommercialEmail(vatNumber, playerName, prize) {
  const commercialEmail = process.env.COMMERCIAL_EMAIL || 'commercial@yourcompany.com';
  
  try {
    const info = await transporter.sendMail({
      from: '"Easter Game System" <noreply@yourcompany.com>',
      to: commercialEmail,
      subject: `New winner: ${playerName} (${vatNumber})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h1 style="color: #3f51b5; text-align: center;">New Easter game winner</h1>
          <p style="font-size: 16px; line-height: 1.5;">A new customer has participated in the Easter game and won a prize:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd; background-color: #f5f5f5;">Customer</th>
              <td style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">${playerName}</td>
            </tr>
            <tr>
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd; background-color: #f5f5f5;">VAT Number</th>
              <td style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">${vatNumber}</td>
            </tr>
            <tr>
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd; background-color: #f5f5f5;">Prize won</th>
              <td style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">${prize}</td>
            </tr>
            <tr>
              <th style="padding: 10px; text-align: left; background-color: #f5f5f5;">Date and time</th>
              <td style="padding: 10px; text-align: left;">${new Date().toLocaleString('en-US')}</td>
            </tr>
          </table>
          <p style="font-size: 16px; line-height: 1.5;">Please contact the customer to arrange delivery of the prize.</p>
        </div>
      `
    });
    
    console.log('Commercial email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending commercial email:', error);
    throw error;
  }
}

module.exports = { sendWinnerEmail, sendCommercialEmail };
