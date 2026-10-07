from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import uuid
import logging
import secrets
import random
from datetime import datetime, timezone, timedelta, date
from typing import Annotated, Optional, List

import bcrypt
import jwt
import requests
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field, BeforeValidator, EmailStr
from starlette.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from seed_data import DEPARTMENTS, EXAM_TYPES, SLOTS, DAYS, all_subjects, academic_year, exam_meta
from pdfgen import render_paper_pdf, extract_pdf_questions
import ai

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")

DEPT_NAMES = {d["code"]: d["name"] for d in DEPARTMENTS}

# ---------- Models ----------
PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v))]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc):
        return cls.model_validate(doc) if doc else None

    def to_mongo(self):
        d = self.model_dump(by_alias=True)
        if d.get("_id") is None:
            d.pop("_id", None)
        return d


class User(BaseDocument):
    email: str
    name: str
    role: str = "student"
    dept: Optional[str] = None
    semester: Optional[int] = None
    roll_no: Optional[str] = None


class Paper(BaseDocument):
    dept: str
    academic_year: str
    class_year: int
    semester: int
    subject_code: str
    subject_name: str
    exam_type: str
    exam_year: int


def out(model, doc):
    d = model.from_mongo(doc).model_dump()
    d.pop("password_hash", None)
    return d


def oid(v):
    try:
        return ObjectId(v)
    except Exception:
        raise HTTPException(404, "Not found")


# ---------- Auth ----------
JWT_ALG = "HS256"


def hash_password(p): return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()
def verify_password(p, h): return bcrypt.checkpw(p.encode(), h.encode())


def make_token(uid, email, kind="access"):
    exp = timedelta(hours=12) if kind == "access" else timedelta(days=7)
    return jwt.encode({"sub": uid, "email": email, "type": kind, "exp": datetime.now(timezone.utc) + exp},
                      os.environ["JWT_SECRET"], algorithm=JWT_ALG)


async def user_from_token(token):
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(401, "Invalid token type")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(401, "User not found")
    return out(User, user)


def extract_token(request: Request):
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return request.cookies.get("access_token")


async def current_user(request: Request):
    return await user_from_token(extract_token(request))


async def admin_user(user=Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    return user


def set_auth(response: Response, user):
    at = make_token(user["id"], user["email"])
    rt = make_token(user["id"], user["email"], "refresh")
    response.set_cookie("access_token", at, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    response.set_cookie("refresh_token", rt, httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    return {"user": user, "token": at}


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    dept: str
    semester: int = Field(ge=1, le=8)
    roll_no: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileIn(BaseModel):
    name: Optional[str] = None
    dept: Optional[str] = None
    semester: Optional[int] = Field(default=None, ge=1, le=8)


@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if body.dept not in DEPT_NAMES:
        raise HTTPException(400, "Invalid department")
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    doc = {"email": email, "name": body.name.strip(), "password_hash": hash_password(body.password), "role": "student",
           "dept": body.dept, "semester": body.semester, "roll_no": body.roll_no,
           "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return set_auth(response, out(User, doc))


@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    ident = f"{request.client.host if request.client else 'x'}:{email}"
    att = await db.login_attempts.find_one({"identifier": ident})
    now = datetime.now(timezone.utc)
    if att and att.get("count", 0) >= 5 and att.get("locked_until") and datetime.fromisoformat(att["locked_until"]) > now:
        raise HTTPException(429, "Too many failed attempts. Try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        cnt = (att.get("count", 0) if att else 0) + 1
        upd = {"count": cnt}
        if cnt >= 5:
            upd["locked_until"] = (now + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({"identifier": ident}, {"$set": upd}, upsert=True)
        raise HTTPException(401, "Invalid email or password")
    await db.login_attempts.delete_one({"identifier": ident})
    return set_auth(response, out(User, user))


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user


@api.put("/auth/profile")
async def update_profile(body: ProfileIn, user=Depends(current_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if "dept" in upd and upd["dept"] not in DEPT_NAMES:
        raise HTTPException(400, "Invalid department")
    if upd:
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": upd})
    return out(User, await db.users.find_one({"_id": ObjectId(user["id"])}))


# ---------- Meta / Subjects ----------
@api.get("/meta")
async def meta():
    counts = {r["_id"]: r["n"] async for r in db.papers.aggregate([
        {"$match": {"is_deleted": False}}, {"$group": {"_id": "$dept", "n": {"$sum": 1}}}])}
    yr = await db.papers.aggregate([{"$match": {"is_deleted": False}},
                                    {"$group": {"_id": None, "min": {"$min": "$exam_year"}, "max": {"$max": "$exam_year"}}}]).to_list(1)
    subj_counts = {r["_id"]: r["n"] async for r in db.subjects.aggregate([{"$group": {"_id": "$dept", "n": {"$sum": 1}}}])}
    return {
        "departments": [{**d, "papers": counts.get(d["code"], 0), "subjects": subj_counts.get(d["code"], 0)} for d in DEPARTMENTS],
        "exam_types": EXAM_TYPES,
        "year_min": yr[0]["min"] if yr else None, "year_max": yr[0]["max"] if yr else None,
        "total_papers": sum(counts.values()),
    }


@api.get("/subjects")
async def subjects(dept: Optional[str] = None, semester: Optional[int] = None):
    q = {}
    if dept: q["dept"] = dept
    if semester: q["semester"] = semester
    items = await db.subjects.find(q).sort([("semester", 1), ("code", 1)]).to_list(500)
    counts = {}
    if dept:
        m = {"is_deleted": False, "dept": dept}
        if semester: m["semester"] = semester
        counts = {r["_id"]: r for r in await db.papers.aggregate([
            {"$match": m}, {"$group": {"_id": "$subject_code", "n": {"$sum": 1}, "latest": {"$max": "$exam_year"}, "first": {"$min": "$exam_year"}}}]).to_list(500)}
    res = []
    for s in items:
        d = out(BaseDocument, s)
        c = counts.get(s["code"], {})
        d.update(papers=c.get("n", 0), latest_year=c.get("latest"), first_year=c.get("first"))
        res.append(d)
    return res


class SubjectIn(BaseModel):
    dept: str
    semester: int = Field(ge=1, le=8)
    code: str = Field(min_length=2, max_length=12)
    name: str = Field(min_length=2, max_length=100)
    is_lab: bool = False


@api.post("/admin/subjects")
async def add_subject(body: SubjectIn, _=Depends(admin_user)):
    if body.dept not in DEPT_NAMES:
        raise HTTPException(400, "Invalid department")
    code = body.code.upper().strip()
    if await db.subjects.find_one({"dept": body.dept, "code": code}):
        raise HTTPException(400, "Subject code already exists in this department")
    doc = {**body.model_dump(), "code": code, "class_year": (body.semester + 1) // 2, "credits": 2 if body.is_lab else 4}
    r = await db.subjects.insert_one(doc)
    doc["_id"] = r.inserted_id
    return out(BaseDocument, doc)


# ---------- Papers ----------
def paper_query(dept=None, class_year=None, semester=None, subject_code=None, exam_type=None, exam_year=None, academic_year=None, q=None):
    f = {"is_deleted": False}
    if dept: f["dept"] = dept
    if class_year: f["class_year"] = class_year
    if semester: f["semester"] = semester
    if subject_code: f["subject_code"] = subject_code
    if exam_type: f["exam_type"] = exam_type
    if exam_year: f["exam_year"] = exam_year
    if academic_year: f["academic_year"] = academic_year
    if q:
        ands = []
        for term in q.strip().split()[:6]:
            rx = {"$regex": re.escape(term), "$options": "i"}
            ors = [{"subject_name": rx}, {"subject_code": rx}, {"dept": rx}, {"exam_type": rx}, {"academic_year": rx}, {"tags": rx}]
            if term.isdigit():
                ors.append({"exam_year": int(term)})
                if len(term) == 1:
                    ors.append({"semester": int(term)})
            ands.append({"$or": ors})
        if ands: f["$and"] = ands
    return f


def paper_out(doc):
    d = out(Paper, doc)
    d.pop("file_path", None)
    d["dept_name"] = DEPT_NAMES.get(d["dept"], d["dept"])
    d["file_type"] = "PDF" if (doc.get("content_type") or "application/pdf") == "application/pdf" else "IMAGE"
    return d


@api.get("/papers")
async def list_papers(dept: Optional[str] = None, class_year: Optional[int] = None, semester: Optional[int] = None,
                      subject_code: Optional[str] = None, exam_type: Optional[str] = None, exam_year: Optional[int] = None,
                      academic_year: Optional[str] = None, q: Optional[str] = None, sort: str = "year",
                      skip: int = 0, limit: int = Query(30, le=100), _=Depends(current_user)):
    f = paper_query(dept, class_year, semester, subject_code, exam_type, exam_year, academic_year, q)
    order = {"popular": [("downloads", -1)], "recent": [("created_at", -1)]}.get(sort, [("exam_year", -1), ("semester", 1), ("subject_code", 1)])
    total = await db.papers.count_documents(f)
    docs = await db.papers.find(f).sort(order).skip(skip).limit(limit).to_list(limit)
    return {"items": [paper_out(d) for d in docs], "total": total}


@api.get("/papers/facets")
async def facets(dept: Optional[str] = None, semester: Optional[int] = None, subject_code: Optional[str] = None, _=Depends(current_user)):
    f = paper_query(dept, None, semester, subject_code)

    async def group(field):
        rows = await db.papers.aggregate([{"$match": f}, {"$group": {"_id": f"${field}", "n": {"$sum": 1}}}]).to_list(200)
        return {str(r["_id"]): r["n"] for r in rows}
    return {"exam_types": await group("exam_type"), "exam_years": await group("exam_year"),
            "academic_years": await group("academic_year"), "semesters": await group("semester")}


@api.get("/papers/trending")
async def trending(dept: Optional[str] = None, _=Depends(current_user)):
    f = {"is_deleted": False}
    if dept: f["dept"] = dept
    docs = await db.papers.find(f).sort([("downloads", -1), ("views", -1)]).limit(8).to_list(8)
    return [paper_out(d) for d in docs]


@api.get("/papers/{pid}")
async def get_paper(pid: str, _=Depends(current_user)):
    doc = await db.papers.find_one({"_id": oid(pid), "is_deleted": False})
    if not doc:
        raise HTTPException(404, "Paper not found")
    related = await db.papers.find({"is_deleted": False, "dept": doc["dept"], "subject_code": doc["subject_code"],
                                    "_id": {"$ne": doc["_id"]}}).sort("exam_year", -1).limit(6).to_list(6)
    return {**paper_out(doc), "related": [paper_out(r) for r in related]}


@api.get("/papers/{pid}/file")
async def paper_file(pid: str, request: Request, download: int = 0, auth: Optional[str] = None):
    await user_from_token(extract_token(request) or auth)
    doc = await db.papers.find_one({"_id": oid(pid), "is_deleted": False})
    if not doc:
        raise HTTPException(404, "Paper not found")
    await db.papers.update_one({"_id": doc["_id"]}, {"$inc": {"downloads" if download else "views": 1}})
    p = paper_out(doc)
    if doc.get("file_path"):
        data, ctype = await run_in_threadpool(get_object, doc["file_path"])
        ctype = doc.get("content_type") or ctype
        ext = doc.get("original_filename", "x.pdf").rsplit(".", 1)[-1]
    else:
        data = await run_in_threadpool(render_paper_pdf, p)
        ctype, ext = "application/pdf", "pdf"
    name = f"{p['dept']}_{p['subject_code']}_{p['exam_type'].replace(' ', '')}_{p['exam_year']}.{ext}"
    disp = "attachment" if download else "inline"
    return Response(content=data, media_type=ctype, headers={"Content-Disposition": f'{disp}; filename="{name}"'})


# ---------- Object storage ----------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "smartcampus"
_storage_key = None


def init_storage(force=False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ["EMERGENT_LLM_KEY"]}, timeout=30)
    r.raise_for_status()
    _storage_key = r.json()["storage_key"]
    return _storage_key


def put_object(path, data, ctype):
    r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage(), "Content-Type": ctype}, data=data, timeout=120)
    if r.status_code == 404:
        r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage(True), "Content-Type": ctype}, data=data, timeout=120)
    r.raise_for_status()
    return r.json()


def get_object(path):
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage()}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


MIME = {"pdf": "application/pdf", "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}


@api.post("/admin/papers")
async def upload_paper(file: UploadFile = File(...), dept: str = Form(...), semester: int = Form(...),
                       subject_code: str = Form(...), exam_type: str = Form(...), exam_year: int = Form(...),
                       academic_year: Optional[str] = Form(None), regulation: Optional[str] = Form(None),
                       has_solution: bool = Form(False), user=Depends(admin_user)):
    if dept not in DEPT_NAMES or exam_type not in EXAM_TYPES or not (1 <= semester <= 8):
        raise HTTPException(400, "Invalid department, semester or exam type")
    if not (1980 <= exam_year <= datetime.now().year + 1):
        raise HTTPException(400, "Invalid exam year")
    subj = await db.subjects.find_one({"dept": dept, "code": subject_code})
    if not subj:
        raise HTTPException(400, "Subject not found for this department")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in MIME:
        raise HTTPException(400, "Only PDF, PNG, JPG or WEBP files are allowed")
    data = await file.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 20MB)")
    path = f"{APP_NAME}/papers/{dept}/{uuid.uuid4()}.{ext}"
    try:
        res = await run_in_threadpool(put_object, path, data, MIME[ext])
    except Exception as e:
        logger.error(f"upload failed {e}")
        raise HTTPException(502, "File storage failed, please retry")
    month, max_marks, duration = exam_meta(exam_type, semester)
    doc = {"dept": dept, "academic_year": academic_year or academic_year_of(semester, exam_year), "class_year": (semester + 1) // 2,
           "semester": semester, "subject_code": subject_code, "subject_name": subj["name"], "exam_type": exam_type,
           "exam_year": exam_year, "exam_month": month, "max_marks": max_marks, "duration": duration,
           "regulation": regulation or ("R2021" if exam_year >= 2021 else "R2017"), "pages": None,
           "questions": extract_pdf_questions(data) if ext == "pdf" else [],
           "file_path": res["path"], "content_type": MIME[ext], "original_filename": file.filename, "size": len(data),
           "tags": subject_tags(subj["name"]), "has_solution": has_solution, "downloads": 0, "views": 0, "is_deleted": False, "uploaded_by": user["email"],
           "created_at": datetime.now(timezone.utc).isoformat()}
    r = await db.papers.insert_one(doc)
    doc["_id"] = r.inserted_id
    return paper_out(doc)


ALIASES = {"Database Management Systems": "DBMS", "Operating Systems": "OS", "Computer Networks": "CN", "Data Structures": "DS",
           "Object Oriented Programming": "OOP OOPS", "Design & Analysis of Algorithms": "DAA", "Theory of Computation": "TOC",
           "Artificial Intelligence": "AI", "Machine Learning": "ML", "Digital Signal Processing": "DSP", "Internet of Things": "IOT",
           "Strength of Materials": "SOM", "Heat & Mass Transfer": "HMT", "Finite Element Analysis": "FEA"}


def subject_tags(name):
    base = name.replace(" Laboratory", "")
    acr = "".join(w[0] for w in base.split() if w[0].isalpha() and w.lower() not in ("of", "and")).upper()
    return f"{acr} {ALIASES.get(base, '')}".strip()


async def backfill_tags():
    names = await db.papers.distinct("subject_name", {"tags": {"$exists": False}})
    for n in names:
        await db.papers.update_many({"subject_name": n, "tags": {"$exists": False}}, {"$set": {"tags": subject_tags(n)}})


def academic_year_of(sem, year):
    return academic_year(sem, year)


@api.delete("/admin/papers/{pid}")
async def delete_paper(pid: str, _=Depends(admin_user)):
    r = await db.papers.update_one({"_id": oid(pid)}, {"$set": {"is_deleted": True}})
    if not r.matched_count:
        raise HTTPException(404, "Paper not found")
    return {"ok": True}


@api.get("/admin/stats")
async def admin_stats(_=Depends(admin_user)):
    uploads = await db.papers.find({"is_deleted": False, "file_path": {"$ne": None}}).sort("created_at", -1).limit(20).to_list(20)
    return {"students": await db.users.count_documents({"role": "student"}),
            "papers": await db.papers.count_documents({"is_deleted": False}),
            "uploaded": await db.papers.count_documents({"is_deleted": False, "file_path": {"$ne": None}}),
            "subjects": await db.subjects.count_documents({}),
            "exams": await db.exams.count_documents({"user_id": {"$exists": False}}),
            "recent_uploads": [paper_out(u) for u in uploads]}


# ---------- Bookmarks ----------
@api.get("/bookmarks")
async def bookmarks(user=Depends(current_user)):
    ids = [b["paper_id"] async for b in db.bookmarks.find({"user_id": user["id"]}).sort("created_at", -1)]
    docs = await db.papers.find({"_id": {"$in": [ObjectId(i) for i in ids]}, "is_deleted": False}).to_list(500)
    by = {str(d["_id"]): d for d in docs}
    return [paper_out(by[i]) for i in ids if i in by]


@api.post("/bookmarks/{pid}")
async def toggle_bookmark(pid: str, user=Depends(current_user)):
    oid(pid)
    q = {"user_id": user["id"], "paper_id": pid}
    if await db.bookmarks.find_one(q):
        await db.bookmarks.delete_one(q)
        return {"bookmarked": False}
    await db.bookmarks.insert_one({**q, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"bookmarked": True}


# ---------- Timetable & Exams ----------
class TimetableIn(BaseModel):
    dept: str
    semester: int = Field(ge=1, le=8)
    day: str
    start: str
    end: str
    subject_code: str
    subject_name: str
    room: str = ""
    faculty: str = ""
    kind: str = "Lecture"


@api.get("/timetable")
async def timetable(dept: str, semester: int, user=Depends(current_user)):
    docs = await db.timetable.find({"$or": [{"dept": dept, "semester": semester, "user_id": {"$exists": False}},
                                            {"user_id": user["id"]}]}).sort("start", 1).to_list(400)
    return [{**out(BaseDocument, d), "mine": d.get("user_id") == user["id"]} for d in docs]


class MyClassIn(BaseModel):
    day: str
    start: str
    end: str
    subject_name: str = Field(min_length=1, max_length=100)
    subject_code: str = ""
    room: str = ""
    faculty: str = ""
    kind: str = "Personal"


@api.post("/timetable/mine")
async def add_my_class(body: MyClassIn, user=Depends(current_user)):
    if body.day not in DAYS:
        raise HTTPException(400, "Invalid day")
    if body.end <= body.start:
        raise HTTPException(400, "End time must be after start time")
    doc = {**body.model_dump(), "user_id": user["id"]}
    r = await db.timetable.insert_one(doc)
    doc["_id"] = r.inserted_id
    return {**out(BaseDocument, doc), "mine": True}


@api.delete("/timetable/mine/{eid}")
async def del_my_class(eid: str, user=Depends(current_user)):
    r = await db.timetable.delete_one({"_id": oid(eid), "user_id": user["id"]})
    if not r.deleted_count:
        raise HTTPException(404, "Entry not found")
    return {"ok": True}


@api.post("/admin/timetable")
async def add_tt(body: TimetableIn, _=Depends(admin_user)):
    if body.day not in DAYS:
        raise HTTPException(400, "Invalid day")
    doc = body.model_dump()
    r = await db.timetable.insert_one(doc)
    doc["_id"] = r.inserted_id
    return out(BaseDocument, doc)


@api.delete("/admin/timetable/{eid}")
async def del_tt(eid: str, _=Depends(admin_user)):
    await db.timetable.delete_one({"_id": oid(eid)})
    return {"ok": True}


class ExamIn(BaseModel):
    dept: str
    semester: int = Field(ge=1, le=8)
    subject_code: str
    subject_name: str
    exam_type: str
    date: str
    start_time: str
    end_time: str
    hall: str = ""
    syllabus: List[str] = []


@api.get("/exams")
async def exams(dept: str, semester: int, user=Depends(current_user)):
    docs = await db.exams.find({"$or": [{"dept": dept, "semester": semester, "user_id": {"$exists": False}},
                                        {"user_id": user["id"]}]}).sort([("date", 1), ("start_time", 1)]).to_list(400)
    return [{**out(BaseDocument, d), "mine": d.get("user_id") == user["id"]} for d in docs]


class MyEventIn(BaseModel):
    subject_name: str = Field(min_length=1, max_length=120)
    exam_type: str = "Personal"
    date: str
    start_time: str
    end_time: str
    hall: str = ""
    syllabus: List[str] = []


@api.post("/exams/mine")
async def add_my_event(body: MyEventIn, user=Depends(current_user)):
    try:
        date.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(400, "Invalid date")
    doc = {**body.model_dump(), "subject_code": "", "user_id": user["id"]}
    r = await db.exams.insert_one(doc)
    doc["_id"] = r.inserted_id
    return {**out(BaseDocument, doc), "mine": True}


@api.delete("/exams/mine/{eid}")
async def del_my_event(eid: str, user=Depends(current_user)):
    r = await db.exams.delete_one({"_id": oid(eid), "user_id": user["id"]})
    if not r.deleted_count:
        raise HTTPException(404, "Event not found")
    return {"ok": True}


@api.post("/admin/exams")
async def add_exam(body: ExamIn, _=Depends(admin_user)):
    if body.exam_type not in EXAM_TYPES:
        raise HTTPException(400, "Invalid exam type")
    date.fromisoformat(body.date)
    doc = body.model_dump()
    r = await db.exams.insert_one(doc)
    doc["_id"] = r.inserted_id
    return out(BaseDocument, doc)


@api.delete("/admin/exams/{eid}")
async def del_exam(eid: str, _=Depends(admin_user)):
    await db.exams.delete_one({"_id": oid(eid)})
    return {"ok": True}


# ---------- Planner tasks ----------
class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=140)
    subject: str = ""
    due_date: str
    priority: str = "Medium"
    status: str = "todo"
    notes: str = ""


class TaskPatch(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


@api.get("/tasks")
async def tasks(user=Depends(current_user)):
    docs = await db.tasks.find({"user_id": user["id"]}).sort("due_date", 1).to_list(1000)
    return [out(BaseDocument, d) for d in docs]


@api.post("/tasks")
async def add_task(body: TaskIn, user=Depends(current_user)):
    doc = {**body.model_dump(), "user_id": user["id"], "created_at": datetime.now(timezone.utc).isoformat()}
    r = await db.tasks.insert_one(doc)
    doc["_id"] = r.inserted_id
    return out(BaseDocument, doc)


@api.patch("/tasks/{tid}")
async def patch_task(tid: str, body: TaskPatch, user=Depends(current_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    doc = await db.tasks.find_one_and_update({"_id": oid(tid), "user_id": user["id"]}, {"$set": upd}, return_document=True)
    if not doc:
        raise HTTPException(404, "Task not found")
    return out(BaseDocument, doc)


@api.delete("/tasks/{tid}")
async def del_task(tid: str, user=Depends(current_user)):
    await db.tasks.delete_one({"_id": oid(tid), "user_id": user["id"]})
    return {"ok": True}


# ---------- Marks / Progress ----------
class MarkIn(BaseModel):
    semester: int = Field(ge=1, le=8)
    subject_code: str
    subject_name: str
    exam_type: str
    score: float = Field(ge=0)
    max_score: float = Field(gt=0)


@api.get("/marks")
async def marks(user=Depends(current_user)):
    docs = await db.marks.find({"user_id": user["id"]}).sort([("semester", 1), ("subject_code", 1)]).to_list(1000)
    return [out(BaseDocument, d) for d in docs]


@api.post("/marks")
async def add_mark(body: MarkIn, user=Depends(current_user)):
    if body.score > body.max_score:
        raise HTTPException(400, "Score cannot exceed maximum")
    doc = {**body.model_dump(), "user_id": user["id"], "created_at": datetime.now(timezone.utc).isoformat()}
    r = await db.marks.insert_one(doc)
    doc["_id"] = r.inserted_id
    return out(BaseDocument, doc)


@api.delete("/marks/{mid}")
async def del_mark(mid: str, user=Depends(current_user)):
    await db.marks.delete_one({"_id": oid(mid), "user_id": user["id"]})
    return {"ok": True}


# ---------- Dashboard ----------
@api.get("/dashboard")
async def dashboard(user=Depends(current_user)):
    dept, sem = user.get("dept") or "IT", user.get("semester") or 1
    today = datetime.now(timezone.utc).date().isoformat()
    upcoming = await db.exams.find({"date": {"$gte": today}, "$or": [{"dept": dept, "semester": sem, "user_id": {"$exists": False}}, {"user_id": user["id"]}]}).sort([("date", 1), ("start_time", 1)]).limit(4).to_list(4)
    tasks_pending = await db.tasks.count_documents({"user_id": user["id"], "status": {"$ne": "done"}})
    m = await db.marks.find({"user_id": user["id"]}).to_list(1000)
    avg = round(sum(x["score"] / x["max_score"] for x in m) / len(m) * 100, 1) if m else None
    return {"upcoming_exams": [out(BaseDocument, e) for e in upcoming], "tasks_pending": tasks_pending,
            "bookmarks": await db.bookmarks.count_documents({"user_id": user["id"]}), "avg_score": avg,
            "dept_papers": await db.papers.count_documents({"is_deleted": False, "dept": dept}),
            "sem_papers": await db.papers.count_documents({"is_deleted": False, "dept": dept, "semester": sem})}


# ---------- Seeding ----------
async def seed():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    for k in ["dept", "semester", "subject_code", "exam_type", "exam_year", "downloads"]:
        await db.papers.create_index(k)
    await db.bookmarks.create_index([("user_id", 1), ("paper_id", 1)])

    admin_email, admin_pw = os.environ["ADMIN_EMAIL"].lower(), os.environ["ADMIN_PASSWORD"]
    ex = await db.users.find_one({"email": admin_email})
    if not ex:
        await db.users.insert_one({"email": admin_email, "name": "Admin", "role": "admin", "dept": "IT", "semester": 3,
                                   "password_hash": hash_password(admin_pw), "created_at": datetime.now(timezone.utc).isoformat()})
    elif not verify_password(admin_pw, ex["password_hash"]) or ex.get("role") != "admin":
        await db.users.update_one({"_id": ex["_id"]}, {"$set": {"password_hash": hash_password(admin_pw), "role": "admin"}})

    if await db.meta.find_one({"_id": "seed_v1"}):
        await backfill_tags()
        return
    logger.info("Seeding campus data...")
    subs = all_subjects()
    await db.subjects.insert_many([dict(s) for s in subs])
    now = datetime.now(timezone.utc)
    cur_year = now.year
    papers = []
    rnd = random.Random(42)
    for s in subs:
        for y in range(2018, cur_year + 1):
            for et in EXAM_TYPES:
                if et == "Practical Exam" and not s["is_lab"]:
                    continue
                if et != "Practical Exam" and s["is_lab"] and et != "Semester Exam":
                    continue
                if y == cur_year and s["semester"] % 2 == 1 and et not in ("Internal 1", "Internal 2"):
                    continue
                month, mx, dur = exam_meta(et, s["semester"])
                papers.append({"dept": s["dept"], "academic_year": academic_year(s["semester"], y), "class_year": s["class_year"],
                               "semester": s["semester"], "subject_code": s["code"], "subject_name": s["name"], "exam_type": et,
                               "exam_year": y, "exam_month": month, "max_marks": mx, "duration": dur,
                               "regulation": "R2021" if y >= 2021 else "R2017", "pages": 2 if mx == 100 else 1,
                               "file_path": None, "content_type": "application/pdf", "has_solution": rnd.random() < 0.25,
                               "downloads": rnd.randint(5, 400) + (y - 2018) * 15, "views": rnd.randint(20, 900),
                               "is_deleted": False, "created_at": now.isoformat()})
    await db.papers.insert_many(papers)

    tt, exams = [], []
    by_ds = {}
    for s in subs:
        by_ds.setdefault((s["dept"], s["semester"]), []).append(s)
    for (dept, sem), ss in by_ds.items():
        theory = [x for x in ss if not x["is_lab"]]
        lab = [x for x in ss if x["is_lab"]]
        for di, day in enumerate(DAYS):
            for si, (st, en) in enumerate(SLOTS):
                if day == "Saturday" and si >= 4:
                    continue
                is_lab = lab and si >= 4 and di % 2 == 0
                sub = lab[0] if is_lab else theory[(di + si) % len(theory)]
                tt.append({"dept": dept, "semester": sem, "day": day, "start": st, "end": en, "subject_code": sub["code"],
                           "subject_name": sub["name"], "room": f"{'LAB' if is_lab else dept}-{(sem + 1) // 2}0{(si % 3) + 1}",
                           "faculty": "Faculty TBA", "kind": "Lab" if is_lab else ("Tutorial" if si == 5 else "Lecture")})
        base = now.date() + timedelta(days=9)
        for et, offset in [("Internal 3", 0), ("Model Exam", 24)]:
            for i, sub in enumerate(theory):
                d = base + timedelta(days=offset + i * 2)
                if d.weekday() == 6:
                    d += timedelta(days=1)
                exams.append({"dept": dept, "semester": sem, "subject_code": sub["code"], "subject_name": sub["name"], "exam_type": et,
                              "date": d.isoformat(), "start_time": "10:00", "end_time": "11:30" if et.startswith("Internal") else "13:00",
                              "hall": f"Exam Hall {(i % 4) + 1}", "syllabus": ["Unit I", "Unit II", "Unit III"] if et.startswith("Internal") else ["Unit I", "Unit II", "Unit III", "Unit IV", "Unit V"]})
        if lab:
            d = base + timedelta(days=50)
            exams.append({"dept": dept, "semester": sem, "subject_code": lab[0]["code"], "subject_name": lab[0]["name"], "exam_type": "Practical Exam",
                          "date": d.isoformat(), "start_time": "09:30", "end_time": "12:30", "hall": "Main Lab", "syllabus": ["All experiments"]})
    await db.timetable.insert_many(tt)
    await db.exams.insert_many(exams)

    st_email = "student@campus.edu"
    if not await db.users.find_one({"email": st_email}):
        r = await db.users.insert_one({"email": st_email, "name": "Demo Student", "role": "student", "dept": "IT", "semester": 3,
                                       "roll_no": "IT23001", "password_hash": hash_password("Student@123"), "created_at": now.isoformat()})
        uid = str(r.inserted_id)
        mk = []
        for s in subs:
            if s["dept"] == "IT" and s["semester"] in (1, 2):
                mk.append({"user_id": uid, "semester": s["semester"], "subject_code": s["code"], "subject_name": s["name"],
                           "exam_type": "Semester Exam", "score": rnd.randint(62, 96), "max_score": 100, "created_at": now.isoformat()})
            if s["dept"] == "IT" and s["semester"] == 3 and not s["is_lab"]:
                for et in ("Internal 1", "Internal 2"):
                    mk.append({"user_id": uid, "semester": 3, "subject_code": s["code"], "subject_name": s["name"],
                               "exam_type": et, "score": rnd.randint(30, 49), "max_score": 50, "created_at": now.isoformat()})
        await db.marks.insert_many(mk)
        t0 = now.date()
        await db.tasks.insert_many([
            {"user_id": uid, "title": "Revise DBMS normalization (1NF-BCNF)", "subject": "Database Management Systems", "due_date": (t0 + timedelta(days=2)).isoformat(), "priority": "High", "status": "todo", "notes": "", "created_at": now.isoformat()},
            {"user_id": uid, "title": "Solve 2024 Internal 2 Data Structures paper", "subject": "Data Structures", "due_date": (t0 + timedelta(days=4)).isoformat(), "priority": "Medium", "status": "doing", "notes": "", "created_at": now.isoformat()},
            {"user_id": uid, "title": "Digital Principles K-map practice", "subject": "Digital Principles", "due_date": (t0 + timedelta(days=6)).isoformat(), "priority": "Low", "status": "todo", "notes": "", "created_at": now.isoformat()},
            {"user_id": uid, "title": "Complete DBMS lab record", "subject": "DBMS Laboratory", "due_date": (t0 - timedelta(days=1)).isoformat(), "priority": "Medium", "status": "done", "notes": "", "created_at": now.isoformat()},
        ])
    await db.meta.insert_one({"_id": "seed_v1", "at": now.isoformat()})
    await backfill_tags()
    logger.info(f"Seeded {len(papers)} papers")


@app.on_event("startup")
async def startup():
    await seed()
    try:
        await run_in_threadpool(init_storage)
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()


@api.get("/")
async def root():
    return {"message": "Smart Campus API"}


app.include_router(api)
app.include_router(ai.build_router(db, current_user))
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
                   allow_methods=["*"], allow_headers=["*"])
