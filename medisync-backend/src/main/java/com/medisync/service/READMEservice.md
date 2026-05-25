# ⚙️ Service Layer (Business Logic)

This package contains the core operations of the hospital system. Controllers should possess zero business logic and strictly delegate to these services.

### AuthenticationService
Manages the onboarding and verification of users.


**Standard Flow (`authenticate`, `register`):**

* Takes DTOs from the controller.
* Hashes incoming passwords for registration.
* Compares hashes using Spring's `AuthenticationManager` for login.
* Issues a signed JWT upon success.

**OAuth2 Token Swap Flow (`googleLogin`):**

* Receives a raw Google ID Token from the Angular/Ionic client.
* Verifies the cryptographic signature against Google's public keys using `GoogleIdTokenVerifier`.
* Checks the database for the extracted email.
* Automatically provisions a new `Patient` account if no record exists.
* Swaps the Google token for a native MediSync JWT to maintain architectural consistency.