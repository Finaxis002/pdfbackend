require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const mongoose = require("mongoose");
const linkRoutes = require("./routes/linkRoutes");
const libraryRouter = require("./routes/library");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const app = express();
const User = require("./models/masteradmin");
const createInitialAdmin = async () => {
  try {
    const adminExists = await User.findOne({ username: "adminsharda" });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("Sharda@567", salt);

      const masterAdmin = new User({
        username: "adminsharda",
        password: hashedPassword,
        role: "master" 
      });

      await masterAdmin.save();
      // console.log("✅ Master Admin saved in database ");
    } else {
      // console.log("ℹ️ Admin setup: Admin already exists.");
    }
  } catch (error) {
    console.error("❌ Admin setup error:", error.message);
  }
};

const allowedOrigins = [
  "https://pdfviewer.sharda.co.in",  // production frontend
  "http://localhost:3000",            // local dev
  "http://localhost:8124",            // local dev alternate
];

app.options("*", cors());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS blocked: " + origin));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use("/api", linkRoutes);
app.use("/api/library", libraryRouter);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.get("/", (req, res) => {
  res.send("Hello from your backend! 🚀 - auto delete links issue solved");
});
// authRoutes.js
mongoose
  .connect(
    process.env.MONGO_URI ||
      "mongodb+srv://finaxisai:EjMibOyOOojhb2TA@cluster0.36cnago.mongodb.net/"
  )
  .then(() => {
    console.log("✅ MongoDB connected successfully!");
    createInitialAdmin();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
  });

if (require.main === module) {
  app.listen(8000, () => console.log("Server running on http://localhost:8000"));
}

module.exports = app;