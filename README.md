
## API Endpoints

### Auth — `/api/auth`

| Method | Endpoint | Description | Auth Required |
|--------|----------|--------------|----------------|
| POST | `/register` | Register a new user | No |
| POST | `/login` | Login with email/password | No |
| POST | `/google` | Login/register via Google (Firebase) | No |
| GET | `/me` | Get current logged-in user | Yes |
| POST | `/logout` | Logout and clear cookie | No |

### Rooms — `/api/rooms`

| Method | Endpoint | Description | Auth Required |
|--------|----------|--------------|----------------|
| GET | `/` | Get all rooms (supports `search`, `amenities`, `floor`, `minPrice`, `maxPrice` query params) | No |
| POST | `/` | Create a new room | Yes |
| GET | `/my-listings` | Get rooms owned by the current user | Yes |
| GET | `/latest` | Get the 6 most recently added rooms | No |
| GET | `/:id` | Get a single room by ID | No |
| PATCH | `/:id` | Update a room (owner only) | Yes |
| DELETE | `/:id` | Delete a room (owner only) | Yes |

### Bookings — `/api/bookings`

| Method | Endpoint | Description | Auth Required |
|--------|----------|--------------|----------------|
| POST | `/` | Create a booking (validates time, availability, conflicts) | Yes |
| GET | `/my-bookings` | Get bookings for the current user, with room details | Yes |
| PATCH | `/:id/cancel` | Cancel a confirmed, future booking (owner only) | Yes |

## Authentication Flow

1. On register/login, the server issues a JWT and sets it as an `httpOnly` cookie named `token`.
2. Protected routes use the `verifyToken` middleware, which reads the cookie, verifies the JWT, and attaches `req.user`.
3. Logout clears the cookie.
4. Google Sign-In accepts `name`, `email`, and `photoURL` from the client (obtained via Firebase), creates the user if they don't exist, and issues the same JWT cookie.

## Business Rules

- Only the room owner can update or delete their own room.
- Bookings must be for a future or current date, within 08:00–20:00, at least 1 hour long.
- Double-booking the same room for an overlapping time slot is prevented.
- Only the booking owner can cancel their own confirmed booking; past bookings cannot be cancelled.

## License

This project is for educational purposes.