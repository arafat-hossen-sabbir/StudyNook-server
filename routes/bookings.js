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

router.get("/my-bookings", verifyToken, async (req, res) => {
  try {
    const db = getDB();

    const bookings = await db
      .collection("bookings")
      .aggregate([
        {
          $match: {
            userId: req.user.userId,
          },
        },
        {
          $lookup: {
            from: "rooms",
            localField: "roomId",
            foreignField: "_id",
            as: "room",
          },
        },
        {
          $unwind: "$room",
        },
        {
          $sort: {
            bookingDate: 1,
            startTime: 1,
          },
        },
      ])
      .toArray();

    res.send(bookings);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch bookings",
    });
  }
});

router.patch("/:id/cancel", verifyToken, async (req, res) => {
  try {
    const db = getDB();

    const bookingId = new ObjectId(req.params.id);

    const booking = await db.collection("bookings").findOne({
      _id: bookingId,
    });

    if (!booking) {
      return res.status(404).send({
        message: "Booking not found",
      });
    }

    if (booking.userId !== req.user.userId) {
      return res.status(403).send({
        message: "You can only cancel your own booking",
      });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).send({
        message: "Only confirmed bookings can be cancelled",
      });
    }

    const today = new Date();
    const bookingDate = new Date(`${booking.bookingDate}T00:00:00`);

    if (bookingDate < new Date(today.toDateString())) {
      return res.status(400).send({
        message: "Past bookings cannot be cancelled",
      });
    }

    await db.collection("bookings").updateOne(
      {
        _id: bookingId,
      },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
        },
      },
    );

    await db.collection("users").updateOne(
      {
        _id: new ObjectId(req.user.userId),
      },
      {
        $pull: {
          bookings: bookingId,
        },
      },
    );

    res.send({
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    res.status(500).send({
      message: "Failed to cancel booking",
    });
  }
});

module.exports = router;
