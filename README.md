# UCC Hospital Booking Platform

A full-stack Hospital Appointment & Patient Management System built for the University of Cape Coast.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase-compatible) |
| Auth | JWT + bcryptjs |
| Frontend | Vanilla JS SPA with hash-based routing |
| Styling | Vanilla CSS with design tokens |
| Icons | Lucide Icons |

## Features

- **Multi-role system**: Patient, Doctor, Admin
- **Appointment booking** with 30-minute slot generation and double-booking prevention
- **Doctor availability management** (weekly schedule)
- **Simulated payment processing** (MTN MoMo, Telecel Cash, AirtelTigo Money, Card)
- **Medical records** creation and viewing
- **In-app notifications** with unread badge
- **Admin dashboard** with stats, user management, and CSV export
- **Profile management** with password change
- **Dark / Light theme** toggle
- **Mobile responsive** design

## Prerequisites

- [Node.js](https://nodejs.org/) v18+ 
- A PostgreSQL database (e.g. [Supabase](https://supabase.com/) free tier)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd ucchmbk-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database URL and a secure JWT secret.

4. **Start the server**
   ```bash
   npm start
   ```
   The app will be available at `http://localhost:3000`.

## Default Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@hospital.com` | `admin123` |
| Doctor | `dr.smith@hospital.com` | `doctor123` |
| Doctor | `dr.jones@hospital.com` | `doctor123` |

> **⚠️ Important**: Change default passwords immediately in production.

## Project Structure

```
ucchmbk-main/
├── server.js              # Express app entry point
├── package.json
├── .env.example           # Environment variable template
├── db/
│   ├── database.js        # PostgreSQL pool + query helpers
│   ├── init.js            # Schema application + seed data
│   └── schema.sql         # DDL — table definitions + indexes
├── middleware/
│   └── auth.js            # JWT authentication + role authorization
├── routes/
│   ├── auth.js            # Register, login, profile, password
│   ├── appointments.js    # Book, list, reschedule, cancel, complete
│   ├── doctors.js         # Doctor listing + availability + slots
│   ├── payments.js        # Payment processing + receipts + stats
│   ├── admin.js           # Dashboard stats, user management, export
│   ├── medical-records.js # Create + view medical records
│   └── notifications.js   # In-app notification management
└── public/
    ├── index.html         # SPA shell
    ├── css/styles.css     # Full design system (1600+ lines)
    ├── images/
    │   └── ucc-logo.png
    └── js/
        ├── app.js         # Router, auth, API helper, theme
        └── pages/
            ├── login.js
            ├── register.js
            ├── forgot-password.js
            ├── patient-dashboard.js
            ├── book-appointment.js
            ├── doctor-dashboard.js
            ├── admin-dashboard.js
            └── profile-panel.js
```

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register patient or doctor |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | ✅ | Get current user + role data |
| GET | `/api/auth/profile` | ✅ | Get full profile |
| PUT | `/api/auth/profile` | ✅ | Update profile fields |
| POST | `/api/auth/change-password` | ✅ | Change own password |
| POST | `/api/auth/reset-password` | Admin | Reset any user's password |

### Appointments
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/appointments` | Patient | Book appointment |
| GET | `/api/appointments` | ✅ | List appointments (role-filtered) |
| PUT | `/api/appointments/:id` | Patient/Admin | Reschedule |
| PATCH | `/api/appointments/:id/cancel` | ✅ | Cancel appointment |
| PATCH | `/api/appointments/:id/complete` | Doctor | Mark completed |

### Doctors
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/doctors` | — | List all doctors |
| GET | `/api/doctors/:id/slots?date=` | — | Get available slots |
| POST | `/api/doctors/availability` | Doctor | Add availability |
| GET | `/api/doctors/availability/me` | Doctor | View own availability |
| DELETE | `/api/doctors/availability/:id` | Doctor | Remove availability |

### Payments
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/payments` | Patient | Process payment |
| GET | `/api/payments` | Patient/Admin | List payments |
| GET | `/api/payments/stats` | Admin | Revenue statistics |
| GET | `/api/payments/receipt/:id` | Patient/Admin | Payment receipt |

### Admin
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/stats` | Admin | Dashboard statistics |
| GET | `/api/admin/users` | Admin | List all users |
| DELETE | `/api/admin/users/:id` | Admin | Delete user |
| GET | `/api/admin/export` | Admin | Export CSV |

## License

MIT
