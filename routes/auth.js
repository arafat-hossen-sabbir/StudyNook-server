const express = require("express");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const verifyToken = require("../middleware/auth");

const router = express.Router();

// Register user
router.post("/register", async (req, res) => {
  try {
    const { name, email, photoURL, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).send({
        message: "Name, email and password are required",
      });
    }

    const db = getDB();

    const existingUser = await db.collection("users").findOne({
      email,
    });

    if (existingUser) {
      return res.status(409).send({
        message: "User already exists",
      });
    }

    const user = {
      name,
      email,
      photoURL: photoURL || "",
      password,
      createdAt: new Date(),
    };

    const result = await db.collection("users").insertOne(user);

    res.status(201).send({
      message: "Registration successful",
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).send({
      message: "Failed to register user",
    });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        message: "Email and password are required",
      });
    }

    const db = getDB();

    const user = await db.collection("users").findOne({
      email,
    });

    if (!user || user.password !== password) {
      return res.status(401).send({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.send({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    res.status(500).send({
      message: "Failed to login",
    });
  }
});

// Get current logged-in user
router.get("/me", verifyToken, async (req, res) => {
  try {
    const db = getDB();

    const user = await db.collection("users").findOne(
      {
        _id: new ObjectId(req.user.userId),
      },
      {
        projection: {
          password: 0,
        },
      },
    );

    if (!user) {
      return res.status(404).send({
        message: "User not found",
      });
    }

    res.send(user);
  } catch (error) {
    res.status(500).send({
      message: "Failed to get current user",
    });
  }
});

// Logout user
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.send({
    message: "Logout successful",
  });
});

module.exports = router;
