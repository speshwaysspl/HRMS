/**
 * Wraps an HTML email body in a professional, responsive corporate template.
 * @param {string} bodyHtml - The original HTML body of the email.
 * @param {string} subject - The subject line of the email.
 * @returns {string} The fully wrapped HTML email.
 */
export const wrapEmail = (bodyHtml, subject) => {
  // If the email is already fully wrapped, return it as-is
  if (
    bodyHtml.includes('<!DOCTYPE html>') ||
    bodyHtml.includes('id="corporate-email-wrapper"')
  ) {
    return bodyHtml;
  }

  // Pre-process bodyHtml to inject classes for button styling and credentials styling
  let modifiedHtml = bodyHtml;

  // Convert standard blue links to styled button actions
  modifiedHtml = modifiedHtml.replace(
    /<a([^>]+href="[^"]*login[^"]*"[^>]*)>([^<]+)<\/a>/gi,
    '<a class="btn-action" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; font-weight: 600; font-size: 15px; text-decoration: none; border-radius: 6px; margin: 10px 0; text-align: center;" $1>$2</a>'
  );
  modifiedHtml = modifiedHtml.replace(
    /<a([^>]+href="[^"]*speshwayhrms[^"]*"[^>]*)>([^<]+)<\/a>/gi,
    '<a class="btn-action" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; font-weight: 600; font-size: 15px; text-decoration: none; border-radius: 6px; margin: 10px 0; text-align: center;" $1>$2</a>'
  );

  let title = subject || "Notification";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .wrapper {
      background-color: #f1f5f9;
      padding: 40px 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
      overflow: hidden;
    }
    .email-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 30px 40px;
      text-align: left;
      border-bottom: 3px solid #3b82f6;
    }
    .email-header h1 {
      color: #ffffff;
      font-size: 20px;
      font-weight: 800;
      margin: 0;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .email-header p {
      color: #94a3b8;
      font-size: 11px;
      margin: 6px 0 0 0;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .email-body {
      padding: 40px;
      color: #334155;
      font-size: 15px;
      line-height: 1.6;
    }
    .email-body h2 {
      color: #0f172a;
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .email-body h3 {
      color: #1e3a8a;
      font-size: 16px;
      font-weight: 600;
      margin-top: 25px;
      margin-bottom: 15px;
    }
    .email-body p {
      margin-top: 0;
      margin-bottom: 16px;
    }
    .email-body ul, .email-body ol {
      margin-top: 0;
      margin-bottom: 20px;
      padding-left: 20px;
    }
    .email-body li {
      margin-bottom: 8px;
    }
    .email-body a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
    }
    .email-body a:hover {
      text-decoration: underline;
    }
    /* Style credentials section dynamically */
    .credentials-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .credentials-card h4 {
      margin-top: 0;
      margin-bottom: 12px;
      color: #0f172a;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    /* Buttons */
    .btn-action {
      display: inline-block !important;
      background-color: #2563eb !important;
      color: #ffffff !important;
      padding: 12px 24px !important;
      font-weight: 600 !important;
      font-size: 15px !important;
      text-decoration: none !important;
      border-radius: 6px !important;
      margin: 15px 0 !important;
      text-align: center !important;
      box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1) !important;
    }
    .btn-action:hover {
      background-color: #1d4ed8 !important;
    }
    .email-footer {
      background-color: #f8fafc;
      padding: 30px 40px;
      border-top: 1px solid #f1f5f9;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .email-footer a {
      color: #475569;
      text-decoration: underline;
    }
    .email-footer p {
      margin: 0 0 8px 0;
    }
    .email-footer p:last-child {
      margin: 0;
    }
    .disclaimer {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 20px;
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
      text-align: justify;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="email-container" id="corporate-email-wrapper">
      <div class="email-header">
        <h1>SPESHWAY SOLUTIONS</h1>
        <p>Human Resource Management System</p>
      </div>
      <div class="email-body">
        ${modifiedHtml}
      </div>
      <div class="email-footer">
        <p>This is an automated notification from the Speshway Solutions HRMS Portal.</p>
        <p>© 2026 Speshway Solutions Pvt. Ltd. All rights reserved.</p>
        <p><a href="https://www.speshwayhrms.com">Visit Portal</a> | <a href="mailto:support@speshway.com">Support Helpdesk</a></p>
        <div class="disclaimer">
          <strong>Confidentiality & Privacy Notice:</strong> This electronic mail transmission, including any attachments, is intended for the named recipient(s) only and contains information that may be confidential, privileged, and/or exempt from disclosure under applicable law. If you are not the intended recipient, please be aware that any disclosure, copying, distribution, or use of the contents of this information is strictly prohibited. If you have received this email in error, please immediately notify the sender by return email and delete/destroy all copies of the original message and any attachments from your system.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
};

/**
 * Generate HTML template for announcements
 */
export const getAnnouncementEmailTemplate = ({ title, description, imageUrl, recipientName, createdAt }) => {
  const formattedDate = new Date(createdAt).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  return `
    <h2>New Announcement 📢</h2>
    <p>Dear ${recipientName || 'Team Member'},</p>
    <p>We have an important announcement to share with you from SPESHWAY SOLUTIONS PVT LTD.</p>
    
    <h3>${title}</h3>
    
    <p><strong>Date:</strong> ${formattedDate}</p>
    
    <p>${description.replace(/\n/g, '<br>')}</p>
    
    ${imageUrl ? `
    <p><strong>Attachment:</strong></p>
    <img src="${imageUrl}" alt="Announcement Image" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; margin: 10px 0;">
    ` : ''}
    
    <p>We believe this information will be valuable to our team. Together, we look forward to achieving new milestones and building a bright future.</p>
    
    <p>If you have any questions about this announcement, please feel free to reach out to the HR department.</p>
    
    <p>Best regards,<br>
    HR Team</p>
    
    <p>SPESHWAY SOLUTIONS PVT LTD</p>
  `;
};

/**
 * Generate email subject for announcements
 * @param {string} title - Announcement title
 * @returns {string} Email subject
 */
export const getAnnouncementEmailSubject = (title) => {
  return `📢 Important Announcement: ${title} - SPESHWAY SOLUTIONS`;
};

export default wrapEmail;