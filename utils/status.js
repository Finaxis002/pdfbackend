// utils/status.js
function computeStatus(link) {
  if (!link) return "Pending"; // Defensive: avoid crash on undefined

  if (link.mode === "duration") {
    if (!link.firstAccessTime) return "Pending";
    const expireAt = link.firstAccessTime + link.durationMinutes * 60 * 1000;
    return Date.now() > expireAt ? "Expired" : "Active";
  } else {
    const now = Date.now();
    if (now < link.startTime) return "Pending";
    if (now > link.endTime) return "Expired";
    return "Active";
  }
}
module.exports = { computeStatus };
