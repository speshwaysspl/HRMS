import nodemailer from "nodemailer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import dotenv from "dotenv";

dotenv.config();

const sendEmail = async (to, subject, html, attachments = []) => {

  try {
    if (!to || !to.includes('@')) {
      console.warn('Invalid recipient email address. Skipping email send.');
      return null;
    }

    const fromEmail =
      process.env.MAIL_FROM_EMAIL ||
      process.env.AWS_SES_FROM ||
      '';
    const fromName = process.env.MAIL_FROM_NAME || 'SPESHWAY SOLUTIONS PVT LTD';
    const replyTo = process.env.MAIL_REPLY_TO || undefined;

    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`📧 Provider: ses (AWS SDK v3 / SESv2)`);

    let transporter;

    // Configure AWS SES Client (v3 - SESv2)
    const sesClient = new SESv2Client({});

    // Create Nodemailer transporter with SESv2
    transporter = nodemailer.createTransport({
      SES: {
        sesClient,
        SendEmailCommand
      }
    });

    const mailOptions = {
      from: fromEmail ? `"${fromName}" <${fromEmail}>` : undefined,
      replyTo,
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
    console.error("❌ Error sending email:", error);
    console.warn(`Email sending failed: ${error.message}`);
    return null;
  }
};

export default sendEmail;
