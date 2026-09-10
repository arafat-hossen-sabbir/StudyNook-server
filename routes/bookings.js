const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const verifyToken = require("../middleware/auth");

const router = express.Router();

// Create a booking
router.post("/", verifyToken, async (req, res) => {
  try {
    const { roomId, bookingDate, startTime, endTime, specialNote } = req.body;

    if (!roomId || !bookingDate || !startTime || !endTime) {
      return res.status(400).send({
        message: "Room, date, start time and end time are required",
      });
    }

    if (startTime >= endTime) {
      return res.status(400).send({
        message: "End time must be after start time",
      });
    }

    const db = getDB();

    const room = await db.collection("rooms").findOne({
      _id: new ObjectId(roomId),
    });

    if (!room) {
      return res.status(404).send({
        message: "Room not found",
      });
    }

    const startHour = Number(startTime.split(":")[0]);
    const endHour = Number(endTime.split(":")[0]);

    const duration = endHour - startHour;

    if (duration < 1) {
      return res.status(400).send({
        message: "Minimum booking duration is 1 hour",
      });
    }

    const totalCost = duration * Number(room.hourlyRate);

    const booking = {
      roomId: new ObjectId(roomId),
      userId: req.user.userId,
      bookingDate,
      startTime,
      endTime,
      duration,
      totalCost,
      specialNote: specialNote || "",
      status: "confirmed",
      createdAt: new Date(),
    };

    const result = await db.collection("bookings").insertOne(booking);

    res.status(201).send({
      message: "Booking created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).send({
      message: "Failed to create booking",
    });
  }
});

module.exports = router;
