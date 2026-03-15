"""Provider-agnostic AI abstraction.

Supports multiple LLM providers via a simple adapter pattern.
Provider selection via AI_PROVIDER env var. Model via AI_MODEL env var.
"""
import logging
import os
import time

logger = logging.getLogger("buildpro.ai")

# ---------------------------------------------------------------------------
# Provider registry
# ---------------------------------------------------------------------------

_PROVIDERS = {}


def register_provider(name):
    """Decorator to register an AI provider adapter."""
    def decorator(cls):
        _PROVIDERS[name] = cls
        return cls
    return decorator


def get_provider(provider_name=None):
    """Get the configured AI provider instance."""
    name = provider_name or os.environ.get("AI_PROVIDER", "gemini")
    if name not in _PROVIDERS:
        raise ValueError(f"Unknown AI provider: {name}. Available: {list(_PROVIDERS.keys())}")
    return _PROVIDERS[name]()


def generate_text(prompt, *, system_prompt="", provider_name=None, max_tokens=2000):
    """High-level text generation via the configured provider.

    Returns dict: {text, provider, model, duration_ms, token_estimate}
    """
    provider = get_provider(provider_name)
    start = time.time()
    try:
        result = provider.generate(prompt, system_prompt=system_prompt, max_tokens=max_tokens)
        duration_ms = int((time.time() - start) * 1000)
        return {
            "text": result["text"],
            "provider": provider.name,
            "model": result.get("model", provider.default_model),
            "duration_ms": duration_ms,
            "token_estimate": len(prompt) // 4,  # rough estimate
        }
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        logger.error("AI generation failed: provider=%s error=%s duration=%dms", provider.name, str(e), duration_ms)
        raise


# ---------------------------------------------------------------------------
# Gemini provider
# ---------------------------------------------------------------------------

@register_provider("gemini")
class GeminiProvider:
    name = "gemini"
    default_model = "gemini-2.0-flash"

    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY", "")
        self.model_id = os.environ.get("AI_MODEL", self.default_model)

    def generate(self, prompt, *, system_prompt="", max_tokens=2000):
        import google.generativeai as genai

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not set")

        genai.configure(api_key=self.api_key)
        model = genai.GenerativeModel(
            self.model_id,
            system_instruction=system_prompt or None,
        )
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=0.3,
            ),
        )
        return {
            "text": response.text,
            "model": self.model_id,
        }


# ---------------------------------------------------------------------------
# Stub/mock provider for testing and dev without API keys
# ---------------------------------------------------------------------------

@register_provider("stub")
class StubProvider:
    name = "stub"
    default_model = "stub-v1"

    def generate(self, prompt, *, system_prompt="", max_tokens=2000):
        return {
            "text": "[AI response placeholder -- configure GEMINI_API_KEY for real output]",
            "model": self.default_model,
        }
