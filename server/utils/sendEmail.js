import nodemailer from "nodemailer";
import AWS from "aws-sdk";

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
    console.log(`📧 Provider: ses (AWS SDK)`);

    let transporter;

    if (!process.env.AWS_REGION) {
      console.warn('Missing AWS_REGION for SES. Skipping email send.');
      return null;
    }
    // Configure AWS SDK (credentials resolved from environment/instance profile)
    AWS.config.update({
      region: process.env.AWS_REGION
    });

    const ses = new AWS.SES({ apiVersion: '2010-12-01' });

    transporter = nodemailer.createTransport({
      SES: { ses, aws: AWS }
    });
    console.log(`📧 SES configured for region: ${process.env.AWS_REGION}`);

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
