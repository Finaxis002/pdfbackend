const Link = require("../models/Link");
const path = require("path");
const { computeStatus } = require("../utils/status");


// Create/upload link
exports.uploadPDF = async (req, res) => {
  try {
    const { originalname, path: filePath } = req.file;
    const { name, password, startTime, endTime } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const status = computeStatus(Number(startTime), Number(endTime)); // Compute at creation

    await Link.create({
      id,
      name,
      fileName: originalname,
      password,
      startTime: Number(startTime),
      endTime: Number(endTime),
      filePath,
      status
    });
    res.json({ link: `/view/${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Serve PDF
exports.servePDF = async (req, res) => {
  const link = await Link.findOne({ id: req.params.id });
  if (!link) return res.status(404).send("Not found");
  res.sendFile(path.resolve(link.filePath));
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
    fileName: link.fileName,
    password: link.password,
    startTime: link.startTime,
    endTime: link.endTime,
    status: link.status, // now always synced!
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  });
};
