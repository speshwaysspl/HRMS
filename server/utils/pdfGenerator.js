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
