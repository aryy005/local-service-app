# LocalPro - Local Service Marketplace
## Complete Technical Documentation & Architecture Guide

---

## 1. Project Overview
**LocalPro** is a modern, full-stack, two-sided marketplace web application designed to connect local consumers with neighborhood service professionals (e.g., Plumbers, Tailors, Electricians). 

The platform supports a dual-role ecosystem where users can seamlessly maintain a "Customer" or "Service Provider" persona, request jobs, update profiles, and manage active service bookings in real-time, all integrated with live geolocation finding.

---

## 2. Technology Stack (MERN)

The application is built on the popular **MERN** stack, supercharged with Vite for lightning-fast frontend tooling.

### Frontend (Client-side)
*   **React 18:** The core UI library used to build the interactive, component-based user interface.
*   **Vite:** The modern frontend build tool, offering incredibly fast Hot Module Replacement (HMR) and optimized production builds.
*   **React Router v6:** Handles seamless Single Page Application (SPA) routing, allowing users to navigate between pages without reloading the browser.
*   **Lucide-React:** Provides the beautiful, consistent SVG icon set used throughout the application.
*   **Context API:** Native React state management used to maintain the active User Session (AuthContext) and Light/Dark Mode (ThemeContext) across all components globally.
*   **Vanilla CSS (CSS Variables):** A robust, custom-built design system that supports dynamic theming and responsive grid layouts without relying on heavy external CSS frameworks.

### Backend (Server-side)
*   **Node.js / Express.js:** The lightweight server infrastructure routing API endpoints and handling logic securely.
*   **MongoDB Atlas (Mongoose):** A scalable, cloud-based NoSQL database housing all users and bookings. Mongoose is used as the Object Data Modeling (ODM) library to enforce strict document schemas.
*   **JSON Web Tokens (JWT):** The stateless authentication standard used to securely transmit the user's logged-in identity between the frontend and backend.
*   **Bcrypt.js:** Used to heavily encrypt/hash user passwords before storing them in the database for maximum security.
*   **Cors & Dotenv:** Essential middleware for handling Cross-Origin requests from the React frontend and securely managing private environment variables.

---

## 3. System Workflows

### A. Authentication & Registration Workflow
1.  A user navigates to `/auth/register`. They choose between the "Customer" or "Service Provider" role.
2.  If they choose Provider, additional fields dynamically render (Category, Hourly Rate, Bio, Location).
3.  Upon submission, the frontend POSTs to `/api/auth/register`. 
4.  The backend encrypts the password Using Bcrypt and creates a Mongoose Document. 
5.  A secure `JWT` is generated and returned to the frontend. The `AuthContext` saves this token to `localStorage` and redirects the user to their appropriate Dashboard.

### B. Booking Workflow
1.  Customers browse the homepage and view `ProviderCard` components.
2.  Clicking a provider takes them to the `ProviderProfile` page.
3.  Clicking "Book Now" opens the `BookingModal`. The Location field has a "Locate Me" button that uses the browser's native `navigator.geolocation` API chained with the OpenStreetMap reverse-geocoding API to parse raw coordinates into readable city addresses.
4.  The form POSTs to `/api/bookings`.
5.  The Provider sees the new `pending` booking populated in their `ProviderDashboard` with the Customer's Name, Phone, and precise Address. They can "Accept", "Decline", or mark as "Completed".

---

## 4. File Structure & Directory Breakdown

Below is the high-level **Folder Blueprint** separating the frontend React app and backend Node server:

```text
local-service-app/
│
├── server/                     # BACKEND ENVIRONMENT
│   ├── middleware/             # Security interception
│   │   └── auth.js             # JWT Verification
│   ├── models/                 # Database Schemas (Mongoose)
│   │   ├── Booking.js          # Booking structure & status
│   │   └── User.js             # User data & Password hashing
│   ├── routes/                 # API Endpoints
│   │   ├── auth.js             # Login/Register endpoints
│   │   └── bookings.js         # Booking CRUD operations
│   ├── .env                    # Secret environment vectors
│   └── server.js               # Main Express.js Entry Point
│
├── src/                        # FRONTEND ENVIRONMENT
│   ├── assets/                 # SVGs and Images
│   ├── components/             # Reusable UI Blocks
│   │   ├── BookingModal.jsx    # Pop-up for scheduling
│   │   ├── Footer.jsx          # Page footer
│   │   ├── Header.jsx          # Navigation / Locate Me tool
│   │   └── ProviderCard.jsx    # Mini provider display
│   ├── context/                # Global React State
│   │   ├── AuthContext.jsx     # User session management
│   │   └── ThemeContext.jsx    # Dark/Light mode management
│   ├── pages/                  # Full-page Views
│   │   ├── CustomerDashboard.jsx 
│   │   ├── ProviderDashboard.jsx
│   │   ├── ProviderProfile.jsx # Public resume page
│   │   ├── Home.jsx            # Landing page
│   │   ├── Login.jsx           
│   │   └── Register.jsx        
│   ├── utils/                  # Helper functions
│   │   └── geolocation.js      # GPS to Address API logic
│   ├── App.jsx                 # Routing logic mapping
│   ├── index.css               # Core visual design variables
│   └── main.jsx                # React DOM Injector
│
├── package.json                # Project Dependencies
└── index.html                  # Core HTML file
```

The codebase is specifically split into two completely independent domains: `/server` (The Backend) and `/src` (The Frontend).

### The Backend Directory (`/server`)
Responsible for data management and security.

*   `server.js`: **The Entry Point**. It initializes the Express app, connects to MongoDB via Mongoose, configures middleware, and defines the base API route prefixes (`/api/auth`, `/api/bookings`).
*   `.env`: **The Secret Vault**. Contains private connection strings (like the `MONGO_URI`) and encryption keys (`JWT_SECRET`). It is explicitly ignored by git.
*   `/middleware/auth.js`: **The Security Guard**. A function that intercepts protected API routes. It reads the JWT from the incoming request headers, verifies it hasn't been tampered with, and injects the decoded `user.id` into the request so the controllers know *who* is making the request.
*   `/models/User.js`: **The User Schema**. Maps out exactly what a User looks like in MongoDB. It enforces required fields (Name, Email, Password, Role, Phone) and contains nested schema data tailored for Providers (`providerDetails`). It also contains the pre-save hook that auto-hashes passwords.
*   `/models/Booking.js`: **The Booking Schema**. Maps out a service request. It fundamentally relies on Mongoose `ObjectIds` to create relational links between the Customer (`customerId`) and the Provider (`providerId`). It tracks the Date, Timeref, Status, and Location.
*   `/routes/auth.js`: **The Identity Controller**. Contains the logic for registering new users, logging in existing users, and fetching/updating the currently logged-in user's profile information.
*   `/routes/bookings.js`: **The Transaction Controller**. Dictates who can create a booking (Customers only), who can view a booking (Only the people involved), and who can update a booking's status (Providers only).

### The Frontend Directory (`/src`)
Responsible for the interactive UI and client logic.

#### Configuration & Assets
*   `main.jsx`: **The React Root**. Injects the entire React application into the browser HTML DOM. It wraps the app inside the React Router and Context Providers.
*   `App.jsx`: **The Central Router**. Maps URLs (like `/` or `/provider/:id`) to their respective Page Components. It dynamically controls the layout structure based on the URL context.
*   `index.css`: **The Design System**. Contains globally scoped CSS variables (colors, fonts, spacing) that dynamically swap palettes when toggling Dark/Light mode.

#### Global Contexts (`/context`)
*   `AuthContext.jsx`: Manages global user state. It handles login, logout, and automatic relogin (fetching `/api/auth/me` on refresh if a token exists in `localStorage`).
*   `ThemeContext.jsx`: Simple toggle logic governing whether the application currently has the `dark` class applied to its root HTML element.

#### Reusable Components (`/components`)
*   `Header.jsx` & `Footer.jsx`: Persistent layout shells surrounding the main page content.
*   `ProviderCard.jsx`: A miniature, glanceable representation of a Service Provider heavily used on the homepage/search pages.
*   `BookingModal.jsx`: The vital pop-up interface handling the form inputs necessary to lock down a booking request with a specific provider.

#### Pages / Views (`/pages`)
*   `Home.jsx`: The landing page consisting of Hero banners and a mapped list of `ProviderCards`.
*   `Login.jsx` & `Register.jsx`: The visually rich authentication forms that securely funnel credentials to the `AuthContext`.
*   `CustomerDashboard.jsx`: The isolated view for Customers. Split into "My Orders" (tracking status of outbound requests) and "My Profile" (editing name/phone data).
*   `ProviderDashboard.jsx`: The isolated view for Service Providers. Split into "My Jobs" (allowing them to Accept/Decline incoming user requests) and "My Profile" (editing their Hourly Rate, Phone, Location, and Bio).
*   `ProviderProfile.jsx`: The public-facing resume page for a specific provider, viewed by customers right before they hit the "Book Now" button.

#### Utilities (`/utils`)
*   `geolocation.js`: A specialized helper module containing the `getCurrentLocationName()` function. It handles browser permissions, extracts longitude/latitude, and contacts OpenStreetMap's free remote servers to fetch English location names.
