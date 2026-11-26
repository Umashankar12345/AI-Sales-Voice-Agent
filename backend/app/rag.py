import json
import logging
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np

logger = logging.getLogger("voxsales.rag")

class RAGPipeline:
    def __init__(self):
        self.model = None
        self.model_name = "all-MiniLM-L6-v2"
        self.faiss_index = None
        self.chunks: List[Dict[str, Any]] = []
        self.dimension = 384
        self.is_ready = False

    def initialize(self, kb_path: Path):
        """
        Parses knowledge base, loads or computes embeddings, and builds FAISS index.
        """
        try:
            logger.info("Initializing RAG Knowledge Base...")
            self.chunks = self._chunk_knowledge_base(kb_path)
            for c in self.chunks:
                c.setdefault("org_id", "public")

            # Reload persisted org-uploaded documents from MongoDB if available
            from app.database import db
            if db.connected and db.db is not None:
                for doc in db.db.kb_documents.find():
                    for ch in doc.get("chunks", []):
                        ch["id"] = len(self.chunks)
                        self.chunks.append(ch)

            logger.info(f"Generated {len(self.chunks)} knowledge chunks from {kb_path.name}")
            self._load_embedder()
            self._build_index()
            self.is_ready = True
            logger.info("RAG Pipeline and FAISS index successfully built and ready.")
        except Exception as e:
            logger.error(f"Failed to initialize RAG pipeline: {e}", exc_info=True)
            self._fallback_init(kb_path)

    def _chunk_knowledge_base(self, kb_path: Path) -> List[Dict[str, Any]]:
        """
        Chunks the knowledge base text file cleanly by sections and logical course blocks.
        """
        if not kb_path.exists():
            raise FileNotFoundError(f"Knowledge base file not found at {kb_path}")

        with open(kb_path, "r", encoding="utf-8") as f:
            content = f.read()

        raw_sections = content.split("------------------------------------------------------------------------------")
        chunks = []
        chunk_id = 0

        for section in raw_sections:
            section = section.strip()
            if not section:
                continue

            # Determine course/section tag
            course_tag = "General / Admissions"
            if "PYTHON" in section.upper():
                course_tag = "Python Programming"
            elif "JAVA" in section.upper():
                course_tag = "Java Enterprise & Microservices"
            elif "FULL STACK" in section.upper() or "MERN" in section.upper():
                course_tag = "Full Stack Web Development"
            elif "ARTIFICIAL INTELLIGENCE" in section.upper() or "MACHINE LEARNING" in section.upper() or "LLM" in section.upper():
                course_tag = "AI & Machine Learning Specialist"
            elif "DATA STRUCTURES" in section.upper() or "DSA" in section.upper():
                course_tag = "DSA & System Design"
            elif "COMPANY OVERVIEW" in section.upper():
                course_tag = "Company Overview"

            # Break into sub-blocks if section is long
            sub_blocks = [b.strip() for b in section.split("\n\n") if len(b.strip()) > 30]
            if len(sub_blocks) <= 2:
                chunks.append({
                    "id": chunk_id,
                    "course": course_tag,
                    "content": section,
                    "preview": section[:160] + "..."
                })
                chunk_id += 1
            else:
                # Group 2 sub-blocks together for high-context chunks
                for i in range(0, len(sub_blocks), 2):
                    chunk_text = "\n\n".join(sub_blocks[i:i+2])
                    chunks.append({
                        "id": chunk_id,
                        "course": course_tag,
                        "content": chunk_text,
                        "preview": chunk_text[:160] + "..."
                    })
                    chunk_id += 1

        return chunks

    def _load_embedder(self):
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading SentenceTransformer: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer ({e}). Falling back to TF-IDF embedding.")
            self.model = None

    def _build_index(self):
        import faiss
        
        texts = [c["content"] for c in self.chunks]
        
        if self.model is not None:
            embeddings = self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
            self.dimension = embeddings.shape[1]
            # Use IndexFlatIP for cosine similarity on normalized vectors
            self.faiss_index = faiss.IndexFlatIP(self.dimension)
            self.faiss_index.add(embeddings.astype(np.float32))
            logger.info(f"FAISS IndexFlatIP created with {self.faiss_index.ntotal} vectors of dimension {self.dimension}")
        else:
            # Fallback using scikit-learn TF-IDF + FAISS or cosine similarity
            from sklearn.feature_extraction.text import TfidfVectorizer
            self.vectorizer = TfidfVectorizer(max_features=256)
            matrix = self.vectorizer.fit_transform(texts).toarray().astype(np.float32)
            self.dimension = matrix.shape[1]
            faiss.normalize_L2(matrix)
            self.faiss_index = faiss.IndexFlatIP(self.dimension)
            self.faiss_index.add(matrix)
            logger.info(f"Fallback TF-IDF FAISS Index built with dimension {self.dimension}")

    def _fallback_init(self, kb_path: Path):
        """Ultra-simple fallback if anything fails during heavy model loading"""
        logger.info("Initializing lightweight fallback knowledge searcher...")
        try:
            with open(kb_path, "r", encoding="utf-8") as f:
                content = f.read()
            blocks = [b.strip() for b in content.split("------------------------------------------------------------------------------") if b.strip()]
            self.chunks = []
            for i, b in enumerate(blocks):
                self.chunks.append({
                    "id": i,
                    "course": "General / Course Info",
                    "content": b,
                    "preview": b[:160] + "..."
                })
            self.is_ready = True
        except Exception as e:
            logger.error(f"Fallback init error: {e}")

    def search(self, query: str, top_k: int = 3, org_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieves top_k most relevant chunks using FAISS cosine similarity, scoped to org_id + public.
        """
        if not self.chunks:
            return []

        allowed_orgs = {"public", org_id or "org_default"}
        search_k = min(len(self.chunks), max(top_k * 4, 15))

        # If FAISS index is active
        if self.faiss_index is not None:
            try:
                import faiss
                if self.model is not None:
                    query_vec = self.model.encode([query], convert_to_numpy=True, normalize_embeddings=True)
                else:
                    vec = self.vectorizer.transform([query]).toarray().astype(np.float32)
                    faiss.normalize_L2(vec)
                    query_vec = vec

                distances, indices = self.faiss_index.search(query_vec.astype(np.float32), search_k)
                
                results = []
                for score, idx in zip(distances[0], indices[0]):
                    if idx < 0 or idx >= len(self.chunks):
                        continue
                    chunk = self.chunks[idx]
                    if chunk.get("org_id", "public") not in allowed_orgs:
                        continue
                    c_copy = chunk.copy()
                    c_copy["score"] = round(float(score), 4)
                    results.append(c_copy)
                    if len(results) >= top_k:
                        break
                return results
            except Exception as e:
                logger.error(f"Error in FAISS search ({e}). Falling back to keyword search.")

        # Heuristic keyword score fallback
        keywords = set(re.findall(r'\w+', query.lower()))
        scored_chunks = []
        for chunk in self.chunks:
            chunk_words = set(re.findall(r'\w+', chunk["content"].lower()))
            overlap = len(keywords.intersection(chunk_words))
            scored_chunks.append((overlap, chunk))
        
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, chunk in scored_chunks[:top_k]:
            c = chunk.copy()
            c["score"] = float(score)
            results.append(c)
        return results

    def get_all_chunks(self) -> List[Dict[str, Any]]:
        return self.chunks

    def add_document(self, source_name: str, text: str, org_id: str = "org_default", chunk_size: int = 600, overlap: int = 100) -> int:
        """
        Cleans, chunks with overlap, persists to MongoDB, and indexes a newly uploaded document into FAISS live.
        Returns number of chunks added, or -1 if duplicate.
        """
        import hashlib
        from datetime import datetime
        from app.database import db

        clean = re.sub(r'\s+', ' ', text).strip()
        if not clean:
            return 0

        doc_hash = hashlib.sha256(clean.encode("utf-8")).hexdigest()
        if db.connected and db.db is not None:
            if db.db.kb_documents.find_one({"org_id": org_id, "doc_hash": doc_hash}):
                return -1

        new_chunks = []
        start_id = len(self.chunks)
        step = max(100, chunk_size - overlap)
        idx = 0
        while idx < len(clean):
            piece = clean[idx:idx + chunk_size].strip()
            if len(piece) > 20:
                new_chunks.append({
                    "id": start_id + len(new_chunks),
                    "org_id": org_id,
                    "course": source_name,
                    "content": piece,
                    "preview": piece[:160] + ("..." if len(piece) > 160 else "")
                })
            idx += step

        if not new_chunks:
            return 0

        if db.connected and db.db is not None:
            db.db.kb_documents.insert_one({
                "org_id": org_id,
                "source_name": source_name,
                "doc_hash": doc_hash,
                "chunks": new_chunks,
                "created_at": datetime.utcnow(),
            })

        self.chunks.extend(new_chunks)
        self._build_index()
        self.is_ready = True
        return len(new_chunks)

    def delete_document(self, source_name: str, org_id: str = "org_default") -> int:
        """Delete an uploaded document's chunks for an org and rebuild the FAISS index."""
        from app.database import db

        before = len(self.chunks)
        self.chunks = [c for c in self.chunks if not (c.get("course") == source_name and c.get("org_id") == org_id)]
        removed = before - len(self.chunks)
        for i, c in enumerate(self.chunks):
            c["id"] = i

        if db.connected and db.db is not None:
            db.db.kb_documents.delete_many({"org_id": org_id, "source_name": source_name})

        if removed > 0:
            self._build_index()
        return removed

rag_service = RAGPipeline()
