const Link = require("../models/Link");
const path = require("path");
const { computeStatus } = require("../utils/status");
const fs = require("fs");

async function markFirstAccess(link) {
  if (link.mode === "duration" && !link.firstAccessTime) {
    link.firstAccessTime = Date.now();
    await link.save();
  }
}

// controllers/linkController.js

exports.uploadPDF = async (req, res) => {
  try {
    const { originalname, path: filePath } = req.file;
    const {
      name, password, startTime, endTime, username, mode, durationMinutes,
    } = req.body;

    const id = Math.random().toString(36).substr(2, 9);

    const linkDoc = {
      id,
      name,
      username,
      fileName: originalname,
      password,
      filePath,
      pdfSource: "ephemeral",                  // ← make it explicit
      mode: mode || "window",
      accessLog: [],
    };

    if (linkDoc.mode === "duration") {
      linkDoc.durationMinutes = Number(durationMinutes);
      linkDoc.firstAccessTime = 0;  // not opened yet
      linkDoc.expireAt = null;      // determined on first open
      linkDoc.deleteAfter = null;
    } else {
      const start = Number(startTime);
      const end = Number(endTime);
      linkDoc.startTime = start;
      linkDoc.endTime = end;

      // For window mode we already know the expiry and cleanup time
      linkDoc.expireAt = new Date(end);
      linkDoc.deleteAfter = new Date(end + 7 * 24 * 60 * 60 * 1000);
    }


    // keep status assignment consistent with the rest of your app
    linkDoc.status = require("../utils/status").computeStatus(linkDoc);



    await Link.create(linkDoc);
    res.json({ link: `/view/${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




exports.servePDF = async (req, res) => {
  try {
    const ua = (req.headers["user-agent"] || "").toLowerCase();
    const isMobilePhone = /android|iphone|ipod|blackberry|iemobile|opera mini|fennec|windows phone/i.test(ua);
    const isTablet = /ipad|tablet|playbook|silk|kindle/i.test(ua) && !/mobile|phone/i.test(ua);
    const isDesktop = /windows nt|macintosh|linux/i.test(ua) && !isMobilePhone && !isTablet;

    if (isMobilePhone && !isTablet && !isDesktop) {
      return res.status(403).send("PDF viewing is allowed only on desktop, laptop, or tablet browsers.");
    }

    // find by custom id first, then by _id; populate library ref
    let link = await Link.findOne({ id: req.params.id }).populate("libraryPdfId");
    if (!link) link = await Link.findById(req.params.id).populate("libraryPdfId");
    if (!link) return res.status(404).send("Not found");

   // If duration link is opened for the first time, set firstAccessTime + housekeeping
    if (link.mode === "duration" && !link.firstAccessTime) {
      link.firstAccessTime = Date.now();

      // compute expireAt/deleteAfter on first open
      const expireMs = link.firstAccessTime + (link.durationMinutes || 0) * 60 * 1000;
      link.expireAt = new Date(expireMs);
      link.deleteAfter = new Date(expireMs + 7 * 24 * 60 * 60 * 1000);

      await link.save();
    }

    // check status (window or duration)
    const statusNow = computeStatus(link);
    if (statusNow === "Expired" || statusNow === "Pending") {
      const msg = statusNow === "Expired" ? "Link expired." : "Link not active yet.";
      return res.status(403).send(msg);
    }

    // choose the correct file path
    let filePath = link.pdfSource === "library"
      ? (link.libraryPdfId && link.libraryPdfId.filePath)
      : link.filePath;

    if (!filePath) {
      return res.status(404).send("File path missing for this link.");
    }

    // make absolute path safely
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    if (!fs.existsSync(absPath)) {
      return res.status(404).send("PDF file not found on server.");
    }

    // (optional) log access – GET has no body, so username may be unknown
    link.accessLog.push({
      timestamp: Date.now(),
      username: (req.query && req.query.username) || "unknown",
    });
    await link.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${path.basename(absPath)}"`);
    res.sendFile(absPath);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error.");
  }
};

// Get link metadata
exports.getLinkMeta = async (req, res) => {
  const link = await Link.findOne({ id: req.params.id });
  if (!link) return res.status(404).send("Not found");

  const currentStatus = computeStatus(link);

  // Update status if needed (but don't set firstAccessTime here)
  if (link.status !== currentStatus) {
    link.status = currentStatus;
    await link.save();
  }

  // REMOVE the markFirstAccess call from here

  res.json({
    id: link.id,
    name: link.name,
    username: link.username,
    fileName: link.fileName,
    password: link.password,
    startTime: link.startTime,
    endTime: link.endTime,
    durationMinutes: link.durationMinutes,
    firstAccessTime: link.firstAccessTime, // Will be null until login
    mode: link.mode,
    status: link.status,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  });
};