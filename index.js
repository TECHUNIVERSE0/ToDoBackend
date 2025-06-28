require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const PORT = process.env.PORT || 8080;
const mongoURL = process.env.mongoURL;

app.use(express.json());

app.use(
  cors({
    origin: "*",
  })
);

mongoose.connect(mongoURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

console.log("MONGO URL:", mongoURL);

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const user = mongoose.model("user", userSchema);

const TaskSchema = new mongoose.Schema({
  task: String,
  status: String,
  priority: String,
  userID: mongoose.Schema.Types.ObjectId,
});

const task = mongoose.model("task", TaskSchema);

app.post("/registor", async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = new user({ username, password: hashed });
  await user.save();
  res.json({ message: "User has been registored" });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await user.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invaild Cresdentials" });
  }
  const token = jwt.sign({ userID: user._id }, "secret", { expiresIn: "1h" });
  res.json({ token });
});

const AuthMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: " No Token" });
  try {
    const decode = jwt.verify(token, "secret");
    req.userID = decode.userID;
    next();
  } catch (e) {
    res.status(401).json({ message: "Invaild Token" });
  }
};

app.get("/tasks", AuthMiddleware, async (req, res) => {
  const tasks = await Task.findOne({ userID: req.userID });
  res.json(tasks);
});

app.post("/tasks", AuthMiddleware, async (req, res) => {
  const task = new Task({ ...req.body, userID: req.userID });
  await task.save();
  res.json(task);
});

app.delete("/tasks/:id", AuthMiddleware, async (req, res) => {
  await Task.findOneAndDelete({ _id: req.params.id, userID: req.userID });
  res.json({ message: "Task deleted" });
});

app.patch("/tasks/:id/status", AuthMiddleware, async (req, res) => {
  const { status } = req.body;
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userID: req.userID },
    { status },
    { new: true }
  );
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json(task);
});

app.patch("/tasks/:id/priority", AuthMiddleware, async (req, res) => {
  const { priority } = req.body;
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userID: req.userID },
    { priority },
    { new: true }
  );
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json(task);
});

app.listen(PORT, () => console.log("Server is running on port: 8080"));
