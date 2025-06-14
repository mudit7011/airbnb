
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

import Lead from "./models/Lead.js";

dotenv.config();

const app = express();
app.use(cors({
  origin: "https://lead-score-seeker-form.vercel.app/",
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/leads", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-pro" });

    const result = await model.generateContent({
      contents: [
    {
      parts: [
        {
          text: `You are a lead scoring assistant. Give a score from 1 to 100(where 100 is extremely qualified and 0 is spam).\n\nLead Details:\nName: ${name}\nEmail: ${email}\nMessage: ${message}`
        }
      ]
    }
  ]
});

    const scoreText = result.response.text();
    const extractedScore = parseInt(scoreText.match(/\d+/)[0]);

    const lead = new Lead({ name, email, message, score: extractedScore });
    console.log("Saving lead:", { name, email, message, extractedScore });
    await lead.save();

    res.status(200).json({ message: "Lead saved", score: extractedScore });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message || "Failed to process lead" });
  }
});


app.listen(4000, () => console.log("Server running on port 4000"));
