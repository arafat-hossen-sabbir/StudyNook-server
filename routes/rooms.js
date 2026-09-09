const express = require("express");
const { getDB } = require("../config/db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const db = getDB();

    const rooms = await db
      .collection("rooms")
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.send(rooms);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch rooms",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const db = getDB();

    const room = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("rooms").insertOne(room);

    res.status(201).send({
      message: "Room created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).send({
      message: "Failed to create room",
    });
  }
});

module.exports = router;
