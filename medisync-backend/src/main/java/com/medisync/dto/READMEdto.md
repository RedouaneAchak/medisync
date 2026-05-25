# 📦 Data Transfer Objects (DTO)

This package contains the Data Transfer Objects (DTOs) for the MediSync API. 

## 🛡️ Architectural Purpose

In this system, we **never** expose our raw database Entities (like `Patient` or `User`) directly to the frontends, and we **never** accept raw Entities directly from incoming HTTP requests. 

Instead, we use DTOs to act as a strict security barrier between the Controller layer and the Service layer.

### Why we use DTOs:

1. **Preventing Over-Posting (Mass Assignment):** If a user tries to inject a `"role": "ADMIN"` field into a standard registration request, the `RegisterRequest` DTO simply ignores it because that field doesn't exist in the DTO shape.
2. **Decoupling:** The database schema can change (e.g., splitting a name into `firstname` and `lastname`) without breaking the mobile or web clients, as long as the DTO shape remains consistent.
3. **Data Hiding:** We can return a user's profile without accidentally returning their hashed password or internal database ID.

## 📂 Current Payloads

### Authentication Payloads

* `AuthenticationRequest`: Captures standard login credentials (`email`, `password`).
* `RegisterRequest`: Captures data for new user onboarding.
* `GoogleLoginRequest`: Captures the raw OAuth2 ID token from the client.
* `AuthenticationResponse`: Wraps the generated JWT to send back to the client.

## 🛠️ Best Practices

* **Lombok Driven:** All DTOs utilize Lombok's `@Data`, `@Builder`, `@NoArgsConstructor`, and `@AllArgsConstructor` to eliminate boilerplate getter/setter code.
* **Validation:** Future iterations should include `spring-boot-starter-validation` annotations (like `@NotBlank` or `@Email`) directly on these fields to catch bad data before it even reaches the Service layer.