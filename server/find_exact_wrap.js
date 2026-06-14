import PDFDocument from "pdfkit";

const run = () => {
  const doc = new PDFDocument({ size: "A4" });
  doc.registerFont("Arial-Regular", "C:/Windows/Fonts/arial.ttf");
  doc.registerFont("Arial-Bold", "C:/Windows/Fonts/arialbd.ttf");
  
  const designation = "Associate Software Engineer";
  const joiningDateDashed = "19-06-2026";
  const reportingTime = "09:00 AM";
  
  const parts = [
    { text: "With reference to your application and subsequent interview, we accept to make you an offer with ", bold: false },
    { text: "Speshway Solutions Pvt. Ltd ", bold: true },
    { text: "as ", bold: false },
    { text: `${designation}. `, bold: true },
    { text: "You are required to ", bold: false },
    { text: `Report on ${joiningDateDashed} at ${reportingTime}; `, bold: true },
    { text: "at the address: ", bold: false },
    { text: "SPESHWAY SOLUTIONS PVT LTD., ", bold: true },
    { text: "Plot No.305, 2nd Floor, Sri Ayyappa Nilayam, Near CGR International Scool, Madhapur, Hyderabad-500081.", bold: false }
  ];

  const pageWidth = doc.page.width; // 595.28

  // We search margins from 40 to 60 (content widths from 475.28 to 515.28)
  // And font sizes from 9.0 to 11.0
  for (let margin = 40; margin <= 55; margin += 1) {
    const contentWidth = pageWidth - (margin * 2);
    for (let size = 9.0; size <= 11.0; size += 0.1) {
      // Let's simulate the wrapping
      let currentLine = "";
      const lines = [];
      
      parts.forEach(p => {
        doc.font(p.bold ? "Arial-Bold" : "Arial-Regular").fontSize(size);
        const words = p.text.split(" ");
        
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          if (!word && i > 0 && i < words.length - 1) continue; // skip double spaces
          const testLine = currentLine + (currentLine ? " " : "") + word;
          const testWidth = doc.widthOfString(testLine);
          
          if (testWidth > contentWidth) {
            lines.push(currentLine.trim());
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
      });
      if (currentLine) {
        lines.push(currentLine.trim());
      }
      
      // Check if it matches target wrapping:
      // Line 1 ends with "with"
      // Line 2 ends with "at"
      // Line 3 ends with "Nilayam,"
      if (lines.length === 4 && 
          lines[0].endsWith("with") && 
          lines[1].endsWith("at") && 
          lines[2].endsWith("Nilayam,")) {
        console.log(`FOUND MATCH! Margin: ${margin} (Width: ${contentWidth.toFixed(2)}), Font Size: ${size.toFixed(1)}`);
        console.log("Lines:");
        lines.forEach((l, idx) => console.log(`  Line ${idx+1}: ${l}`));
      }
    }
  }
};

run();
