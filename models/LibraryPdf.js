// models/LibraryPdf.js
const mongoose = require("mongoose");

const LibraryPdfSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    filePath: { type: String, required: true }, // absolute/relative path on disk or S3 key
    mimeType: { type: String, default: "application/pdf" },
    sizeBytes: { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false }, // soft-delete only
  },
  { timestamps: true }
);

module.exports = mongoose.model("LibraryPdf", LibraryPdfSchema);
