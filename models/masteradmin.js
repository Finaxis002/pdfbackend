const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ["master", "sales", "admin"], 
    default: "sales" 
  },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Number, default: 0 }
}, { timestamps: true }); 

module.exports = mongoose.model("masteradmin", userSchema);