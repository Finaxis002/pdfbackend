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
      const newStatus = computeStatus(link.startTime, link.endTime);
      if (link.status !== newStatus) {
        link.status = newStatus;
        await link.save();
      }
    })
  );

  // Fetch updated links
  links = await Link.find();

  const linksWithStatus = links.map((link) => ({
    id: link.id,
    name: link.name,
    fileName: link.fileName,
    password: link.password,
    startTime: link.startTime,
    endTime: link.endTime,
    status: link.status,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  }));
  res.json({ links: linksWithStatus });
});

router.delete("/link/:id", async (req, res) => {
  const Link = require("../models/Link");
  const link = await Link.findOne({ id: req.params.id });
  
  if (!link) {
    return res.status(404).json({ success: false, message: "Link not found" });
  }

  // Delete the file if it exists
  if (link.filePath) {
    // Handle both / and \ in file paths
    const filePath = path.resolve(link.filePath);
    fs.unlink(filePath, (err) => {
      // Log but don't fail on file not found
      if (err && err.code !== "ENOENT") {
        console.error("Failed to delete file:", filePath, err);
      }
    });
  }

  // Delete the DB document
  await Link.deleteOne({ id: req.params.id });

  res.json({ success: true });
});

module.exports = router;
