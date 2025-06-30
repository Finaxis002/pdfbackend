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
