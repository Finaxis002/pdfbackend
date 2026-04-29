const mongoose = require("mongoose");

const LibraryPdfSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    filePath: { type: String, required: true }, // absolute/relative path on disk or S3 key
    mimeType: { type: String, default: "application/pdf" },
    sizeBytes: { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: String, default: "admin" }, // 🔥 Sirf ye line add ki hai user filter ke liye
    assignedTo: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false }, // soft-delete only
  },
  { timestamps: true }
);

module.exports = mongoose.model("LibraryPdf", LibraryPdfSchema);