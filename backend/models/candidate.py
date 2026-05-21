from pydantic import BaseModel
from typing import Optional


class CandidateBase(BaseModel):
    candidate_name: str
    role: str = "Software Engineer"


class SessionCreate(CandidateBase):
    session_id: str


class CVUpload(BaseModel):
    session_id: str
    cv_text: str
    cv_summary: str
