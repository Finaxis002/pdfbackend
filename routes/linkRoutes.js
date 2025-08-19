const express = require("express");
const multer = require("multer");
const router = express.Router();
const linkController = require("../controllers/linkController");
const Link = require("../models/Link");
const { computeStatus } = require("../utils/status");
const fs = require("fs");
const path = require("path");



const upload = multer({ dest: "uploads/" });

// POST /api/upload
router.post("/upload", upload.single("file"), linkController.uploadPDF);

// GET /api/file/:id
router.get("/file/:id", linkController.servePDF);

// GET /api/link/:id
router.get("/link/:id", linkController.getLinkMeta);




router.get("/all-links", async (req, res) => {
  let links = await Link.find();

  // Update statuses in DB if necessary
  await Promise.all(
    links.map(async (link) => {
      // Only update for window mode!
      if (link.mode === "window") {
        const newStatus = computeStatus(link); // Pass full link object!
        if (link.status !== newStatus) {
          link.status = newStatus;
          await link.save();
        }
      }
      // For duration mode, never update status here!
    })
  );

  // Fetch updated links
  links = await Link.find();

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
  }));
  res.json({ links: linksWithStatus });
});



// routes/links.js (delete handler snippet)
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


// router.post("/validate-login", async (req, res) => {
//   const { username, password, linkId } = req.body;

//   // Validate input
//   if (!username || !password || !linkId) {
//     return res.status(400).json({ success: false, message: "Missing parameters" });
//   }

//   // Find the link record with this username and linkId
//   const link = await Link.findOne({ username, id: linkId });

//   if (!link) {
//     return res.status(401).json({ success: false, message: "Invalid username or link not found" });
//   }

//   // For demo: plaintext comparison (improve with hash in production)
//   if (link.password !== password) {
//     return res.status(401).json({ success: false, message: "Incorrect password" });
//   }

//   // Optionally: check if the link is active
//   const now = Date.now();
//   if (now < link.startTime || now > link.endTime) {
//     return res.status(403).json({ success: false, message: "Link not active or expired" });
//   }

//   return res.status(200).json({ success: true });
// });


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
    firstAccessTime: link.firstAccessTime // Send back the access time
  });
});


module.exports = router;
