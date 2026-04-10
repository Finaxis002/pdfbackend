const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    default: "" 
  },
  role: { 
    type: String, 
    default: "user"  // "sales" → "user"
  } 
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);