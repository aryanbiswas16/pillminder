# PillMinder

A human-centered medication management app designed for older adults and their caregivers.

## 🎯 Project Overview

PillMinder addresses the critical need for accessible medication management among older adults (65+) who face cognitive and motor limitations. Unlike existing solutions that overwhelm users with complexity, PillMinder prioritizes **simplicity, clarity, and peace of mind**.

### Key Features

**For Primary Users (Elderly Residents):**
- ✓ Large, forgiving touch targets (minimum 64x64dp)
- ✓ Instant visual confirmation with high-contrast status indicators
- ✓ One-tap medication logging
- ✓ Clear "Did I take it?" status at a glance
- ✓ No complex navigation or small text

**For Secondary Users (Caregivers/Family):**
- ✓ Real-time adherence dashboard
- ✓ Missed dose alerts
- ✓ Historical adherence reports
- ✓ Multi-patient oversight for nurses
- ✓ Passive monitoring without intrusion

## 🏗️ Architecture

```
pillminder/
├── frontend/          # React + Tailwind CSS
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Main views (Resident, Caregiver, Nurse)
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/          # Helpers and constants
│   └── public/
├── backend/           # Node.js + Express + Sequelize (SQLite default, PostgreSQL optional)
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── models/         # Database models
│   │   ├── middleware/     # Auth, validation
│   │   └── socket/         # Real-time updates
│   └── migrations/
└── docs/              # Design docs, personas, user flows
```

## 🚀 Quick Start

### Windows One-Click Run

From the project root, run:

```powershell
.\run-app.cmd
```

This opens backend and frontend in separate terminal windows using `npm.cmd` (works even when PowerShell blocks `npm.ps1`).

### Prerequisites
- Node.js 18+
- npm or yarn

PostgreSQL is optional. The prototype runs with SQLite by default.

### Backend Setup

```bash
cd backend
npm install

# Optional: create .env from .env.example
# (for PostgreSQL, set DB_DIALECT=postgres and DB_* values)

# Run migrations
npm run migrate

# Start server
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

On Windows PowerShell, use `;` to chain commands (not `&&`). Example:

```powershell
cd backend; npm.cmd run migrate; npm.cmd run dev
```

The app will be available at `http://localhost:3000`

## 👥 User Scenarios

### Scenario 1: The Morning Check (Ida - Resident)
Ida, 82, is distracted by a phone call while taking her medication. She becomes uncertain if she completed her dose. She glances at her kitchen tablet and sees a **large green checkmark** — instant confirmation that her 9 AM heart medication was logged. No confusion, no second-guessing.

### Scenario 2: Remote Peace of Mind (Sam - Family)
Sam, 45, is at work wondering if his mother took her medication. Instead of calling and potentially disrupting her routine, he opens the PillMinder app. A simple status card reads: **"Mom: All meds taken today"**. He gets peace of mind without intrusion.

### Scenario 3: The Efficient Round (Brenda - Nurse)
Brenda starts her shift with 15 residents to check. Instead of flipping through paper logs, she opens the nurse dashboard. A **red flag** immediately shows that Room 204 missed their 9 AM dose. She prioritizes that room first, ensuring safety while saving time.

## 🎨 HCI Design Principles

1. **Visibility of System Status** — Users always know if meds were taken
2. **Match Between System and Real World** — Simple language, no jargon
3. **User Control and Freedom** — Easy to undo accidental taps
4. **Consistency and Standards** — Same patterns throughout
5. **Error Prevention** — Confirmation dialogs for critical actions
6. **Recognition Rather Than Recall** — Visual cues, not memory-dependent
7. **Flexibility and Efficiency** — Simple for residents, detailed for nurses
8. **Aesthetic and Minimalist Design** — No clutter, only what matters
9. **Help Users Recognize and Recover** — Clear error messages
10. **Accessibility** — WCAG 2.1 AA compliant

## 📱 Screenshots

*Coming soon - see docs/design/ for wireframes*

## 🔧 Tech Stack

- **Frontend:** React 18, Tailwind CSS, Socket.io-client
- **Backend:** Node.js, Express, Socket.io
- **Database:** SQLite (prototype default) or PostgreSQL with Sequelize ORM
- **Real-time:** WebSocket for live updates
- **Authentication:** JWT tokens
- **Testing:** Jest, React Testing Library

## 📝 License

MIT License - see LICENSE file

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

---

Built with care for older adults and their support networks.
