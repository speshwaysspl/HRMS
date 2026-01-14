import sendEmail from "./sendEmail.js";

const queue = [];
let processing = false;
const delayMs = 500;

const processNext = async () => {
  if (!queue.length) {
    processing = false;
    return;
  }
  processing = true;
  const item = queue.shift();
  try {
    await sendEmail(item.to, item.subject, item.html, item.attachments);
  } catch (error) {
    console.error("Queued email error:", error);
  }
  setTimeout(processNext, delayMs);
};

export const enqueueEmail = (to, subject, html, attachments = []) => {
  queue.push({ to, subject, html, attachments });
  if (!processing) {
    processNext();
  }
};

export default enqueueEmail;
