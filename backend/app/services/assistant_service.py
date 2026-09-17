"""Para Agent -- the free, always-on conversational assistant.

Backed by public.assistant_sessions / public.assistant_messages. Unlike the
7 paid tools (routed through _run_tool() in tools.py), Para Agent never
touches BillingService -- it is explicitly free to use, so there is no
credit check or deduction anywhere in this file.

Engine routing: rather than trying to run a specialized engine's job itself
(which would either silently skip billing for work that should cost
credits, or require duplicating each engine's billing/logging path here),
Para Agent recognizes when a request is really a job for one of the
dedicated tools and points the user there with a direct link, then still
answers conversationally. The routing signal is a machine-readable
`[[ENGINE:<slug>]]` marker the system prompt asks Gemini to emit on its own
final line when (and only when) that applies; this function strips it out
of the visible reply and turns it into a structured suggestion instead of
leaking the raw marker to the user.
"""
import re
from typing import Optional
from datetime import datetime, timezone
import structlog

from app.db.supabase import get_supabase_admin
from app.ai.llm_service import generate_dict

logger = structlog.get_logger()

MAX_TITLE_LENGTH = 60
MAX_HISTORY_MESSAGES = 20

ENGINE_CATALOG = {
    "paraphraser": {"name": "Paraphraser", "route": "/tools/paraphraser"},
    "humanizer": {"name": "Humanizer", "route": "/tools/humanizer"},
    "detector": {"name": "AI Detector", "route": "/tools/detector"},
    "grammar": {"name": "Grammar Checker", "route": "/tools/grammar"},
    "summarizer": {"name": "Summarizer", "route": "/tools/summarizer"},
    "translator": {"name": "Translator", "route": "/tools/translator"},
    "seo": {"name": "SEO Optimizer", "route": "/tools/seo"},
    "writing-dna": {"name": "Writing DNA", "route": "/tools/writing-dna"},
    "agent-studio": {"name": "Multi-Agent Studio", "route": "/tools/agent-studio"},
}

_ENGINE_MARKER_RE = re.compile(r"\n?\[\[ENGINE:([a-z-]+)\]\]\s*$")

SYSTEM_PROMPT = """You are Para Agent, the built-in AI assistant for Paraflow AI, a professional AI writing platform. You are free to use and behave like a normal, helpful chatbot (similar to ChatGPT or Claude) for general conversation, questions, brainstorming, and advice.

Paraflow AI also has 9 specialized, dedicated engines for specific writing jobs:
- paraphraser (Paraphraser): rewrites text in a chosen mode/tone
- humanizer (Humanizer): makes AI-sounding text read as more natural and human
- detector (AI Detector): estimates the likelihood a piece of text was AI-written
- grammar (Grammar Checker): finds and fixes grammar/spelling issues
- summarizer (Summarizer): condenses long text into a summary
- translator (Translator): translates text between languages
- seo (SEO Optimizer): analyzes text for SEO quality, keywords, and meta descriptions
- writing-dna (Writing DNA): builds the user's personal writing-style profile
- agent-studio (Multi-Agent Studio): iteratively improves a document using multiple AI agents together

Rules:
1. Always try to be genuinely helpful and answer directly, the same way a great general chat assistant would, for anything that isn't one of the specific jobs above.
2. If the user is specifically asking you to DO one of the 9 jobs above on a piece of text (e.g. "translate this to French", "is this AI written?", "fix the grammar here", "make this sound more human", "summarize this", "paraphrase this", "optimize this for SEO", "build my writing profile"), do NOT perform that task yourself in this chat -- running it there is free and doesn't reflect its real cost or produce as high-quality a result as the dedicated tool. Instead, briefly and warmly explain that a specific tool is built for exactly this, and end your entire reply with a line in EXACTLY this form (nothing after it):
[[ENGINE:<slug>]]
using one of these slugs only: paraphraser, humanizer, detector, grammar, summarizer, translator, seo, writing-dna, agent-studio
3. If no specialized engine applies, do not include an [[ENGINE:...]] line at all.
4. Format replies in clean, well-organized Markdown -- headings, bullet lists, bold, code blocks where relevant. Never output raw HTML or broken Markdown syntax.
5. Keep replies focused. Don't pad with filler."""


def make_title(first_message: str) -> str:
    snippet = " ".join(first_message.split())[:MAX_TITLE_LENGTH]
    if len(first_message) > MAX_TITLE_LENGTH:
        snippet = snippet.rstrip() + "..."
    return snippet or "New chat"


def _parse_engine_marker(text: str) -> tuple[str, Optional[str]]:
    """Strip a trailing [[ENGINE:slug]] marker off the model's reply and
    return (visible_text, slug_or_None). An unrecognized slug is treated as
    no suggestion rather than surfaced to the user as a raw marker."""
    match = _ENGINE_MARKER_RE.search(text)
    if not match:
        return text, None
    slug = match.group(1)
    if slug not in ENGINE_CATALOG:
        return text[: match.start()].rstrip(), None
    return text[: match.start()].rstrip(), slug


class AssistantService:
    def __init__(self):
        self.admin = get_supabase_admin()

    async def list_sessions(self, user_id: str, project_id: Optional[str] = None) -> list:
        query = (
            self.admin.table("assistant_sessions")
            .select("id,title,project_id,created_at,updated_at")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
        )
        if project_id:
            query = query.eq("project_id", project_id)
        response = query.execute()
        return response.data or []

    async def get_session(self, user_id: str, session_id: str) -> Optional[dict]:
        session_resp = (
            self.admin.table("assistant_sessions")
            .select("*")
            .eq("user_id", user_id)
            .eq("id", session_id)
            .execute()
        )
        if not session_resp.data:
            return None
        session = session_resp.data[0]
        messages_resp = (
            self.admin.table("assistant_messages")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at", desc=False)
            .execute()
        )
        messages = messages_resp.data or []
        for m in messages:
            slug = m.get("suggested_engine")
            m["suggested_engine_url"] = ENGINE_CATALOG[slug]["route"] if slug in ENGINE_CATALOG else None
        session["messages"] = messages
        return session

    async def delete_session(self, user_id: str, session_id: str) -> bool:
        response = (
            self.admin.table("assistant_sessions")
            .delete()
            .eq("user_id", user_id)
            .eq("id", session_id)
            .execute()
        )
        return bool(response.data)

    async def create_session(self, user_id: str, project_id: Optional[str] = None) -> dict:
        row = {"user_id": user_id, "project_id": project_id, "title": None}
        response = self.admin.table("assistant_sessions").insert(row).execute()
        if not response.data:
            raise RuntimeError("Failed to create assistant session")
        return response.data[0]

    async def send_message(
        self,
        user_id: str,
        session_id: Optional[str],
        content: str,
        attachment_text: Optional[str] = None,
        attachment_name: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> dict:
        if session_id:
            session_resp = (
                self.admin.table("assistant_sessions")
                .select("*")
                .eq("user_id", user_id)
                .eq("id", session_id)
                .execute()
            )
            if not session_resp.data:
                raise ValueError("Session not found")
            session = session_resp.data[0]
        else:
            session = await self.create_session(user_id, project_id)

        is_first_message = session.get("title") is None

        history_resp = (
            self.admin.table("assistant_messages")
            .select("role,content,attachment_name,attachment_text")
            .eq("session_id", session["id"])
            .order("created_at", desc=True)
            .limit(MAX_HISTORY_MESSAGES)
            .execute()
        )
        history = list(reversed(history_resp.data or []))

        # Document-aware context: previously the attachment's extracted
        # text was used only for the turn it was attached on and never
        # persisted, so a follow-up question a turn later ("what are the
        # three main points?") had no way to see the document again --
        # only whatever the model happened to restate in its first reply.
        # Every attachment still in the history window is now gathered
        # into one document-context block (deduped by name) and given to
        # every turn in the session, not just the one it arrived on.
        seen_attachments = set()
        document_blocks = []
        for m in history:
            name = m.get("attachment_name")
            text = m.get("attachment_text")
            if name and text and name not in seen_attachments:
                seen_attachments.add(name)
                document_blocks.append(f"[Attached file: {name}]\n---\n{text}\n---")
        if attachment_text and attachment_name not in seen_attachments:
            document_blocks.append(
                f"[Attached file: {attachment_name or 'file.txt'}]\n---\n{attachment_text[:12000]}\n---"
            )

        conversation = "\n\n".join(
            f"{'User' if m['role'] == 'user' else 'Para Agent'}: {m['content']}"
            for m in history
        )

        prompt_sections = []
        if document_blocks:
            prompt_sections.append(
                "The user has attached the following document(s) in this conversation. "
                "Use them to answer when relevant, and say clearly when the answer isn't "
                "in them rather than guessing or inventing facts:\n\n"
                + "\n\n".join(document_blocks)
            )
        prompt_sections.append(f"{conversation}\n\nUser: {content}" if conversation else f"User: {content}")
        full_prompt = "\n\n---\n\n".join(prompt_sections)

        result = generate_dict(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=full_prompt,
            temperature=0.6,
            max_tokens=1024,
        )

        now = datetime.now(timezone.utc).isoformat()

        if result.get("status") == "success" and result.get("output"):
            visible_text, engine_slug = _parse_engine_marker(result["output"])
        else:
            visible_text = (
                "Sorry, I couldn't generate a reply just now "
                f"({result.get('error', 'the AI service is temporarily unavailable')}). "
                "Please try again in a moment."
            )
            engine_slug = None

        user_row = {
            "session_id": session["id"],
            "user_id": user_id,
            "role": "user",
            "content": content,
            "attachment_name": attachment_name,
            "attachment_text": attachment_text[:12000] if attachment_text else None,
        }
        assistant_row = {
            "session_id": session["id"],
            "user_id": user_id,
            "role": "assistant",
            "content": visible_text,
            "suggested_engine": engine_slug,
        }
        inserted = (
            self.admin.table("assistant_messages")
            .insert([user_row, assistant_row])
            .execute()
        )
        saved_user, saved_assistant = inserted.data[0], inserted.data[1]

        title = session.get("title")
        if is_first_message:
            title = make_title(content)
            self.admin.table("assistant_sessions").update({
                "title": title,
                "updated_at": now,
            }).eq("id", session["id"]).execute()
        else:
            self.admin.table("assistant_sessions").update({
                "updated_at": now,
            }).eq("id", session["id"]).execute()

        engine_url = ENGINE_CATALOG[engine_slug]["route"] if engine_slug else None

        return {
            "session_id": session["id"],
            "title": title,
            "user_message": saved_user,
            "assistant_message": {**saved_assistant, "suggested_engine_url": engine_url},
        }
