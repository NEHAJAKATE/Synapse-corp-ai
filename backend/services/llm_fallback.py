import os
import time
import requests
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

_best_model = None
_fallback_to_featherless = False

def get_best_gemini_model() -> str:
    global _best_model
    if _best_model:
        return _best_model

    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    try:
        available = []
        for m in genai.list_models():
            if "generateContent" in m.supported_generation_methods:
                available.append(m.name)
        
        preferred = [
            "models/gemini-1.5-flash",
            "models/gemini-1.5-flash-latest",
            "models/gemini-1.5-pro",
            "models/gemini-1.5-pro-latest",
            "models/gemini-1.0-pro",
            "models/gemini-pro"
        ]
        
        for p in preferred:
            if p in available:
                _best_model = p.replace("models/", "")
                print(f"[LLM] Auto-selected optimal model: {_best_model}")
                return _best_model
                
        for a in available:
            if "gemini" in a:
                _best_model = a.replace("models/", "")
                print(f"[LLM] Auto-selected fallback model: {_best_model}")
                return _best_model
                
        _best_model = "gemini-1.5-flash"
        return _best_model
    except Exception as e:
        print(f"[LLM] Failed to list models, defaulting to gemini-1.5-flash. Error: {e}")
        return "gemini-1.5-flash"

class FeatherlessChatSession:
    def __init__(self, system_prompt: str):
        self.history = [
            {"role": "user", "parts": [f"System Instructions:\n{system_prompt}\n\nDo you understand these instructions?"]},
            {"role": "model", "parts": ["Yes, I understand completely. I will adopt this persona and follow all rules precisely."]}
        ]

def create_chat_session(system_prompt: str):
    """
    Creates a chat session that is guaranteed to work regardless of the model's 
    support for system_instruction, by injecting the prompt into the history.
    """
    global _fallback_to_featherless
    featherless_key = os.getenv("FEATHERLESS_API_KEY", "")
    has_featherless = featherless_key and "YOUR_FEATHERLESS" not in featherless_key

    if _fallback_to_featherless and has_featherless:
        return FeatherlessChatSession(system_prompt)

    model_name = get_best_gemini_model()
    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
    ]

    model = genai.GenerativeModel(model_name=model_name, safety_settings=safety_settings)
    
    history = [
        {"role": "user", "parts": [f"System Instructions:\n{system_prompt}\n\nDo you understand these instructions?"]},
        {"role": "model", "parts": ["Yes, I understand completely. I will adopt this persona and follow all rules precisely."]}
    ]
    
    return model.start_chat(history=history)

def _featherless_chat(chat_session, message: str, key: str) -> str:
    messages = []
    for h in chat_session.history:
        if isinstance(h, dict):
            role = "assistant" if h["role"] == "model" else "user"
            text = h["parts"][0]
        else:
            role = "assistant" if h.role == "model" else "user"
            text = "".join([p.text for p in h.parts])
        messages.append({"role": role, "content": text})
        
    messages.append({"role": "user", "content": message})
    
    resp = requests.post(
        "https://api.featherless.ai/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={
            "model": "meta-llama/Meta-Llama-3.1-8B-Instruct",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 256
        },
        timeout=30.0
    )
    if resp.status_code == 200:
        content = resp.json()["choices"][0]["message"]["content"].strip()
        # Append as dicts so we can translate them next time if needed
        if hasattr(chat_session.history, "append"):
             chat_session.history.append({"role": "user", "parts": [message]})
             chat_session.history.append({"role": "model", "parts": [content]})
        return content
    else:
        raise Exception(f"Featherless fallback failed: {resp.text}")

def send_chat_message_safe(chat_session, message: str) -> str:
    """
    Sends a message in a chat session. If Gemini hits rate limits, permanently 
    switches to Featherless AI for all future interactions to bypass quotas.
    """
    global _fallback_to_featherless
    featherless_key = os.getenv("FEATHERLESS_API_KEY", "")
    has_featherless = featherless_key and "YOUR_FEATHERLESS" not in featherless_key

    if (isinstance(chat_session, FeatherlessChatSession) or _fallback_to_featherless) and has_featherless:
        return _featherless_chat(chat_session, message, featherless_key)
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = chat_session.send_message(message)
            return response.text
        except ResourceExhausted as e:
            if has_featherless:
                print("\n[LLM] ⚠️ GEMINI QUOTA EXCEEDED ⚠️\nSwitching system entirely to Featherless AI (Meta-Llama-3.1-8B-Instruct) to bypass rate limits.\n")
                _fallback_to_featherless = True
                return _featherless_chat(chat_session, message, featherless_key)

            if attempt < max_retries - 1:
                print(f"[LLM] Rate limit hit during chat. Retrying in 65 seconds... (Attempt {attempt+1}/{max_retries})")
                time.sleep(65)
            else:
                raise e
        except Exception as e:
            raise e

def generate_content_safe(system_prompt: str, user_prompt: str) -> str:
    """
    Safe one-off generation bypassing system_instruction
    """
    global _fallback_to_featherless
    featherless_key = os.getenv("FEATHERLESS_API_KEY", "")
    has_featherless = featherless_key and "YOUR_FEATHERLESS" not in featherless_key
    
    combined_prompt = f"System Instructions:\n{system_prompt}\n\nTask:\n{user_prompt}"

    if _fallback_to_featherless and has_featherless:
        resp = requests.post(
            "https://api.featherless.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {featherless_key}", "Content-Type": "application/json"},
            json={
                "model": "meta-llama/Meta-Llama-3.1-8B-Instruct",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.3,
                "max_tokens": 1024
            },
            timeout=45.0
        )
        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"].strip()
        else:
            raise Exception(f"Featherless fallback failed: {resp.text}")

    model_name = get_best_gemini_model()
    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
    ]
    model = genai.GenerativeModel(model_name=model_name, safety_settings=safety_settings)
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = model.generate_content(combined_prompt)
            return response.text
        except ResourceExhausted as e:
            if has_featherless:
                print("\n[LLM] ⚠️ GEMINI QUOTA EXCEEDED ⚠️\nSwitching system entirely to Featherless AI (Meta-Llama-3.1-8B-Instruct) to bypass rate limits.\n")
                _fallback_to_featherless = True
                return generate_content_safe(system_prompt, user_prompt) # Recursive call will now hit the featherless branch

            if attempt < max_retries - 1:
                print(f"[LLM] Rate limit hit. Retrying in 65 seconds... (Attempt {attempt+1}/{max_retries})")
                time.sleep(65)
            else:
                raise e
        except Exception as e:
            raise e
