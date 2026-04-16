const express = require("express");
const multer = require("multer");
const router = express.Router();
const linkController = require("../controllers/linkController");
const Link = require("../models/Link");
const Notification = require("../models/Notification");
const { computeStatus } = require("../utils/status");
const fs = require("fs");
const path = require("path");

const UPLOAD_DIR = process.env.VERCEL ? "/tmp/uploads" : path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({ dest: UPLOAD_DIR });

router.post("/upload", upload.single("file"), linkController.uploadPDF);
router.get("/file/:id", linkController.servePDF);
router.get("/link/:id", linkController.getLinkMeta);
router.post("/library/links", linkController.createLinkFromLibrary);

// ==========================================
// GET ALL LINKS
// ==========================================
router.post("/all-links", async (req, res) => {
  try {
    const { role, username } = req.body;

    console.log("====================================");
    console.log("➡️ DASHBOARD NE LINKS MAANGE!");
    console.log("👉 Role:", role);
    console.log("👉 Username:", username);

    let filterCondition = {};

    if (role !== "admin" && role !== "master_admin" && role !== "master") {
      filterCondition = {
        $or: [
          { assignedTo: { $regex: `(^|,)\\s*${username}\\s*(,|$)`, $options: "i" } },
          { username: username }
        ]
      };
      console.log("🔍 FILTER:", JSON.stringify(filterCondition));
    } else {
      console.log("🔓 ADMIN - Sab dikhega");
    }

    let links = await Link.find(filterCondition);

    await Promise.all(
      links.map(async (link) => {
        if (link.mode === "window") {
          const newStatus = computeStatus(link);
          if (link.status !== newStatus) {
            link.status = newStatus;
            await link.save();
          }
        }
      })
    );

    links = await Link.find(filterCondition).sort({ createdAt: -1 });

    const linksWithStatus = links.map((link) => ({
      id: link.id,
      name: link.name,
      username: link.username,
      fileName: link.fileName,
      password: link.password,
      startTime: link.startTime,
      endTime: link.endTime,
      durationMinutes: link.durationMinutes,
      firstAccessTime: link.firstAccessTime,
      mode: link.mode,
      status: link.status,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
      createdBy: link.createdBy,
      assignedTo: link.assignedTo || ""
    }));

    res.json({ success: true, links: linksWithStatus });

  } catch (error) {
    console.error("Error fetching links:", error);
    res.status(500).json({ success: false, message: "Error fetching links" });
  }
});

// ==========================================
// DELETE LINK
// ==========================================
router.delete("/link/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let link = await Link.findOne({ id });
    if (!link) link = await Link.findById(id);
    if (!link) return res.status(404).json({ message: "Not found" });

    if (link.pdfSource !== "library") {
      try {
        if (link.filePath && fs.existsSync(link.filePath)) {
          fs.unlinkSync(link.filePath);
        }
      } catch (_) {}
    }

    await link.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ==========================================
// NOTIFICATIONS
// ==========================================

// GET - Sabhi notifications fetch karo
router.get("/notifications", async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// ✅ POST - Nayi notification save karo (copy event ke liye)
router.post("/notifications", async (req, res) => {
  try {
    const { message, type, linkId, linkName, copiedBy } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const notification = new Notification({
      message,
      isRead: false,
      createdAt: new Date(),
    });

    await notification.save();

    console.log(`🔔 NEW NOTIFICATION: ${message}`);

    res.json({ success: true });
  } catch (error) {
    console.error("Notification save error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// MARK ALL AS READ
router.post("/notifications/mark-read", async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// ==========================================
// VALIDATE LOGIN
// ==========================================
router.post("/validate-login", async (req, res) => {
  const { username, password, linkId } = req.body;

  if (!username || !password || !linkId) {
    return res.status(400).json({ success: false, message: "Missing parameters" });
  }

  const link = await Link.findOne({ username, id: linkId });
  if (!link) {
    return res.status(401).json({ success: false, message: "Invalid username or link not found" });
  }

  if (link.password !== password) {
    return res.status(401).json({ success: false, message: "Incorrect password" });
  }

  if (link.mode === "duration" && !link.firstAccessTime) {
    link.firstAccessTime = Date.now();
    const expireMs = link.firstAccessTime + (link.durationMinutes || 0) * 60 * 1000;
    link.expireAt = new Date(expireMs);
    link.deleteAfter = new Date(expireMs + 7 * 24 * 60 * 60 * 1000);
    await link.save();
  }

  const status = computeStatus(link);
  if (status === "Expired") {
    return res.status(403).json({ success: false, message: "Link has expired" });
  }

  return res.status(200).json({
    success: true,
    firstAccessTime: link.firstAccessTime
  });
});

module.exports = router;