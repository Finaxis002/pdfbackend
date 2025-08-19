const mongoose = require("mongoose");

const LinkSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: String,
    fileName: String,
    password: String,
    startTime: Number,
    endTime: Number,
    filePath: String,
    status: { type: String, default: "Pending" }, // new field
    username: { type: String }, // new field
    durationMinutes: Number, // null/undefined if not using duration mode
    firstAccessTime: Number, // when the user first accesses the link (ms timestamp)
    mode: { type: String, enum: ["window", "duration"], default: "window" }, // distinguish mode
    // models/Link.js  (add these fields to your existing schema)
    pdfSource: { type: String, enum: ["ephemeral", "library"], default: "ephemeral" },
    libraryPdfId: { type: mongoose.Schema.Types.ObjectId, ref: "LibraryPdf" },

    // NEW: housekeeping
    expireAt: { type: Date, default: null },     // when link actually expires
    deleteAfter: { type: Date, default: null },  // expireAt + 7 days


    accessLog: [
      {
        // for tracking
        timestamp: Number, // ms since epoch
        username: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Link", LinkSchema);
