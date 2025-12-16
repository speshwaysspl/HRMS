import nodemailer from "nodemailer";

const sendEmail = async (to, subject, html, attachments = []) => {

  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('Missing SMTP configuration. Skipping email send.');
      return null;
    }

    if (!to || !to.includes('@')) {
      console.warn('Invalid recipient email address. Skipping email send.');
      return null;
    }

    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`📧 SMTP Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    console.log(`📧 SMTP User: ${process.env.SMTP_USER}`);
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Enhanced options for Gmail compatibility
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      },
      requireTLS: true,
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000
    });

    // Verify transporter configuration
    await transporter.verify();
    console.log('📧 SMTP connection verified successfully');

    const mailOptions = {
      from: `"SPESHWAY SOLUTIONS PVT LTD" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
      console.log(`📧 Email includes ${attachments.length} attachment(s)`);
    }

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to}`);
    console.log(`📧 Message ID: ${result.messageId}`);
    
    return result;
  } catch (error) {
    console.error("❌ Error sending email:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    console.warn(`Email sending failed: ${error.message}`);
    return null;
  }
};

export default sendEmail;
