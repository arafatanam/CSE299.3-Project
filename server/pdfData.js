const mongoose = require("mongoose");

const PdfDataSchema = new mongoose.Schema(
  {
    pdf: String,
    pdfdata: String,
  },
  { collection: "PdfData" }
);

mongoose.model("PdfData", PdfDataSchema);