const Link = require("../models/Link");
const Notification = require("../models/Notification"); // 🔥 Notification Model
const path = require("path");
const { computeStatus } = require("../utils/status");
const fs = require("fs");
const sendLinkEmail = require("../utils/mailer");

async function markFirstAccess(link) {
  if (link.mode === "duration" && !link.firstAccessTime) {
    link.firstAccessTime = Date.now();
    await link.save();
  }
}

// 1. TEMPORARY UPLOAD (Aapka existing function - untouched)
exports.uploadPDF = async (req, res) => {
  try {
    const { originalname, path: filePath } = req.file;
    const {
      name, password, startTime, endTime, username, mode, durationMinutes, createdBy
    } = req.body;

    console.log("====================================");
    console.log("➡️ NAYA LINK CREATE HO RAHA HAI...");
    console.log("👉 Form Data aya:", req.body);
    console.log("👉 Kisne Banaya (createdBy):", createdBy);
    console.log("====================================");

    const id = Math.random().toString(36).substr(2, 9);

    const linkDoc = {
      id,
      name,
      username,
      fileName: originalname,
      password,
      filePath,
      pdfSource: "ephemeral",
      mode: mode || "window",
      accessLog: [],
      createdBy: createdBy || "admin",
    };

    if (linkDoc.mode === "duration") {
      linkDoc.durationMinutes = Number(durationMinutes);
      linkDoc.firstAccessTime = 0;  
      linkDoc.expireAt = null;      
      linkDoc.deleteAfter = null;
    } else {
      const start = Number(startTime);
      const end = Number(endTime);
      linkDoc.startTime = start;
      linkDoc.endTime = end;
      linkDoc.expireAt = new Date(end);
      linkDoc.deleteAfter = new Date(end + 7 * 24 * 60 * 60 * 1000);
    }

    linkDoc.status = require("../utils/status").computeStatus(linkDoc);

    await Link.create(linkDoc);

    // 🔥 MAIL BHEJNE KA LOGIC 🔥
    try {
      const adminEmail = "adityajaysawal27@gmail.com";
      const fullUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/view/${id}`;
      
      sendLinkEmail(adminEmail, {
        username: username,
        name: name,
        url: fullUrl,
        password: password || "No password",
        createdBy: createdBy || "admin"
      });
    } catch (mailErr) {
      console.error("Mail bhejne mein error:", mailErr);
    }

    // 🔥 NOTIFICATION SAVE KARNE KA LOGIC 🔥
    if (createdBy && createdBy !== "admin" && createdBy !== "master_admin") {
      try {
        await Notification.create({
          message: `${createdBy} generated a new PDF link: "${name}"`
        });
      } catch (notifErr) {
        console.error("Notification save error:", notifErr);
      }
    }

    res.json({ link: `/view/${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. PERMANENT LIBRARY LINK (Ab Email bhi jayega)
exports.createLinkFromLibrary = async (req, res) => {
  try {
    const { 
      libraryPdfId, name, username, password, mode, 
      durationMinutes, startTime, endTime, createdBy 
    } = req.body;

    const id = Math.random().toString(36).substr(2, 9);

    const linkDoc = {
      id,
      name,
      username,
      password: password || "",
      libraryPdfId,
      pdfSource: "library",
      mode: mode || "window",
      createdBy: createdBy || "admin", 
      accessLog: [],
    };

    if (linkDoc.mode === "duration") {
      linkDoc.durationMinutes = Number(durationMinutes);
      linkDoc.firstAccessTime = 0;
    } else {
      linkDoc.startTime = Number(startTime);
      linkDoc.endTime = Number(endTime);
      linkDoc.expireAt = new Date(linkDoc.endTime);
      linkDoc.deleteAfter = new Date(linkDoc.endTime + 7 * 24 * 60 * 60 * 1000);
    }

    linkDoc.status = require("../utils/status").computeStatus(linkDoc);
    await Link.create(linkDoc);

    // 🔥 1. MAIL BHEJNE KA LOGIC (Library Links ke liye add kiya) 🔥
    try {
      const adminEmail = "adityajaysawal27@gmail.com";
      const fullUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/view/${id}`;
      
      sendLinkEmail(adminEmail, {
        username: username,
        name: name,
        url: fullUrl,
        password: password || "No password",
        createdBy: createdBy || "admin"
      });
      console.log("✅ Library Link Email sent successfully!");
    } catch (mailErr) {
      console.error("❌ Library Mail error:", mailErr);
    }

    // 🔥 2. NOTIFICATION Logic
    if (createdBy && createdBy !== "admin" && createdBy !== "master_admin") {
      try {
        await Notification.create({
          message: `${createdBy} generated a new PDF link from library: "${name}"`
        });
      } catch (err) {
        console.error("Library Notif Error:", err);
      }
    }

    res.json({ success: true, link: `/view/${id}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. SERVE PDF (Aapka existing function)
exports.servePDF = async (req, res) => {
  try {
    const ua = (req.headers["user-agent"] || "").toLowerCase();
    const isMobilePhone = /android|iphone|ipod|blackberry|iemobile|opera mini|fennec|windows phone/i.test(ua);
    const isTablet = /ipad|tablet|playbook|silk|kindle/i.test(ua) && !/mobile|phone/i.test(ua);
    const isDesktop = /windows nt|macintosh|linux/i.test(ua) && !isMobilePhone && !isTablet;

    if (isMobilePhone && !isTablet && !isDesktop) {
      return res.status(403).send("PDF viewing is allowed only on desktop, laptop, or tablet browsers.");
    }

    let link = await Link.findOne({ id: req.params.id }).populate("libraryPdfId");
    if (!link) link = await Link.findById(req.params.id).populate("libraryPdfId");
    if (!link) return res.status(404).send("Not found");

    if (link.mode === "duration" && !link.firstAccessTime) {
      link.firstAccessTime = Date.now();
      const expireMs = link.firstAccessTime + (link.durationMinutes || 0) * 60 * 1000;
      link.expireAt = new Date(expireMs);
      link.deleteAfter = link.expireAt;
      await link.save();
    }

    const statusNow = computeStatus(link);
    if (statusNow === "Expired" || statusNow === "Pending") {
      const msg = statusNow === "Expired" ? "Link expired." : "Link not active yet.";
      return res.status(403).send(msg);
    }

    let filePath = link.pdfSource === "library"
      ? (link.libraryPdfId && link.libraryPdfId.filePath)
      : link.filePath;

    if (!filePath) {
      return res.status(404).send("File path missing for this link.");
    }

    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    if (!fs.existsSync(absPath)) {
      return res.status(404).send("PDF file not found on server.");
    }

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

// 4. GET LINK META (Aapka existing function)
exports.getLinkMeta = async (req, res) => {
  const link = await Link.findOne({ id: req.params.id });
  if (!link) return res.status(404).send("Not found");

  const currentStatus = computeStatus(link);

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