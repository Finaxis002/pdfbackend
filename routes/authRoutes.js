const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs"); // 1. Bcrypt import karein
const User = require("../models/masteradmin");

// LOGIN ROUTE
router.post("/login", async (req, res) => {
  const { username, password, userCaptcha, actualCaptcha } = req.body;

  if (!userCaptcha || userCaptcha.toLowerCase() !== actualCaptcha.toLowerCase()) {
    return res.status(400).json({ success: false, message: "Invalid Captcha" });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    // 2. Check Lockout Status
    const currentTime = Date.now();
    if (user.lockUntil && currentTime > user.lockUntil) {
      user.loginAttempts = 0; 
      user.lockUntil = 0;
      await user.save();
      console.log("ℹ️ Lock period over, attempts reset to 0.");
    }

    if (user.lockUntil && user.lockUntil > currentTime) {
      const remainingMinutes = Math.ceil((user.lockUntil - currentTime) / 60000);
      return res.status(403).json({ 
        success: false, 
        message: `Account locked. Please try again after ${remainingMinutes} minutes.`,
        lockUntil: user.lockUntil
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      user.loginAttempts = 0;
      user.lockUntil = 0;
      await user.save();

      return res.json({ success: true, role: user.role, username: user.username });
   } else {
      user.loginAttempts += 1;

      const maxAttempts = 5;
      const attemptsLeft = maxAttempts - user.loginAttempts;

      if (user.loginAttempts >= maxAttempts) {
        const lockTime = currentTime + (5 * 60 * 1000); // 5 Minutes lock
        user.lockUntil = lockTime;
        // user.loginAttempts = 0; 
        
        await user.save();
        return res.status(403).json({ 
          success: false, 
          message: "Too many failed attempts. Account locked for 5 minutes.", 
          lockUntil: lockTime 
        });
      } else {
        await user.save();
        return res.status(401).json({ 
          success: false, 
          message: `Wrong Password. ${attemptsLeft} attempts remaining.` 
        });
      }
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// GET ALL USERS EXCEPT MASTER
router.get("/all-users", async (req, res) => {
  try {
    // Role 'master' ko filter out kar rahe hain
    const users = await User.find({ role: { $ne: "master" } }); 
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;