// utils/id.js
const crypto = require("crypto");
function newLinkId(size = 10) {
  // URL-safe random id (A–Z, a–z, 0–9, - and _)
  return crypto.randomBytes(size).toString("base64url").slice(0, size);
}
module.exports = { newLinkId };
