require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const linkRoutes = require("./routes/linkRoutes");

const app = express();

app.use(cors({
  origin: "*",
  exposedHeaders: ["Content-Disposition"]
}));
app.use(express.json());
app.use("/api", linkRoutes);

app.get("/", (req, res) => {
  res.send("Hello from your backend! 🚀");
});

mongoose
  .connect(
    process.env.MONGO_URI ||
      "mongodb+srv://finaxisai:EjMibOyOOojhb2TA@cluster0.36cnago.mongodb.net/"
  )
  .then(() => {
    console.log("✅ MongoDB connected successfully!");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
  });

app.listen(8000, () => console.log("Server running on http://localhost:8000"));
