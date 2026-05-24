# MediSync Data Models (Entities)

## 📌 What are Models?
In a Spring Boot application, **Models** (also known as Entities or Data Transfer Objects) are Java classes that represent real-world concepts. They act as the "blueprint" or "DNA" of your application's data. Instead of interacting with raw rows and columns in a database, your code interacts with these Java objects.

## ❓ Why use them?
1. **Object-Relational Mapping (ORM):** They map Object-Oriented Java code directly to database tables (SQL) or document collections (NoSQL).
2. **Data Integrity:** They enforce constraints (e.g., ensuring a password field is never null, or linking a patient to an appointment).
3. **Cybersecurity:** Using strong typing and structured models prevents malicious data injection, as the structure is strictly validated before hitting the database.
4. **Reduced Boilerplate:** Combined with tools like Project Lombok (`@Data`), they keep the code clean and readable.

## 🛠️ How they work
Models use **Annotations** to tell the Spring framework how to treat them:
* `@Entity` + `@Table`: Tells PostgreSQL this class is a relational table.
* `@Document`: Tells MongoDB this class is a NoSQL document.
* `@Id`: Marks the primary key.
* `@OneToOne`, `@ManyToOne`: Defines SQL relationships and foreign keys.

---

## 📂 Models Used in the MediSync Project

### 1. Relational Models (PostgreSQL)
These entities handle strict business logic and relationships.

| Model | Purpose | Key Relationships |
| :--- | :--- | :--- |
| **`User`** | The base identity for authentication (JWT/Security). | Extended by Patient/Doctor. |
| **`Patient`** | Stores patient details and demographics. | Self-references for `Guardian` (Minors). |
| **`Doctor`** | Stores professional details (Specialty, Rates). | Linked to Appointments. |
| **`Room`** | Physical clinic resources. | Tracks equipment and occupancy. |
| **`Appointment`** | The hub connecting a Doctor, Patient, and Room. | Generates Invoices. |
| **`Invoice`** | Handles billing and payment status. | Linked 1:1 with an Appointment. |

### 2. Document Models (MongoDB)
These models handle flexible, unstructured, or high-volume data.

| Model | Purpose | Key Concept |
| :--- | :--- | :--- |
| **`Consultation`** | Stores long medical notes and large file attachments (PDFs/DICOMs). | Variable size per record. |
| **`AuditLog`** | Tracks every system action (who clicked what, from what IP). | Critical for security compliance. |
| **`NotificationLog`**| Tracks 24h/1h reminders to prevent spamming patients. | Time-series event tracking. |

### 3. Enumerations (Global Types)
* **`Role`**: `PATIENT`, `DOCTOR`, `SECRETARY`, `ADMIN` (Used for JWT Access Control).
* **`PatientCategory`**: `ADULT`, `MINOR`, `DEPENDENT`, `CORPORATE`.
