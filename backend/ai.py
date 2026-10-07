import os
import re
import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

from pdfgen import paper_questions


def norm(q):
    return re.sub(r"[^a-z0-9 ]", "", q.lower()).strip()


async def important_questions(db, dept, subject_code, exam_type=None, limit=30):
    f = {"is_deleted": False, "dept": dept, "subject_code": subject_code}
    if exam_type:
        f["exam_type"] = exam_type
    papers = await db.papers.find(f).to_list(500)
    stats = defaultdict(lambda: {"count": 0, "years": set(), "exam_types": set(), "marks": None, "text": ""})
    for p in papers:
        p["id"] = str(p["_id"])
        qs = p.get("questions") if p.get("file_path") else paper_questions(p)
        seen = set()
        for _, marks, text in (qs or []):
            k = norm(text)
            if not k or k in seen:
                continue
            seen.add(k)
            s = stats[k]
            s["count"] += 1
            s["years"].add(p["exam_year"])
            s["exam_types"].add(p["exam_type"])
            s["marks"] = s["marks"] or marks
            s["text"] = s["text"] or text
    ranked = sorted(stats.values(), key=lambda s: (-s["count"], -max(s["years"])))[:limit]
    items = [{"question": s["text"], "count": s["count"], "marks": s["marks"],
              "years": sorted(s["years"], reverse=True), "exam_types": sorted(s["exam_types"])} for s in ranked]
    years = [p["exam_year"] for p in papers]
    return {"papers_analysed": len(papers), "year_from": min(years) if years else None, "year_to": max(years) if years else None,
            "subject_name": papers[0]["subject_name"] if papers else None, "items": items}


class ChatIn(BaseModel):
    dept: str
    subject_code: str
    message: str = Field(min_length=1, max_length=2000)


def build_router(db, current_user):
    r = APIRouter(prefix="/api/ai")

    @r.get("/important")
    async def important(dept: str, subject_code: str, exam_type: Optional[str] = None, _=Depends(current_user)):
        return await important_questions(db, dept, subject_code, exam_type)

    @r.get("/status")
    async def status(_=Depends(current_user)):
        return {"configured": bool((os.environ.get("GEMINI_API_KEY") or "").strip()), "model": os.environ.get("GEMINI_MODEL") or "gemini-3-flash-preview"}

    def sid(user, dept, code):
        return f"{user['id']}:{dept}:{code}"

    @r.get("/history")
    async def history(dept: str, subject_code: str, user=Depends(current_user)):
        docs = await db.ai_messages.find({"session_id": sid(user, dept, subject_code)}, {"_id": 0, "role": 1, "text": 1, "created_at": 1}).sort("created_at", 1).to_list(200)
        return docs

    @r.delete("/history")
    async def clear(dept: str, subject_code: str, user=Depends(current_user)):
        await db.ai_messages.delete_many({"session_id": sid(user, dept, subject_code)})
        return {"ok": True}

    @r.post("/chat")
    async def chat(body: ChatIn, user=Depends(current_user)):
        key = (os.environ.get("GEMINI_API_KEY") or "").strip()
        if not key:
            raise HTTPException(503, "AI tutor is not configured yet. Ask the admin to add GEMINI_API_KEY.")
        data = await important_questions(db, body.dept, body.subject_code, limit=40)
        if not data["papers_analysed"]:
            raise HTTPException(404, "No papers found for this subject")
        session = sid(user, body.dept, body.subject_code)
        past = await db.ai_messages.find({"session_id": session}).sort("created_at", -1).limit(10).to_list(10)
        past.reverse()
        qlines = "\n".join(f"- [{q['count']}x | {q['marks'] or '?'} marks | years {', '.join(map(str, q['years'][:6]))} | {', '.join(q['exam_types'])}] {q['question']}" for q in data["items"])
        system = (
            f"You are 'Exam AI', a study tutor inside a college student portal. Subject: {data['subject_name']} ({body.subject_code}), "
            f"department {body.dept}. You have analysed {data['papers_analysed']} previous question papers from {data['year_from']} to {data['year_to']} "
            f"(Internal 1/2/3, Model, Practical, Semester exams).\n\nMost repeated questions (frequency, marks, years, exam types):\n{qlines}\n\n"
            "Use this data to tell students which questions are most asked and important, predict likely questions, explain answers, "
            "and build study plans. Always cite how many times / which years a question appeared when relevant. "
            "Be concise, use markdown headings, numbered lists and bold for key terms. If asked something unrelated to studies, gently steer back."
        )
        convo = "\n".join(f"{'Student' if m['role'] == 'user' else 'Exam AI'}: {m['text']}" for m in past)
        prompt = (f"Conversation so far:\n{convo}\n\nStudent: {body.message}" if convo else body.message)
        now = datetime.now(timezone.utc).isoformat()
        await db.ai_messages.insert_one({"session_id": session, "user_id": user["id"], "role": "user", "text": body.message, "created_at": now})
        llm = LlmChat(api_key=key, session_id=session, system_message=system).with_model("gemini", os.environ.get("GEMINI_MODEL") or "gemini-3-flash-preview")

        async def gen():
            full = []
            try:
                async for ev in llm.stream_message(UserMessage(text=prompt)):
                    if isinstance(ev, TextDelta):
                        full.append(ev.content)
                        yield f"data: {json.dumps({'t': ev.content})}\n\n"
                    elif isinstance(ev, StreamDone):
                        break
            except Exception as e:
                yield f"data: {json.dumps({'error': 'AI request failed: ' + str(e)[:200]})}\n\n"
            if full:
                await db.ai_messages.insert_one({"session_id": session, "user_id": user["id"], "role": "assistant", "text": "".join(full),
                                                 "created_at": datetime.now(timezone.utc).isoformat()})
            yield "data: {\"done\": true}\n\n"

        return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    return r
