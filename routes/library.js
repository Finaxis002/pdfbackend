// routes/library.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const LibraryPdf = require("../models/LibraryPdf");
const Link = require("../models/Link");
const { newLinkId } = require("../utils/id");

const router = express.Router();

// Multer storage for PERMANENT PDFs ONLY
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), "library-uploads")),
  filename: (req, file, cb) => {
    // keep it simple; you can add uuid if you like
    const ts = Date.now();
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, `${ts}__${safe}`);
  }
});
const upload = multer({ storage });

// 1) Upload a permanent PDF
router.post("/pdfs", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const doc = await LibraryPdf.create({
      name: req.body.name || req.file.originalname,
      filePath: req.file.path,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype || "application/pdf",
      uploadedBy: req.user?._id || null, // optional
    });
    res.json({ pdf: doc });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 2) List/search permanent PDFs
router.get("/pdfs", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const filter = { isDeleted: false };
    if (q) filter.name = { $regex: q, $options: "i" };

    const pdfs = await LibraryPdf.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ pdfs });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 3) Delete a permanent PDF (blocked if in use)
router.delete("/pdfs/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const inUse = await Link.countDocuments({ pdfSource: "library", libraryPdfId: id });
    if (inUse > 0) {
      return res.status(409).json({ message: "PDF is referenced by links. Delete those links first." });
    }
    // Soft delete (safer)
    await LibraryPdf.findByIdAndUpdate(id, { isDeleted: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 4) Create a LINK that references a permanent PDF
router.post("/links", async (req, res) => {
  try {
    const {
      libraryPdfId, name,
      mode, startTime, endTime, durationMinutes,
      username, password,
    } = req.body;

    const lib = await LibraryPdf.findById(libraryPdfId);
    if (!lib || lib.isDeleted) return res.status(404).json({ message: "Permanent PDF not found" });

    const linkDoc = await Link.create({
         id: newLinkId(),  
      pdfSource: "library",
      libraryPdfId,
      name: name || lib.name,
      mode,
      startTime,
      endTime,
      durationMinutes,
      username,
      password,
      firstAccessTime: 0,
      // keep your other fields as-is
    });

    // Return both id and _id, since you use a custom id in frontend sometimes
    const payload = linkDoc.toObject();
    payload.id = payload.id || payload._id?.toString();
    res.json({ link: payload });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
