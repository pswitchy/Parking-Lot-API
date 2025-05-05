# Car Parking Lot API (NestJS)

This project implements a RESTful API for managing a car parking lot system using NestJS and TypeScript. It uses in-memory data structures (Maps and Priority Queue) to manage parking slots and car information, fulfilling the requirement of not using an external database.

## Features

*   Initialize a parking lot with a specific capacity.
*   Expand the parking lot by adding more slots.
*   Park a car, allocating the nearest available slot.
*   Unpark a car using either the slot number or the car's registration number.
*   Get the status of all occupied slots.
*   Query registration numbers of cars by color.
*   Query slot numbers occupied by cars of a specific color.
*   Query the slot number for a specific car registration number.

## Prerequisites

*   Node.js (v16 or later recommended)
*   npm (usually comes with Node.js) or yarn

## Postman Documentation and Deployment

Postman - https://documenter.getpostman.com/view/39067872/2sB2j6AAfT

Deployed link - https://parking-lot-api-ya9g.onrender.com

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/pswitchy/Parking-Lot-API
    cd Parking-Lot-API
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

## Running the Application

*   **Development Mode (with hot-reloading):**
    ```bash
    npm run start:dev
    ```
    The API will be available at `http://localhost:3000`.

*   **Production Mode:**
    ```bash
    npm run build
    npm run start:prod
    ```

## Running Tests

*   **Unit Tests:**
    ```bash
    npm run test
    ```
*   **Test Coverage:**
    ```bash
    npm run test:cov
    ```
*   **End-to-End Tests (requires running application):**
    ```bash
    npm run test:e2e
    ```

## Running with Docker

1.  **Build the Docker image:**
    ```bash
    docker build -t parking-lot-api .
    ```
2.  **Run the Docker container:**
    ```bash
    docker run -p 3000:3000 --name my-parking-app parking-lot-api
    ```
    The API will be accessible at `http://localhost:3000` on your host machine.

## API Endpoints

The base URL is `/parking-lots`.

---

**1. Initialize Parking Lot**

*   **Method:** `POST`
*   **URL:** `/parking-lots`
*   **Body:**
    ```json
    {
      "capacity": 6
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "message": "Parking lot created successfully.",
      "capacity": 6
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If capacity is missing, not an integer, or <= 0.
    *   (Note: Current implementation re-initializes if called again, logging a warning.)

---

**2. Expand Parking Lot**

*   **Method:** `PATCH`
*   **URL:** `/parking-lots`
*   **Body:**
    ```json
    {
      "addCapacity": 3
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
        "message": "Added 3 slots successfully.",
        "oldCapacity": 6,
        "newCapacity": 9
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If `addCapacity` is missing, not an integer, or <= 0, or if the lot is not initialized.

---

**3. Park a Car**

*   **Method:** `POST`
*   **URL:** `/parking-lots/parkings`
*   **Body:**
    ```json
    {
      "registrationNumber": "KA-01-HH-1234",
      "color": "White"
    }
    ```
*   **Success Response (201 Created):** (Allocates the nearest available slot)
    ```json
    {
      "slotNumber": 1,
      "registrationNumber": "KA-01-HH-1234",
      "color": "White"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid input (missing fields, invalid registration format), or if the lot is not initialized.
    *   `409 Conflict`: If the parking lot is full, or if a car with the same registration number is already parked.

---

**4. Unpark a Car**

*   **Method:** `DELETE`
*   **URL:** `/parking-lots/parkings`
*   **Query Parameters:** Provide *either* `slotNumber` *or* `registrationNumber`.
    *   Example 1: `/parking-lots/parkings?slotNumber=1`
    *   Example 2: `/parking-lots/parkings?registrationNumber=KA-01-HH-1234`
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Slot number 1 is free.",
      "freedSlotNumber": 1
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If neither or both query parameters are provided, if `slotNumber` is not a valid number, or if the lot is not initialized.
    *   `404 Not Found`: If the specified slot is already free, or if the car with the given registration number is not found.

---

**5. Get Parking Lot Status**

*   **Method:** `GET`
*   **URL:** `/parking-lots/status`
*   **Success Response (200 OK):** Returns an array of all occupied slots, sorted by slot number.
    ```json
    [
      {
        "slotNumber": 1,
        "registrationNumber": "KA-01-HH-1234",
        "color": "White"
      },
      {
        "slotNumber": 2,
        "registrationNumber": "KA-01-HH-9999",
        "color": "Black"
      }
      // ... other parked cars
    ]
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If the lot is not initialized.

---

**6. Get Registration Numbers by Color**

*   **Method:** `GET`
*   **URL:** `/parking-lots/registrations`
*   **Query Parameter:** `color` (required)
    *   Example: `/parking-lots/registrations?color=White`
*   **Success Response (200 OK):** Returns an array of registration numbers.
    ```json
    [
      "KA-01-HH-1234",
      "KA-01-HH-7777"
    ]
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If the `color` query parameter is missing, or if the lot is not initialized.

---

**7. Get Slot Numbers by Color**

*   **Method:** `GET`
*   **URL:** `/parking-lots/slots`
*   **Query Parameter:** `color` (required *if not* providing `registrationNumber`)
    *   Example: `/parking-lots/slots?color=White`
*   **Success Response (200 OK):** Returns an array of slot numbers, sorted numerically.
    ```json
    [
      1,
      3
    ]
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If required query parameters are missing, or if the lot is not initialized.

---

**8. Get Slot Number by Registration Number**

*   **Method:** `GET`
*   **URL:** `/parking-lots/slots`
*   **Query Parameter:** `registrationNumber` (required *if not* providing `color`)
    *   Example: `/parking-lots/slots?registrationNumber=KA-01-HH-1234`
*   **Success Response (200 OK):**
    ```json
    {
      "slotNumber": 1
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: If required query parameters are missing, or if the lot is not initialized.
    *   `404 Not Found`: If the car with the given registration number is not found.

---

## Assumptions

*   The system manages a single parking lot instance. Re-initializing clears the old state.
*   Registration numbers and colors are case-sensitive.
*   "Nearest" slot means the smallest available slot number.
*   Basic concurrency is handled by Node.js event loop; high-concurrency scenarios might require more advanced locking mechanisms.

## Time Complexity Notes

*   **Park Car:** O(log k) due to MinPriorityQueue dequeue (where k is the number of *available* slots). Map insertions are O(1) on average.
*   **Unpark Car:** O(log k) due to MinPriorityQueue enqueue. Map lookups/deletions are O(1) on average.
*   **Get Status/Queries by Color:** O(N) where N is the number of *occupied* slots, as it requires iterating through the `occupiedSlots` map.
*   **Get Slot by Registration Number:** O(1) on average due to map lookup.
*   **Initialize/Expand:** O(C) or O(AddC) respectively, where C is the capacity, due to populating the priority queue initially.
