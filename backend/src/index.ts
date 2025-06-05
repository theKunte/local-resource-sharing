import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory resource storage
let resources: Array<{
  id: number;
  title: string;
  description: string;
  image?: string; // base64 or URL
}> = [];
let nextId = 1;

app.use(cors());
app.use(express.json({ limit: "5mb" })); // Allow large payloads for images

// Root route for API info or friendly message
app.get("/", (req, res) => {
  res.send("<h2>Local Resource Sharing API is running.<br>Use <code>/api/resources</code> to access resources.</h2>");
});

// Get all resources
app.get("/api/resources", (req, res) => {
  res.json(resources);
});

// Post a new resource
app.post("/api/resources", (req, res) => {
  const { title, description, image } = req.body;
  if (!title || !description) {
    return res
      .status(400)
      .json({ error: "Title and description are required." });
  }
  const resource = { id: nextId++, title, description, image };
  resources.push(resource);
  res.status(201).json(resource);
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
