import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getShortName = (fullName) => {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
};

const formatOrdinalDate = (dateVal) => {
  if (!dateVal) return "";
  const dateObj = new Date(dateVal);
  if (isNaN(dateObj.getTime())) return "";
  const day = dateObj.getDate();
  const monthName = dateObj.toLocaleDateString("en-IN", { month: "long" });
  const year = dateObj.getFullYear();
  let suffix = "th";
  if (day === 1 || day === 21 || day === 31) suffix = "st";
  else if (day === 2 || day === 22) suffix = "nd";
  else if (day === 3 || day === 23) suffix = "rd";
  return `${String(day).padStart(2, "0")}${suffix} ${monthName} ${year}`;
};

/**
 * Draw background watermark logo
 */
const drawWatermark = (doc) => {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  
  const savedY = doc.y;
  const savedBottomMargin = doc.page.margins.bottom;
  
  doc.page.margins.bottom = 0;
  doc.y = 0;
  
  const logoPath = path.join(__dirname, "..", "assets", "logo.png");
  try {
    if (fs.existsSync(logoPath)) {
      doc.save();
      doc.opacity(0.35);
      
      const logoSize = 320;
      const text1Size = 54;
      const text2Size = 44;
      const gap1 = 15;
      const gap2 = 12;
      
      const totalBlockHeight = logoSize + gap1 + text1Size + gap2 + text2Size;
      const startY = (pageHeight - totalBlockHeight) / 2;
      
      const logoX = (pageWidth - logoSize) / 2;
      const logoY = startY;
      
      doc.image(logoPath, logoX, logoY, {
        width: logoSize,
        height: logoSize
      });
      
      doc.font("Arial-Bold").fontSize(text1Size);
      doc.text("SPESHWAY", 0, logoY + logoSize + gap1, {
        align: "center",
        width: pageWidth,
        characterSpacing: 6
      });
      
      doc.font("Arial-Bold").fontSize(text2Size);
      doc.text("SOLUTIONS", 0, logoY + logoSize + gap1 + text1Size + gap2, {
        align: "center",
        width: pageWidth,
        characterSpacing: 5
      });
      
      doc.restore();
    }
  } catch (err) {
    console.error("Error drawing watermark logo:", err);
  }
  
  doc.page.margins.bottom = savedBottomMargin;
  doc.y = savedY;
};

/**
 * Draw Page Header Logo and Bottom Footer Address Block
 */
const drawPageTemplate = (doc) => {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  
  const savedY = doc.y;
  const savedBottomMargin = doc.page.margins.bottom;
  
  doc.page.margins.bottom = 0;
  doc.y = 0;
  
  // Top right logo
  const logoPath = path.join(__dirname, "..", "assets", "logo.png");
  try {
    if (fs.existsSync(logoPath)) {
      const logoSize = 52;
      const logoX = pageWidth - logoSize - 50;
      const logoY = 15;
      
      doc.image(logoPath, logoX, logoY, { width: logoSize, height: logoSize });
      
      doc.save();
      doc.font("Arial-Bold").fontSize(7.5).fillColor("#1e3a8a");
      doc.text("SPESHWAY", logoX - 15, logoY + logoSize + 4, { align: "center", width: logoSize + 30, characterSpacing: 1.5 });
      
      doc.font("Arial-Bold").fontSize(6.5).fillColor("#4b5563");
      doc.text("SOLUTIONS", logoX - 15, logoY + logoSize + 12, { align: "center", width: logoSize + 30, characterSpacing: 0.8 });
      doc.restore();
    }
  } catch (err) {
    console.error("Error drawing logo in header:", err);
  }
  
  // Footer
  const footerY = pageHeight - 65;
  
  doc.font("Arial-Bold").fontSize(8.5).fillColor("#2563eb").text("SPESHWAYSOLUTIONS PVT. LTD", 0, footerY + 8, {
    align: "center",
    width: pageWidth,
    lineBreak: false
  });
  
  doc.font("Arial-Medium").fontSize(7.5).fillColor("#1f2937").text("Plot No 1/C, Sy No 83/1, Raidurgam Knowledge City Rd, Serilingampalle,", 0, footerY + 18, {
    align: "center",
    width: pageWidth,
    lineBreak: false
  });
  
  doc.font("Arial-Medium").fontSize(7.5);
  const part1 = "Telangana 500081 Email:";
  const part2 = "info@speshway.com";
  const w1 = doc.widthOfString(part1);
  const w2 = doc.widthOfString(part2);
  const totalW = w1 + w2;
  const startX = (pageWidth - totalW) / 2;
  
  doc.fillColor("#1f2937").text(part1, startX, footerY + 27, { lineBreak: false });
  doc.fillColor("#2563eb").text(part2, startX + w1, footerY + 27, { lineBreak: false });
  
  doc.font("Arial-Medium").fontSize(7.5).fillColor("#2563eb").text("www.speshway.com", 0, footerY + 36, {
    align: "center",
    width: pageWidth,
    lineBreak: false,
    underline: true
  });

  doc.page.margins.bottom = savedBottomMargin;
  doc.y = savedY;
};

const generateAppointmentLetterPDFContent = (doc, candidate) => {
  const pageWidth = doc.page.width;
  const marginX = 50;
  const contentWidth = pageWidth - 100;

  // Watermark and template
  drawWatermark(doc);
  drawPageTemplate(doc);

  let y = 80;

  // Top header text
  doc.font("Arial-Bold").fontSize(18).fillColor("#111827");
  doc.text("SPESHWAY SOLUTIONS PVT LTD", marginX, y, { align: "center", width: contentWidth });
  
  y = doc.y + 10;
  doc.font("Arial-Bold").fontSize(15).fillColor("#111827");
  doc.text("Letter of Appointment", marginX, y, { align: "center", width: contentWidth, underline: true });
  
  y = doc.y + 30;

  // Date and candidate metadata
  const letterDate = formatOrdinalDate(candidate.appointmentDate || new Date());
  const joiningDateStr = formatOrdinalDate(candidate.joiningDate);
  const designation = candidate.designation || candidate.position || "Associate Software Engineer";
  
  // Format Employee No
  const dateObj = new Date(candidate.joiningDate || new Date());
  const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yearShort = String(dateObj.getFullYear()).slice(-2);
  const candidateNum = candidate.candidateId ? candidate.candidateId.replace("CAN", "") : "1174";
  const employeeNo = candidate.employeeId || `SS${monthNum}${yearShort}HYD${candidateNum}`;

  doc.font("Arial-Bold").fontSize(10.5).fillColor("#111827");
  doc.text("Date: ", marginX, y, { continued: true }).font("Arial-Medium").text(letterDate);
  y = doc.y + 6;
  doc.font("Arial-Bold").text("Employee Name: ", marginX, y, { continued: true }).font("Arial-Medium").text(candidate.fullName);
  y = doc.y + 6;
  doc.font("Arial-Bold").text("Employee No.: ", marginX, y, { continued: true }).font("Arial-Medium").text(employeeNo);
  y = doc.y + 6;
  doc.font("Arial-Bold").text("Appointed as ", marginX, y, { continued: true }).font("Arial-Medium").text(designation);

  y = doc.y + 24;

  // Paragraph 1
  doc.font("Arial-Medium").fontSize(10).fillColor("#374151");
  doc.text("We refer to your recent interview for the above position and are pleased to inform that we are offering you the position with our company effective from ", marginX, y, { width: contentWidth, align: "justify", lineGap: 3, continued: true });
  doc.font("Arial-Bold").fillColor("#111827").text(`${joiningDateStr} `, { continued: true });
  doc.font("Arial-Medium").fillColor("#374151").text("under the following terms and conditions.", { lineGap: 3 });

  y = doc.y + 18;

  // Terms and conditions
  const salaryLPA = candidate.salaryPackage ? (candidate.salaryPackage).toLocaleString("en-IN") + "/- LPA" : "4,80,000/- LPA";
  
  const terms = [
    ["Salary: ", `${salaryLPA}`],
    ["Probation Period: ", candidate.probationPeriod || "The period of six months need to be served by the candidate, after joining the job"],
    ["Working Hours: ", candidate.workingHours || "The working hours to be followed by the employee is 9 hours and Monday to Friday"],
    ["Leave Policy: ", candidate.leavePolicy || "No leaves in probation period and after the probation leave policy will be applicable."],
    ["Notice Period: ", candidate.noticePeriod || "If employee desires to leave the company, he/she needs to serve the notice period of one month."]
  ];

  terms.forEach(([label, value]) => {
    doc.font("Arial-Bold").fontSize(10).fillColor("#111827").text(label, marginX, y, { width: contentWidth, continued: true, lineGap: 4 });
    doc.font("Arial-Medium").fillColor("#374151").text(value, { lineGap: 4 });
    y = doc.y + 6;
  });

  y = doc.y + 12;

  // Paragraph 2
  doc.font("Arial-Medium").fontSize(10).fillColor("#374151");
  doc.text("We congratulate you on your appointment and assure you to get our full support for your professional growth and development.", marginX, y, { width: contentWidth, align: "justify", lineGap: 3 });

  y = doc.y + 30;

  // Signature Block
  doc.font("Arial-Medium").fontSize(10).fillColor("#111827").text("Sincerely,", marginX, y);
  
  // Siddharth Reddy name and title
  y = doc.y + 10;
  doc.font("Arial-Bold").fontSize(12).fillColor("#111827").text("Siddharth Reddy", marginX, y);
  
  y = doc.y + 3;
  doc.font("Arial-Medium").fontSize(9.5).fillColor("#4b5563").text("HR Manager", marginX, y);
  doc.text("Speshway Solutions Pvt Ltd.", marginX, doc.y + 2);
};

export const generateAppointmentLetterPDFBuffer = async (candidate) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      
      const arialRegularPath = "C:/Windows/Fonts/arial.ttf";
      const arialBoldPath = "C:/Windows/Fonts/arialbd.ttf";
      if (fs.existsSync(arialRegularPath) && fs.existsSync(arialBoldPath)) {
        doc.registerFont("Arial-Medium", arialRegularPath);
        doc.registerFont("Arial-Bold", arialBoldPath);
      } else {
        doc.registerFont("Arial-Medium", "Helvetica");
        doc.registerFont("Arial-Bold", "Helvetica-Bold");
      }
      
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      generateAppointmentLetterPDFContent(doc, candidate);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
