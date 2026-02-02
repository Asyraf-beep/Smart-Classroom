// lib/pdf.js
import PDFDocument from "pdfkit";

export function buildReportPdf(title, rows) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];

    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(18).text(title);
    doc.moveDown();

    doc.fontSize(12).text("Student ID | Name | Attendance % | Status");
    doc.moveDown(0.5);

    rows.forEach((r) => {
      doc.text(`${r.student_id} | ${r.name} | ${r.percent}% | ${r.status}`);
    });

    doc.end();
  });
}
