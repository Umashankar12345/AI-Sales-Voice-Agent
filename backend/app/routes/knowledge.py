from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import csv
import io
import time
import xml.etree.ElementTree as ET
import zipfile

from app.auth import CurrentUser, get_optional_user
from app.rag import rag_service

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB limit

router = APIRouter(prefix="/api/knowledge", tags=["Knowledge Base & RAG"])

class SearchQuery(BaseModel):
    query: str = Field(..., min_length=1, description="Question or keyword to search in FAISS")
    top_k: int = Field(3, ge=1, le=10)

@router.get("/chunks")
async def get_all_chunks():
    """
    Returns all indexed knowledge base chunks for live UI demonstration.
    """
    chunks = rag_service.get_all_chunks()
    return {
        "total_chunks": len(chunks),
        "embedding_model": rag_service.model_name,
        "vector_dimension": rag_service.dimension,
        "chunks": chunks
    }

@router.post("/search")
async def search_knowledge(req: SearchQuery, current: Optional[CurrentUser] = Depends(get_optional_user)):
    """
    Interactive endpoint to test FAISS cosine similarity retrieval.
    Shows the exact retrieved context and similarity scores for demonstration.
    """
    start_time = time.time()
    org_id = current.org_id if current else "org_default"
    results = rag_service.search(req.query, top_k=req.top_k, org_id=org_id)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    return {
        "query": req.query,
        "retrieved_count": len(results),
        "latency_ms": duration_ms,
        "results": results
    }


def _extract_text_from_upload(filename: str, raw: bytes) -> str:
    lower = filename.lower()
    if lower.endswith(".txt") or lower.endswith(".md"):
        return raw.decode("utf-8", errors="ignore")
    if lower.endswith(".csv"):
        text = raw.decode("utf-8", errors="ignore")
        rows = list(csv.reader(io.StringIO(text)))
        return "\n".join([" | ".join(r) for r in rows if any(c.strip() for c in r)])
    if lower.endswith(".docx"):
        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            xml_data = zf.read("word/document.xml")
        root = ET.fromstring(xml_data)
        return " ".join(el.text for el in root.iter() if el.text)
    if lower.endswith(".pdf"):
        try:
            import fitz
            doc = fitz.open(stream=raw, filetype="pdf")
            return "\n".join(page.get_text() for page in doc)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"PDF extraction failed: {exc}")
    raise HTTPException(status_code=400, detail="Unsupported file type. Supported: .pdf, .docx, .txt, .csv")


@router.post("/upload")
async def upload_knowledge_document(
    file: Optional[UploadFile] = File(None),
    title: Optional[str] = Form(None),
    pasted_text: Optional[str] = Form(None),
    current: Optional[CurrentUser] = Depends(get_optional_user),
):
    """Upload PDF, DOCX, TXT, CSV, or pasted text to the live FAISS RAG knowledge base."""
    org_id = current.org_id if current else "org_default"
    if file is not None:
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=422, detail="Uploaded file is empty")
        if len(raw) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File exceeds 5 MB upload limit")
        source_name = (title or file.filename or "Uploaded Document").strip()
        extracted = _extract_text_from_upload(file.filename or "doc.txt", raw)
    elif pasted_text and pasted_text.strip():
        source_name = (title or "Pasted Knowledge").strip()
        extracted = pasted_text.strip()
    else:
        raise HTTPException(status_code=400, detail="Provide either a file (.pdf/.docx/.txt/.csv) or pasted_text.")

    added = rag_service.add_document(source_name, extracted, org_id=org_id)
    if added == -1:
        raise HTTPException(status_code=409, detail="Duplicate document already indexed for this organization.")
    if added == 0:
        raise HTTPException(status_code=422, detail="No indexable text found in document.")
    return {
        "success": True,
        "source": source_name,
        "org_id": org_id,
        "chunks_added": added,
        "total_chunks": len(rag_service.chunks),
    }


@router.delete("/document/{source_name}")
async def delete_knowledge_document(
    source_name: str,
    current: Optional[CurrentUser] = Depends(get_optional_user),
):
    org_id = current.org_id if current else "org_default"
    removed = rag_service.delete_document(source_name, org_id=org_id)
    if removed == 0:
        raise HTTPException(status_code=404, detail="Document not found for this organization.")
    return {"success": True, "source": source_name, "chunks_removed": removed, "total_chunks": len(rag_service.chunks)}
