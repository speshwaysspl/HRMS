// server/utils/pdfGenerator.js
import PDFDocument from "pdfkit";
import axios from "axios";
import numberToWords from "number-to-words";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { toWords } = numberToWords;
const formatCurrency = (val) => `INR ${Number(val || 0).toFixed(2)}`;

// Fetch remote image as buffer (optional use if you want remote logos)
const fetchLogoBuffer = async (url) => {
  try {
    const res = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(res.data, "binary");
  } catch (err) {
    console.error("Error fetching logo:", err.message);
    return null;
  }
};

/**
 * Shared function to draw PDF content
 */
const generateSalaryPDFContent = (doc, salary) => {
  const pageWidth = doc.page.width;
  let cursorY = 20;

  /** -------------------- HEADER -------------------- **/
  const logoPath = path.join(__dirname, "..", "assets", "logo.png");
  let logoBuffer = null;
  try {
    logoBuffer = fs.readFileSync(logoPath);
  } catch (err) {
    console.error("Error loading local logo at", logoPath, ":", err.message);
    logoBuffer = null;
  }

  // Draw header box
  doc.rect(20, cursorY, pageWidth - 40, 70).stroke();

  if (logoBuffer) {
    doc.image(logoBuffer, 30, cursorY + 5, { width: 60, height: 60 });
  }

  doc
    .font("Times-Bold")
    .fontSize(18)
    .fillColor("#2563eb") // Blue-600 color
    .text("SPESHWAY SOLUTIONS PRIVATE LIMITED", 0, cursorY + 15, {
      align: "center",
      width: pageWidth,
    });

  doc
    .font("Times-Roman")
    .fontSize(10)
    .fillColor("black")
    .text("Hitech City, Hyderabad", {
      align: "center",
      width: pageWidth,
    });

  doc
    .font("Times-Bold")
    .fontSize(11)
    .text(`Payslip for the month of ${salary.month} ${salary.year}`, {
      align: "center",
      width: pageWidth,
    });

  cursorY += 70;

  /** -------------------- PERSONAL INFO -------------------- **/
  doc.rect(20, cursorY, pageWidth - 40, 100).stroke();
  doc.moveTo(pageWidth / 2, cursorY).lineTo(pageWidth / 2, cursorY + 100).stroke();

  const labelLeftX = 25;
  const valueLeftX = 110;
  const labelRightX = pageWidth / 2 + 5;
  const valueRightX = pageWidth / 2 + 100;
  const lineSpacing = 16;
  let y = cursorY + 8;

  // Handle employeeId field - it can be a string or an object with employeeId property
  const employeeNumber = salary.employeeId?.employeeId || salary.employeeId || "-";
  
  const formatDate = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-GB"); // DD/MM/YYYY
  };

  const fields = [
    ["Name:", salary.name, "Employee No:", employeeNumber],
    ["Joining Date:", formatDate(salary.joiningDate), "Bank Name:", salary.bankname || "-"],
    ["Designation:", salary.designation || "-", "Bank Account No:", salary.bankaccountnumber || "-"],
    ["Department:", salary.department || "-", "PAN No:", salary.pan || "-"],
    ["Work Days:", salary.workingdays || 0, "UAN No:", salary.uan || "-"],
    ["LOP Days:", salary.lopDays || 0, "", ""],
  ];

  doc.fontSize(9);
  fields.forEach(([labelL, valueL, labelR, valueR]) => {
    doc.font("Times-Roman").fillColor("black").text(labelL, labelLeftX, y);
    // Correctly handle 0 values (like LOP days) to show "0" instead of "-"
    const displayValueL = (valueL !== undefined && valueL !== null && valueL !== "") ? String(valueL) : "-";
    doc.font("Times-Bold").text(displayValueL, valueLeftX, y);

    if (labelR) {
      doc.font("Times-Roman").text(labelR, labelRightX, y);
      const displayValueR = (valueR !== undefined && valueR !== null && valueR !== "") ? String(valueR) : "-";
      doc.font("Times-Bold").text(displayValueR, valueRightX, y);
    }
    y += lineSpacing;
  });

  cursorY += 100;

  /** -------------------- EARNINGS & DEDUCTIONS -------------------- **/
  const rowHeight = 18;
  const rowGap = 2;

  const earningsRows = [
    ["BASIC", salary.basicSalary],
    ["DA", salary.da],
    ["HRA", salary.hra],
    ["CONVEYANCE", salary.conveyance],
    ["MEDICAL ALLOWANCE", salary.medicalallowances],
    ["SPECIAL ALLOWANCE", salary.specialallowances],
  ];
  const deductionRows = [
    ["PROF TAX", salary.proftax],
    ["PF", salary.pf],
    ["LOSS OF PAY", salary.lopamount],
    ["OTHER DEDUCTIONS", salary.deductions],
  ];

  const maxRows = Math.max(earningsRows.length, deductionRows.length);
  const headerHeight = 22;
  const footerHeight = 25;
  const sectionHeight = headerHeight + (maxRows * (rowHeight + rowGap)) + footerHeight;
  
  // Outer box
  doc.rect(20, cursorY, pageWidth - 40, sectionHeight).stroke();
  
  // Vertical divider
  doc.moveTo(pageWidth / 2, cursorY).lineTo(pageWidth / 2, cursorY + sectionHeight - footerHeight).stroke();
  
  // Header background/line
  doc.moveTo(20, cursorY + headerHeight).lineTo(pageWidth - 20, cursorY + headerHeight).stroke();

  doc.font("Times-Bold").fontSize(10);
  doc.text("Earnings", 25, cursorY + 7);
  doc.text("Actual", pageWidth / 2 - 110, cursorY + 7, { width: 80, align: "right" });
  
  doc.text("Deductions", pageWidth / 2 + 10, cursorY + 7);
  doc.text("Actual", pageWidth - 130, cursorY + 7, { width: 80, align: "right" });

  let rowY = cursorY + headerHeight + 5;
  const formatAmt = (amt) => Number(amt || 0).toFixed(0);

  doc.font("Times-Roman").fontSize(9);
  for (let i = 0; i < maxRows; i++) {
    if (i < earningsRows.length) {
      const [label, val] = earningsRows[i];
      doc.text(label, 25, rowY);
      doc.text(formatAmt(val), pageWidth / 2 - 110, rowY, { width: 80, align: "right" });
    }
    if (i < deductionRows.length) {
      const [label, val] = deductionRows[i];
      doc.text(label, pageWidth / 2 + 10, rowY);
      doc.text(formatAmt(val), pageWidth - 130, rowY, { width: 80, align: "right" });
    }
    rowY += rowHeight + rowGap;
  }

  /** -------------------- TOTALS -------------------- **/
  const totalEarnings =
    Number(salary.basicSalary || 0) +
    Number(salary.da || 0) +
    Number(salary.hra || 0) +
    Number(salary.conveyance || 0) +
    Number(salary.medicalallowances || 0) +
    Number(salary.specialallowances || 0);

  const totalDeductions =
    Number(salary.proftax || 0) +
    Number(salary.pf || 0) +
    Number(salary.lopamount || 0) +
    Number(salary.deductions || 0);

  const netPay = totalEarnings - totalDeductions;

  // Totals horizontal line
  const totalsY = cursorY + sectionHeight - footerHeight;
  doc.moveTo(20, totalsY).lineTo(pageWidth - 20, totalsY).stroke();

  doc
    .font("Times-Bold")
    .fontSize(10)
    .text(`Total Earnings: ${formatCurrency(totalEarnings)}`, 25, totalsY + 7)
    .text(`Total Deductions: ${formatCurrency(totalDeductions)}`, pageWidth / 2 + 5, totalsY + 7);

  cursorY += sectionHeight + 20;

  /** -------------------- NET PAY SECTION -------------------- **/
  doc
    .font("Times-Bold")
    .fontSize(11)
    .text(`Net Pay for the month: ${formatCurrency(netPay)}`, 25, cursorY);
    
  doc
    .font("Times-Italic")
    .fontSize(10)
    .text(`(${toWords(Math.floor(netPay)).replace(/\b\w/g, (c) => c.toUpperCase())} Rupees Only)`, 25, cursorY + 15);

  cursorY += 50;

  doc
    .fontSize(10)
    .font("Times-Roman")
    .text("This is a system generated and does not require signature", 0, cursorY, {
      width: pageWidth,
      align: "center",
    });

  cursorY += 40;

  /** -------------------- FOOTER -------------------- **/
  const footerY = doc.page.height - 70;

  // Draw footer line
  doc
    .moveTo(20, footerY)
    .lineTo(pageWidth - 20, footerY)
    .strokeColor("#cccccc")
    .stroke()
    .strokeColor("black");

  doc
    .font("Times-Bold")
    .fontSize(10)
    .fillColor("#2563eb")
    .text("SPESHWAY SOLUTIONS PRIVATE LIMITED", 0, footerY + 10, {
      align: "center",
      width: pageWidth,
    });

  doc
    .font("Times-Roman")
    .fontSize(9)
    .fillColor("black")
    .text("Hitech City, Hyderabad", {
      align: "center",
      width: pageWidth,
    })
    .text("Email: support@speshwayhrms.com", {
      align: "center",
      width: pageWidth,
    });
};

/**
 * Generate PDF and stream to response
 */
export const generateSalaryPDF = async (res, salary) => {
  // Build a safe filename even if some fields are missing (Lambda-safe)
  const employeePart = salary?.employeeId?.employeeId || salary?.employeeId || "Unknown";
  const dateInput = salary?.payDate ? new Date(salary.payDate) : new Date();
  const datePart = isNaN(dateInput.getTime())
    ? new Date().toISOString().split("T")[0]
    : dateInput.toISOString().split("T")[0];
  const fileName = `Payslip_${employeePart}_${datePart}.pdf`;

  // Generate into a Buffer to avoid streaming issues on Lambda/API Gateway
  const doc = new PDFDocument({ size: "A4", margin: 20 });
  const chunks = [];

  return new Promise((resolve, reject) => {
    try {
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Length", pdfBuffer.length);
        res.end(pdfBuffer);
        resolve();
      });
      doc.on("error", (err) => {
        console.error("PDF generation error:", err);
        // Ensure we send a JSON error response if possible
        try {
          res.status(500).json({ success: false, error: "PDF generation error" });
        } catch (_) {}
        reject(err);
      });

      generateSalaryPDFContent(doc, salary);
      doc.end();
    } catch (error) {
      console.error("Unhandled PDF generation error:", error);
      try {
        res.status(500).json({ success: false, error: "PDF generation error" });
      } catch (_) {}
      reject(error);
    }
  });
};

/**
 * Generate PDF as buffer (for email attachments)
 */
export const generateSalaryPDFBuffer = async (salary) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 20 });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      generateSalaryPDFContent(doc, salary);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Convert numbers to Indian style currency in words
 */
const convertNumberToIndianWords = (num) => {
  const lakhs = Math.floor(num / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  
  let result = "";
  if (lakhs > 0) {
    result += `${toWords(lakhs)} Lakhs `;
  }
  if (thousands > 0) {
    result += `${toWords(thousands)} Thousand `;
  }
  
  return result.trim().replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Calculate dynamic Salary Breakdown percentages matching the sample letter
 */
const calculateSalaryBreakdown = (totalGross) => {
  const annualGross = Number(totalGross || 650000);
  const monthlyGross = Math.floor(annualGross / 12);

  const basicAnnual = Math.round(annualGross * 0.3789538);
  const basicMonthly = Math.floor(basicAnnual / 12);

  const daAnnual = Math.round(annualGross * 0.2084246);
  const daMonthly = Math.round(daAnnual / 12);

  const hraAnnual = Math.round(annualGross * 0.1894769);
  const hraMonthly = Math.round(hraAnnual / 12);

  const conveyanceAnnual = 19200;
  const conveyanceMonthly = 1600;

  const medicalAnnual = 15000;
  const medicalMonthly = 1250;

  const specialAnnual = annualGross - (basicAnnual + daAnnual + hraAnnual + conveyanceAnnual + medicalAnnual);
  const specialMonthly = monthlyGross - (basicMonthly + daMonthly + hraMonthly + conveyanceMonthly + medicalMonthly);

  return {
    annual: {
      basic: basicAnnual,
      da: daAnnual,
      hra: hraAnnual,
      conveyance: conveyanceAnnual,
      medical: medicalAnnual,
      special: specialAnnual,
      total: annualGross
    },
    monthly: {
      basic: basicMonthly,
      da: daMonthly,
      hra: hraMonthly,
      conveyance: conveyanceMonthly,
      medical: medicalMonthly,
      special: specialMonthly,
      total: monthlyGross
    }
  };
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
      // Keep watermark opacity at 0.35 for visibility
      doc.opacity(0.35);
      
      const logoSize = 320; // Increased logo size from 185 to 320
      const text1Size = 54; // Increased font size for SPESHWAY to match
      const text2Size = 44; // Increased font size for SOLUTIONS to match
      const gap1 = 15;
      const gap2 = 12;
      
      // Calculate total height of the watermark block (logo + brand texts + gaps)
      const totalBlockHeight = logoSize + gap1 + text1Size + gap2 + text2Size;
      
      // Calculate starting Y coordinate to perfectly center the entire block on the page
      const startY = (pageHeight - totalBlockHeight) / 2;
      
      const logoX = (pageWidth - logoSize) / 2;
      const logoY = startY;
      
      // Draw shield logo centered
      doc.image(logoPath, logoX, logoY, {
        width: logoSize,
        height: logoSize
      });
      
      // Draw stacked watermark texts below logo using standard characterSpacing option
      doc.font("Times-Bold").fontSize(text1Size);
      doc.text("SPESHWAY", 0, logoY + logoSize + gap1, {
        align: "center",
        width: pageWidth,
        characterSpacing: 6
      });
      
      doc.font("Times-Bold").fontSize(text2Size);
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
const drawPageTemplate = (doc, pageNum, totalPages) => {
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
      // Keep aspect ratio 1:1 and increase size compared to original squished 45px height
      const logoSize = 52;
      const logoX = pageWidth - logoSize - 50; // Aligned with the new 50pt right-hand margin
      const logoY = 15;
      
      doc.image(logoPath, logoX, logoY, { width: logoSize, height: logoSize });
      
      // Draw brand text below the logo icon
      doc.save();
      doc.font("Times-Bold").fontSize(7.5).fillColor("#1e3a8a");
      doc.text("SPESHWAY", logoX - 15, logoY + logoSize + 4, { align: "center", width: logoSize + 30, characterSpacing: 1.5 });
      
      doc.font("Times-Bold").fontSize(6.5).fillColor("#4b5563");
      doc.text("SOLUTIONS", logoX - 15, logoY + logoSize + 12, { align: "center", width: logoSize + 30, characterSpacing: 0.8 });
      doc.restore();
    }
  } catch (err) {
    console.error("Error drawing logo in header:", err);
  }
  
  // Footer
  const footerY = pageHeight - 65;
  doc.strokeColor("#cccccc").lineWidth(0.5);
  doc.moveTo(50, footerY).lineTo(pageWidth - 50, footerY).stroke();
  
  doc.font("Times-Bold").fontSize(8.5).fillColor("#1e3a8a").text("SPESHWAY SOLUTIONS PVT. LTD", 0, footerY + 8, {
    align: "center",
    width: pageWidth,
    lineBreak: false
  });
  
  doc.font("Times-Roman").fontSize(7.5).fillColor("#4b5563").text("Plot No 1/C, Sy No 83/1, Raidurgam Knowledge City Rd, Panmaktha Hyderabad, Serilingampalle (M), Rai Durg, Telangana 500081.", 0, footerY + 18, {
    align: "center",
    width: pageWidth,
    lineBreak: false
  });
  
  doc.font("Times-Roman").fontSize(7.5).fillColor("#2563eb").text("Email: info@speshway.com  |  www.speshway.com", 0, footerY + 28, {
    align: "center",
    width: pageWidth,
    lineBreak: false
  });
  
  doc.font("Times-Roman").fontSize(7).fillColor("#9ca3af").text(`${pageNum}`, pageWidth - 65, pageHeight - 20, { align: "right", lineBreak: false });

  doc.page.margins.bottom = savedBottomMargin;
  doc.y = savedY;
};

/**
 * Draw Annexure Table with Documents A-L
 */
const drawAnnexureTable = (doc, startY) => {
  const pageWidth = doc.page.width;
  const startX = 50;
  const tableWidth = pageWidth - 100;
  const col1Width = 25;
  const col2Width = tableWidth - col1Width;
  
  const rows = [
    ["A", "Original copy of Speshway offer letter"],
    ["B", "DATE OF BIRTH PROOF: Mandatory is Aadhar Card. If no Aadhar Card or incomplete details on Aadhar card then the following will apply- (Any ONE of the following: Birth Certificate, Xth, XIIth Mark Sheet with DOB details on it, Passport, PAN Card, Driving License, School/College Leaving Certificate) - 1 copy"],
    ["C", "PHOTO ID: Aadhar OR PAN Card in the absence of both then the following will apply- (ONE of the following: Voters ID, Driving License, Passport, or Bank Passbook with photograph, Banker verification, NSR (National Skills Registry) ID card - 1copy"],
    ["D", "PERMANENT ADDRESS PROOF: (ONE of the following: Passport, Driving License, Voter’s ID Nationalized Bank Passbook with photograph and address, Electricity Bill - latest of Self or Parent Ration Card, LIC & Insurance documents, Mobile Bill, Telephone Landline Bill – latest of Self Parents, or Current lease deed – with you or your parents / spouse as lessee or co-lessee) - 1 copy. The information for address needs to be verifiable during BGV and hence the same needs to be the latest permanent address proof."],
    ["E", "EDUCATION QUALIFICATION PROOF: (mark sheets & degree are important) (as applicable: Xth, XIIth, Graduation, Post-Graduation Certificate, Copy of Diploma, others)"],
    ["F", "PASSPORT SIZE PHOTOGRAPHS: 5 copies (with White Background ONLY)"],
    ["G", "PAN NUMBER: Photocopy of PAN Card. If you do not possess a PAN card then an application for one will have to be made and a copy of the application receipt will have to be submitted."],
    ["H", "Professional Relieving or Experience Letter from previous employer (last 2 employments) or Accepted Resignation Letter from previous employer."],
    ["I", "Salary Slip / Salary certificate from previous employer (last 2 employments). Bank statement if no salary slips from the Company."],
    ["J", "Employee ID Proof: (photocopy of salary slips, appraisal letter which contains the employee id proof)"],
    ["K", "Marriage Certificate (if applicable) OR Marriage Affidavit with Couple Photo"],
    ["L", "Self-declaration Medical Fitness form: Medical Fitness form needs to be duly filled and stamped by a Doctor."]
  ];
  
  let currentY = startY;
  
  doc.strokeColor("#9ca3af").lineWidth(0.5);
  doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).stroke();
  
  rows.forEach(([col1, col2]) => {
    doc.font("Times-Roman").fontSize(8.5);
    const textHeight = doc.heightOfString(col2, startX + col1Width + 5, currentY + 6, { width: col2Width - 10 });
    const rowHeight = Math.max(textHeight + 12, 24);
    
    doc.moveTo(startX, currentY).lineTo(startX, currentY + rowHeight).stroke();
    doc.moveTo(startX + col1Width, currentY).lineTo(startX + col1Width, currentY + rowHeight).stroke();
    doc.moveTo(startX + tableWidth, currentY).lineTo(startX + tableWidth, currentY + rowHeight).stroke();
    
    doc.font("Times-Bold").fontSize(8.5).fillColor("#1f2937").text(col1, startX + 8, currentY + 6);
    doc.font("Times-Roman").fontSize(8.5).fillColor("#374151").text(col2, startX + col1Width + 5, currentY + 6, { width: col2Width - 10, align: "justify" });
    
    currentY += rowHeight;
    doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).stroke();
  });
};

/**
 * Draw Salary Breakdown Table
 */
const drawSalaryBreakdownTable = (doc, startY, candidate, profile) => {
  const pageWidth = doc.page.width;
  const startX = 50;
  const tableWidth = pageWidth - 100;
  const colWidth = tableWidth / 3;
  
  let salaryLPA = 6.5;
  if (candidate.ctc) {
    salaryLPA = candidate.ctc / 100000;
  } else if (profile?.professionalDetails?.currentSalary) {
    const current = Number(profile.professionalDetails.currentSalary);
    if (current > 0) {
      if (current < 50) {
        salaryLPA = current * 1.20;
      } else if (current > 100000) {
        salaryLPA = (current * 1.20) / 100000;
      } else {
        salaryLPA = (current * 12 * 1.20) / 100000;
      }
    }
  }
  const breakdown = calculateSalaryBreakdown(salaryLPA * 100000);
  
  const fmt = (val) => Math.round(val).toLocaleString("en-IN");
  
  const rows = [
    ["BASIC", fmt(breakdown.monthly.basic), fmt(breakdown.annual.basic)],
    ["Dearness Allowance", fmt(breakdown.monthly.da), fmt(breakdown.annual.da)],
    ["House Rent Allowance", fmt(breakdown.monthly.hra), fmt(breakdown.annual.hra)],
    ["Conveyance", fmt(breakdown.monthly.conveyance), fmt(breakdown.annual.conveyance)],
    ["Medical Expenses", fmt(breakdown.monthly.medical), fmt(breakdown.annual.medical)],
    ["Special", fmt(breakdown.monthly.special), fmt(breakdown.annual.special)],
    ["Total Gross salary", fmt(breakdown.monthly.total), fmt(breakdown.annual.total)]
  ];
  
  let currentY = startY;
  
  doc.strokeColor("#9ca3af").lineWidth(0.5);
  doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).stroke();
  
  const metaRows = [
    ["NAME", candidate.fullName],
    ["DESIGNATION", candidate.designation || candidate.position || "Software Engineer"],
    ["LOCATION", "HYDERABAD"]
  ];
  
  metaRows.forEach(([col1, col2]) => {
    const rowHeight = 32;
    doc.moveTo(startX, currentY).lineTo(startX, currentY + rowHeight).stroke();
    doc.moveTo(startX + colWidth, currentY).lineTo(startX + colWidth, currentY + rowHeight).stroke();
    doc.moveTo(startX + tableWidth, currentY).lineTo(startX + tableWidth, currentY + rowHeight).stroke();
    
    doc.font("Times-Bold").fontSize(9.5).fillColor("#1f2937").text(col1, startX + 10, currentY + 11);
    doc.font("Times-Bold").text(col2, startX + colWidth + 10, currentY + 11);
    
    currentY += rowHeight;
    doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).stroke();
  });
  
  const headerHeight = 28;
  doc.moveTo(startX, currentY).lineTo(startX, currentY + headerHeight).stroke();
  doc.moveTo(startX + colWidth, currentY).lineTo(startX + colWidth, currentY + headerHeight).stroke();
  doc.moveTo(startX + colWidth * 2, currentY).lineTo(startX + colWidth * 2, currentY + headerHeight).stroke();
  doc.moveTo(startX + tableWidth, currentY).lineTo(startX + tableWidth, currentY + headerHeight).stroke();
  
  doc.font("Times-Bold").fontSize(9.5).fillColor("#1f2937");
  doc.text("Per Month", startX + colWidth + 10, currentY + 9);
  doc.text("Per Annum", startX + colWidth * 2 + 10, currentY + 9);
  
  currentY += headerHeight;
  doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).stroke();
  
  rows.forEach(([comp, pm, pa], idx) => {
    const rowHeight = 26;
    const isTotalRow = idx === rows.length - 1;
    
    doc.moveTo(startX, currentY).lineTo(startX, currentY + rowHeight).stroke();
    doc.moveTo(startX + colWidth, currentY).lineTo(startX + colWidth, currentY + rowHeight).stroke();
    doc.moveTo(startX + colWidth * 2, currentY).lineTo(startX + colWidth * 2, currentY + rowHeight).stroke();
    doc.moveTo(startX + tableWidth, currentY).lineTo(startX + tableWidth, currentY + rowHeight).stroke();
    
    if (isTotalRow) {
      doc.font("Times-Bold").fontSize(9.5).fillColor("#111827");
    } else {
      doc.font("Times-Roman").fontSize(9).fillColor("#374151");
    }
    
    doc.text(comp, startX + 10, currentY + 8);
    doc.text(pm, startX + colWidth + 10, currentY + 8);
    doc.text(pa, startX + colWidth * 2 + 10, currentY + 8);
    
    currentY += rowHeight;
    doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).stroke();
  });
  doc.y = currentY;
};

/**
 * Shared function to draw Offer Letter PDF content
 */
const generateOfferLetterPDFContent = (doc, candidate, profile) => {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Formatting dates
  const dateObj = new Date(candidate.offerDate || candidate.verificationDate || candidate.createdAt || Date.now());
  const dateStr = dateObj.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).replace(/ /g, "-"); // e.g. 26-May-2025

  const joiningDateVal = candidate.joiningDate ? new Date(candidate.joiningDate) : null;
  const joiningDate = joiningDateVal && !isNaN(joiningDateVal.getTime()) ? joiningDateVal : (() => {
    const d = new Date(dateObj);
    d.setDate(d.getDate() + 14);
    return d;
  })();

  const day = joiningDate.getDate();
  const monthName = joiningDate.toLocaleDateString("en-IN", { month: "long" });
  const year = joiningDate.getFullYear();
  
  let suffix = "th";
  if (day === 1 || day === 21 || day === 31) suffix = "st";
  else if (day === 2 || day === 22) suffix = "nd";
  else if (day === 3 || day === 23) suffix = "rd";
  
  const joiningDateOrdinal = `${day}${suffix} ${monthName} ${year}`;
  const joiningDateDashed = `${String(day).padStart(2, '0')}-${String(joiningDate.getMonth() + 1).padStart(2, '0')}-${joiningDate.getFullYear()}`;

  const designation = candidate.designation || candidate.position || "Software Engineer";
  let reportingTime = candidate.reportingTime || "11:00 AM";
  if (reportingTime && reportingTime.includes(":") && !reportingTime.toLowerCase().includes("am") && !reportingTime.toLowerCase().includes("pm")) {
    const parts = reportingTime.split(":");
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1].substring(0, 2);
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      reportingTime = `${String(displayHours).padStart(2, "0")}:${minutes} ${ampm}`;
    }
  }

  // CTC Calculations
  let salaryLPA = 6.5; // default 6.5 LPA
  if (candidate.ctc) {
    salaryLPA = candidate.ctc / 100000;
  } else if (profile?.professionalDetails?.currentSalary) {
    const current = Number(profile.professionalDetails.currentSalary);
    if (current > 0) {
      if (current < 50) {
        salaryLPA = current * 1.20;
      } else if (current > 100000) {
        salaryLPA = (current * 1.20) / 100000;
      } else {
        salaryLPA = (current * 12 * 1.20) / 100000;
      }
    }
  }
  const annualCTC = salaryLPA * 100000;
  const ctcInWords = convertNumberToIndianWords(annualCTC);
  const formattedRemuneration = `Rs ${annualCTC.toLocaleString("en-IN")}/- (${ctcInWords} only)`;

  // Ref ID
  const refId = `SS${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getFullYear()).slice(-2)}HYD${candidate.candidateId ? candidate.candidateId.replace("CAN", "") : "703"}`;

  // Helper for margins
  const marginX = 50;
  const contentWidth = pageWidth - 100; // margins 50 on left and right

  // ==========================================
  // PAGE 1
  // ==========================================
  drawWatermark(doc);
  drawPageTemplate(doc, 1, 7);

  let y = 80;
  doc.font("Times-Bold").fontSize(10).fillColor("#1f2937").text(dateStr, marginX, y);
  y += 20;

  doc.font("Times-Bold").text(`Ref:${refId}`, marginX, y);
  y += 20;

  doc.font("Times-Bold").text(`Mr.${candidate.fullName.toUpperCase()}`, marginX, y);
  y += 40;

  doc.font("Times-Bold").fontSize(11).fillColor("#1e3a8a").text("CONFIDENTIAL – OFFER OF EMPLOYMENT", marginX, y, { align: "center", width: contentWidth });
  y += 30;

  doc.font("Times-Bold").fontSize(10).fillColor("#1f2937").text(`Dear ${candidate.fullName},`, marginX, y);
  y += 20;

  doc.font("Times-Roman").fontSize(9.5).fillColor("#374151");
  doc.text("Welcome to Speshway Solutions Pvt Ltd.", marginX, y);
  y += 18;

  doc.font("Times-Bold").text("Congratulations! We Welcome you on Board.", marginX, y);
  y += 22;

  doc.font("Times-Roman").text("With reference to your application and subsequent interview, we accept to make you an offer with ", marginX, y, { width: contentWidth, align: "justify", lineGap: 3, continued: true });
  doc.font("Times-Bold").text("Speshway Solutions Pvt. Ltd ", { continued: true });
  doc.font("Times-Roman").text("as ", { continued: true });
  doc.font("Times-Bold").text(`${designation}. `, { continued: true });
  doc.font("Times-Roman").text("You are required to ", { continued: true });
  doc.font("Times-Bold").text(`Report on ${joiningDateDashed} at ${reportingTime}; `, { continued: true });
  doc.font("Times-Roman").text("at the address: ", { continued: true });
  doc.font("Times-Bold").text("SPESHWAY SOLUTIONS PVT LTD., ", { continued: true });
  doc.font("Times-Roman").text("Plot No 1/C, Sy No 83/1, Raidurgam Knowledge City Rd, Panmaktha Hyderabad, Serilingampalle (M), Rai Durg, Telangana 500081.");
  
  y = doc.y + 15;

  doc.font("Times-Roman").text("Your post carries an initial remuneration of ", marginX, y, { width: contentWidth, align: "justify", continued: true });
  doc.font("Times-Bold").text(`${formattedRemuneration} `, { continued: true });
  doc.font("Times-Roman").text("per annum. Please refer ", { continued: true });
  doc.font("Times-Bold").text("Annexure ", { continued: true });
  doc.font("Times-Roman").text("for details on the compensation.");
  
  y = doc.y + 18;

  doc.font("Times-Bold").text("Acceptance Terms:", marginX, y);
  y += 18;

  doc.font("Times-Roman").text("Your appointment will be effective on your Joining date, i.e., ", marginX, y, { width: contentWidth, align: "justify", lineGap: 2, continued: true });
  doc.font("Times-Bold").text(`${joiningDateDashed}. `, { continued: true });
  doc.font("Times-Roman").text("Please contact us immediately if you require an alternative Joining date. If you do not confirm your acceptance or we are unable to set an alternative date, this offer will be withdrawn.");
  
  y = doc.y + 15;

  doc.font("Times-Roman").text("Please see the employment terms and conditions noted in this letter and the annexure for details related to your compensation structure. Once you have reviewed the letter in full, please sign each page of this letter in acceptance of the employment terms and conditions.", marginX, y, { width: contentWidth, align: "justify", lineGap: 2 });
  
  y = doc.y + 18;

  doc.font("Times-Roman").text("We very much look forward to welcoming you to ", marginX, y, { width: contentWidth, align: "justify", continued: true });
  doc.font("Times-Bold").text("SPESHWAY SOLUTIONS.");

  // ==========================================
  // PAGE 2
  // ==========================================
  doc.addPage();
  drawWatermark(doc);
  drawPageTemplate(doc, 2, 7);
  
  y = 80;
  doc.font("Times-Bold").fontSize(10).fillColor("#1f2937").text("Date of Joining:", marginX, y);
  y += 18;
  doc.font("Times-Roman").fontSize(9.5).fillColor("#374151").text("If you accept this offer before the stipulated date you must report on duty and commence your job not later than ", marginX, y, { width: contentWidth, align: "justify", lineGap: 2, continued: true });
  doc.font("Times-Bold").text(`${joiningDateOrdinal}. `, { continued: true });
  doc.font("Times-Roman").text("In case you do not report on the agreed upon date, Speshway may deem that you have declined this offer.");
  
  y = doc.y + 20;
  doc.font("Times-Bold").fillColor("#1f2937").text("Office Hours:", marginX, y);
  y += 18;
  doc.font("Times-Roman").fillColor("#374151").text("Our usual office hours are of 9-hours duration every day, Monday to Friday, with one hour normally allowed for lunch. Your office hours can change in the future since we support work requirements across different time zones globally", marginX, y, { width: contentWidth, align: "justify", lineGap: 2 });

  y = doc.y + 20;
  doc.font("Times-Bold").fillColor("#1f2937").text("Training:", marginX, y);
  y += 18;
  doc.font("Times-Roman").fillColor("#374151").text("You will hold yourself in readiness for any training at any place whenever required. Such training would be imparted to you at the company’s expense. Kindly note that refusal to participate in a training Program without any extraneous circumstances would lead to automatic termination of your employment.", marginX, y, { width: contentWidth, align: "justify", lineGap: 2 });

  y = doc.y + 20;
  doc.font("Times-Bold").fillColor("#1f2937").text("Secrecy/Confidentiality:", marginX, y);
  y += 18;
  doc.font("Times-Roman").fillColor("#374151").text("You will not during the course of your employment with the company or at any time there after divulge or disclose to any person whomsoever, make any use whatsoever for your own purpose or for any other purpose other than that of the company, of any information or knowledge obtained by you during your employment as to the business or affairs of the company including development, process reports and reporting system and you will during the course of your employment here under also use your best endeavour to prevent any other person from doing so.", marginX, y, { width: contentWidth, align: "justify", lineGap: 2 });

  y = doc.y + 22;
  doc.font("Times-Bold").fillColor("#1f2937").text("This offer letter and your employment with the company are subject to:", marginX, y);
  y += 18;
  doc.font("Times-Roman").fillColor("#374151").text("Satisfactory results of a complete background and reference check carried out by the company.", marginX, y, { width: contentWidth });
  y += 15;
  doc.text("You are required to sign of Employment Agreement, Non-Disclosure & Non-Compete Agreement and the annexure annexed herewith (if applicable). Please note that in the event it is found that you have not complied with these conditions, your employment can be terminated forthwith by the company without any notice period or compensation and without any reasons thereof.", marginX, y, { width: contentWidth, align: "justify", lineGap: 2 });

  // ==========================================
  // PAGE 3
  // ==========================================
  doc.addPage();
  drawWatermark(doc);
  drawPageTemplate(doc, 3, 7);

  y = 80;
  doc.font("Times-Bold").fontSize(10).fillColor("#1f2937").text("Assignments/Transfer/Deputation:", marginX, y);
  y += 18;
  doc.font("Times-Roman").fontSize(9.5).fillColor("#374151").text("Your will be initially based in ", marginX, y, { width: contentWidth, align: "justify", lineGap: 2, continued: true });
  doc.font("Times-Bold").text("Hyderabad. ", { continued: true });
  doc.font("Times-Roman").text("However, ", { continued: true });
  doc.font("Times-Bold").text("SPESHWAY SOLUTIONS, ", { continued: true });
  doc.font("Times-Roman").text("at its discretion can transfer you to any of its subsidiary or affiliate company or client offices in India or overseas. In such cases, your employment may be governed by the terms and conditions applicable at the new location/ company.");

  y = doc.y + 20;
  doc.font("Times-Bold").fillColor("#1f2937").text("Verification of particulars:", marginX, y);
  y += 18;
  doc.font("Times-Roman").fillColor("#374151").text("You acknowledge and agree that the company has offered you employment based on the specific information and records furnished by you. All particulars furnished by you vide your application are taken to be true and correct. In case any of these particulars turn out to be false or incorrect on verification, the company may at this absolute discretion elect to terminate or suspend your services without any notice or assigning any reason thereof.", marginX, y, { width: contentWidth, align: "justify", lineGap: 2 });

  y = doc.y + 20;
  doc.font("Times-Bold").fillColor("#1f2937").text("Termination of Employment:", marginX, y);
  y += 18;
  doc.font("Times-Roman").fillColor("#374151").text("A) During the initial Probation period as mentioned in Offer letter, your performance would be closely monitored and if your performance is not up to the mark, The Company reserves the right to terminate your services without prior notice.", marginX, y, { width: contentWidth, align: "justify" });
  y = doc.y + 12;
  doc.text("B) Unauthorized absence or absence without permission from duty for a continuous period of 7 working days would make you lose your lien on employment. In such case your employment shall automatically come to an end without any notice of termination or notice Pay.", marginX, y, { width: contentWidth, align: "justify" });
  y = doc.y + 12;
  doc.text("C) You will be governed by the laid down code of conduct of the company and if there is any breach of the same or non-conformance of contractual obligation or with the terms and conditions laid down in this agreement, your service can be terminated without any notice; notwithstanding any other terms and conditions stipulated herein the company reserves the right to invoke other legal remedies as it deems fit to protect its legitimate interest.", marginX, y, { width: contentWidth, align: "justify", lineGap: 2 });
  y = doc.y + 12;
  doc.text("You have to agree client Package and location after Your probation period (company Client or other company, Pan India Locations), otherwise company will terminate you.", marginX, y, { width: contentWidth, align: "justify" });

  y = doc.y + 20;
  doc.font("Times-Bold").fillColor("#1f2937").text("Mandatory period of service:", marginX, y);
  y += 18;
  doc.font("Times-Roman").fillColor("#374151").text("In consideration of impartation of Probation, you shall work in the Company at least for a period of 12 months from the date of successful completion of Probation period.", marginX, y, { width: contentWidth, align: "justify" });
  y = doc.y + 10;
  doc.text("During such period of Probation (including on job training) and Mandatory Period of Service of 12 months thereafter, you shall not leave, abandon or resign from the services of the Company.", marginX, y, { width: contentWidth, align: "justify", lineGap: 2 });

  // ==========================================
  // PAGE 4
  // ==========================================
  doc.addPage();
  drawWatermark(doc);
  drawPageTemplate(doc, 4, 7);

  y = 80;
  doc.font("Times-Bold").fontSize(10).fillColor("#1f2937").text("Leave Policy:", marginX, y);
  y += 18;
  doc.font("Times-Roman").fontSize(9.5).fillColor("#374151").text("Employee under probation is not entitled for any leave. After successful completion of probation, an employee is entitled for 01-day casual leave for every completed month. However, an employee should not avail more than 03 days of accumulated leave at a time. Leave application must be applied on hr@speshway.com at least 3 days prior to the date of availing the leave. Any absence without proper approval from the competent authority of the company will lead to deduction in the pay and also disciplinary action as per the existing rules of the company.", marginX, y, { width: contentWidth, align: "justify", lineGap: 2.5 });

  y = doc.y + 20;
  doc.font("Times-Bold").fillColor("#1f2937").text("Code of conduct:", marginX, y);
  y += 18;
  doc.font("Times-Roman").fillColor("#374151").text("A) Your individual remuneration is purely a matter between yourself and the company and has been arrived at based on your job, skills, specific background and professional merit. Accordingly, any changes made to it your salary are strictly confidential. You shall treat such matters accordingly, and any breach thereof would be viewed very seriously.", marginX, y, { width: contentWidth, align: "justify", lineGap: 2 });
  y = doc.y + 12;
  doc.text("B) You shall maintain proper discipline and dignity of your office and shall deal with all matter with sobriety.", marginX, y, { width: contentWidth });
  y = doc.y + 12;
  doc.text("C) You shall inform the company of any changes in your personal data within three days of the occurrence of such change.", marginX, y, { width: contentWidth });
  y = doc.y + 12;
  doc.text("D) your salary would count from your training starting date.", marginX, y, { width: contentWidth });
  y = doc.y + 12;
  doc.text("E) in your Reporting time you must submit Education Documents, Aadhar card and Pan Card at the time of reporting, you must submit. Non-Submission of the same may lead to cancellation of the offer letter.", marginX, y, { width: contentWidth, align: "justify", lineGap: 2 });

  y = doc.y + 20;
  doc.font("Times-Bold").fillColor("#1f2937").text("Other Conditions:", marginX, y);
  y += 18;
  doc.font("Times-Roman").fillColor("#374151").text("I. The company expects you to work with a high standard of initiative, efficiency and economy.", marginX, y, { width: contentWidth });
  y = doc.y + 10;
  doc.text("II. You will devote your entire time to the work of the company and will not directly/ indirectly undertake any business or work for any company or entity or person other than SPESHWAY SOLUTIONS PVT LTD.", marginX, y, { width: contentWidth, align: "justify" });
  y = doc.y + 10;
  doc.text("III. Company is not encouraging backdoor jobs and whatever the company is charging is for training and salary in probation period. After completion of training if you qualified in the assignment then you will be deployed into live projects or client location of the company.", marginX, y, { width: contentWidth, align: "justify", lineGap: 2 });
  y = doc.y + 12;
  doc.text("You will be responsible for the safekeeping and return in good condition and order all the property of the company which is in your possession, use, custody or charge. You shall make good of any loss or damage that occurs to any company property which is in your possession/ custody.", marginX, y, { width: contentWidth, align: "justify", lineGap: 2 });

  // ==========================================
  // PAGE 5
  // ==========================================
  doc.addPage();
  drawWatermark(doc);
  drawPageTemplate(doc, 5, 7);

  y = 80;
  doc.font("Times-Bold").fontSize(11).fillColor("#1e3a8a").text("Annexure - I", marginX, y, { align: "center", width: contentWidth });
  y += 25;
  
  doc.font("Times-Roman").fontSize(9.5).fillColor("#374151").text("1. You need to furnish the following Documents at the time of joining Speshway.", marginX, y);
  y += 20;

  doc.font("Times-Bold").fillColor("#ef4444").text("NOTE: Joining will not happen without these documents.", marginX, y);
  y += 25;

  drawAnnexureTable(doc, y);

  // ==========================================
  // PAGE 6
  // ==========================================
  doc.addPage();
  drawWatermark(doc);
  drawPageTemplate(doc, 6, 7);

  y = 80;
  doc.font("Times-Bold").fontSize(11).fillColor("#1e3a8a").text("Annexure - II", marginX, y, { align: "center", width: contentWidth });
  y += 30;

  drawSalaryBreakdownTable(doc, y, candidate, profile);
  
  y = doc.y + 45;
  doc.font("Times-Bold").fontSize(8.5).fillColor("#1f2937").text("Salary:", marginX, y, { width: contentWidth, align: "justify", lineGap: 2, continued: true });
  doc.font("Times-Roman").fontSize(8).fillColor("#4b5563").text(" Your salary will be paid monthly through bank transfer, for which you would be required to open a Bank A/c with any of the Company specified Bank/s. Disbursement of Salary is subject to your regular attendance, submission and updating of Permanent Account Number (PAN) details in the Company's records. Variable pay is different from the package mentioned below");

  y = doc.y + 40;
  doc.font("Times-Bold").fontSize(9.5).fillColor("#1f2937").text("Signature:", marginX, y);

  // ==========================================
  // PAGE 7
  // ==========================================
  doc.addPage();
  drawWatermark(doc);
  drawPageTemplate(doc, 7, 7);

  y = 80;
  doc.font("Times-Bold").fontSize(10).fillColor("#1f2937").text("Amendments:", marginX, y);
  y += 18;
  doc.font("Times-Roman").fontSize(9.5).fillColor("#374151").text("The Company, at its discretion, may alter, replace or annul any of the above, should circumstances so warrant either as a result of statute or otherwise. All changes will duly be updated on the company intranet and will be duly notified to the employees through proper channels. should have to follow the company rules Time-Time.", marginX, y, { width: contentWidth, align: "justify", lineGap: 2 });
  y = doc.y + 15;
  doc.text("If you agree to accept this position, please notify in writing by signing your name and mentioning the date of joining at the bottom of this page indicating your acceptance of this appointment. A copy of this letter will be provided to you.", marginX, y, { width: contentWidth, align: "justify", lineGap: 2 });
  y = doc.y + 15;
  doc.text("Irrespective of whether you join ", marginX, y, { width: contentWidth, align: "justify", lineGap: 2, continued: true });
  doc.font("Times-Bold").text("Speshway Solutions Pvt. Ltd ", { continued: true });
  doc.font("Times-Roman").text("or not, you shall keep all the details contained in this letter confidential. please mark all of your correspondence \"Confidential\"");

  y = doc.y + 35;
  doc.font("Times-Roman").fontSize(10).fillColor("#1f2937").text("I ", marginX, y, { width: contentWidth, align: "justify", lineGap: 2, continued: true });
  doc.font("Times-Bold").text(`Mr. ${candidate.fullName.toUpperCase()}`, { continued: true });
  doc.font("Times-Roman").text(", take this opportunity to welcome you to ", { continued: true });
  doc.font("Times-Bold").text("Speshway Solutions Pvt Ltd");

  y = doc.y + 25;
  doc.font("Times-Bold").text("Acceptance", marginX, y);
  y += 20;

  doc.font("Times-Roman").text("I ", marginX, y, { width: contentWidth, align: "justify", lineGap: 2, continued: true });
  doc.font("Times-Bold").text(`Mr. ${candidate.fullName.toUpperCase()}`, { continued: true });
  doc.font("Times-Roman").text(", hereby confirm acceptance of all of the above terms and conditions, and will join.");

  y = doc.y + 70;
  doc.font("Times-Bold").fontSize(10).text("Signature", marginX, y);
  doc.text("Date:", pageWidth - 170, y, { align: "right", width: 120 });
};

/**
 * Generate Offer Letter PDF as buffer
 */
export const generateOfferLetterPDFBuffer = async (candidate, profile) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      generateOfferLetterPDFContent(doc, candidate, profile);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
