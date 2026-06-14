import PDFDocument from "pdfkit";
import fs from "fs";

const run = async () => {
  try {
    const doc = new PDFDocument({ size: "A4" });
    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => {
      const buf = Buffer.concat(chunks);
      fs.writeFileSync("C:/Users/Lenovo/Downloads/speshway/HRMS/server/test_segoe_pdf.pdf", buf);
      console.log("Successfully generated test Segoe PDF!");
    });
    
    // Register Segoe UI Semibold as Arial-Medium and Segoe UI Bold as Arial-Bold
    doc.registerFont("Arial-Medium", "C:/Windows/Fonts/seguisb.ttf");
    doc.registerFont("Arial-Bold", "C:/Windows/Fonts/segoeuib.ttf");
    
    doc.font("Arial-Medium").fontSize(11).fillColor("#374151");
    doc.text("This is Segoe UI Semibold (registered as Arial-Medium). It is natively somewhat bold!");
    
    doc.font("Arial-Bold").fontSize(11).fillColor("#111827");
    doc.text("This is Segoe UI Bold (registered as Arial-Bold). It is fully bold.");
    
    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};

run();
