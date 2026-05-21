import sys
import os
sys.path.append(r"c:\Users\user\Desktop\synapse AI corp\synapse-corp-ai\backend")

from services.llm_fallback import create_chat_session
from agents.ava_hr import AVA_HR_SYSTEM_PROMPT

chat = create_chat_session(AVA_HR_SYSTEM_PROMPT)
msg = """agents to assist in technical screening, workflow analysis, and executive-level recommendations. While the idea had strong technical potential, it became politically sensitive because different stakeholders viewed it differently. Technical teams were concerned about reliability, operations teams feared workflow disruption, and some decision-makers were hesitant about introducing AI into processes traditionally handled manually. **Task:** My responsibility was to move the initiative forward without creating resistance between teams, while also proving that the system could add value safely and incrementally. **Action:** Instead of pushing for a full rollout immediately, I strategically reframed the initiative as a "decision-support system" rather than a replacement for existing workflows. I organized smaller demonstrations for each stakeholder group, tailored the messaging to their priorities, and built a limited proof-of-concept focused on measurable improvements such as reduced evaluation time and standardized reporting. I also involved stakeholders early in testing and feedback discussions, which helped create a sense of ownership and reduced opposition. From a technical side, I introduced validation checkpoints and human review layers so teams felt more comfortable trusting the system. **Result:** The initiative gained gradual approval and moved from a high-risk experimental idea into a validated workflow prototype."""

try:
    response = chat.send_message(f"Candidate's response: {msg}\n\nAsk your next interview question. Keep it to 1-2 sentences.")
    print("SUCCESS")
    print(response.text)
except Exception as e:
    print(f"FAILED: {e}")
