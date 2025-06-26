// utils/status.js
function computeStatus(startTime, endTime) {
  const now = Date.now();
  if (now < startTime) return "Pending";
  if (now > endTime) return "Expired";
  return "Active";
}
module.exports = { computeStatus };
