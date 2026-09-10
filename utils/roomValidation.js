const validateRoom = (room) => {
  const { name, description, image, floor, capacity, hourlyRate, amenities } =
    room;

  if (
    !name ||
    !description ||
    !image ||
    !floor ||
    capacity === undefined ||
    hourlyRate === undefined ||
    !Array.isArray(amenities)
  ) {
    return "All room fields are required";
  }

  if (Number(capacity) < 1) {
    return "Capacity must be at least 1";
  }

  if (Number(hourlyRate) < 0) {
    return "Hourly rate cannot be negative";
  }

  if (amenities.length === 0) {
    return "At least one amenity is required";
  }

  return null;
};

module.exports = validateRoom;
