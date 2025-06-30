const Link = require("../models/Link");
const path = require("path");
const { computeStatus } = require("../utils/status");
const fs = require("fs");


// function computeStatus(link) {
//   if (link.mode === "duration") {
//     if (!link.firstAccessTime) return "Pending";
//     const expireAt = link.firstAccessTime + link.durationMinutes * 60 * 1000;
//     return Date.now() > expireAt ? "Expired" : "Active";
//   } else {
//     const now = Date.now();
//     if (now < link.startTime) return "Pending";
//     if (now > link.endTime) return "Expired";
//     return "Active";
//   }
// }


// Create/upload link
exports.uploadPDF = async (req, res) => {
  try {
    const { originalname, path: filePath } = req.file;
    const {
      name,
      password,
      startTime,
      endTime,
      username,
      mode,
      durationMinutes,
    } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    let status = "Pending";
    let linkDoc = {
      id,
      name,
      username,
      fileName: originalname,
      password,
      filePath,
      mode: mode || "window",
      accessLog: [],
    };
    if (mode === "duration") {
      linkDoc.durationMinutes = Number(durationMinutes);
      linkDoc.firstAccessTime = null;
      linkDoc.status = "Pending";
    } else {
      linkDoc.startTime = Number(startTime);
      linkDoc.endTime = Number(endTime);
      linkDoc.status = computeStatus(Number(startTime), Number(endTime));
    }
    // linkDoc.status = status;

    await Link.create(linkDoc);
    res.json({ link: `/view/${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Serve PDF

exports.servePDF = async (req, res) => {
  const ua = req.headers["user-agent"]?.toLowerCase() || "";

  // 1. Log all user agents for analysis
  console.log("User-Agent:", ua);

  // 2. Only allow certain desktop OS
  const isDesktop =
    /windows nt|macintosh|linux x86_64|x11/.test(ua) &&
    !/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini|tablet|touch|webos|fennec|windows phone|kindle|silk/i.test(
      ua
    );

  if (!isDesktop) {
    return res
      .status(403)
      .send("PDF viewing is allowed only on desktop/laptop browsers.");
  }

  const link = await Link.findOne({ id: req.params.id });
  if (!link) return res.status(404).send("Not found");

  const filePath = path.resolve(link.filePath);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("PDF file not found on server.");
  }

  if (link.mode === "duration") {
    if (!link.firstAccessTime) {
      link.firstAccessTime = Date.now();
      await link.save();
    }
    const expireTime = link.firstAccessTime + link.durationMinutes * 60 * 1000;
    if (Date.now() > expireTime) {
      return res.status(403).send("Link expired.");
    }
  } else {
    if (Date.now() < link.startTime || Date.now() > link.endTime) {
      return res.status(403).send("Link not active or expired.");
    }
  }
  link.accessLog.push({
    timestamp: Date.now(),
    username: req.body.username || "unknown",
  });
  await link.save();

  res.sendFile(filePath);
};

// Get link metadata
exports.getLinkMeta = async (req, res) => {
  const link = await Link.findOne({ id: req.params.id });
  if (!link) return res.status(404).send("Not found");
    const currentStatus = computeStatus(link);

  // If status in DB is outdated, update it
  if (link.status !== currentStatus) {
    link.status = currentStatus;
    await link.save();
  }

  res.json({
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
  });
};
