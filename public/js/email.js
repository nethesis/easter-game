const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
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
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Congratulazioni! Hai vinto un premio di Pasqua!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h1 style="color: #6200ea; text-align: center;">Buona Pasqua, ${name}!</h1>
          <p style="font-size: 16px; line-height: 1.5;">Congratulazioni! Hai appena vinto un fantastico premio nel nostro gioco di Pasqua:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h2 style="color: #e91e63; margin: 0;">${prize}</h2>
          </div>
          <p style="font-size: 16px; line-height: 1.5;">Il nostro team commerciale ti contatterà presto con i dettagli su come riscattare il tuo premio.</p>
          <p style="font-size: 16px; line-height: 1.5;">Grazie per aver partecipato al nostro gioco e Buona Pasqua!</p>
          <div style="text-align: center; margin-top: 30px; color: #757575; font-size: 14px;">
            <p>Questa è un'email automatica, si prega di non rispondere.</p>
          </div>
        </div>
      `
    });
    
    return info;
  } catch (error) {
    console.error('Error sending winner email:', error);
    throw error;
  }
}

// Send email to commercial department
async function sendCommercialEmail(vatNumber, playerName, prize, playerEmail) {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.COMMERCIAL_EMAIL,
      subject: `Nuovo vincitore: ${playerName} (${vatNumber})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h1 style="color: #3f51b5; text-align: center;">Nuovo vincitore del gioco di Pasqua</h1>
          <p style="font-size: 16px; line-height: 1.5;">Un nuovo cliente ha partecipato al gioco di Pasqua e ha vinto un premio:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd; background-color: #f5f5f5;">Cliente</th>
              <td style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">${playerName}</td>
            </tr>
            <tr>
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd; background-color: #f5f5f5;">Partita IVA</th>
              <td style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">${vatNumber}</td>
            </tr>
            <tr>
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd; background-color: #f5f5f5;">Email</th>
              <td style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">${playerEmail}</td>
            </tr>
            <tr>
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd; background-color: #f5f5f5;">Premio vinto</th>
              <td style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">${prize}</td>
            </tr>
            <tr>
              <th style="padding: 10px; text-align: left; background-color: #f5f5f5;">Data e ora</th>
              <td style="padding: 10px; text-align: left;">${new Date().toLocaleString('it-IT')}</td>
            </tr>
          </table>
          <p style="font-size: 16px; line-height: 1.5;">Si prega di contattare il cliente per organizzare la consegna del premio.</p>
        </div>
      `
    });
    
    return info;
  } catch (error) {
    console.error('Error sending commercial email:', error);
    throw error;
  }
}

module.exports = { sendWinnerEmail, sendCommercialEmail };
