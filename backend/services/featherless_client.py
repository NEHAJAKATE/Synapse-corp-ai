"""
Featherless AI client for Nova CFO agent.
Uses OpenAI-compatible API.
"""
import os
import httpx
import json


FEATHERLESS_BASE_URL = "https://api.featherless.ai/v1"
DEFAULT_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct"


async def call_featherless(
    system_prompt: str,
    user_prompt: str,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.3,
    max_tokens: int = 512
) -> str:
    """Call Featherless AI API and return the text response."""
    api_key = os.getenv("FEATHERLESS_API_KEY", "")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{FEATHERLESS_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": temperature,
                "max_tokens": max_tokens
            }
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
