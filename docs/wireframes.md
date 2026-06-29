# UI Wireframes — Real Pathshala AI Content Creator

Low-fidelity ASCII wireframes for the core screens. High-fidelity components are
built in Phase 6. Design language: clean, premium, education-focused, with a
collapsible sidebar, dark mode, soft cards, and motion.

---

## 1. App Shell (authenticated)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ☰  Real Pathshala AI            🔍 Search…            🌙  🔔   ◯ Profile ▾ │
├──────────────┬────────────────────────────────────────────────────────────┤
│  SIDEBAR     │                                                            │
│              │                  MAIN CONTENT AREA                         │
│  ▸ Dashboard │                                                            │
│  ▸ Notes     │                                                            │
│  ▸ Tests     │                                                            │
│  ▸ PPTs      │                                                            │
│  ▸ Q-Bank    │                                                            │
│  ▸ Lesson    │                                                            │
│  ▸ Files     │                                                            │
│  ▸ Templates │                                                            │
│              │                                                            │
│  ──────────  │                                                            │
│  ⚙ Settings  │                                                            │
└──────────────┴────────────────────────────────────────────────────────────┘
```

---

## 2. Dashboard

```
┌──────────────────────────────────────────────────────────────────────┐
│  Welcome back, Gaurav 👋                              [+ New Content]  │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│  │  Notes 42  │ │ Tests  18  │ │  PPTs  11  │ │ Downloads  │          │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘          │
│                                                                        │
│  Recently Created                                       View all →     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                    │
│  │ 📝 Trigono…  │ │ 🧪 Physics…  │ │ 📊 Chemis…   │   ...             │
│  │ Class 10·Math│ │ Class 12·Phy │ │ Class 11·Chem│                    │
│  │ PDF · DOCX   │ │ PDF          │ │ PPTX         │                    │
│  └──────────────┘ └──────────────┘ └──────────────┘                    │
│                                                                        │
│  Quick Actions                                                         │
│  [ 📝 Notes ] [ 🧪 Test ] [ 📊 PPT ] [ 📚 Q-Bank ] [ 🗓 Lesson Plan ] │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Notes Generator (wizard)

```
┌──────────────────────────────────────────────────────────────────────┐
│  AI Notes Generator                              Step 1 of 2          │
├──────────────────────────────────────────────────────────────────────┤
│  Class      [ Class 10 ▾ ]      Subject  [ Mathematics ▾ ]            │
│  Chapter    [ 8 · Introduction to Trigonometry ▾ ]                    │
│  Topic      [ optional… ]                                             │
│                                                                        │
│  Note Style                                                            │
│   ◉ Short   ○ Detailed   ○ Revision   ○ One-Shot                      │
│   ○ Formula Sheet   ○ Mind Map                                        │
│                                                                        │
│                                          [ Cancel ]  [ Generate → ]   │
└──────────────────────────────────────────────────────────────────────┘

  → While generating: animated progress bar + streaming preview
  → Result screen: rendered notes + [ Export PDF ] [ Export DOCX ] [ Save ]
```

---

## 4. Test / Paper Generator

```
┌──────────────────────────────────────────────────────────────────────┐
│  AI Test Generator                                                    │
├──────────────────────────────────────────────────────────────────────┤
│  Class [10▾] Subject [Math▾] Chapter [multi-select ▾]                 │
│  Test Type  [ Board Pattern ▾ ]   Difficulty [ Medium ▾ ]            │
│  Total Marks [ 80 ]  Duration [ 180 min ]  Questions [ 35 ]           │
│                                                                        │
│  Question Mix                                                          │
│   MCQ        [▇▇▇▇▁▁] 20                                              │
│   Case Study [▇▁▁▁▁▁] 04                                              │
│   Assertion  [▇▁▁▁▁▁] 04                                              │
│   Short Ans  [▇▇▁▁▁▁] 06                                              │
│   Long Ans   [▇▁▁▁▁▁] 05                                              │
│                                                                        │
│  ☑ Answer Key   ☑ Step-by-step Solutions   ☑ Marking Scheme          │
│                                          [ Cancel ]  [ Generate → ]   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. PPT Generator

```
┌──────────────────────────────────────────────────────────────────────┐
│  AI PPT Generator                                                     │
├──────────────────────────────────────────────────────────────────────┤
│  Class [11▾] Subject [Physics▾] Chapter [Laws of Motion ▾]            │
│  Slides [ 18 ]    ☑ PYQ (CBSE)   ☑ Diagrams   ☑ Homework             │
│                                                                        │
│  Theme   [Blue] [Green] [Dark] [Minimal] [Modern Edu]                 │
│           ▔▔▔▔                                                        │
│  Live thumbnail preview ▭ ▭ ▭ ▭                                       │
│                                          [ Cancel ]  [ Generate → ]   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 6. File Manager

```
┌──────────────────────────────────────────────────────────────────────┐
│  My Files            [ ⬚ Grid | ☰ List ]      [+ New Folder]         │
├───────────────┬──────────────────────────────────────────────────────┤
│  FOLDERS      │  📁 Class 10   📁 Class 12   📁 Sample Papers         │
│  📁 Class 10  │  ──────────────────────────────────────────────────  │
│  📁 Class 12  │  📝 Trigonometry Notes       Math·10   ⋮ (rename/dup/ │
│  📁 Samples   │  🧪 Term-1 Test              Phys·12      delete/dl)  │
│  + New        │  📊 Organic Chemistry PPT    Chem·11                  │
│               │  (drag-and-drop into folders)                        │
└───────────────┴──────────────────────────────────────────────────────┘
```

---

## 7. Auth Screens

```
   Login                          Register                  Forgot Password
 ┌───────────────┐             ┌───────────────┐          ┌───────────────┐
 │  Logo         │             │  Logo         │          │  Reset link   │
 │  Email […]    │             │  Name  […]    │          │  Email  […]   │
 │  Password […] │             │  Email […]    │          │  [ Send link ]│
 │  [ Sign in ]  │             │  Password […] │          └───────────────┘
 │  ─── or ───   │             │  [ Create ]   │
 │  [G] Google   │             │  [G] Google   │
 │  Forgot? Reg? │             │  Have acct?   │
 └───────────────┘             └───────────────┘
```

---

## Design Tokens (Phase 6)

- **Radius:** `xl` (16px) cards, `2xl` modals.
- **Palette:** indigo/violet primary, slate neutrals, theme accents per PPT theme.
- **Motion:** Framer Motion — fade/slide on route change, skeleton + shimmer while
  generating, progress bar for jobs.
- **Dark mode:** class-based via `next-themes`.
