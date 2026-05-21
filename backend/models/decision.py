from pydantic import BaseModel
from typing import List, Optional


class CEODecision(BaseModel):
    decision: str  # hired | rejected | hold
    reasoning: str
    confidence: int
    key_factors: List[str]
    message_to_candidate: str
    next_steps: str
