require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const mongoose = require("mongoose");
const linkRoutes = require("./routes/linkRoutes");
const libraryRouter = require("./routes/library");
const authRoutes = require("./routes/authRoutes");
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

// app.options("*", cors());

const corsOptions = {
  origin: "*", // Allow all origins for testing
  credentials: true,
};
app.use(helmet());

app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());
app.use("/api", linkRoutes);
app.use("/api/library", libraryRouter);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Hello from your backend! 🚀 - auto delete links issue solved");
});

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

app.listen(8000, () => console.log("Server running on http://localhost:8000"));
