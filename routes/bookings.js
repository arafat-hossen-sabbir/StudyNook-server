const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const verifyToken = require("../middleware/auth");

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {
  try {
    const { roomId, bookingDate, startTime, endTime, specialNote } = req.body;

    if (!roomId || !bookingDate || !startTime || !endTime) {
      return res.status(400).send({
        message: "Room, date, start time and end time are required",
      });
    }

    const today = new Date();
    const selectedDate = new Date(`${bookingDate}T00:00:00`);

    if (selectedDate < new Date(today.toDateString())) {
      return res.status(400).send({
        message: "Booking date must be today or a future date",
      });
    }

    if (startTime >= endTime) {
      return res.status(400).send({
        message: "End time must be after start time",
      });
    }

    const startHour = Number(startTime.split(":")[0]);
    const endHour = Number(endTime.split(":")[0]);

    if (startHour < 8 || endHour > 20) {
      return res.status(400).send({
        message: "Booking time must be between 08:00 and 20:00",
      });
    }

    const duration = endHour - startHour;

    if (duration < 1) {
      return res.status(400).send({
        message: "Minimum booking duration is 1 hour",
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

    const conflictingBooking = await db.collection("bookings").findOne({
      roomId: new ObjectId(roomId),
      bookingDate,
      status: "confirmed",
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (conflictingBooking) {
      return res.status(409).send({
        message: "This room is already booked for the selected time",
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

    await db.collection("users").updateOne(
      {
        _id: new ObjectId(req.user.userId),
      },
      {
        $push: {
          bookings: result.insertedId,
        },
      },
    );

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
