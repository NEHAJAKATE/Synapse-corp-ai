from pydantic import BaseModel
from typing import List, Optional


class HREvaluation(BaseModel):
    score: int
    strengths: List[str]
    weaknesses: List[str]
    summary: str
    recommendation: str
    confidence: Optional[int] = None


class CTOEvaluation(BaseModel):
    score: int
    technical_assessment: str
    key_skills_identified: List[str]
    knowledge_gaps: List[str]
    risk_level: str
    summary: str
    recommendation: str


class CFOEvaluation(BaseModel):
    salary_estimate: int
    total_first_year_cost: int
    onboarding_cost: int
    budget_risk: str
    roi_timeline_months: int
    summary: str
    recommendation: str
