// Email templates for various notifications

/**
 * Generate announcement email template matching welcome email style
 * @param {Object} params - Template parameters
 * @param {string} params.title - Announcement title
 * @param {string} params.description - Announcement description
 * @param {string} params.imageUrl - Optional image URL
 * @param {string} params.recipientName - Recipient's name
 * @param {Date} params.createdAt - Announcement creation date
 * @returns {string} HTML email template
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