# AstralCore V5 - Comprehensive Testing Plan
## Mental Health Application Test Strategy

---

## 1. INTERACTIVE ELEMENTS MAP

### A. Crisis Support Page (`/crisis`)
#### Critical Safety Elements:
- **Emergency Contact Links** (lines 72-87)
  - ✅ `tel:988` - 988 Suicide & Crisis Lifeline
  - ✅ `sms:741741&body=HOME` - Crisis Text Line  
  - ✅ `tel:911` - Emergency Services
  - **TEST**: Verify all links trigger proper phone/SMS actions
  - **CRITICAL**: Must work on all devices/browsers

- **Navigation Links**
  - ✅ Start Crisis Chat button → `/therapy?crisis=true` (line 110)
  - ✅ Peer Support button → `/community` (line 119)
  - ✅ Back to Home → `/` (line 182)

### B. Safety Plan Builder (`/crisis/safety-plan`)
#### Form Elements & State Management:
- **Warning Signs Section** (lines 100-123)
  - ✅ Dynamic text inputs (add/remove)
  - ✅ Trash icon buttons for deletion
  - ✅ "Add Warning Sign" button
  - **TEST**: Verify state persistence, input validation

- **Coping Strategies Section** (lines 141-164)
  - ✅ Dynamic text inputs
  - ✅ Add/Remove functionality
  - **TEST**: Character limits, empty state handling

- **Support Contacts Section** (lines 182-221)
  - ✅ Name input field
  - ✅ Phone number input (tel type)
  - ✅ Relationship input
  - ✅ Delete contact buttons
  - **TEST**: Phone number validation, required fields

- **Professional Contacts Section** (lines 239-278)
  - ✅ Name/Title input
  - ✅ Phone number input
  - ✅ Organization input
  - **TEST**: Form validation, data persistence

- **Save Button** (line 289)
  - ✅ Save Safety Plan action
  - **CRITICAL**: Must handle save failures gracefully
  - **TEST**: Loading states, error handling, success feedback

### C. Mood Tracker (`/wellness/mood-tracker`)
#### Interactive Components:
- **Mood Selection Grid** (lines 131-151)
  - ✅ 5 mood options (1-5 scale)
  - ✅ Visual feedback on selection
  - ✅ Icon changes based on mood
  - **TEST**: Single selection only, visual state changes

- **Emotion Tags** (lines 158-171)
  - ✅ 18 emotion options
  - ✅ Multi-select toggles
  - **TEST**: Multiple selection, deselection, state tracking

- **Trigger Tags** (lines 178-191)
  - ✅ 12 trigger options  
  - ✅ Multi-select functionality
  - **TEST**: Combination selections, clearing selections

- **Notes Textarea** (lines 197-203)
  - ✅ Multi-line text input
  - ✅ Placeholder text
  - **TEST**: Character limits, special characters, XSS prevention

- **Save Button** (lines 207-214)
  - ✅ Disabled when no mood selected
  - ✅ Save mood entry action
  - **TEST**: Validation, success/error states

- **Quick Help Links** (lines 365-393)
  - ✅ AI Therapist → `/therapy`
  - ✅ Mood Resources → `/resources`
  - ✅ Community Support → `/community`
  - ✅ Crisis Support → `/crisis`

### D. Breathing Exercises (`/wellness/breathing`)
#### Exercise Controls:
- **Exercise Selection Cards** (lines 196-246)
  - ✅ 4 breathing patterns (4-7-8, Box, Triangle, Coherent)
  - ✅ Start Exercise buttons
  - **TEST**: Pattern selection, transition animations

- **Breathing Interface** (when exercise active)
  - ✅ Play/Pause button (lines 302-319)
  - ✅ Reset button (line 322-327)
  - ✅ Cycles dropdown (3, 5, 10, 15, 20) (lines 334-343)
  - ✅ Sound toggle button (lines 346-353)
  - ✅ Back to exercises link (line 358)
  - **TEST**: Timer accuracy, state transitions, visual feedback

### E. Dashboard (`/dashboard`)
#### Dashboard Elements:
- **Header Actions** (lines 110-118)
  - ✅ Notifications button
  - ✅ Settings button
  - **TEST**: Click handlers, visual feedback

- **Quick Action Cards** (lines 166-194)
  - ✅ Start AI Therapy → `/therapy`
  - ✅ Log Mood → `/wellness?action=mood`
  - ✅ Community → `/community`
  - ✅ Crisis Support → `/crisis`
  - **TEST**: Hover states, navigation, loading states

- **Weekly Progress Grid** (lines 269-281)
  - ✅ 7 day indicators
  - ✅ Checkmark/Plus icons
  - **TEST**: Visual states, data binding

### F. AI Therapy Page (`/therapy`)
#### Therapy Interface:
- **Start Session Button** (line 130)
  - ✅ Start Anonymous Session
  - ✅ Transitions to chat interface
  - **TEST**: Loading states, error handling

- **Crisis Support Link** (line 139)
  - ✅ Direct link to crisis page
  - **CRITICAL**: Must be always accessible

### G. Community Page (`/community`)
#### Complex Interactive System:
- **Navigation Tabs** (lines 214-254)
  - ✅ Overview tab
  - ✅ Chat Rooms tab
  - ✅ Support Groups tab
  - ✅ Mentorship tab
  - **TEST**: Tab switching, state persistence

- **Chat Room Selection** (lines 420-448)
  - ✅ Room list buttons
  - ✅ Room selection state
  - ✅ Participant counts
  - **TEST**: Real-time updates, connection handling

- **Feature Cards** (lines 341-374)
  - ✅ Clickable cards with hover effects
  - ✅ Navigation to sub-features
  - **TEST**: Animation triggers, navigation

- **Crisis Footer Links** (lines 505-515)
  - ✅ Call 988 link
  - ✅ Text HOME link
  - ✅ Crisis Resources link
  - **CRITICAL**: Always visible and functional

### H. Login Page (`/login`)
#### Authentication Elements:
- **Demo User Cards** (lines 163-219)
  - ✅ 4 demo user options
  - ✅ Login buttons for each role
  - ✅ Loading states during login
  - **TEST**: Role-based redirects, error handling

- **Alternative Login** (lines 234-249)
  - ✅ Google sign-in button
  - ✅ Create Account link → `/auth/signup`
  - **TEST**: OAuth flow, registration flow

---

## 2. CRITICAL USER FLOWS

### Flow 1: Crisis Intervention Path 🚨
**Priority: CRITICAL**
1. User lands on any page in distress
2. Clicks Crisis Support (available on all pages)
3. Views emergency contacts
4. Can immediately call/text for help
5. Optional: Create safety plan
6. Optional: Start crisis chat

**Test Cases:**
- ✅ Crisis button visible on ALL pages
- ✅ Emergency numbers clickable and correct
- ✅ Safety plan saves successfully
- ✅ Crisis chat flag properly set
- ✅ Works without authentication

### Flow 2: Mood Tracking Journey
**Priority: HIGH**
1. User navigates to Mood Tracker
2. Selects overall mood (1-5)
3. Chooses specific emotions
4. Identifies triggers
5. Adds optional notes
6. Saves entry
7. Views weekly history

**Test Cases:**
- ✅ Mood required before save
- ✅ Multiple emotions selectable
- ✅ Data persists after save
- ✅ History displays correctly
- ✅ Insights calculate properly

### Flow 3: Breathing Exercise Session
**Priority: HIGH**
1. User selects exercise type
2. Exercise timer starts
3. Visual breathing guide animates
4. User can pause/resume
5. Cycles complete automatically
6. Can adjust settings mid-session

**Test Cases:**
- ✅ Timer accuracy (4-7-8, Box, etc.)
- ✅ Animation sync with timer
- ✅ Pause maintains state
- ✅ Cycle counting correct
- ✅ Sound toggle works

### Flow 4: Community Support Access
**Priority: HIGH**
1. User logs in (or demo login)
2. Navigates to Community
3. Selects chat room
4. Sends messages
5. Receives real-time responses
6. Can report/block if needed

**Test Cases:**
- ✅ Authentication required
- ✅ WebSocket connection established
- ✅ Messages send/receive
- ✅ Room switching works
- ✅ Moderation tools functional

### Flow 5: Safety Plan Creation
**Priority: CRITICAL**
1. Navigate to Safety Plan Builder
2. Add warning signs
3. Add coping strategies
4. Add support contacts
5. Add professional contacts
6. Save complete plan

**Test Cases:**
- ✅ All sections save data
- ✅ Phone validation works
- ✅ Can delete/edit items
- ✅ Plan persists on refresh
- ✅ Export/share functionality

---

## 3. DETAILED TEST CHECKLIST

### A. Functional Testing

#### Crisis Features (CRITICAL)
- [ ] **Emergency Contacts**
  - [ ] 988 link dials correctly
  - [ ] Text HOME to 741741 works
  - [ ] 911 link functions
  - [ ] Links work on mobile devices
  - [ ] Links work in all browsers

- [ ] **Safety Plan**
  - [ ] Can add unlimited warning signs
  - [ ] Can remove individual items
  - [ ] Phone numbers validate format
  - [ ] Required fields enforced
  - [ ] Save shows success message
  - [ ] Data persists after save
  - [ ] Can edit existing plan

- [ ] **Crisis Detection**
  - [ ] Crisis keywords trigger alerts
  - [ ] Crisis mode in therapy chat
  - [ ] Emergency resources shown
  - [ ] Escalation paths work

#### Wellness Tools
- [ ] **Mood Tracker**
  - [ ] Mood selection required
  - [ ] Can select multiple emotions
  - [ ] Can select multiple triggers
  - [ ] Notes accept 500+ characters
  - [ ] Save disabled without mood
  - [ ] History shows last 7 days
  - [ ] Insights calculate correctly

- [ ] **Breathing Exercises**
  - [ ] 4-7-8 pattern timing accurate
  - [ ] Box breathing 4-4-4-4 correct
  - [ ] Triangle 4-4-4 works
  - [ ] Coherent 5-0-5 functions
  - [ ] Visual sync with timing
  - [ ] Pause maintains state
  - [ ] Reset returns to start
  - [ ] Cycle count accurate

#### Community Features
- [ ] **Chat Rooms**
  - [ ] Room list loads
  - [ ] Can select room
  - [ ] Messages send
  - [ ] Messages receive
  - [ ] Typing indicators work
  - [ ] User count updates
  - [ ] Can leave room

- [ ] **Support Groups**
  - [ ] Group list displays
  - [ ] Can join group
  - [ ] Schedule shows correctly
  - [ ] Notifications work

#### Authentication
- [ ] **Demo Login**
  - [ ] All 4 demo users work
  - [ ] Correct role redirects
  - [ ] Loading states show
  - [ ] Error handling works

- [ ] **Regular Login**
  - [ ] Google OAuth works
  - [ ] Create account link works
  - [ ] Session persists
  - [ ] Logout functions

### B. UI/UX Testing

#### Visual Elements
- [ ] **Animations**
  - [ ] Page transitions smooth
  - [ ] Hover effects work
  - [ ] Loading spinners show
  - [ ] Breathing circle animates
  - [ ] Button press feedback

- [ ] **Responsive Design**
  - [ ] Mobile layout (320px)
  - [ ] Tablet layout (768px)
  - [ ] Desktop layout (1024px+)
  - [ ] Text remains readable
  - [ ] Buttons touchable on mobile

#### Accessibility
- [ ] **WCAG Compliance**
  - [ ] Keyboard navigation works
  - [ ] Screen reader compatible
  - [ ] Color contrast sufficient
  - [ ] Focus indicators visible
  - [ ] Alt text present
  - [ ] ARIA labels correct

#### Error States
- [ ] **Form Validation**
  - [ ] Required field messages
  - [ ] Invalid input warnings
  - [ ] Network error handling
  - [ ] Save failure recovery
  - [ ] Graceful degradation

### C. Performance Testing

#### Loading Times
- [ ] Initial page load < 3s
- [ ] Route changes < 1s
- [ ] API responses < 2s
- [ ] WebSocket connection < 1s
- [ ] Image optimization working

#### State Management
- [ ] Form data persists
- [ ] Navigation maintains state
- [ ] Refresh handles gracefully
- [ ] Back button works correctly
- [ ] Session timeout handled

### D. Security Testing

#### Data Protection
- [ ] XSS prevention on inputs
- [ ] SQL injection blocked
- [ ] CSRF tokens present
- [ ] Sensitive data encrypted
- [ ] HTTPS enforced

#### Privacy
- [ ] Anonymous mode works
- [ ] Data minimization
- [ ] Consent mechanisms
- [ ] Data deletion possible
- [ ] No PII leakage

### E. Edge Cases

#### Crisis Scenarios
- [ ] Multiple crisis flags
- [ ] Simultaneous help requests
- [ ] Network disconnection
- [ ] Session timeout during crisis
- [ ] International numbers

#### Data Limits
- [ ] Max text input (10000 chars)
- [ ] Max items in lists (100+)
- [ ] Large mood history (365 days)
- [ ] Many chat messages (1000+)
- [ ] Multiple browser tabs

---

## 4. TEST EXECUTION PRIORITY

### Priority 1: Life-Critical Features 🚨
1. **Emergency contact links** (Crisis page)
2. **Crisis chat initiation** 
3. **Safety plan save functionality**
4. **Crisis detection in AI chat**
5. **24/7 availability of crisis resources**

### Priority 2: Core Wellness Features
1. **Mood tracker data persistence**
2. **Breathing exercise accuracy**
3. **Community chat functionality**
4. **AI therapy session start**
5. **Dashboard quick actions**

### Priority 3: User Experience
1. **Navigation between pages**
2. **Form validations**
3. **Visual feedback**
4. **Loading states**
5. **Error messages**

### Priority 4: Advanced Features
1. **Analytics displays**
2. **Settings management**
3. **Export functionality**
4. **Notification system**
5. **Search features**

---

## 5. REGRESSION TEST SUITE

### Daily Smoke Tests (5 min)
1. ✅ Crisis page loads
2. ✅ Emergency numbers clickable
3. ✅ Can start mood entry
4. ✅ Breathing exercise starts
5. ✅ Login works

### Weekly Full Test (2 hours)
1. Complete all critical flows
2. Test all form submissions
3. Verify data persistence
4. Check responsive layouts
5. Validate accessibility

### Release Candidate Test (4 hours)
1. Full functional test suite
2. Cross-browser testing
3. Mobile device testing
4. Performance benchmarks
5. Security scan

---

## 6. TEST ENVIRONMENT REQUIREMENTS

### Browsers
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

### Devices
- iPhone (various sizes)
- Android phones
- iPad
- Android tablets
- Desktop (Windows/Mac/Linux)

### Network Conditions
- High-speed (100+ Mbps)
- 3G mobile
- Offline mode
- Intermittent connection
- High latency (satellite)

---

## 7. AUTOMATED TEST COVERAGE

### Unit Tests Required
- Form validation logic
- Timer calculations
- State management
- API integrations
- Component rendering

### E2E Tests Required
- Crisis intervention flow
- Complete mood entry
- Full breathing session
- Safety plan creation
- Community chat flow

### Performance Tests
- Page load times
- API response times
- Database query optimization
- WebSocket performance
- Bundle size monitoring

---

## 8. ACCEPTANCE CRITERIA

### Must Pass (Blocking)
- ✅ All crisis features functional
- ✅ No data loss on save
- ✅ Works on mobile devices
- ✅ Accessible to screen readers
- ✅ Secure user data

### Should Pass (High Priority)
- ✅ Smooth animations
- ✅ Fast page loads
- ✅ Intuitive navigation
- ✅ Clear error messages
- ✅ Consistent styling

### Nice to Have
- ✅ Offline support
- ✅ PWA features
- ✅ Advanced analytics
- ✅ Keyboard shortcuts
- ✅ Customization options

---

## TEST EXECUTION LOG

### Test Session Template
```
Date: _______
Tester: _______
Environment: _______
Build Version: _______

Tests Executed:
[ ] Crisis Features
[ ] Mood Tracker
[ ] Breathing Exercises
[ ] Community Features
[ ] Authentication

Issues Found:
1. _______
2. _______
3. _______

Status: PASS / FAIL / BLOCKED
```

---

## CRITICAL NOTES FOR TESTERS

⚠️ **SAFETY FIRST**: Any failure in crisis features must be treated as CRITICAL and fixed immediately.

⚠️ **MENTAL HEALTH CONTEXT**: Remember users may be in vulnerable states. All features must be reliable and reassuring.

⚠️ **ACCESSIBILITY**: This app must work for everyone, including those with disabilities or limited tech access.

⚠️ **PRIVACY**: User data, especially mental health data, must be protected at all times.

⚠️ **24/7 AVAILABILITY**: The app must be resilient and available round-the-clock for crisis support.

---

*This testing plan should be reviewed and updated regularly as the application evolves. Mental health applications carry special responsibility for user safety and wellbeing.*