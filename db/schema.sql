-- ============================================
-- UCC Hospital Booking Platform — Database Schema
-- PostgreSQL
-- ============================================

-- Users table (all roles: patient, doctor, admin)
CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role        TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
    phone       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Session invalidation: increment on password change to revoke old JWTs
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;

-- Doctors table (extends users with role = 'doctor')
CREATE TABLE IF NOT EXISTS doctors (
    id                TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    specialization    TEXT NOT NULL,
    bio               TEXT DEFAULT '',
    consultation_fee  NUMERIC(10, 2) DEFAULT 0
);

-- Patients table (extends users with role = 'patient')
CREATE TABLE IF NOT EXISTS patients (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth   TEXT,
    gender          TEXT,
    blood_group     TEXT,
    address         TEXT DEFAULT ''
);

-- Doctor weekly availability windows
CREATE TABLE IF NOT EXISTS doctor_availability (
    id          TEXT PRIMARY KEY,
    doctor_id   TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time  TEXT NOT NULL,
    end_time    TEXT NOT NULL
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id          TEXT PRIMARY KEY,
    patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id   TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    date        TEXT NOT NULL,
    time_slot   TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'rescheduled', 'completed', 'cancelled')),
    notes       TEXT DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id              TEXT PRIMARY KEY,
    appointment_id  TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id      TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    amount          NUMERIC(10, 2) NOT NULL DEFAULT 0,
    currency        TEXT NOT NULL DEFAULT 'GHS',
    payment_method  TEXT NOT NULL,
    payment_phone   TEXT,
    card_last4      TEXT,
    transaction_ref TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'completed', 'failed')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Medical records
CREATE TABLE IF NOT EXISTS medical_records (
    id              TEXT PRIMARY KEY,
    diagnosis       TEXT NOT NULL,
    treatment       TEXT NOT NULL,
    patient_id      TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id       TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_id  TEXT REFERENCES appointments(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message     TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'info'
                CHECK (type IN ('success', 'info', 'warning', 'error')),
    read        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for query performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email            ON users(email);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id         ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_user_id        ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient    ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor     ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date       ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_payments_appointment    ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient        ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user      ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_avail_doctor     ON doctor_availability(doctor_id);

-- Partial unique index to prevent double-booking of active slots
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_slot 
ON appointments (doctor_id, date, time_slot) 
WHERE status IN ('scheduled', 'rescheduled');

-- Patient Queues for daily check-in
CREATE TABLE IF NOT EXISTS patient_queues (
    id             TEXT PRIMARY KEY,
    appointment_id TEXT UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    doctor_id      TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id     TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    queue_date     TEXT NOT NULL,
    ticket_number  INTEGER NOT NULL,
    ticket_code    TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'checked_in'
                   CHECK (status IN ('checked_in', 'called', 'in_consultation', 'completed', 'no_show', 'cancelled')),
    check_in_time  TIMESTAMPTZ DEFAULT NOW(),
    called_at      TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ
);

-- Ensures unique ticket numbers per doctor per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_doctor_ticket 
ON patient_queues (doctor_id, queue_date, ticket_number);

-- Password reset OTP codes
CREATE TABLE IF NOT EXISTS password_resets (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_code    TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
