// server/utils/pdfGenerator.js
import PDFDocument from "pdfkit";
import axios from "axios";
import numberToWords from "number-to-words";

const { toWords } = numberToWords;
const formatCurrency = (val) => `INR ${Number(val || 0).toFixed(2)}`;

// Fetch remote image as buffer
const fetchLogoBuffer = async (url) => {
  try {
    const res = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(res.data, "binary");
  } catch (err) {
    console.error("Error fetching logo:", err.message);
    return null;
  }
};

export const generateSalaryPDF = async (res, salary) => {
  const fileName = `Payslip_${salary?.employeeId?.employeeId || salary?.employeeId}_${
    new Date(salary.payDate).toISOString().split("T")[0]
  }.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({ size: "A4", margin: 20 });
  doc.pipe(res);

  const pageWidth = doc.page.width;
  let cursorY = 20;

  /** -------------------- HEADER -------------------- **/
  // Use local logo file instead of remote URL to avoid 403 errors
  const logoPath = "./assets/logo.png";
  let logoBuffer = null;
  try {
    const fs = await import('fs');
    logoBuffer = fs.default.readFileSync(logoPath);
  } catch (err) {
    console.error("Error loading local logo:", err.message);
    logoBuffer = null;
  }

  // Draw outer rectangle for header
  doc.rect(20, cursorY, pageWidth - 40, 70).stroke();

  // Place logo on the left
  if (logoBuffer) {
    doc.image(logoBuffer, 30, cursorY + 2, { width: 70 });
  }

  // Center-aligned text block for company info
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

  const fields = [
    ["Name", salary.name, "Employee No", salary?.employeeId?.employeeId || "-"],
    ["Joining Date", new Date(salary.joiningDate).toLocaleDateString(), "Bank Name", salary.bankname || "-"],
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
  doc.rect(20, cursorY, pageWidth - 40, 140).stroke();

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
  ];

  doc.font("Times-Bold").fontSize(10);
  doc.text("Earnings", 25, cursorY + 5);
  doc.text("Actual", 180, cursorY + 5);
  doc.text("Deductions", pageWidth / 2 + 5, cursorY + 5);
  doc.text("Actual", pageWidth - 130, cursorY + 5);

  let rowY = cursorY + 20;
  const rowHeight = 18;
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
    Number(salary.specialallowances || 0);

  const totalDeductions =
    Number(salary.proftax || 0) +
    Number(salary.pf || 0) +
    Number(salary.lopamount || 0);

  const netPay = totalEarnings - totalDeductions;

  rowY += 5;
  doc
    .font("Times-Bold")
    .fontSize(10)
    .text(`Total Earnings: ${formatCurrency(totalEarnings)}`, 25, rowY)
    .text(`Total Deductions: ${formatCurrency(totalDeductions)}`, pageWidth / 2 + 5, rowY);

  rowY += 25;
 doc
  .font("Times-Italic") // Changed to italic
  .fontSize(12)
  .text(`Net Pay for the month: ${formatCurrency(netPay)}`, 25, rowY)
  .font("Times-Italic") // Italic again
  .fontSize(10)
  .text(
    `(${toWords(netPay).replace(/\b\w/g, c => c.toUpperCase())} Rupees Only)`,
    25,
    rowY + 15
  );


  doc
    .fontSize(12)
    .font("Times-Roman")
    .text(
      "This is a system generated and does not require signature",
      0,
      rowY + 80,
      {
        width: pageWidth,
        align: "center",
      }
    );

  /** -------------------- FOOTER -------------------- **/
  const pageHeight = doc.page.height;
  const bottomMargin = 20;

  doc.font("Times-Roman").fontSize(9).fillColor("#0066cc")
     .text("SPESHWAY SOLUTIONS PVT LTD", 0, pageHeight - bottomMargin - 80, {
         width: pageWidth,
         align: "center"
     });

  doc
    .font("Times-Italic")
   .fillColor("black")
     .text("Plot No 1/C, Syno 83/1, Raidurgam, Knowledge City Rd, Panmaktha", 0, pageHeight - bottomMargin - 70, {
         width: pageWidth,
         align: "center"
     });

  doc
   .font("Times-Italic")
  .text("Hyderabad Telangana 500081 | Email: info@speshway.com", 0, pageHeight - bottomMargin - 60, {
         width: pageWidth,
         align: "center"
     });

  doc.end();
};
