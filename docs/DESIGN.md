# PillMinder - Design Documentation

## User Personas

### Ida (Independent Resident)
- **Age:** 82
- **Tech Comfort:** Low
- **Primary Needs:**
  - Instant confirmation of medication status
  - Large, forgiving touch targets
  - No complex navigation
  - Visual clarity (green check = taken)

### Sam (Family Caregiver)
- **Age:** 45
- **Tech Comfort:** High
- **Primary Needs:**
  - Passive monitoring without intrusion
  - Quick status checks
  - Historical adherence data
  - Alerts for missed doses

### Brenda (Nurse)
- **Age:** 35
- **Tech Comfort:** Medium
- **Primary Needs:**
  - Efficient floor management
  - Priority-based patient list
  - Quick access to overdue medications
  - Minimal administrative overhead

## Key HCI Principles Applied

### 1. Visibility of System Status
- Large progress indicators showing "X of Y medications taken"
- Color-coded medication cards (green=taken, red=missed, white=pending)
- Instant visual feedback when logging doses

### 2. Match Between System and Real World
- Simple language: "Take Now" instead of "Log Administration"
- Medication names and dosages match prescription labels
- Time shown in 12-hour format with AM/PM

### 3. User Control and Freedom
- Clear back buttons on all screens
- Undo capability for accidental taps (confirmation dialogs)
- Easy logout accessible from all pages

### 4. Consistency and Standards
- Same button styles throughout
- Consistent color coding (green=good, red=alert, blue=action)
- Standard navigation patterns

### 5. Error Prevention
- Large touch targets (minimum 64x64dp)
- Confirmation for critical actions
- Clear visual hierarchy to prevent mis-taps

### 6. Recognition Rather Than Recall
- Medication icons and colors for quick identification
- Status visible at a glance (no need to remember)
- Today's schedule shown prominently

### 7. Flexibility and Efficiency
- Simple view for residents
- Detailed view for caregivers/nurses
- Filter and sort options for professionals

### 8. Aesthetic and Minimalist Design
- No clutter on resident screens
- Only essential information shown
- Generous whitespace

### 9. Help Users Recognize and Recover
- Clear error messages
- Help text on every screen
- Contact information for assistance

### 10. Accessibility
- WCAG 2.1 AA compliant
- High contrast mode support
- Screen reader compatible
- Large text options

## Color Palette

### Primary Colors
- Blue (#2563EB): Primary actions, links
- Green (#10B981): Success, taken medications
- Red (#EF4444): Alerts, missed medications
- Yellow (#F59E0B): Warnings, pending items

### Neutral Colors
- Gray 50 (#F9FAFB): Background
- Gray 100 (#F3F4F6): Cards
- Gray 900 (#111827): Text

## Typography

- Base font size: 18px (larger than standard 16px)
- Headings: Bold, high contrast
- Body text: Minimum 18px for readability
- Touch targets: Minimum 48px

## User Flows

### Flow 1: Morning Medication Check (Ida)
1. Ida approaches kitchen tablet
2. Sees large progress indicator at top
3. Views medication cards for today
4. Takes medication
5. Taps "Take Now" button
6. Card instantly turns green with checkmark
7. Feels confident and proceeds with day

### Flow 2: Remote Check (Sam)
1. Sam opens app during work
2. Sees dashboard with mother's card
3. Green status shows "All caught up"
4. Taps for detail view
5. Reviews week's adherence
6. Closes app reassured

### Flow 3: Nurse Round (Brenda)
1. Brenda opens nurse dashboard
2. Sees prioritized list (overdue first)
3. Room 204 flagged as high priority
4. Taps to see overdue medications
5. Visits room and administers meds
6. Returns to dashboard, sees update

## Technical Considerations

### Tablet-First Design
- Optimized for 10" tablets in landscape
- Large touch targets for tremor accommodation
- High contrast for vision impairments

### Real-Time Updates
- WebSocket for instant caregiver notifications
- No need to refresh to see updates

### Offline Support
- Basic functionality works offline
- Sync when connection restored
