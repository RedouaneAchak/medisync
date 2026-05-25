# ⚙️ Service Layer (Business Logic)

This package contains the core operations of the hospital system. Controllers should possess zero business logic and strictly delegate to these services.

---

## 📂 Services in the MediSync Project

### `AuthenticationService`
Manages the onboarding and verification of users.

* `register()` — Creates a `User` + linked `Patient` profile atomically. Returns a JWT so the user is logged in immediately after signup.
* `authenticate()` — Standard email/password login. Issues a signed JWT on success.
* `googleLogin()` — Verifies the Google ID Token, auto-provisions a `Patient` if the email is new, and swaps it for a native MediSync JWT.

> **Security Note:** Google Client ID is injected via `@Value("${google.client-id}")`, never hardcoded.

---

### `PatientService`
Manages the patient's personal space and medical dossier.

* `getProfile()` / `updateProfile()` — Read and update personal information.
* `getAppointmentHistory()` — Returns all past and upcoming appointments.
* `getMedicalHistory()` — Fetches consultation records from MongoDB. **Writes an AuditLog entry on every access** for RGPD compliance.
* `uploadDocument()` — Appends an external file (PDF, JPG, DICOM) to the MongoDB dossier.
* `getDependents()` — Returns minor/dependent patients linked to a guardian. Powers the "book for a third party" feature.

---

### `DoctorService`
Manages doctor profiles, search, and availability.

* `searchBySpecialty()` — Case-insensitive search. Powers the patient-facing doctor discovery screen.
* `getTodayAppointments()` — Returns the doctor's patient list for the current day.
* `getAvailableSlots()` — Generates all possible time slots (08:00–18:00), then filters out already-booked ones. Returns only free windows.
* `updateProfile()` — Updates specialty, bio, spoken languages, and consultation rate.

---

### `AppointmentService`
The central engine managing the complete lifecycle of every appointment.

* `create()` — Validates doctor availability, then room availability, before saving. Fails atomically if any conflict is detected.
* `update()` — Re-runs conflict checks while excluding the appointment being edited to avoid false positives.
* `cancel()` / `confirm()` — Updates status and triggers a `NotificationLog` entry.

> **Double-booking is architecturally impossible:** `checkDoctorAvailability()` and `checkRoomAvailability()` are called on every write before any data is saved.

---

### `ConsultationService`
Manages medical records stored as documents in MongoDB.

* `create()` — Doctor writes clinical notes and electronic prescriptions post-consultation.
* `update()` — Null-safe update: only fields explicitly provided are overwritten.
* `addFile()` — Appends imaging or lab results to an existing consultation document.
* `getByPatient()` — Full medical history for the doctor to review during a consultation.

---

### `InvoiceService`
Handles billing and financial reporting.

* `generate()` — Creates an invoice for an appointment. Enforces one-invoice-per-appointment.
* `markAsPaid()` — Called by the secretary after collecting payment.
* `getUnpaid()` — All outstanding invoices. Feeds the secretary's debt-tracking view.
* `getByPeriod()` / `getTotalRevenue()` — Used to generate daily, monthly, and annual financial reports.

---

### `SecretaryService`
An orchestration layer. Contains no independent business logic — strictly delegates to the appropriate domain service.

* `createPatientAccount()` — Creates a `User` + `Patient` for a walk-in with no existing account. Generates a temporary password automatically.
* Delegates all appointment operations to `AppointmentService`.
* Delegates all billing operations to `InvoiceService`.

---

### `AdminService`
Full control over the establishment and a global analytics view.

* `createUser()` — Creates any account type. Auto-provisions a `Doctor` profile if role is `DOCTOR`.
* `createRoom()` / `deleteRoom()` — Manages physical clinic resources.
* `getDashboard()` — Returns all KPIs in a single call: total appointments, no-show rate, revenue, unpaid invoices, consultations per doctor, and room occupancy.
* `getAuditLogs()` — Full chronological log of all sensitive system actions from MongoDB.
