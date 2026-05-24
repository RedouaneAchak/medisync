# 🛡️ MediSync Security Layer (The Vault)

## 📌 Overview
This folder contains the core cybersecurity infrastructure for the **MediSync** backend. Because medical data is highly sensitive, this application abandons traditional stateful sessions in favor of **Stateless JSON Web Tokens (JWT)** and **Role-Based Access Control (RBAC)**. 

Beyond access control, this layer implements active threat mitigation to defend against Brute Force attacks, DDoS attempts, Cross-Site Scripting (XSS), and Cross-Origin Resource Sharing (CORS) vulnerabilities.

## ❓ Why this Architecture?
1. **Stateless Scalability:** The server does not store session IDs in its memory. Every request carries its own cryptographic proof of identity.
2. **Cryptographic Integrity:** Tokens are signed using HMAC-SHA256. Any tampering breaks the mathematical signature, instantly rejecting the request.
3. **Defense-in-Depth:** Security is applied in layers. Traffic is filtered by IP rate limits before any CPU-intensive cryptographic operations occur.

---

## 📂 Core Components

### 1. `RateLimitFilter.java` (The Shield)
* **Purpose:** Defends against Brute Force and Denial of Service (DDoS) attacks.
* **Responsibilities:** Uses the Bucket4j library to enforce a Token Bucket algorithm, restricting each IP address to a strict limit of requests per minute (e.g., 50 req/min). Violators receive a `429 Too Many Requests` status.

### 2. `JwtAuthenticationFilter.java` (The Frontline Bouncer)
* **Purpose:** A filter that executes `OncePerRequest` to intercept incoming traffic that has passed the Rate Limiter.
* **Responsibilities:** Scans the HTTP Headers for the `Authorization` tag. If a token is found, it passes it to the `JwtService` for validation.

### 3. `JwtService.java` (The Cryptography Engine)
* **Purpose:** Handles all mathematical operations regarding the JWT.
* **Responsibilities:** Generates tokens upon login and mathematically verifies the signature and expiration of incoming tokens using a 256-bit secret key injected from the environment variables.

### 4. `SecurityConfig.java` (The Firewall Rulebook)
* **Purpose:** The master configuration class tying all filters and rules together.
* **Responsibilities:**
  * **CORS:** Strictly restricts incoming API requests to the trusted Angular (`localhost:4200`) and Ionic (`localhost:8100`) origins.
  * **XSS Headers:** Injects strict Content Security Policies (CSP) to prevent cross-site scripting.
  * **Filter Ordering:** Ensures the Rate Limiter executes *before* the JWT filter to protect server CPU resources.
  * **Endpoint Routing:** Maps specific URL paths to explicit Authorities (e.g., `/api/admin/**` strictly requires the `ADMIN` role).

---

## 🛡️ Active Threat Mitigation Summary

| Attack Vector | Defense Mechanism | Layer of Enforcement |
| :--- | :--- | :--- |
| **Brute Force / DDoS** | Bucket4j Token Bucket (50 req/min) | `RateLimitFilter` |
| **SQL Injection (SQLi)** | Parameterized Queries (JPA) | `Repository` Layer |
| **Cross-Site Scripting (XSS)**| Content Security Policy (CSP) Headers | `SecurityConfig` |
| **Session Hijacking / CSRF** | Stateless JWTs / No Cookies | `SecurityConfig` |
| **Unauthorized API Access** | Strict CORS Origin Whitelisting | `SecurityConfig` |

---

## 🔄 The Authentication Flow

1. **Request:** A client sends an HTTP request to a protected endpoint.
2. **Rate Check:** `RateLimitFilter` checks the IP's request bucket. If empty, the connection drops.
3. **Interception:** `JwtAuthenticationFilter` intercepts the request before it reaches the Controller.
4. **Validation:** The cryptographic signature is checked via `JwtService`.
5. **Authorization:** `SecurityConfig` checks if the validated user's `Role` matches the endpoint's requirements.
6. **Execution:** If all checks pass, the request proceeds to the business logic.