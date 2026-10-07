# Smart Campus Student Portal — PRD

## Original problem statement
Build a Smart Campus Student Portal with a unique modern UI/UX.
MAIN FEATURE: Complete Previous Question Paper Hub.
Store and display all college exam question papers from the beginning of the college/department until the current year. Organize papers department-wise → academic year → class/year → semester → subject → exam type → question paper.
Support exam types such as Internal 1, Internal 2, Internal 3, Model Exam, Practical Exam and Semester Exam.
Example structure: IT → 2nd Year → 3rd Semester → DBMS → Internal 1 → 2025 → Question Paper
Students can search, filter, preview and download papers. Show the exam year clearly on every paper.
Add departments such as IT, CSE, ECE, EEE, Mechanical and Civil, with an admin system to upload new papers and select department, class, semester, subject, exam type and year.
Also include Smart Timetable, Study Planner, Exam Schedule and Student Progress.
UI/UX: Premium, unique, mobile-first student interface with department cards, year filters, subject cards, search, calendar, clean navigation, dark/light mode and smooth animations. Avoid a generic admin-dashboard design.

Follow-up: "now add google gemini ai provider which ai chatbot that tracks the previous question papers and give the most asked questions to help students to study important questions for exams and make sure create the .env file and make a gemini api key and i paste the key then add students to create their own timetable and schedules"

User choices: JWT email/password auth (admin seeded, students register); object storage for PDF/image papers; seeded sample data; admin manages timetable & exams, students manage planner & progress; Gemini with user's own key, free tier (gemini-2.5-flash requested but not available to new users → gemini-3-flash-preview).

## Architecture
- FastAPI (server.py, ai.py, pdfgen.py, seed_data.py) + MongoDB; Emergent object storage for uploads; reportlab renders seeded papers as PDF on the fly; pypdf extracts questions from uploaded PDFs.
- Gemini via emergentintegrations LlmChat (GEMINI_API_KEY, GEMINI_MODEL in backend/.env), SSE streaming.
- React + shadcn + framer-motion + react-query + react-pdf + recharts; next-themes dark/light.

## User personas
Students (browse/download papers, plan study, AI tutor); Admin (curate papers, subjects, timetable, exams).

## Implemented (2026-10-07)
- JWT auth (Bearer + httpOnly cookie), brute-force lockout, admin seeding, profile (dept/sem)
- Paper Hub: dept cards → year/semester tabs → subject cards → exam type + year chips + academic-year filter → year-grouped paper cards; search with multi-term + aliases (DBMS, OS…), filters, sort, load more; Ctrl+K command search
- Preview modal (react-pdf, zoom, print, open, related papers), download, bookmarks/Saved, recently viewed, trending
- Admin studio: upload PDF/image, manage/delete papers, timetable, exams, subjects, stats
- Timetable (live status, week grid) + personal slots; Exam schedule (calendar, countdowns, practice link) + personal events; Planner (kanban, calendar, focus timer); Progress (charts, CGPA est.)
- Exam AI: most-repeated question ranking across all papers of a subject + Gemini streaming chat with per-subject history
- ~7,080 seeded sample papers 2018–2026 (template-generated questions, "[College Name]" placeholder)

## Backlog
- P1: OCR for image papers so AI can analyse them; answer-key uploads
- P2: Notifications/reminders before exams; password reset; class-wide announcements
