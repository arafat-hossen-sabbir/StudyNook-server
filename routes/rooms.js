const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const validateRoom = require("../utils/roomValidation");
const verifyToken = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { search, amenities, minPrice, maxPrice, floor } = req.query;

    const db = getDB();

    const filter = {};

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          description: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (amenities) {
      const amenityList = amenities
        .split(",")
        .map((amenity) => amenity.trim())
        .filter(Boolean);

      if (amenityList.length > 0) {
        filter.amenities = {
          $in: amenityList,
        };
      }
    }

    if (floor) {
      filter.floor = floor;
    }

    if (minPrice || maxPrice) {
      filter.hourlyRate = {};

      if (minPrice) {
        filter.hourlyRate.$gte = Number(minPrice);
      }

      if (maxPrice) {
        filter.hourlyRate.$lte = Number(maxPrice);
      }
    }

    const rooms = await db
      .collection("rooms")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.send(rooms);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch rooms",
    });
  }
});

router.post("/", verifyToken, async (req, res) => {
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
      ownerId: req.user.userId,
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

router.get("/my-listings", verifyToken, async (req, res) => {
  try {
    const db = getDB();

    const rooms = await db
      .collection("rooms")
      .find({
        ownerId: req.user.userId,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(rooms);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch your listings",
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

router.patch("/:id", verifyToken, async (req, res) => {
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

    const room = await db.collection("rooms").findOne({
      _id: roomId,
    });

    if (!room) {
      return res.status(404).send({
        message: "Room not found",
      });
    }

    if (room.ownerId !== req.user.userId) {
      return res.status(403).send({
        message: "You can only update your own room",
      });
    }

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

router.delete("/:id", verifyToken, async (req, res) => {
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

    if (room.ownerId !== req.user.userId) {
      return res.status(403).send({
        message: "You can only delete your own room",
      });
    }

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
