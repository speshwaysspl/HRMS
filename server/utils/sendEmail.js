import nodemailer from "nodemailer";

const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    // Validate required environment variables
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('Missing required SMTP configuration. Please check environment variables.');
    }

    // Validate email recipient
    if (!to || !to.includes('@')) {
      throw new Error('Invalid recipient email address');
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
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

export default sendEmail;
