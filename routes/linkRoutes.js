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

// ==========================================
// 1. UPLOAD PDF (Link Create Karna) - UPDATE KIYA HAI
// ==========================================
// Note: Isko theek se kaam karne ke liye aapke frontend (AddLinkDialog) 
// se 'createdBy' field aana chahiye formData mein.
router.post("/upload", upload.single("file"), linkController.uploadPDF);


// GET /api/file/:id
router.get("/file/:id", linkController.servePDF);

// GET /api/link/:id
router.get("/link/:id", linkController.getLinkMeta);

router.post("/library/links", linkController.createLinkFromLibrary);
// ==========================================
// GET ALL LINKS (Role ke hisab se Filter)
// ==========================================
router.post("/all-links", async (req, res) => {
  try {
    const { role, username } = req.body; 
    
    // 🔥 JASOOS 2: Dekhte hain Dashboard se kya request aayi
    console.log("====================================");
    console.log("➡️ DASHBOARD NE LINKS MAANGE!");
    console.log("👉 Maangne wale ka Role:", role);
    console.log("👉 Maangne wale ka Username:", username);

    let filterCondition = {};
    
    if ((role === "sales" || role === "user") && username) {
      filterCondition = { createdBy: username }; 
      console.log("🔍 FILTER LAG GAYA:", filterCondition);
    } else {
      console.log("🔓 KOI FILTER NAHI (Admin mode - Sab dikhega)");
    }

    let links = await Link.find(filterCondition);
    console.log("📦 Database se Total Links mile:", links.length);
    console.log("====================================");

    // ... Baki ka code same rahega (Promise.all wala)

    // Baki ka status update karne wala logic same rahega...
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

    // Updated links wapas fetch karein
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
      createdBy: link.createdBy 
    }));

    res.json({ success: true, links: linksWithStatus });

  } catch (error) {
    console.error("Error fetching links:", error);
    res.status(500).json({ success: false, message: "Error fetching links" });
  }
});

// ==========================================
// 3. DELETE LINK
// ==========================================
router.delete("/link/:id", async (req, res) => {
  try {
    const id = req.params.id;
    let link = await Link.findOne({ id });
    if (!link) link = await Link.findById(id);
    if (!link) return res.status(404).json({ message: "Not found" });

    // If ephemeral, optionally delete its file from /ephemeral-uploads
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
// 🔥 NOTIFICATION APIs 🔥
// ==========================================

// 1. Saari notifications laane ke liye
router.get("/notifications", async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 2. Notifications ko 'Read' mark karne ke liye
router.post("/notifications/mark-read", async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

module.exports = router; // <-- Aapki file mein ye pehle se hoga

// ==========================================
// 4. VALIDATE LOGIN (PDF kholne ke liye)
// ==========================================
router.post("/validate-login", async (req, res) => {
  const { username, password, linkId } = req.body;

  // Validate input
  if (!username || !password || !linkId) {
    return res.status(400).json({ success: false, message: "Missing parameters" });
  }

  // Find the link record
  const link = await Link.findOne({ username, id: linkId });
  if (!link) {
    return res.status(401).json({ success: false, message: "Invalid username or link not found" });
  }

  // Check password
  if (link.password !== password) {
    return res.status(401).json({ success: false, message: "Incorrect password" });
  }

  // For duration mode links, set firstAccessTime if not already set
  if (link.mode === "duration" && !link.firstAccessTime) {
    link.firstAccessTime = Date.now();
    const expireMs = link.firstAccessTime + (link.durationMinutes || 0) * 60 * 1000;
    link.expireAt = new Date(expireMs);
    link.deleteAfter = new Date(expireMs + 7 * 24 * 60 * 60 * 1000);
    await link.save();
  }

  // Check link status
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