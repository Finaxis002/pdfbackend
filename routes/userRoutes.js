const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user"); 
const Link = require("../models/Link");

// 1. ADD NEW USER API
router.post("/add", async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required!" });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "This username already exists!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      password: hashedPassword,
      email: email || "",
      role: 'user' 
    });

    await newUser.save();
    res.status(201).json({ success: true, message: "User created successfully!" });

  } catch (error) {
    console.error("❌ ADD USER ERROR:", error);
    res.status(500).json({ success: false, message: "Internal Server Error!" });
  }
});

// 2. GET ALL USERS SUMMARY
router.get("/all-summary", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    const userSummary = await Promise.all(
      users.map(async (user) => {
        const userLinks = await Link.find({ createdBy: user.username }).select("name id createdAt");

const assignedLinksCount = await Link.countDocuments({
  $or: [
    { assignedTo: { $regex: `(^|,)\\s*${user.username}\\s*(,|$)`, $options: "i" } },
    { username: user.username }
  ]
});

return {
  _id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  joinedAt: user.createdAt,
  totalLinks: userLinks.length,
  assignedLinksCount,
  links: userLinks 
};
      })
    );

    res.json({ success: true, users: userSummary });
  } catch (err) {
    console.error("❌ GET USERS SUMMARY ERROR:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 🔥 3. EDIT USER API
router.put("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, password } = req.body;

    const updateData = { username, email, role };

    // Agar password bhi bheja gaya hai, toh use hash karke update karein
    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true } // updated document return karega
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    res.json({ success: true, message: "User updated successfully!", user: updatedUser });
  } catch (error) {
    console.error("❌ EDIT USER ERROR:", error);
    res.status(500).json({ success: false, message: "Update failed!" });
  }
});

// 4. DELETE USER API
router.delete("/delete/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Delete failed!" });
  }
});

// 5. RESET PASSWORD API (Direct Reset)
router.post("/reset-password", async (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ success: false, message: "Required details are missing!" });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(userId, { password: hashedPassword });
    res.json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    console.error("❌ RESET PASSWORD ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error!" });
  }
});

module.exports = router;