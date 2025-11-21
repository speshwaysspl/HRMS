// server/utils/pdfGenerator.js
import PDFDocument from "pdfkit";
import axios from "axios";
import numberToWords from "number-to-words";
import fs from "fs";

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
  const logoPath = "./assets/logo.png";
  let logoBuffer = null;
  try {
    logoBuffer = fs.readFileSync(logoPath);
  } catch (err) {
    console.error("Error loading local logo:", err.message);
    logoBuffer = null;
  }

  doc.rect(20, cursorY, pageWidth - 40, 70).stroke();

  if (logoBuffer) {
    doc.image(logoBuffer, 30, cursorY + 2, { width: 70 });
  }

  doc
    .font("Times-Bold")
    .fontSize(16)
    .text("SPESHWAY SOLUTIONS PVT LTD", 0, cursorY + 19, {
      align: "center",
      width: pageWidth,
    });

  doc
    .font("Times-Roman")
    .fontSize(10)
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
  const valueLeftX = 130;
  const labelRightX = pageWidth / 2 + 5;
  const valueRightX = pageWidth - 130;
  const lineSpacing = 15;
  let y = cursorY + 10;

  // Handle employeeId field - it can be a string or an object with employeeId property
  const employeeNumber = salary.employeeId?.employeeId || salary.employeeId || "-";
  
  const fields = [
    ["Name", salary.name, "Employee No", employeeNumber],
    ["Joining Date", new Date(salary.joiningDate).toLocaleDateString("en-IN"), "Bank Name", salary.bankname || "-"],
    ["Designation", salary.designation || "-", "Bank Account No", salary.bankaccountnumber || "-"],
    ["Department", salary.department || "-", "PAN No", salary.pan || "-"],
    ["Work Days", salary.workingdays || 0, "UAN No", salary.uan || "-"],
    ["LOP Days", salary.lopDays || 0, "", ""],
  ];

  fields.forEach(([labelL, valueL, labelR, valueR]) => {
    doc.font("Times-Roman").text(`${labelL}:`, labelLeftX, y);
    doc.font("Times-Roman").text(valueL, valueLeftX, y);

    if (labelR) {
      doc.font("Times-Roman").text(`${labelR}:`, labelRightX, y);
      doc.font("Times-Roman").text(valueR, valueRightX, y);
    }
    y += lineSpacing;
  });

  cursorY += 100;

  /** -------------------- EARNINGS & DEDUCTIONS -------------------- **/
  const rowHeight = 18;
  const rowGap = 3;

  const earningsRows = [
    ["BASIC", salary.basicSalary],
    ["DA", salary.da],
    ["HRA", salary.hra],
    ["CONVEYANCE", salary.conveyance],
    ["MEDICAL ALLOWANCE", salary.medicalallowances],
    ["SPECIAL ALLOWANCE", salary.specialallowances],
    ["OTHER ALLOWANCE", salary.allowances],
  ];
  const deductionRows = [
    ["PROF TAX", salary.proftax],
    ["PF", salary.pf],
    ["LOSS OF PAY", salary.lopamount],
    ["OTHER DEDUCTIONS", salary.deductions],
  ];

  const maxRows = Math.max(earningsRows.length, deductionRows.length);
  const headerHeight = 20;
  const paddingBottom = 15;
  const sectionHeight = headerHeight + (maxRows * (rowHeight + rowGap)) + paddingBottom;
  doc.rect(20, cursorY, pageWidth - 40, sectionHeight).stroke();

  doc.font("Times-Bold").fontSize(10);
  doc.text("Earnings", 25, cursorY + 5);
  doc.text("Actual", 180, cursorY + 5);
  doc.text("Deductions", pageWidth / 2 + 5, cursorY + 5);
  doc.text("Actual", pageWidth - 130, cursorY + 5);

  let rowY = cursorY + headerHeight;
  const formatAmt = (amt) => Number(amt || 0).toFixed(0);

  for (let i = 0; i < Math.max(earningsRows.length, deductionRows.length); i++) {
    if (i < earningsRows.length) {
      const [label, val] = earningsRows[i];
      doc.font("Times-Roman").text(label, 25, rowY + 2);
      doc.text(formatAmt(val), 180, rowY + 2);
    }
    if (i < deductionRows.length) {
      const [label, val] = deductionRows[i];
      doc.text(label, pageWidth / 2 + 5, rowY + 2);
      doc.text(formatAmt(val), pageWidth - 130, rowY + 2);
    }
    rowY += rowHeight + 3;
  }

  /** -------------------- TOTALS -------------------- **/
  const totalEarnings =
    Number(salary.basicSalary || 0) +
    Number(salary.da || 0) +
    Number(salary.hra || 0) +
    Number(salary.conveyance || 0) +
    Number(salary.medicalallowances || 0) +
    Number(salary.specialallowances || 0) +
    Number(salary.allowances || 0);

  const totalDeductions =
    Number(salary.proftax || 0) +
    Number(salary.pf || 0) +
    Number(salary.lopamount || 0) +
    Number(salary.deductions || 0);

  const netPay = totalEarnings - totalDeductions;

  const gapBelowBox = 18;
  const totalsY = cursorY + sectionHeight + gapBelowBox;
  doc
    .font("Times-Bold")
    .fontSize(10)
    .text(`Total Earnings: ${formatCurrency(totalEarnings)}`, 25, totalsY)
    .text(`Total Deductions: ${formatCurrency(totalDeductions)}`, pageWidth / 2 + 5, totalsY);

  const netY = totalsY + 25;
  doc
    .font("Times-Italic")
    .fontSize(12)
    .text(`Net Pay for the month: ${formatCurrency(netPay)}`, 25, netY)
    .font("Times-Italic")
    .fontSize(10)
    .text(`(${toWords(netPay).replace(/\b\w/g, (c) => c.toUpperCase())} Rupees Only)`, 25, netY + 15);

  doc
    .fontSize(12)
    .font("Times-Roman")
    .text("This is a system generated and does not require signature", 0, netY + 80, {
      width: pageWidth,
      align: "center",
    });

  /** -------------------- FOOTER -------------------- **/
  
    
};

/**
 * Generate PDF and stream to response
 */
export const generateSalaryPDF = async (res, salary) => {
  const fileName = `Payslip_${salary?.employeeId?.employeeId || salary?.employeeId}_${
    new Date(salary.payDate).toISOString().split("T")[0]
  }.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({ size: "A4", margin: 20 });
  doc.pipe(res);

  generateSalaryPDFContent(doc, salary);

  doc.end();
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
