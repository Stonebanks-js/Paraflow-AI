"""Document text extraction for Para Agent file attachments.

Handles the formats a browser can't parse on its own (PDF, DOCX) --
plain-text-like formats (.txt/.md/.csv/.json/.log) are still read
client-side via FileReader for speed, with no round trip needed. This
module exists so PDF/DOCX support is real extraction, not a claimed
capability that silently does nothing: an unreadable, empty, encrypted,
or corrupted file raises a clear, honest error rather than being
attached as blank/garbage content.
"""
import io
from typing import Optional
import structlog

logger = structlog.get_logger()

MAX_EXTRACTED_CHARS = 20000

SUPPORTED_EXTENSIONS = {"pdf", "docx", "txt", "md", "markdown", "csv", "json", "log"}


class UnsupportedFileError(ValueError):
    """Raised for any file this extractor can't produce real text from."""


def extract_text(filename: str, content: bytes) -> str:
    ext = (filename.rsplit(".", 1)[-1] if "." in filename else "").lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise UnsupportedFileError(
            f"Unsupported file type '.{ext}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}."
        )

    if ext == "pdf":
        text = _extract_pdf(content)
    elif ext == "docx":
        text = _extract_docx(content)
    else:
        text = _extract_plain_text(content)

    text = text.strip()
    if not text:
        raise UnsupportedFileError(
            "No extractable text found in this file (it may be scanned/image-based, empty, or corrupted)."
        )
    return text[:MAX_EXTRACTED_CHARS]


def _extract_plain_text(content: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            return content.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            continue
    raise UnsupportedFileError("Could not decode this file as text.")


def _extract_pdf(content: bytes) -> str:
    from pypdf import PdfReader
    from pypdf.errors import PdfReadError

    try:
        reader = PdfReader(io.BytesIO(content))
    except PdfReadError as e:
        raise UnsupportedFileError(f"Could not read this PDF: {str(e)[:200]}") from None
    except Exception as e:
        raise UnsupportedFileError(f"Could not read this PDF: {str(e)[:200]}") from None

    if reader.is_encrypted:
        try:
            reader.decrypt("")
        except Exception:
            raise UnsupportedFileError("This PDF is password-protected and can't be read.") from None

    pages_text = []
    for page in reader.pages:
        try:
            pages_text.append(page.extract_text() or "")
        except Exception as e:
            logger.warning("document_extraction.pdf_page_failed", error=str(e)[:200])
    return "\n\n".join(pages_text)


def _extract_docx(content: bytes) -> str:
    from docx import Document
    from docx.opc.exceptions import PackageNotFoundError

    try:
        doc = Document(io.BytesIO(content))
    except PackageNotFoundError:
        raise UnsupportedFileError("Could not read this file as a .docx document.") from None
    except Exception as e:
        raise UnsupportedFileError(f"Could not read this .docx file: {str(e)[:200]}") from None

    parts = [p.text for p in doc.paragraphs if p.text.strip()]
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                if cell.text.strip():
                    parts.append(cell.text)
    return "\n".join(parts)
