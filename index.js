const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectDB } = require("./config/db");
const roomsRouter = require("./routes/rooms");
const authRouter = require("./routes/auth");

const app = express();

const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("StudyNook server is running");
});

app.use("/api/rooms", roomsRouter);
app.use("/api/auth", authRouter);

const startServer = async () => {
  await connectDB();

  app.listen(port, () => {
    console.log(`StudyNook server running on port ${port}`);
  });
};

startServer();
