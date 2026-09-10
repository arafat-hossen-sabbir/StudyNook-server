const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const validateRoom = require("../utils/roomValidation");

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
    const validationError = validateRoom(req.body);

    if (validationError) {
      return res.status(400).send({
        message: validationError,
      });
    }

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

router.get("/:id", async (req, res) => {
  try {
    const db = getDB();

    const room = await db.collection("rooms").findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!room) {
      return res.status(404).send({
        message: "Room not found",
      });
    }

    res.send(room);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch room",
    });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    if (req.body.capacity !== undefined && Number(req.body.capacity) < 1) {
      return res.status(400).send({
        message: "Capacity must be at least 1",
      });
    }

    if (req.body.hourlyRate !== undefined && Number(req.body.hourlyRate) < 0) {
      return res.status(400).send({
        message: "Hourly rate cannot be negative",
      });
    }

    const db = getDB();

    const roomId = new ObjectId(req.params.id);

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };

    const result = await db.collection("rooms").updateOne(
      { _id: roomId },
      {
        $set: updateData,
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Room not found",
      });
    }

    res.send({
      message: "Room updated successfully",
    });
  } catch (error) {
    res.status(500).send({
      message: "Failed to update room",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = getDB();

    const result = await db.collection("rooms").deleteOne({
      _id: new ObjectId(req.params.id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Room not found",
      });
    }

    res.send({
      message: "Room deleted successfully",
    });
  } catch (error) {
    res.status(500).send({
      message: "Failed to delete room",
    });
  }
});

module.exports = router;
