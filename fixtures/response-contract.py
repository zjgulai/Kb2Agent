"""Syntax-only Responses API contract fixture; it performs no network request."""


def build_request(model: str, prompt: str) -> dict:
    if not model or not prompt:
        raise ValueError("model and prompt are required")
    return {
        "model": model,
        "input": prompt,
    }


def read_output(response) -> str:
    return str(response.output_text)
