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
    status: { type: String, default: "Pending" }, 
    username: { type: String }, 
    durationMinutes: Number, 
    firstAccessTime: Number, 
    mode: { type: String, enum: ["window", "duration"], default: "window" }, 
    pdfSource: { type: String, enum: ["ephemeral", "library"], default: "ephemeral" },
    libraryPdfId: { type: mongoose.Schema.Types.ObjectId, ref: "LibraryPdf" },
    expireAt: { type: Date, default: null },     
    deleteAfter: { type: Date, index: { expireAfterSeconds: 0 } },  
    accessLog: [
      {
        timestamp: Number, 
        username: String,
      },
    ],
    
    // 🔥 BAS YEH EK LINE MISSING THI 🔥
    createdBy: { type: String, default: "admin" } 
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Link", LinkSchema);