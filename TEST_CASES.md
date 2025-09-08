# AstralCore V5 - Critical Test Cases
## Detailed Test Scenarios for Mental Health Features

---

## TEST SUITE 1: CRISIS INTERVENTION 🚨

### TC-001: Emergency Contact Accessibility
**Priority:** CRITICAL  
**Precondition:** User on any page of the application  
**Test Steps:**
1. Navigate to `/crisis` page
2. Locate the emergency contact cards
3. Click on "988" link
4. Verify phone dialer opens with 988 pre-filled
5. Return to app
6. Click "Text HOME to 741741" link
7. Verify SMS app opens with recipient 741741 and message "HOME"
8. Click "911" link
9. Verify phone dialer opens with 911

**Expected Results:**
- All emergency links trigger appropriate actions
- Phone/SMS apps open correctly on mobile
- On desktop, appropriate prompts appear
- Links are clearly visible and accessible

**Pass Criteria:** All emergency contacts functional within 2 clicks from any page

---

### TC-002: Safety Plan Data Persistence
**Priority:** CRITICAL  
**Precondition:** User logged in  
**Test Steps:**
1. Navigate to `/crisis/safety-plan`
2. Add 3 warning signs:
   - "Feeling hopeless"
   - "Isolating from friends"
   - "Not sleeping well"
3. Add 2 coping strategies:
   - "Call a friend"
   - "Go for a walk"
4. Add support contact:
   - Name: "John Doe"
   - Phone: "555-1234"
   - Relationship: "Best Friend"
5. Click "Save Safety Plan"
6. Refresh the page
7. Verify all data persists

**Expected Results:**
- Save confirmation message appears
- All entered data remains after refresh
- No data loss occurs
- Phone number format validated

**Pass Criteria:** 100% data retention after save

---

### TC-003: Crisis Mode Activation in Chat
**Priority:** CRITICAL  
**Precondition:** User in therapy chat  
**Test Steps:**
1. Navigate to `/therapy`
2. Start anonymous session
3. Type message: "I want to end my life"
4. Send message
5. Observe system response

**Expected Results:**
- Immediate crisis alert triggered
- Crisis resources displayed prominently
- Emergency contacts shown
- Supportive message from AI
- Option to connect with human counselor

**Pass Criteria:** Crisis detection within 2 seconds, resources displayed immediately

---

## TEST SUITE 2: MOOD TRACKING

### TC-004: Complete Mood Entry Flow
**Priority:** HIGH  
**Precondition:** User on mood tracker page  
**Test Steps:**
1. Navigate to `/wellness/mood-tracker`
2. Select mood level 3 (Okay)
3. Select emotions: "Anxious", "Tired", "Hopeful"
4. Select triggers: "Work stress", "Sleep issues"
5. Enter note: "Had a challenging day at work but feeling better after talking to a friend"
6. Click "Save Today's Mood"
7. Check weekly view for entry

**Expected Results:**
- Mood selection changes color/icon
- Multiple emotions can be selected
- Multiple triggers can be selected
- Note accepts text without issues
- Save button enables only after mood selection
- Entry appears in weekly history

**Pass Criteria:** Complete entry saved and visible in history

---

### TC-005: Mood Tracker Input Validation
**Priority:** HIGH  
**Precondition:** Mood tracker page loaded  
**Test Steps:**
1. Try to save without selecting mood
2. Select mood, then try to save with 10,000 character note
3. Select all emotions (18 total)
4. Deselect all emotions
5. Select mood 5, save, then try to save again same day

**Expected Results:**
- Save disabled without mood selection
- Long notes handled gracefully (truncated or scrollable)
- All emotions selectable/deselectable
- Duplicate daily entries handled appropriately

**Pass Criteria:** No data corruption, appropriate validation messages

---

## TEST SUITE 3: BREATHING EXERCISES

### TC-006: 4-7-8 Breathing Pattern Accuracy
**Priority:** HIGH  
**Precondition:** Breathing exercise page loaded  
**Test Steps:**
1. Navigate to `/wellness/breathing`
2. Select "4-7-8 Breathing"
3. Set cycles to 3
4. Click "Start Exercise"
5. Time each phase with stopwatch:
   - Inhale phase (should be 4 seconds)
   - Hold phase (should be 7 seconds)
   - Exhale phase (should be 8 seconds)
6. Verify 3 complete cycles
7. Check total time = 3 × 19 seconds = 57 seconds

**Expected Results:**
- Each phase matches specified duration ±0.5 seconds
- Visual animation syncs with timer
- Cycle counter increments correctly
- Auto-stops after 3 cycles

**Pass Criteria:** Timing accuracy within 5% margin

---

### TC-007: Breathing Exercise Interruption Handling
**Priority:** MEDIUM  
**Precondition:** Exercise in progress  
**Test Steps:**
1. Start Box Breathing exercise
2. After 2 cycles, click Pause
3. Wait 10 seconds
4. Click Resume
5. Complete exercise
6. During new exercise, click Reset
7. Verify state returns to beginning

**Expected Results:**
- Pause freezes timer and animation
- Resume continues from pause point
- Reset returns to cycle 0, initial phase
- State maintained correctly throughout

**Pass Criteria:** No state corruption during interruptions

---

## TEST SUITE 4: COMMUNITY FEATURES

### TC-008: Real-time Chat Functionality
**Priority:** HIGH  
**Precondition:** User logged in, WebSocket connected  
**Test Steps:**
1. Navigate to `/community`
2. Click "Chat Rooms" tab
3. Select "Anxiety Support" room
4. Type message: "Hello everyone, first time here"
5. Press Enter to send
6. Open second browser, login as different user
7. Verify message appears in second browser
8. Reply from second browser
9. Verify reply appears in first browser

**Expected Results:**
- Messages send without delay
- Messages appear in real-time for all users
- User avatars and names display correctly
- Timestamp shows for each message
- No message duplication

**Pass Criteria:** Messages delivered within 2 seconds

---

### TC-009: Community Moderation Tools
**Priority:** MEDIUM  
**Precondition:** User in chat room  
**Test Steps:**
1. Send message with profanity
2. Send message with crisis keywords
3. Try to send 100 messages rapidly
4. Send very long message (5000 chars)
5. Try to share personal contact info

**Expected Results:**
- Profanity filtered or blocked
- Crisis keywords trigger appropriate response
- Rate limiting prevents spam
- Long messages truncated or blocked
- Personal info detection and warning

**Pass Criteria:** All safety mechanisms functional

---

## TEST SUITE 5: AUTHENTICATION & AUTHORIZATION

### TC-010: Demo User Role-Based Access
**Priority:** HIGH  
**Precondition:** Login page loaded  
**Test Steps:**
1. Click "Login as Sarah" (regular user)
2. Verify redirect to `/dashboard`
3. Check available features
4. Logout
5. Click "Login as Dr. Chen" (therapist)
6. Verify redirect to `/therapist-dashboard`
7. Check therapist-specific features visible
8. Logout
9. Test crisis counselor and admin roles similarly

**Expected Results:**
- Each role redirects to appropriate dashboard
- Role-specific features accessible
- Restricted features not visible for wrong roles
- Session maintains role correctly

**Pass Criteria:** Proper role-based access control enforced

---

## TEST SUITE 6: RESPONSIVE DESIGN

### TC-011: Mobile Crisis Page Usability
**Priority:** CRITICAL  
**Precondition:** Mobile device or emulator  
**Test Steps:**
1. Open app on mobile device (iPhone/Android)
2. Navigate to crisis page
3. Verify emergency buttons are thumb-reachable
4. Test touch targets (minimum 44x44px)
5. Scroll through warning signs
6. Verify text readable without zooming
7. Test landscape orientation

**Expected Results:**
- All critical buttons easily tappable
- No horizontal scrolling required
- Text legible at default zoom
- Layout adapts to orientation
- Emergency contacts always visible

**Pass Criteria:** Full functionality on screens ≥320px wide

---

### TC-012: Tablet Layout Optimization
**Priority:** MEDIUM  
**Precondition:** Tablet device or emulator (768px-1024px)  
**Test Steps:**
1. Load dashboard on tablet
2. Verify 2-column layout where appropriate
3. Test mood tracker grid layout
4. Check breathing exercise visualization
5. Test community chat sidebar
6. Verify touch gestures work

**Expected Results:**
- Optimal use of screen space
- No cramped or stretched layouts
- Touch targets appropriately sized
- Readable without zooming

**Pass Criteria:** Optimized layouts for tablet screens

---

## TEST SUITE 7: ACCESSIBILITY

### TC-013: Screen Reader Navigation
**Priority:** HIGH  
**Precondition:** Screen reader enabled (NVDA/JAWS/VoiceOver)  
**Test Steps:**
1. Navigate to home page using only keyboard
2. Tab through all interactive elements
3. Verify crisis button announced clearly
4. Navigate to mood tracker
5. Select mood using keyboard only
6. Fill safety plan using screen reader
7. Test chat interface with screen reader

**Expected Results:**
- All elements have descriptive labels
- Focus order logical
- Crisis features announced with urgency
- Form fields properly labeled
- Status messages announced
- No keyboard traps

**Pass Criteria:** Full app navigable via screen reader

---

### TC-014: Color Contrast & Visual Accessibility
**Priority:** HIGH  
**Precondition:** Various lighting conditions  
**Test Steps:**
1. Run automated contrast checker (WAVE/Axe)
2. Test in bright sunlight simulation
3. Test in dark mode (if available)
4. Verify without color (grayscale mode)
5. Test with color blindness simulators
6. Check focus indicators visibility

**Expected Results:**
- All text meets WCAG AA standards (4.5:1)
- Important elements meet AAA (7:1)
- Information not conveyed by color alone
- Focus indicators clearly visible
- Error states distinguishable

**Pass Criteria:** WCAG AA compliance minimum

---

## TEST SUITE 8: PERFORMANCE

### TC-015: Crisis Page Load Time
**Priority:** CRITICAL  
**Precondition:** Various network speeds  
**Test Steps:**
1. Clear cache and cookies
2. Set network to "Slow 3G" in DevTools
3. Navigate to `/crisis`
4. Measure time to:
   - First Contentful Paint
   - Emergency numbers visible
   - Page fully interactive
5. Repeat on Fast 3G, 4G, WiFi

**Expected Results:**
- Emergency numbers visible < 3 seconds on 3G
- Page interactive < 5 seconds on 3G
- No layout shift after initial load
- Critical resources prioritized

**Pass Criteria:** Emergency info accessible within 3 seconds on 3G

---

### TC-016: Breathing Exercise Performance
**Priority:** MEDIUM  
**Precondition:** Low-end device  
**Test Steps:**
1. Start breathing exercise on low-end phone
2. Monitor CPU usage during animation
3. Check for frame drops
4. Test with multiple exercises
5. Switch between exercises rapidly
6. Test for memory leaks over 30 minutes

**Expected Results:**
- Smooth animations (60fps target, 30fps minimum)
- CPU usage < 50%
- No memory leaks
- No janky animations
- Quick exercise switching

**Pass Criteria:** Smooth performance on 2GB RAM devices

---

## TEST SUITE 9: DATA INTEGRITY

### TC-017: Mood Data Consistency
**Priority:** HIGH  
**Precondition:** Multiple days of mood data  
**Test Steps:**
1. Enter mood data for 7 consecutive days
2. Check weekly view calculations
3. Export data (if available)
4. Delete one entry
5. Verify history updates correctly
6. Check average calculations
7. Test with missing days

**Expected Results:**
- All entries properly saved
- Calculations accurate
- Deletions handled cleanly
- Missing data doesn't break views
- Export includes all data

**Pass Criteria:** 100% data accuracy and consistency

---

### TC-018: Safety Plan Versioning
**Priority:** HIGH  
**Precondition:** Existing safety plan  
**Test Steps:**
1. Create initial safety plan
2. Save plan
3. Edit plan - add new contact
4. Save changes
5. Edit again - remove warning sign
6. Save changes
7. Verify current version correct
8. Check if version history available

**Expected Results:**
- Each save creates new version
- Latest version always displayed
- No data loss during edits
- Can recover previous versions (if feature exists)

**Pass Criteria:** Data integrity maintained through all edits

---

## TEST SUITE 10: SECURITY

### TC-019: Input Sanitization
**Priority:** CRITICAL  
**Precondition:** Form inputs available  
**Test Steps:**
1. In mood notes, enter: `<script>alert('XSS')</script>`
2. In safety plan, enter SQL injection: `'; DROP TABLE users; --`
3. In chat, send HTML: `<img src=x onerror=alert(1)>`
4. In name field: `<b>Bold Name</b>`
5. Submit each form
6. Verify outputs safely rendered

**Expected Results:**
- Scripts not executed
- SQL not interpreted
- HTML escaped or stripped
- No code execution
- Data safely stored and displayed

**Pass Criteria:** No security vulnerabilities exploitable

---

### TC-020: Session Security
**Priority:** HIGH  
**Precondition:** User logged in  
**Test Steps:**
1. Login as demo user
2. Copy session cookie
3. Open incognito window
4. Try to use copied cookie
5. Test session timeout (idle 30 min)
6. Test logout clears session
7. Test concurrent sessions

**Expected Results:**
- Sessions properly isolated
- Timeout works correctly
- Logout clears all session data
- No session hijacking possible
- Secure cookie flags set

**Pass Criteria:** Secure session management throughout

---

## EXECUTION MATRIX

| Test Case | Priority | Frequency | Automation |
|-----------|----------|-----------|------------|
| TC-001 | CRITICAL | Every build | Yes |
| TC-002 | CRITICAL | Every build | Yes |
| TC-003 | CRITICAL | Every build | Yes |
| TC-004 | HIGH | Daily | Yes |
| TC-005 | HIGH | Daily | Yes |
| TC-006 | HIGH | Weekly | Partial |
| TC-007 | MEDIUM | Weekly | Yes |
| TC-008 | HIGH | Daily | Partial |
| TC-009 | MEDIUM | Weekly | Yes |
| TC-010 | HIGH | Every build | Yes |
| TC-011 | CRITICAL | Every build | Manual |
| TC-012 | MEDIUM | Weekly | Manual |
| TC-013 | HIGH | Weekly | Manual |
| TC-014 | HIGH | Weekly | Automated |
| TC-015 | CRITICAL | Every build | Yes |
| TC-016 | MEDIUM | Weekly | Partial |
| TC-017 | HIGH | Daily | Yes |
| TC-018 | HIGH | Daily | Yes |
| TC-019 | CRITICAL | Every build | Yes |
| TC-020 | HIGH | Daily | Yes |

---

## DEFECT SEVERITY LEVELS

### CRITICAL (P0)
- Crisis features non-functional
- Data loss or corruption
- Security vulnerabilities
- Complete app crash
- Emergency contacts broken

### HIGH (P1)
- Core features broken
- Major usability issues
- Data inconsistencies
- Performance < 50% of target
- Accessibility barriers

### MEDIUM (P2)
- Minor feature issues
- UI inconsistencies
- Slow performance
- Non-critical validation
- Minor responsive issues

### LOW (P3)
- Cosmetic issues
- Nice-to-have features
- Minor text issues
- Enhancement requests
- Documentation gaps

---

*Remember: In mental health applications, what might be a "medium" issue elsewhere could be critical here. User safety and wellbeing always take priority.*