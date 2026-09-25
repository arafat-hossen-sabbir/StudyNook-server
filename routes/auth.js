const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const verifyToken = require("../middleware/auth");

const router = express.Router();

const isProd = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

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

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      name,
      email,
      photoURL: photoURL || "",
      password: hashedPassword,
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

    if (!user) {
      return res.status(401).send({
        message: "Invalid email or password",
      });
    }

    const passwordMatched = await bcrypt.compare(password, user.password);

    if (!passwordMatched) {
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

    res.cookie("token", token, cookieOptions);

    res.send({
      message: "Login successful",
      user: {
        _id: user._id,
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

// Google login
router.post("/google", async (req, res) => {
  try {
    const { name, email, photoURL } = req.body;

    if (!name || !email) {
      return res.status(400).send({
        message: "Name and email are required",
      });
    }

    const db = getDB();

    let user = await db.collection("users").findOne({ email });

    if (!user) {
      const newUser = {
        name,
        email,
        photoURL: photoURL || "",
        password: null,
        provider: "google",
        createdAt: new Date(),
      };

      const result = await db.collection("users").insertOne(newUser);

      user = { ...newUser, _id: result.insertedId };
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

    res.cookie("token", token, cookieOptions);

    res.send({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    res.status(500).send({
      message: "Failed to login with Google",
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
    secure: isProd,
    sameSite: isProd ? "none" : "strict",
  });

  res.send({
    message: "Logout successful",
  });
});

module.exports = router;
