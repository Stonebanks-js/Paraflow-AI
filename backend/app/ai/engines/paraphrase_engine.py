"""Paraphrase engine - pure prompt builder, no provider-specific code."""
from typing import Optional

from .base import BaseAIEngine
from app.ai.llm_service import generate_dict


class ParaphraseEngine(BaseAIEngine):
    MODES = ["standard", "fluency", "formal", "academic", "creative", "simple", "expand", "shorten"]

    def __init__(self):
        super().__init__()

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {"status": "error", "error": "Invalid input"}

        mode = options.get("mode", "standard") if options else "standard"
        strength = options.get("strength", 50) if options else 50

        if mode not in self.MODES:
            return {"status": "error", "error": f"Invalid mode. Choose from: {self.MODES}"}

        writing_dna = options.get("writing_dna") if options else None

        system_prompt = self._build_system_prompt(mode, writing_dna)

        result = generate_dict(
            system_prompt=system_prompt,
            user_prompt=input_text,
            temperature=0.7 + (strength / 200.0),
            max_tokens=min(2048, max(256, len(input_text.split()) * 3)),
        )

        if result.get("status") == "success" and result.get("output"):
            output = result["output"]
            return {
                "status": "success",
                "output": output,
                "mode": mode,
                "word_count_diff": len(output.split()) - len(input_text.split()),
                "model_used": result.get("model"),
                "provider": result.get("provider"),
            }

        # All providers failed - use local rule-based fallback
        try:
            output = self._local_paraphrase(input_text, mode, strength)
            return {
                "status": "success",
                "output": output,
                "mode": mode,
                "word_count_diff": len(output.split()) - len(input_text.split()),
                "model_used": "local-fallback",
                "provider": "local",
            }
        except Exception as e:
            return {
                "status": "error",
                "error": f"All providers failed: {result.get('error', 'unknown')}",
            }

    def _local_paraphrase(self, text: str, mode: str, strength: int) -> str:
        """Local rule-based paraphrase fallback."""
        import re
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
        if not sentences:
            return text

        out = [self._rewrite_sentence(s, mode, i, strength) for i, s in enumerate(sentences)]

        if mode == "expand":
            connectors = ["Additionally,", "Furthermore,", "Moreover,", "It's worth noting that"]
            for i, s in enumerate(out):
                if i > 0 and i % 2 == 0:
                    out[i] = f"{connectors[i % len(connectors)]} {s}"
        elif mode == "shorten":
            out = [s.split(",")[0] + "." if "," in s else s for s in out]
        elif mode == "simple":
            replacements = {
                "utilize": "use", "commence": "start", "terminate": "end",
                "demonstrate": "show", "facilitate": "help", "subsequently": "then",
                "additionally": "also", "furthermore": "also", "however": "but",
                "nevertheless": "still", "approximately": "about", "sufficient": "enough",
            }
            for i, s in enumerate(out):
                for old, new in replacements.items():
                    s = re.sub(rf'\b{old}\b', new, s, flags=re.IGNORECASE)
                out[i] = s
        elif mode == "formal":
            out = [s.replace("don't", "do not").replace("won't", "will not").replace("can't", "cannot")
                       .replace("I'm", "I am").replace("you're", "you are") for s in out]

        return " ".join(out)

    def _rewrite_sentence(self, sentence: str, mode: str, index: int, strength: int) -> str:
        if not sentence:
            return sentence
        words = sentence.split()
        if len(words) < 4:
            return sentence

        substitutions = {
            "standard": {
                "important": "significant", "big": "large", "small": "minor",
                "good": "favorable", "bad": "unfavorable", "use": "utilize",
                "show": "demonstrate", "make": "create", "get": "obtain",
                "help": "assist", "start": "initiate", "end": "conclude",
            },
            "fluency": {
                "however": "nevertheless", "therefore": "consequently",
                "because": "since", "but": "yet", "and": "additionally",
                "also": "moreover",
            },
        }
        sub = substitutions.get(mode, substitutions["standard"])
        max_subs = max(1, strength // 30)
        new_words = []
        sub_count = 0
        for word in words:
            word_lower = word.lower().strip('.,!?;:')
            if word_lower in sub and sub_count < max_subs:
                replacement = sub[word_lower]
                if word[0].isupper():
                    replacement = replacement[0].upper() + replacement[1:]
                trailing = ""
                for ch in word[::-1]:
                    if ch in '.,!?;:':
                        trailing = ch + trailing
                    else:
                        break
                new_words.append(replacement + trailing)
                sub_count += 1
            else:
                new_words.append(word)
        return " ".join(new_words)

    def _build_system_prompt(self, mode: str, writing_dna: Optional[str]) -> str:
        base_prompts = {
            "standard": "You are a professional writer. Rewrite the text preserving meaning, improving clarity and flow. Output only the rewritten text, no explanations, no labels, no markdown.",
            "fluency": "You are a fluency expert. Rewrite the text so it flows smoothly and naturally while preserving meaning. Output only the rewritten text, no explanations, no labels, no markdown.",
            "formal": "You are a formal writing expert. Transform the text into formal, professional language. Output only the transformed text, no explanations, no labels, no markdown.",
            "academic": "You are an academic writing expert. Use scholarly tone and precise language. Output only the adapted text, no explanations, no labels, no markdown.",
            "creative": "You are a creative writer. Add creative flair while keeping the core message. Output only the creative version, no explanations, no labels, no markdown.",
            "simple": "You are a clear communication expert. Simplify the language for broader accessibility. Output only the simplified text, no explanations, no labels, no markdown.",
            "expand": "You are an expansion writer. Elaborate on ideas while maintaining the original intent. Output only the elaborated text, no explanations, no labels, no markdown.",
            "shorten": "You are a concise writer. Reduce word count while preserving key information. Output only the condensed text, no explanations, no labels, no markdown.",
        }
        prompt = base_prompts.get(mode, base_prompts["standard"])
        if writing_dna:
            prompt += f"\n\nMatch this writing style: {writing_dna}"
        return prompt
