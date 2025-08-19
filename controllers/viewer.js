// controllers/viewer.js (snippet inside exports.servePDF)
const fs = require("fs");
const path = require("path");
const Link = require("../models/Link");

exports.servePDF = async (req, res) => {
  try {
    const linkId = req.params.id;

    // Your app sometimes uses a custom "id" field; support both.
    let link = await Link.findOne({ id: linkId }).populate("libraryPdfId");
    if (!link) link = await Link.findById(linkId).populate("libraryPdfId");
    if (!link) return res.status(404).send("Not found");

    // ---- your existing timing/rules logic here ----
    // e.g., window mode checks, duration mode sets firstAccessTime, etc.
    // Example for duration:
    // if (link.mode === "duration" && (!link.firstAccessTime || link.firstAccessTime === 0)) {
    //   link.firstAccessTime = Date.now();
    //   await link.save();
    // }

    // Decide which file to stream:
    let filePath;
    if (link.pdfSource === "library") {
      filePath = link.libraryPdfId && link.libraryPdfId.filePath;
    } else {
      // legacy/ephemeral path your current flow uses
      filePath = link.filePath;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send("PDF file not found on server.");
    }

    res.setHeader("Content-Type", "application/pdf");
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).send("Internal server error.");
  }
};
