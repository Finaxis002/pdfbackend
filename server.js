require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const linkRoutes = require("./routes/linkRoutes");

const app = express();

// app.options("*", cors());

const corsOptions = {
  origin: "*", // Allow all origins for testing
  credentials: true,
};


app.use(cors(corsOptions));
app.use(express.json());
app.use("/api", linkRoutes);

app.get("/", (req, res) => {
  res.send("Hello from your backend! 🚀 - pdf locked on mobile view ");
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
