import nodemailer from "nodemailer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import dotenv from "dotenv";
import { wrapEmail } from "./emailTemplates.js";

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

    let transporter;

    if (process.env.SMTP_HOST) {
      console.log(`📧 Provider: SMTP (${process.env.SMTP_HOST})`);
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        // For private mail servers that might have self-signed certificates
        tls: {
          rejectUnauthorized: false
        }
      });
    } else {
      if (!process.env.AWS_REGION) {
        console.warn('Missing AWS_REGION and SMTP_HOST. Skipping email send.');
        return null;
      }

      console.log(`📧 Provider: AWS SES`);
      // Configure AWS SES Client (v3 - SESv2)
      const sesClient = new SESv2Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      // Create Nodemailer transporter with SESv2
      transporter = nodemailer.createTransport({
        SES: {
          sesClient,
          SendEmailCommand
        }
      });
      console.log(`📧 SES configured for region: ${process.env.AWS_REGION}`);
    }

    const wrappedHtml = wrapEmail(html, subject);

    const mailOptions = {
      from: fromEmail ? `"${fromName}" <${fromEmail}>` : undefined,
      replyTo,
      to,
      subject,
      html: wrappedHtml,
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
      console.log(`📧 Email includes ${attachments.length} attachment(s)`);
    }

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to}`);
    console.log(`📧 Message ID: ${result?.messageId || 'N/A'}`);
    
    return result;
  } catch (error) {
    console.error("❌ Error sending email:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    console.warn(`Email sending failed: ${error.message}`);
    return null;
  }
};

export default sendEmail;
