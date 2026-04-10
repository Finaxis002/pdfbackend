const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const MasterAdmin = require("../models/masteradmin"); 
const User = require("../models/user"); 

// STRICT LOGIN ROUTE
router.post("/login", async (req, res) => {
  // 1. loginType ko destructure karein (frontend toggle se aayega)
  const { username, password, userCaptcha, actualCaptcha, loginType } = req.body;

  // Validation: Saare fields check karein (Missing fields ki wajah se 400 error aata hai)
  if (!username || !password || !userCaptcha || !actualCaptcha || !loginType) {
    return res.status(400).json({ success: false, message: "Missing required fields!" });
  }

  // Captcha Validation
  if (userCaptcha.toLowerCase() !== actualCaptcha.toLowerCase()) {
    return res.status(400).json({ success: false, message: "Invalid Captcha" });
  }

  try {
    let foundUser = null;

    // 🔥 STRICT LOGIC: Toggle ke basis par sahi table chunein
    if (loginType === "admin") {
      // Admin tab selected hai toh SIRF MasterAdmin table dekho
      foundUser = await MasterAdmin.findOne({ username });
    } else if (loginType === "user") {
      // User tab selected hai toh SIRF User (Sales) table dekho
      foundUser = await User.findOne({ username });
    }

    // Agar us specific table mein user nahi mila
    if (!foundUser) {
      return res.status(401).json({ 
        success: false, 
        message: `This account is not registered as an ${loginType}.` 
      });
    }

    // 2. Check Lockout Status
    const currentTime = Date.now();
    if (foundUser.lockUntil && currentTime > foundUser.lockUntil) {
      foundUser.loginAttempts = 0;
      foundUser.lockUntil = 0;
      await foundUser.save();
    }

    if (foundUser.lockUntil && foundUser.lockUntil > currentTime) {
      const remainingMinutes = Math.ceil((foundUser.lockUntil - currentTime) / 60000);
      return res.status(403).json({
        success: false,
        message: `Account locked. Try after ${remainingMinutes} minutes.`,
        lockUntil: foundUser.lockUntil
      });
    }

    // 3. Password Verification
    const isMatch = await bcrypt.compare(password, foundUser.password);

    if (isMatch) {
      foundUser.loginAttempts = 0;
      foundUser.lockUntil = 0;
      await foundUser.save();

      return res.json({ 
        success: true, 
        role: foundUser.role, 
        username: foundUser.username 
      });
    } else {
      // Wrong Password Logic
      foundUser.loginAttempts = (foundUser.loginAttempts || 0) + 1;
      const maxAttempts = 5;
      
      if (foundUser.loginAttempts >= maxAttempts) {
        foundUser.lockUntil = currentTime + (5 * 60 * 1000); // 5 min lock
        await foundUser.save();
        return res.status(403).json({
          success: false,
          message: "Too many failed attempts. Account locked for 5 minutes.",
          lockUntil: foundUser.lockUntil
        });
      } else {
        await foundUser.save();
        return res.status(401).json({
          success: false,
          message: `Wrong Password. ${maxAttempts - foundUser.loginAttempts} attempts left.`
        });
      }
    }
  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET ALL USERS
router.get("/all-users", async (req, res) => {
  try {
    const users = await User.find().select("-password"); 
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;