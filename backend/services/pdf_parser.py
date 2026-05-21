"""
PDF Parser service using PyMuPDF (fitz) to extract text from uploaded CVs.
Falls back to basic text extraction if PyMuPDF is unavailable.
"""
import io


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes. Returns plain text string."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text())
        doc.close()
        return "\n".join(text_parts).strip()
    except ImportError:
        # Fallback: try pdfplumber
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                pages = [page.extract_text() or "" for page in pdf.pages]
            return "\n".join(pages).strip()
        except ImportError:
            return "CV text extraction unavailable — PyMuPDF not installed. Please install: pip install pymupdf"
    except Exception as e:
        return f"Could not extract CV text: {str(e)}"
