# MediSync Data Access Layer (Repositories)

## 📌 What are Repositories?
In the N-Tier architecture, **Repositories** (or DAOs - Data Access Objects) act as the "Librarians" or "Gatekeepers" of your database. They are Java Interfaces that provide the methods needed to Create, Read, Update, and Delete (CRUD) data from the databases.

## ❓ Why use them?
1. **Abstraction:** You don't have to write complex SQL or MongoDB queries. You just write a method name like `findByEmail()`, and Spring Boot writes the database query automatically.
2. **Security Injection Prevention:** Repositories automatically sanitize inputs, providing built-in defense against SQL Injection attacks.
3. **Separation of Concerns:** Keeps your business logic (Services) completely separate from your database logic. If you swap databases, your business rules don't have to change.

## 🛠️ How they work
You create an `Interface` and extend a Spring Data class.
* **SQL:** `extends JpaRepository<Model, ID>` connects to PostgreSQL.
* **NoSQL:** `extends MongoRepository<Model, ID>` connects to MongoDB.

Once created, you can inject these repositories into your Services to fetch or save data.

---

## 📂 Repositories Used in the MediSync Project

### 1. SQL Repositories (PostgreSQL)
These interfaces handle the strict relational data for the clinic's daily operations.

| Repository | Key Custom Methods | Purpose |
| :--- | :--- | :--- |
| **`UserRepository`** | `findByEmail(String email)` | The core of the Security Layer. Used to find a user during login to verify their password. |
| **`PatientRepository`** | `findBySocialSecurityNumber(String ssn)` | Allows secretaries to quickly pull up a patient's file. |
| **`DoctorRepository`** | `findBySpecialtyContainingIgnoreCase(String specialty)` | Powers the mobile app's search engine for patients looking for specialists. |
| **`RoomRepository`** | `findByRoomNumber(String number)` | Manages physical clinic resources. |
| **`AppointmentRepository`** | `findByDoctorIdAndDateTimeBetween(...)` | **Critical Business Logic:** Prevents double-booking of doctors or rooms. |
| **`InvoiceRepository`** | `findByIsPaidFalse()` | Instantly generates lists of patients who have outstanding balances. |

### 2. NoSQL Repositories (MongoDB)
These interfaces handle the rapid reading and writing of logs and medical documents.

| Repository | Key Custom Methods | Purpose |
| :--- | :--- | :--- |
| **`ConsultationRepository`** | `findByPatientId(Long id)` | Retrieves a patient's entire medical history (notes, prescriptions, files) at once. |
| **`AuditLogRepository`** | `findByUserIdOrderByTimestampDesc(Long id)` | **Cybersecurity Focus:** Allows admins to monitor a specific user's system activity chronologically. |
| **`NotificationLogRepository`** | `existsByAppointmentIdAndType(...)` | Checks if a 24h or 1h reminder was already sent to prevent duplicate emails. |
