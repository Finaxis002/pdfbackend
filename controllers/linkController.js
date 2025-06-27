const Link = require("../models/Link");
const path = require("path");
const { computeStatus } = require("../utils/status");
const fs = require("fs");

// Create/upload link
exports.uploadPDF = async (req, res) => {
  try {
    const { originalname, path: filePath } = req.file;
    const { name, password, startTime, endTime, username } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const status = computeStatus(Number(startTime), Number(endTime)); // Compute at creation

    await Link.create({
      id,
      name,
      username, // Use req.user if available, else default to "anonymous
      fileName: originalname,
      password,
      startTime: Number(startTime),
      endTime: Number(endTime),
      filePath,
      status,
    });
    res.json({ link: `/view/${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Serve PDF
// exports.servePDF = async (req, res) => {

//   const link = await Link.findOne({ id: req.params.id });
//   if (!link) return res.status(404).send("Not found");
//   res.sendFile(path.resolve(link.filePath));
// };

exports.servePDF = async (req, res) => {
  const ua = req.headers["user-agent"]?.toLowerCase() || "";

  // 1. Log all user agents for analysis
  console.log("User-Agent:", ua);

  // 2. Only allow certain desktop OS
  const isDesktop = (
    /windows nt|macintosh|linux x86_64|x11/.test(ua) && 
    !/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini|tablet|touch|webos|fennec|windows phone|kindle|silk/i.test(ua)
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

  res.sendFile(filePath);
};


// Get link metadata
exports.getLinkMeta = async (req, res) => {
  const link = await Link.findOne({ id: req.params.id });
  if (!link) return res.status(404).send("Not found");
  const currentStatus = computeStatus(link.startTime, link.endTime);

  // If status in DB is outdated, update it
  if (link.status !== currentStatus) {
    link.status = currentStatus;
    await link.save();
  }

  res.json({
    id: link.id,
    name: link.name,
    username: link.username, // now always synced!
    fileName: link.fileName,
    password: link.password,
    startTime: link.startTime,
    endTime: link.endTime,
    status: link.status, // now always synced!
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  });
};
