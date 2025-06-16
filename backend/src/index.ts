import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: "5mb" })); // Allow large payloads for images

// Root route for API info or friendly message
app.get("/", (req, res) => {
  res.send(
    "<h2>Local Resource Sharing API is running.<br>Use <code>/api/resources</code> to access resources.</h2>"
  );
});

// Get all resources from the database, with optional user filter
app.get("/api/resources", async (req, res) => {
  try {
    const user = req.query.user as string | undefined;
    let resources;
    if (user) {
      resources = await prisma.resource.findMany({ where: { user } });
    } else {
      resources = await prisma.resource.findMany();
    }
    res.json(resources);
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Post a new resource to the database
app.post("/api/resources", async (req, res) => {
  const { title, description, image, user } = req.body;
  if (!title || !description || !user) {
    return res
      .status(400)
      .json({ error: "Title, description, and user are required." });
  }

  try {
    const resource = await prisma.resource.create({
      data: { title, description, image, user },
    });
    res.status(201).json(resource);
  } catch (error) {
    console.error("Error creating resource:", error);
    res.status(500).json({ error: "Failed to create resource" });
  }
});

// Update a resource by id
app.put("/api/resources/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, description, image } = req.body;
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid resource id" });
  }
  if (!title || !description) {
    return res
      .status(400)
      .json({ error: "Title and description are required." });
  }
  try {
    const updated = await prisma.resource.update({
      where: { id },
      data: { title, description, image },
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating resource:", error);
    res.status(404).json({ error: "Resource not found" });
  }
});

// Delete a resource by id
app.delete("/api/resources/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid resource id" });
  }
  try {
    await prisma.resource.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting resource:", error);
    res.status(404).json({ error: "Resource not found" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
