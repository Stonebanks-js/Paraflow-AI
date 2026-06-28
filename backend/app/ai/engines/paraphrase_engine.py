from typing import Optional
from .base import BaseAIEngine
from .nvidia_engine import NVIDIAEngine
import structlog
import re

logger = structlog.get_logger()


class ParaphraseEngine(BaseAIEngine):
    MODES = ["standard", "fluency", "formal", "academic", "creative", "simple", "expand", "shorten"]

    def __init__(self):
        super().__init__()
        self._nvidia = NVIDIAEngine()

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {"status": "error", "error": "Invalid input"}

        mode = options.get("mode", "standard") if options else "standard"
        strength = options.get("strength", 50) if options else 50

        if mode not in self.MODES:
            return {"status": "error", "error": f"Invalid mode. Choose from: {self.MODES}"}

        prompt_options = {
            "mode": mode,
            "writing_dna": options.get("writing_dna") if options else None,
        }

        result = await self._nvidia.process(input_text, prompt_options)

        if result.get("status") == "success":
            output = result.get("output", "")
            return {
                "status": "success",
                "output": output,
                "mode": mode,
                "word_count_diff": len(output.split()) - len(input_text.split()),
                "model_used": result.get("model"),
            }

        # NVIDIA failed - use local paraphrase fallback so the user always gets a response.
        # This is a rule-based transformation that changes sentence structure, replaces
        # common words with synonyms, and varies the output based on the mode.
        logger.warning(f"paraphrase.nvidia_fallback", error=result.get("error"))
        try:
            output = self._local_paraphrase(input_text, mode, strength)
            return {
                "status": "success",
                "output": output,
                "mode": mode,
                "word_count_diff": len(output.split()) - len(input_text.split()),
                "model_used": "local-fallback",
            }
        except Exception as e:
            logger.error(f"paraphrase.local_fallback_failed: {e}")
            return result  # Return original error

    def _local_paraphrase(self, text: str, mode: str, strength: int) -> str:
        """Local rule-based paraphrase fallback.
        Provides a deterministic rewrite using synonym substitution and sentence
        restructuring. Quality is lower than NVIDIA, but always works.
        """
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
        if not sentences:
            return text

        out = []
        for i, sentence in enumerate(sentences):
            rewritten = self._rewrite_sentence(sentence, mode, i, strength)
            out.append(rewritten)

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
                "endeavor": "try", "ascertain": "find out", "commence": "begin",
            }
            for i, s in enumerate(out):
                for old, new in replacements.items():
                    s = re.sub(rf'\b{old}\b', new, s, flags=re.IGNORECASE)
                out[i] = s
        elif mode == "formal":
            out = [s.replace("don't", "do not").replace("won't", "will not").replace("can't", "cannot")
                       .replace("I'm", "I am").replace("you're", "you are") for s in out]
        elif mode == "creative":
            starters = ["Imagine", "Consider", "Picture", "Think about"]
            if sentences and len(sentences) > 0 and i == 0:
                out[0] = f"{starters[i % len(starters)]} — {out[0]}"
        elif mode == "academic":
            replacements = {
                "I think": "It is suggested that", "a lot of": "numerous",
                "really": "considerably", "very": "substantially", "big": "significant",
                "get": "obtain", "show": "demonstrate", "tell": "indicate",
            }
            for i, s in enumerate(out):
                for old, new in replacements.items():
                    s = re.sub(rf'\b{old}\b', new, s, flags=re.IGNORECASE)
                out[i] = s
        # "standard", "fluency" - just sentence variation

        return " ".join(out)

    def _rewrite_sentence(self, sentence: str, mode: str, index: int, strength: int) -> str:
        """Apply a small set of transformations to vary the sentence."""
        if not sentence:
            return sentence

        # Don't transform very short sentences aggressively
        words = sentence.split()
        if len(words) < 4:
            return sentence

        # Apply synonym substitution based on mode
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

        # Apply up to strength/30 substitutions per sentence
        max_subs = max(1, strength // 30)
        new_words = []
        sub_count = 0
        for word in words:
            word_lower = word.lower().strip('.,!?;:')
            if word_lower in sub and sub_count < max_subs:
                replacement = sub[word_lower]
                # Preserve capitalization
                if word[0].isupper():
                    replacement = replacement[0].upper() + replacement[1:]
                # Preserve trailing punctuation
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
