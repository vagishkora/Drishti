# 🔮 Drishti (दृष्टि) — Cyber-Hardened Creator Platform

> ⚠️ **NOTICE: ACTIVE DEVELOPMENT & PUBLIC BETA (`v0.9.0-beta`)**
> 
> Drishti is currently under active engineering and continuous security hardening. Core cryptographic primitives, Zero-Trust controls, and Neon database engines are operational, with ongoing development targeting media CDN pipeline enhancements and hardware token support.

[![Status: Active Development](https://img.shields.io/badge/Status-Active%20Development%20(Beta)-ff9800.svg)](#development-roadmap)
[![Security: Zero-Trust](https://img.shields.io/badge/Security-Zero--Trust-10b981.svg)](#security-architecture)
[![Cryptography: NIST P-256 ECDH + AES-256-GCM](https://img.shields.io/badge/Crypto-P--256%20ECDH%20%2B%20AES--GCM-6366f1.svg)](#cryptographic-engine)
[![Audit: SHA-256 Chained Ledger](https://img.shields.io/badge/Audit-SHA--256%20Chained-f59e0b.svg)](#tamper-evident-audit-ledger)
[![Database: Neon PostgreSQL](https://img.shields.io/badge/Database-Neon%20Serverless%20Postgres-00e599.svg)](https://neon.tech)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Drishti (दृष्टि — *Vision*) is an enterprise-grade creator and media streaming platform built from the ground up with a **security-first, zero-trust philosophy**. 

Instead of relying on perimeter security or client-side trust, Drishti incorporates **browser-native End-to-End Encryption (E2EE)**, **tamper-evident SHA-256 audit ledgers**, **server-authoritative double-entry balance accounting**, and an interactive **Security Operations Center (SOC)** dashboard.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph "Zero-Trust Client (React PWA)"
        UI[Cyber-Industrial UI & Command Palette Ctrl+K]
        CryptoEngine[Web Crypto API: ECDH P-256 + AES-GCM-256]
        Vault[Client IndexedDB Private Key Vault]
        CryptoEngine <--> Vault
    end

    subgraph "Defense Gateway (Node.js & Express API)"
        WAF[Helmet.js CSP & Rate Limiter]
        AuthSvc[Bcrypt + Signed JWT + 2FA Engine]
        MsgSvc[Zero-Knowledge Ciphertext Router]
        AuditEmitter[SIEM Telemetry Emitter]
    end

    subgraph "Root-of-Trust (Neon Serverless PostgreSQL)"
        Schema[Master Relational Schema - 21 Tables]
        HashChain[(security_audit_logs: SHA-256 Chained Blocks)]
        Ledger[(credit_transactions: Double-Entry Ledger)]
        KeyStore[(user_keys: SPKI Public Key Directory)]
        AuditProc[Stored Procedure: verify_audit_log_integrity]
        CreditProc[Stored Procedure: add_credits_secure]
    end

    UI --> WAF
    CryptoEngine -->|Ciphertext + IV Only| MsgSvc
    WAF --> AuthSvc
    AuthSvc --> AuditEmitter
    AuditEmitter --> HashChain
    MsgSvc --> KeyStore
    WAF --> CreditProc
    CreditProc --> Ledger
    AuditProc -.->|Mathematical Verification| HashChain
```

---

## 🔐 Core Security & Cryptographic Specifications

| Security Primitive | Implementation Standard | Threat Mitigated |
| :--- | :--- | :--- |
| **E2EE Key Agreement** | NIST Curve P-256 (secp256r1) ECDH | Man-in-the-Middle (MitM), Passive Wiretapping |
| **Message Encryption** | AES-256-GCM (Authenticated Encryption) | Ciphertext Tampering, Bit-Flipping, Replay Attacks |
| **Key Storage** | Browser-Isolated IndexedDB Key Vault | Database Host Compromise, Plaintext Leakage |
| **Audit Ledger Integrity** | SHA-256 Hash Chained Linked Blocks | SQL Injection Tampering, Rogue DB Admin Alterations |
| **Balance Accounting** | Pessimistic Locking (`FOR UPDATE`) + Stored Procedures | Concurrency Race Conditions, Balance Underflow |
| **Multi-Factor Auth (MFA)** | RFC 6238 TOTP with AES-256-GCM Envelope Encryption | Credential Stuffing, Database Dump Exposure |
| **Emergency Recovery** | Salted SHA-256 Hashing with Single-Use Burn | Offline Brute-Force of Account Recovery Codes |
| **Privilege Control** | Stored Procedure & Trigger Constraint Enforcement | Client-Side Privilege Escalation (`is_admin`, `credits`) |

---

## ⚡ Quick Start & Verification

### Prerequisites
- Node.js v18+ (tested on v20 & v24)
- Neon Serverless PostgreSQL instance

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/drishti.git
cd drishti

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
cd ..
```

### 2. Environment Setup
```bash
# Configure backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your Neon DATABASE_URL and JWT_SECRET

# Configure frontend environment
cp frontend/.env.example frontend/.env.local
```

### 3. Run Automated 5-Phase Security Verification
Execute the automated test suite verifying all cryptographic invariants, stored procedures, and audit chains live against Neon:
```bash
node backend/tests/verify_all_phases.js
```

### 4. Launch Development Environment
```bash
# Windows
.\start.bat

# Or run manually in separate terminals:
# Terminal 1 (Backend API):
cd backend && npm run dev

# Terminal 2 (Frontend Client):
cd frontend && npm run dev
```

---

## 🛡️ Security Operations Center (SOC) Preview

Drishti features an administrative SOC dashboard providing real-time visibility into the cryptographic state of the application:
* **1-Click Audit Verification:** Calls `verify_audit_log_integrity()` to mathematically verify every historical SHA-256 chained block from the Genesis Block to current head.
* **Live SIEM Feed:** Surfaces authentication events, 2FA recovery code burn events, and financial mutations with actor UUID and IP attribution.
* **Global Cyber CLI:** Press `Ctrl+K` (or `Cmd+K`) anywhere in the application to access the command palette.

---

## 📚 Documentation & Research Artifacts

- [STRIDE Threat Model & Security Whitepaper](docs/security_whitepaper.md)
- [Resume Bullet Points & AppSec Interview Guide](docs/resume_bullet_points.md)
- [System Architecture Specification](docs/architecture.md)

---

## 🗺️ Active Development & Security Roadmap

Drishti follows an iterative security engineering lifecycle:

- [x] **Phase 1: Database Root-of-Trust** — 21-table Neon PostgreSQL schema, server-authoritative balance procedures (`add_credits_secure`), underflow guards.
- [x] **Phase 2: Cryptographic Engine** — Browser-native NIST P-256 ECDH + AES-256-GCM zero-knowledge messaging, IndexedDB private key vault, out-of-band SHA-256 fingerprints.
- [x] **Phase 3: Backend Hardening** — Bcrypt (12 rounds), signed JWTs, RFC 6238 TOTP 2FA, AES-256-GCM envelope encryption at rest, single-use hashed recovery code burn.
- [x] **Phase 4: SOC & Telemetry UI** — Real-time SIEM audit stream, 1-click `verify_audit_log_integrity()` verification, Cyber Command Palette (`Ctrl+K`).
- [x] **Phase 5: Threat Modeling & Verification** — STRIDE threat analysis, automated 5-phase test runner (`verify_all_phases.js`).
- [ ] **Phase 6 (In Progress): Decentralized Media Delivery** — Cloudflare R2 / AWS S3 presigned upload URLs with client-side chunking and zero-trust bucket policies.
- [ ] **Phase 7 (Upcoming): FIDO2 / WebAuthn Hardware Tokens** — YubiKey and platform biometric authenticator support (Passkeys).
- [ ] **Phase 8 (Upcoming): Automated Security CI/CD** — GitHub Actions pipeline running `verify_all_phases.js` and automated Semgrep / OWASP ZAP scans on PRs.

---

## 📜 License
MIT License. Created by Vagish for academic and cybersecurity engineering portfolio demonstration.
