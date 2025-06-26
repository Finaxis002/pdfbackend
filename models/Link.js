const mongoose = require("mongoose");

const LinkSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  fileName: String,
  password: String,
  startTime: Number,
  endTime: Number,
  filePath: String,
  status: { type: String, default: "Pending" }, // new field
}, {
  timestamps: true
});


module.exports = mongoose.model("Link", LinkSchema);
