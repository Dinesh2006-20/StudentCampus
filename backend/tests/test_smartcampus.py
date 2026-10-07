"""Smart Campus Student Portal - backend regression tests."""
import io
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://exam-hub-pro-13.preview.emergentagent.com").rstrip("/")
API = BASE_URL + "/api"

ADMIN = {"email": "dinesh9360695@gmail.com", "password": "Admin@123"}
STUDENT = {"email": "student@campus.edu", "password": "Student@123"}


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def student_token():
    r = requests.post(f"{API}/auth/login", json=STUDENT, timeout=30)
    assert r.status_code == 200, f"Student login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Auth ----------
class TestAuth:
    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": STUDENT["email"], "password": "wrong-pass"})
        assert r.status_code in (401, 429)

    def test_login_admin(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=hdr(admin_token))
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_login_student_me(self, student_token):
        r = requests.get(f"{API}/auth/me", headers=hdr(student_token))
        assert r.status_code == 200
        assert r.json()["role"] == "student"

    def test_register_and_logout(self):
        email = f"TEST_user_{int(time.time())}@campus.edu"
        payload = {"name": "Test User", "email": email, "password": "Test@12345", "dept": "IT", "semester": 3}
        r = requests.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and data["user"]["email"] == email.lower()
        # logout
        lr = requests.post(f"{API}/auth/logout")
        assert lr.status_code == 200
        # delete via mongo later (admin cleanup) - skipping for now; marker in email prefix

    def test_me_no_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- Meta / Subjects / Papers ----------
class TestMeta:
    def test_meta(self):
        r = requests.get(f"{API}/meta")
        assert r.status_code == 200
        d = r.json()
        assert len(d["departments"]) == 6
        assert d["total_papers"] > 0
        assert set(["Internal 1", "Internal 2", "Internal 3", "Model Exam", "Practical Exam", "Semester Exam"]).issubset(set(d["exam_types"]))

    def test_subjects_filter(self, student_token):
        r = requests.get(f"{API}/subjects", params={"dept": "IT", "semester": 3}, headers=hdr(student_token))
        assert r.status_code == 200
        subs = r.json()
        assert len(subs) > 0
        assert all(s["dept"] == "IT" and s["semester"] == 3 for s in subs)


class TestPapers:
    def test_papers_list(self, student_token):
        r = requests.get(f"{API}/papers", params={"dept": "IT", "semester": 3, "limit": 5}, headers=hdr(student_token))
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "total" in d
        assert d["total"] > 0
        p = d["items"][0]
        assert "exam_year" in p and "exam_type" in p and "dept_name" in p

    def test_papers_search(self, student_token):
        r = requests.get(f"{API}/papers", params={"q": "dbms 2024 internal", "limit": 5}, headers=hdr(student_token))
        assert r.status_code == 200
        assert r.json()["total"] >= 0  # just verify no error

    def test_papers_facets(self, student_token):
        r = requests.get(f"{API}/papers/facets", params={"dept": "IT", "semester": 3}, headers=hdr(student_token))
        assert r.status_code == 200
        d = r.json()
        assert "exam_types" in d and "exam_years" in d

    def test_papers_trending(self, student_token):
        r = requests.get(f"{API}/papers/trending", params={"dept": "IT"}, headers=hdr(student_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_paper_detail_and_file(self, student_token):
        lst = requests.get(f"{API}/papers", params={"dept": "IT", "limit": 1}, headers=hdr(student_token)).json()
        pid = lst["items"][0]["id"]
        r = requests.get(f"{API}/papers/{pid}", headers=hdr(student_token))
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == pid and "related" in d
        # file render (seeded has no file_path, should render PDF)
        f = requests.get(f"{API}/papers/{pid}/file", headers=hdr(student_token), timeout=60)
        assert f.status_code == 200
        assert f.headers.get("Content-Type") == "application/pdf"
        assert f.content[:5] == b"%PDF-"

    def test_paper_requires_auth(self):
        r = requests.get(f"{API}/papers", params={"dept": "IT"})
        assert r.status_code == 401


# ---------- Bookmarks ----------
class TestBookmarks:
    def test_toggle_and_list(self, student_token):
        lst = requests.get(f"{API}/papers", params={"dept": "IT", "limit": 1}, headers=hdr(student_token)).json()
        pid = lst["items"][0]["id"]
        r1 = requests.post(f"{API}/bookmarks/{pid}", headers=hdr(student_token))
        assert r1.status_code == 200
        state1 = r1.json()["bookmarked"]
        bm = requests.get(f"{API}/bookmarks", headers=hdr(student_token)).json()
        if state1:
            assert any(p["id"] == pid for p in bm)
        # toggle back
        r2 = requests.post(f"{API}/bookmarks/{pid}", headers=hdr(student_token))
        assert r2.status_code == 200
        assert r2.json()["bookmarked"] != state1


# ---------- Admin RBAC ----------
class TestAdminRBAC:
    def test_non_admin_forbidden(self, student_token):
        r = requests.post(f"{API}/admin/subjects", json={"dept": "IT", "semester": 3, "code": "X9999", "name": "X"},
                          headers=hdr(student_token))
        assert r.status_code == 403

    def test_admin_stats(self, admin_token):
        r = requests.get(f"{API}/admin/stats", headers=hdr(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in ("students", "papers", "subjects", "recent_uploads"):
            assert k in d


# ---------- Admin Subject + Paper upload ----------
class TestAdminSubjectAndPaper:
    created_subject_code = None
    created_paper_id = None

    def _tiny_pdf(self):
        # minimal valid PDF
        return b"%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"

    def test_add_subject(self, admin_token):
        code = f"T{int(time.time()) % 100000}"
        r = requests.post(f"{API}/admin/subjects",
                          json={"dept": "IT", "semester": 3, "code": code, "name": "TEST_Subject"},
                          headers=hdr(admin_token))
        assert r.status_code == 200, r.text
        TestAdminSubjectAndPaper.created_subject_code = r.json()["code"]

    def test_upload_paper(self, admin_token):
        code = TestAdminSubjectAndPaper.created_subject_code
        assert code
        files = {"file": ("test.pdf", io.BytesIO(self._tiny_pdf()), "application/pdf")}
        data = {"dept": "IT", "semester": "3", "subject_code": code, "exam_type": "Internal 1", "exam_year": "2024"}
        r = requests.post(f"{API}/admin/papers", files=files, data=data, headers=hdr(admin_token), timeout=60)
        if r.status_code == 502:
            pytest.skip("Object storage unavailable in preview")
        assert r.status_code == 200, r.text
        TestAdminSubjectAndPaper.created_paper_id = r.json()["id"]

    def test_delete_uploaded_paper(self, admin_token):
        pid = TestAdminSubjectAndPaper.created_paper_id
        if not pid:
            pytest.skip("no uploaded paper")
        r = requests.delete(f"{API}/admin/papers/{pid}", headers=hdr(admin_token))
        assert r.status_code == 200

    def test_non_admin_upload_denied(self, student_token):
        files = {"file": ("x.pdf", io.BytesIO(b"%PDF-"), "application/pdf")}
        data = {"dept": "IT", "semester": "3", "subject_code": "CS301", "exam_type": "Internal 1", "exam_year": "2024"}
        r = requests.post(f"{API}/admin/papers", files=files, data=data, headers=hdr(student_token))
        assert r.status_code == 403


# ---------- Timetable ----------
class TestTimetable:
    def test_list(self, student_token):
        r = requests.get(f"{API}/timetable", params={"dept": "IT", "semester": 3}, headers=hdr(student_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list) and len(r.json()) > 0

    def test_add_delete_mine(self, student_token):
        payload = {"day": "Monday", "start": "16:00", "end": "17:00", "subject_name": "TEST_Personal slot"}
        r = requests.post(f"{API}/timetable/mine", json=payload, headers=hdr(student_token))
        assert r.status_code == 200
        eid = r.json()["id"]
        assert r.json()["mine"] is True
        rd = requests.delete(f"{API}/timetable/mine/{eid}", headers=hdr(student_token))
        assert rd.status_code == 200

    def test_mine_invalid_time(self, student_token):
        r = requests.post(f"{API}/timetable/mine",
                          json={"day": "Monday", "start": "11:00", "end": "10:00", "subject_name": "TEST_x"},
                          headers=hdr(student_token))
        assert r.status_code == 400


# ---------- Exams ----------
class TestExams:
    def test_list(self, student_token):
        r = requests.get(f"{API}/exams", params={"dept": "IT", "semester": 3}, headers=hdr(student_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_add_delete_mine(self, student_token):
        r = requests.post(f"{API}/exams/mine",
                          json={"subject_name": "TEST_Personal exam", "date": "2026-06-01",
                                "start_time": "10:00", "end_time": "12:00"},
                          headers=hdr(student_token))
        assert r.status_code == 200
        eid = r.json()["id"]
        rd = requests.delete(f"{API}/exams/mine/{eid}", headers=hdr(student_token))
        assert rd.status_code == 200


# ---------- Tasks ----------
class TestTasks:
    def test_crud(self, student_token):
        r = requests.post(f"{API}/tasks",
                          json={"title": "TEST_task", "due_date": "2026-06-01", "priority": "High"},
                          headers=hdr(student_token))
        assert r.status_code == 200
        tid = r.json()["id"]
        p = requests.patch(f"{API}/tasks/{tid}", json={"status": "doing"}, headers=hdr(student_token))
        assert p.status_code == 200 and p.json()["status"] == "doing"
        lst = requests.get(f"{API}/tasks", headers=hdr(student_token)).json()
        assert any(t["id"] == tid for t in lst)
        d = requests.delete(f"{API}/tasks/{tid}", headers=hdr(student_token))
        assert d.status_code == 200


# ---------- Marks ----------
class TestMarks:
    def test_crud(self, student_token):
        r = requests.post(f"{API}/marks", json={"semester": 3, "subject_code": "CS301", "subject_name": "TEST_subj",
                                                "exam_type": "Internal 1", "score": 45, "max_score": 50},
                          headers=hdr(student_token))
        assert r.status_code == 200
        mid = r.json()["id"]
        d = requests.delete(f"{API}/marks/{mid}", headers=hdr(student_token))
        assert d.status_code == 200

    def test_score_exceed(self, student_token):
        r = requests.post(f"{API}/marks", json={"semester": 3, "subject_code": "CS301", "subject_name": "x",
                                                "exam_type": "Internal 1", "score": 100, "max_score": 50},
                          headers=hdr(student_token))
        assert r.status_code == 400


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard(self, student_token):
        r = requests.get(f"{API}/dashboard", headers=hdr(student_token))
        assert r.status_code == 200
        d = r.json()
        for k in ("upcoming_exams", "tasks_pending", "bookmarks", "dept_papers", "sem_papers"):
            assert k in d


# ---------- AI ----------
class TestAI:
    def test_status(self, student_token):
        r = requests.get(f"{API}/ai/status", headers=hdr(student_token))
        assert r.status_code == 200
        assert "configured" in r.json() and "model" in r.json()

    def test_important_questions(self, student_token):
        # Pick a known IT subject with seeded papers
        subs = requests.get(f"{API}/subjects", params={"dept": "IT", "semester": 3}, headers=hdr(student_token)).json()
        assert subs
        code = subs[0]["code"]
        r = requests.get(f"{API}/ai/important", params={"dept": "IT", "subject_code": code}, headers=hdr(student_token))
        assert r.status_code == 200
        d = r.json()
        assert d["papers_analysed"] > 0
        assert isinstance(d["items"], list)
