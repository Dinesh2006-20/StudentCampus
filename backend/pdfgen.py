import io
import re
import random
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import simpleSplit

STEMS_SHORT = [
    "Define the term {t} with an example.", "List any two applications of {t}.", "What is meant by {t}?",
    "Differentiate between {t} and its alternative approach.", "State the significance of {t}.",
    "Give the limitations of {t}.", "Write a short note on {t}.", "Mention the properties of {t}.",
]
STEMS_LONG = [
    "Explain in detail the working of {t} with a neat diagram.",
    "Discuss the architecture of {t} and analyse its performance.",
    "Illustrate {t} with a suitable case study and derive the key results.",
    "Compare and contrast the various techniques used in {t}.",
    "Design a solution using {t} for a real-world engineering problem.",
]
TOPIC_SUFFIX = ["fundamentals", "models", "design principles", "analysis", "optimisation", "applications", "core concepts", "advanced methods"]


def _topics(name):
    return [f"{name} {s}" if i % 2 else f"{s.title()} of {name}" for i, s in enumerate(TOPIC_SUFFIX)]


def paper_questions(p: dict):
    """Deterministic question list for a generated paper: [(part, marks, text)]."""
    rnd = random.Random(p["id"])
    topics = _topics(p["subject_name"])
    if p["exam_type"] == "Practical Exam":
        return [("Practical", 100, f"Implement and demonstrate {rnd.choice(topics)}; record observations and results.") for _ in range(8)]
    full = p.get("max_marks", 100) == 100
    n_a, n_b = (10, 5) if full else (5, 3)
    b_marks = 13 if full else 10
    qs = [("A", 2, rnd.choice(STEMS_SHORT).format(t=rnd.choice(topics))) for _ in range(n_a)]
    for _ in range(n_b):
        qs.append(("B", b_marks, rnd.choice(STEMS_LONG).format(t=rnd.choice(topics))))
        qs.append(("B", b_marks, rnd.choice(STEMS_LONG).format(t=rnd.choice(topics))))
    if full:
        qs.append(("C", 15, rnd.choice(STEMS_LONG).format(t=rnd.choice(topics))))
    return qs


Q_LINE = re.compile(r"^\s*(?:Q\.?\s*)?\d{1,2}\s*[\.\)]\s*(?:\(?[ab]\)\s*)?(.{12,})$", re.I)


def extract_pdf_questions(data: bytes):
    from pypdf import PdfReader
    try:
        text = "\n".join((pg.extract_text() or "") for pg in PdfReader(io.BytesIO(data)).pages[:12])
    except Exception:
        return []
    out = []
    for ln in text.splitlines():
        m = Q_LINE.match(ln)
        if m:
            out.append(("", None, re.sub(r"\(\s*\d+\s*\)\s*$", "", m.group(1)).strip()))
    return out[:80]


def render_paper_pdf(p: dict) -> bytes:
    qs = paper_questions(p)
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4

    def watermark():
        c.saveState()
        c.setFillColor(HexColor("#2563EB"))
        c.setFillAlpha(0.06)
        c.setFont("Helvetica-Bold", 160)
        c.translate(w / 2, h / 2)
        c.rotate(35)
        c.drawCentredString(0, -50, str(p["exam_year"]))
        c.restoreState()

    watermark()
    y = h - 50
    c.setFont("Helvetica-Bold", 9)
    c.drawString(40, y, "Reg. No: ________________")
    c.drawRightString(w - 40, y, f"Paper ID: {p['id'][-8:].upper()}")
    y -= 28
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(w / 2, y, "[College Name]")
    y -= 18
    c.setFont("Helvetica", 10)
    c.drawCentredString(w / 2, y, f"Department of {p.get('dept_name', p['dept'])}")
    y -= 18
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(w / 2, y, f"{p['exam_type'].upper()} - {p.get('exam_month', '')} {p['exam_year']}")
    y -= 16
    c.setFont("Helvetica", 10)
    c.drawCentredString(w / 2, y, f"Academic Year {p['academic_year']}  |  Semester {p['semester']}  |  Regulation {p.get('regulation', '')}")
    y -= 18
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(w / 2, y, f"{p['subject_code']} - {p['subject_name']}")
    y -= 18
    c.setFont("Helvetica", 9)
    c.drawString(40, y, f"Time: {p.get('duration', '3 Hours')}")
    c.drawRightString(w - 40, y, f"Maximum Marks: {p.get('max_marks', 100)}")
    y -= 8
    c.line(40, y, w - 40, y)
    y -= 22

    def line(text, font="Helvetica", size=10, indent=40):
        nonlocal y
        for i, part in enumerate(simpleSplit(text, font, size, w - indent - 40)):
            if y < 60:
                c.showPage()
                watermark()
                y = h - 60
            c.setFont(font, size)
            c.drawString(indent + (14 if i else 0), y, part)
            y -= 15

    if p["exam_type"] == "Practical Exam":
        line("Answer any ONE experiment allotted by lot.", "Helvetica-Oblique", 9)
        for i, (_, _, q) in enumerate(qs, 1):
            line(f"{i}. {q}")
    else:
        a = [q for q in qs if q[0] == "A"]
        b = [q for q in qs if q[0] == "B"]
        cc = [q for q in qs if q[0] == "C"]
        bm = b[0][1]
        line(f"PART A  ({len(a)} x 2 = {len(a) * 2} Marks)", "Helvetica-Bold", 11)
        line("Answer ALL questions.", "Helvetica-Oblique", 9)
        for i, q in enumerate(a, 1):
            line(f"{i}. {q[2]}")
        y -= 8
        nb = len(b) // 2
        line(f"PART B  ({nb} x {bm} = {nb * bm} Marks)", "Helvetica-Bold", 11)
        line("Answer ALL questions, choosing either (a) or (b).", "Helvetica-Oblique", 9)
        for j in range(nb):
            n = len(a) + j + 1
            line(f"{n}. (a) {b[2 * j][2]}  ({bm})")
            line("(OR)", "Helvetica-Bold", 9, 280)
            line(f"    (b) {b[2 * j + 1][2]}  ({bm})")
        if cc:
            y -= 8
            line("PART C  (1 x 15 = 15 Marks)", "Helvetica-Bold", 11)
            line(f"{len(a) + nb + 1}. {cc[0][2]}  (15)")
    y -= 10
    line("*** ALL THE BEST ***", "Helvetica-Bold", 9, w / 2 - 50)
    c.save()
    return buf.getvalue()
