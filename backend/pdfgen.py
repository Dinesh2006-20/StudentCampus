import io
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


def render_paper_pdf(p: dict) -> bytes:
    rnd = random.Random(p["id"])
    topics = _topics(p["subject_name"])
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
    c.drawString(40, y, f"Reg. No: ________________")
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

    full = p.get("max_marks", 100) == 100
    if p["exam_type"] == "Practical Exam":
        line("Answer any ONE experiment allotted by lot.", "Helvetica-Oblique", 9)
        for i in range(1, 9):
            line(f"{i}. Implement and demonstrate {rnd.choice(topics)}; record observations and results.")
    else:
        n_a, n_b = (10, 5) if full else (5, 3)
        b_marks = 13 if full else 10
        line(f"PART A  ({n_a} x 2 = {n_a * 2} Marks)", "Helvetica-Bold", 11)
        line("Answer ALL questions.", "Helvetica-Oblique", 9)
        for i in range(1, n_a + 1):
            line(f"{i}. " + rnd.choice(STEMS_SHORT).format(t=rnd.choice(topics)))
        y -= 8
        line(f"PART B  ({n_b} x {b_marks} = {n_b * b_marks} Marks)", "Helvetica-Bold", 11)
        line("Answer ALL questions, choosing either (a) or (b).", "Helvetica-Oblique", 9)
        for i in range(n_a + 1, n_a + n_b + 1):
            line(f"{i}. (a) " + rnd.choice(STEMS_LONG).format(t=rnd.choice(topics)) + f"  ({b_marks})")
            line("(OR)", "Helvetica-Bold", 9, 280)
            line(f"    (b) " + rnd.choice(STEMS_LONG).format(t=rnd.choice(topics)) + f"  ({b_marks})")
        if full:
            y -= 8
            line("PART C  (1 x 15 = 15 Marks)", "Helvetica-Bold", 11)
            line(f"{n_a + n_b + 1}. " + rnd.choice(STEMS_LONG).format(t=rnd.choice(topics)) + "  (15)")
    y -= 10
    line("*** ALL THE BEST ***", "Helvetica-Bold", 9, w / 2 - 50)
    c.save()
    return buf.getvalue()
