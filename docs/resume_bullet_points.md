# Drishti (दृष्टि) — Cybersecurity & Software Engineering Resume Artifacts

Use these tailored bullet points for Software Engineering, Cybersecurity Engineering, and Application Security (AppSec) roles.

---

## 🎯 Master Resume Bullet Points (Flagship Portfolio Centerpiece)

### Option 1: Software Engineer / Full-Stack Security Focus
* **Architected and engineered Drishti**, a Zero-Trust creator platform featuring end-to-end encrypted (E2EE) messaging, tamper-evident cryptographic audit ledgers, and server-authoritative double-entry balance accounting.
* **Implemented browser-native E2EE engine** using Web Crypto API (`NIST Curve P-256 ECDH` + `AES-256-GCM`), establishing out-of-band SHA-256 fingerprint verification and isolated client-side private key storage in IndexedDB (zero plaintext stored on server).
* **Designed a tamper-evident SIEM audit trail** in PostgreSQL with SHA-256 cryptographic hash chaining (`Prev_Hash || ID || Event || Actor || Timestamp || Metadata`), complemented by stored procedures that mathematically verify ledger integrity from a Genesis block.
* **Hardened application against OWASP Top 10 vulnerabilities**, establishing AES-256-GCM envelope encryption at rest for TOTP secrets, single-use hashed emergency recovery codes, and strict database triggers preventing client-side privilege escalation.
* **Migrated relational data layer to Neon Serverless PostgreSQL**, implementing high-throughput connection pooling via `pg.Pool`, signed JWT authentication (15m access tokens + httpOnly cookies), and a live Security Operations Center (SOC) telemetry dashboard.

---

### Option 2: Application Security (AppSec) / Security Engineer Focus
* **Zero-Trust Access Control & Defense Engineering:** Engineered server-authoritative RBAC preventing client-side elevation of privilege (`is_admin`, `credits`, `is_verified`) using stored procedure constraints and dual-layer authorization middleware.
* **Cryptographic Architecture & Key Management:** Designed end-to-end encrypted messaging protocols via Elliptic-Curve Diffie-Hellman (`ECDH P-256`) key exchange and authenticated symmetric encryption (`AES-GCM-256`), eliminating server-side visibility into in-transit and at-rest message content.
* **Tamper-Evident Audit Logging:** Formulated a blockchain-inspired append-only audit ledger in PostgreSQL utilizing continuous SHA-256 hash chaining, detecting retroactive data modification with sub-millisecond stored procedure verification.
* **Authentication Hardening & Multi-Factor Auth (MFA):** Deployed RFC 6238 TOTP two-factor authentication featuring envelope encryption of secrets at rest (AES-256-GCM), bcrypt password hashing (12 rounds), and single-use SHA-256 hashed recovery tokens with automatic burn-on-use.
* **Threat Modeling & Defense Automation:** Formulated comprehensive STRIDE threat model document; engineered a real-time SOC dashboard surfacing live security telemetry, authentication failure trips, and cryptographic ledger verification.

---

## 📊 Technical Skills Demonstrated

* **Cryptographic Primitives:** ECDH (NIST Curve P-256 / secp256r1), AES-256-GCM (Authenticated Encryption), SHA-256, HMAC, Bcrypt, Web Crypto API (`crypto.subtle`), Envelope Encryption.
* **Security & Defense Concepts:** Zero-Trust Architecture, STRIDE Threat Modeling, OWASP Top 10 Mitigation, Tamper-Evident Hash Chaining, SIEM & Security Auditing, Multi-Factor Authentication (RFC 6238 TOTP), Single-Use Emergency Tokens, Defense-in-Depth.
* **Database & Backend Architecture:** Neon Serverless PostgreSQL, Stored Procedures (PL/pgSQL), Database Triggers, Double-Entry Financial Ledgers, Row-Level Locking (`FOR UPDATE`), Node.js, Express.js, JWT, Helmet.js, Rate Limiting.
* **Frontend Security & Architecture:** React, TypeScript, IndexedDB Key Isolation, PWA Service Workers, Glassmorphism Cyber-Industrial UI, Command Palette CLI (`Ctrl+K`).

---

## 💡 Interview Talking Points & Elevator Pitch

### "Tell me about your flagship project"
> *"Drishti is a Zero-Trust creator and media streaming platform that I designed with a security-first philosophy. Rather than relying on client trust or standard perimeter defenses, I wanted to build an application where the database and communications are mathematically provable and resilient.
> 
> I engineered a browser-native E2EE messaging system using Web Crypto API with NIST P-256 ECDH and AES-256-GCM authenticated encryption, keeping private keys securely in IndexedDB so the backend only ever sees ciphertext.
> 
> For auditing and platform compliance, I built a tamper-evident audit ledger in Neon PostgreSQL where each security event is hashed and chained to its predecessor with SHA-256—similar to a cryptographic blockchain. If an insider or attacker alters a historical record in the database, the stored procedure `verify_audit_log_integrity()` mathematically catches the break instantly.
> 
> On top of that, I developed a Security Operations Center dashboard in the Admin panel where administrators can monitor live security events and trigger cryptographic integrity audits with a single click."*

---

## 🔬 Invariant Test Suite Commands
To run the automated security verification suites against live Neon PostgreSQL:
```bash
# Phase 1: Database Root-of-Trust & Stored Procedures
node backend/tests/verify_phase1.js

# Phase 2: NIST P-256 ECDH & AES-256-GCM Cryptographic Engine
node backend/tests/verify_phase2.js

# Phase 3: Backend Hardening, TOTP 2FA & Audit Pipeline
node backend/tests/verify_phase3.js
```
