"""RAG (Retrieval-Augmented Generation) service for document indexing and retrieval.

This module provides:
- Document chunking with hybrid strategy (semantic + token limit)
- Embedding generation using Ollama
- FAISS vector index management
- Integration with the document_chunks table for backup
"""
import os
import re
import pickle
from typing import List, Optional, Tuple, Dict, Any
import httpx
from sqlalchemy.orm import Session

from app.models.models import Document, DocumentChunk, AppSetting

# Storage paths
STORAGE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "storage"
)
FAISS_INDEX_DIR = os.path.join(STORAGE_DIR, "faiss_index")
FAISS_INDEX_FILE = os.path.join(FAISS_INDEX_DIR, "index.faiss")
FAISS_METADATA_FILE = os.path.join(FAISS_INDEX_DIR, "metadata.pkl")

# Ensure directories exist
os.makedirs(FAISS_INDEX_DIR, exist_ok=True)

# Default settings
DEFAULT_OLLAMA_URL = "http://localhost:11434"
DEFAULT_EMBEDDING_MODEL = "nomic-embed-text"  # Common embedding model for Ollama
MAX_TOKENS_PER_CHUNK = 500
CHARS_PER_TOKEN_ESTIMATE = 3.5  # Rough estimate for Hungarian/English mixed text


def get_ollama_settings(db: Session) -> dict:
    """Get Ollama settings from database."""
    settings = {}
    rows = db.query(AppSetting).filter(
        AppSetting.key.in_([
            "ollama_url",
            "ollama_base_url",
            "embedding_model",
        ])
    ).all()

    for row in rows:
        settings[row.key] = row.value

    return settings


def estimate_tokens(text: str) -> int:
    """Estimate token count for a text string.

    Uses a rough heuristic based on character count.
    """
    if not text:
        return 0
    return max(1, int(len(text) / CHARS_PER_TOKEN_ESTIMATE))


def find_semantic_boundaries(text: str) -> List[int]:
    """Find semantic boundaries in text (paragraph breaks, section headers, etc.).

    Returns list of character positions where semantic boundaries occur.
    """
    boundaries = [0]  # Start of text is always a boundary

    # Patterns for semantic boundaries
    patterns = [
        r'\n\s*\n',  # Double newline (paragraph break)
        r'\n#{1,6}\s',  # Markdown headers
        r'\n\d+\.\s',  # Numbered list items
        r'\n[-*]\s',  # Bullet points
        r'\n[A-ZÁÉÍÓÖŐÚÜŰ][^a-záéíóöőúüű]{0,50}:\s*\n',  # Section headers (Hungarian)
        r'\n[A-Z][^a-z]{0,50}:\s*\n',  # Section headers (English)
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, text):
            boundaries.append(match.start())

    boundaries.append(len(text))  # End of text
    return sorted(set(boundaries))


def chunk_text_hybrid(
    text: str,
    max_tokens: int = MAX_TOKENS_PER_CHUNK,
    overlap_tokens: int = 50
) -> List[str]:
    """Chunk text using a hybrid strategy: semantic boundaries + token limit.

    This approach:
    1. Identifies semantic boundaries (paragraphs, sections)
    2. Respects these boundaries when possible
    3. Splits long sections at the token limit with overlap

    Args:
        text: The text to chunk
        max_tokens: Maximum tokens per chunk (default 500)
        overlap_tokens: Token overlap between chunks for context continuity

    Returns:
        List of text chunks
    """
    if not text or not text.strip():
        return []

    max_chars = int(max_tokens * CHARS_PER_TOKEN_ESTIMATE)
    overlap_chars = int(overlap_tokens * CHARS_PER_TOKEN_ESTIMATE)

    # Find semantic boundaries
    boundaries = find_semantic_boundaries(text)

    chunks = []
    current_chunk_start = 0

    i = 0
    while i < len(boundaries) - 1:
        boundary_start = boundaries[i]
        boundary_end = boundaries[i + 1]
        segment = text[boundary_start:boundary_end].strip()

        if not segment:
            i += 1
            continue

        segment_len = len(segment)

        # If segment fits in current chunk, add it
        current_pos = boundary_start - current_chunk_start
        if current_pos + segment_len <= max_chars:
            i += 1
            continue

        # If we have accumulated content, save it as a chunk
        if boundary_start > current_chunk_start:
            chunk_text = text[current_chunk_start:boundary_start].strip()
            if chunk_text:
                chunks.append(chunk_text)
            # Set new start with overlap
            current_chunk_start = max(0, boundary_start - overlap_chars)

        # Handle segments that are too long (need to split within segment)
        if segment_len > max_chars:
            # Split this long segment
            segment_start = boundary_start
            while segment_start < boundary_end:
                end_pos = min(segment_start + max_chars, boundary_end)

                # Try to find a sentence boundary for cleaner splits
                if end_pos < boundary_end:
                    # Look for sentence endings within the last 20% of the chunk
                    search_start = max(segment_start, end_pos - int(max_chars * 0.2))
                    search_text = text[search_start:end_pos]

                    # Find last sentence ending
                    sentence_endings = [
                        m.end() + search_start
                        for m in re.finditer(r'[.!?]\s+', search_text)
                    ]
                    if sentence_endings:
                        end_pos = sentence_endings[-1]

                chunk_text = text[segment_start:end_pos].strip()
                if chunk_text:
                    chunks.append(chunk_text)

                # Move forward with overlap
                segment_start = max(segment_start + 1, end_pos - overlap_chars)

            current_chunk_start = boundary_end - overlap_chars
            i += 1
        else:
            i += 1

    # Don't forget the last chunk
    remaining = text[current_chunk_start:].strip()
    if remaining:
        chunks.append(remaining)

    return chunks


async def generate_embedding_ollama(
    text: str,
    ollama_url: str = DEFAULT_OLLAMA_URL,
    model: str = DEFAULT_EMBEDDING_MODEL,
) -> Optional[List[float]]:
    """Generate embedding for text using Ollama.

    Args:
        text: Text to embed
        ollama_url: Ollama server URL
        model: Embedding model to use

    Returns:
        List of floats representing the embedding, or None on error
    """
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{ollama_url}/api/embeddings",
                json={
                    "model": model,
                    "prompt": text,
                }
            )
            response.raise_for_status()
            result = response.json()
            return result.get("embedding")
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None


async def generate_embeddings_batch(
    texts: List[str],
    ollama_url: str = DEFAULT_OLLAMA_URL,
    model: str = DEFAULT_EMBEDDING_MODEL,
) -> List[Optional[List[float]]]:
    """Generate embeddings for multiple texts.

    Args:
        texts: List of texts to embed
        ollama_url: Ollama server URL
        model: Embedding model to use

    Returns:
        List of embeddings (or None for failed items)
    """
    embeddings = []
    for text in texts:
        embedding = await generate_embedding_ollama(text, ollama_url, model)
        embeddings.append(embedding)
    return embeddings


class FAISSIndex:
    """FAISS index wrapper for document chunks."""

    def __init__(self):
        self.index = None
        self.metadata: List[Dict[str, Any]] = []  # Stores doc_id, chunk_id, etc.
        self.dimension: Optional[int] = None
        self._load_index()

    def _load_index(self):
        """Load existing index from disk if available."""
        if os.path.exists(FAISS_INDEX_FILE) and os.path.exists(FAISS_METADATA_FILE):
            try:
                import faiss
                self.index = faiss.read_index(FAISS_INDEX_FILE)
                with open(FAISS_METADATA_FILE, "rb") as f:
                    self.metadata = pickle.load(f)
                if self.index.ntotal > 0:
                    self.dimension = self.index.d
            except Exception as e:
                print(f"Error loading FAISS index: {e}")
                self.index = None
                self.metadata = []

    def _save_index(self):
        """Save index to disk."""
        if self.index is not None:
            try:
                import faiss
                faiss.write_index(self.index, FAISS_INDEX_FILE)
                with open(FAISS_METADATA_FILE, "wb") as f:
                    pickle.dump(self.metadata, f)
            except Exception as e:
                print(f"Error saving FAISS index: {e}")

    def _ensure_index(self, dimension: int):
        """Ensure index exists with correct dimension."""
        import faiss
        if self.index is None or self.dimension != dimension:
            # Use IndexFlatIP for inner product (cosine similarity with normalized vectors)
            self.index = faiss.IndexFlatIP(dimension)
            self.dimension = dimension
            self.metadata = []

    def add_embeddings(
        self,
        embeddings: List[List[float]],
        metadata_list: List[Dict[str, Any]]
    ):
        """Add embeddings to the index.

        Args:
            embeddings: List of embedding vectors
            metadata_list: List of metadata dicts (must match embeddings length)
        """
        import numpy as np
        import faiss

        if not embeddings:
            return

        # Convert to numpy array
        vectors = np.array(embeddings, dtype=np.float32)

        # Normalize vectors for cosine similarity
        faiss.normalize_L2(vectors)

        # Ensure index exists
        self._ensure_index(vectors.shape[1])

        # Add to index
        self.index.add(vectors)
        self.metadata.extend(metadata_list)

        # Save to disk
        self._save_index()

    def remove_document(self, document_id: int):
        """Remove all chunks for a document from the index.

        Note: FAISS doesn't support direct removal, so we rebuild the index
        without the removed document's chunks.
        """
        import numpy as np
        import faiss

        if self.index is None or self.index.ntotal == 0:
            return

        # Find indices to keep
        indices_to_keep = [
            i for i, m in enumerate(self.metadata)
            if m.get("document_id") != document_id
        ]

        if len(indices_to_keep) == len(self.metadata):
            return  # Nothing to remove

        if not indices_to_keep:
            # Remove all - reset index
            self.index = None
            self.metadata = []
            self._save_index()
            return

        # Reconstruct vectors for kept indices
        vectors = np.zeros((len(indices_to_keep), self.dimension), dtype=np.float32)
        for new_idx, old_idx in enumerate(indices_to_keep):
            vectors[new_idx] = self.index.reconstruct(old_idx)

        # Rebuild index
        new_index = faiss.IndexFlatIP(self.dimension)
        new_index.add(vectors)

        self.index = new_index
        self.metadata = [self.metadata[i] for i in indices_to_keep]
        self._save_index()

    def search(
        self,
        query_embedding: List[float],
        k: int = 5
    ) -> List[Tuple[Dict[str, Any], float]]:
        """Search for similar chunks.

        Args:
            query_embedding: Query vector
            k: Number of results to return

        Returns:
            List of (metadata, score) tuples
        """
        import numpy as np
        import faiss

        if self.index is None or self.index.ntotal == 0:
            return []

        # Convert and normalize query
        query = np.array([query_embedding], dtype=np.float32)
        faiss.normalize_L2(query)

        # Search
        k = min(k, self.index.ntotal)
        scores, indices = self.index.search(query, k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and idx < len(self.metadata):
                results.append((self.metadata[idx], float(score)))

        return results

    def get_stats(self) -> Dict[str, Any]:
        """Get index statistics."""
        return {
            "total_vectors": self.index.ntotal if self.index else 0,
            "dimension": self.dimension,
            "documents_indexed": len(set(
                m.get("document_id") for m in self.metadata
            )) if self.metadata else 0,
        }


# Global index instance
_faiss_index: Optional[FAISSIndex] = None


def get_faiss_index() -> FAISSIndex:
    """Get or create the FAISS index instance."""
    global _faiss_index
    if _faiss_index is None:
        _faiss_index = FAISSIndex()
    return _faiss_index


async def index_document(
    document: Document,
    db: Session,
) -> Tuple[int, Optional[str]]:
    """Index a document for RAG.

    This function:
    1. Extracts text from the document
    2. Chunks the text using hybrid strategy
    3. Generates embeddings for each chunk
    4. Stores chunks in database and FAISS index

    Args:
        document: Document model instance
        db: Database session

    Returns:
        Tuple of (chunks_created, error_message)
    """
    from app.routers.documents import extract_document_content

    # Get settings
    settings = get_ollama_settings(db)
    ollama_url = settings.get("ollama_url") or settings.get("ollama_base_url") or DEFAULT_OLLAMA_URL
    embedding_model = settings.get("embedding_model") or DEFAULT_EMBEDDING_MODEL

    # Extract text
    text_content, _ = extract_document_content(document.file_path, document.file_type)

    if not text_content or text_content.startswith("[Hiba"):
        return 0, f"Nem sikerült kinyerni a szöveget: {text_content}"

    # Delete existing chunks for this document
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete()
    db.commit()

    # Remove from FAISS index
    faiss_index = get_faiss_index()
    faiss_index.remove_document(document.id)

    # Chunk the text
    chunks = chunk_text_hybrid(text_content)

    if not chunks:
        return 0, "A dokumentum nem tartalmaz feldolgozható szöveget."

    # Generate embeddings
    embeddings = await generate_embeddings_batch(chunks, ollama_url, embedding_model)

    # Store chunks and add to index
    valid_embeddings = []
    valid_metadata = []

    for idx, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
        # Create database record
        chunk = DocumentChunk(
            document_id=document.id,
            chunk_index=idx,
            content=chunk_text,
            embedding_id=f"doc_{document.id}_chunk_{idx}" if embedding else None,
        )
        db.add(chunk)

        if embedding:
            valid_embeddings.append(embedding)
            valid_metadata.append({
                "document_id": document.id,
                "chunk_index": idx,
                "chunk_id": chunk.embedding_id,
                "filename": document.original_filename,
            })

    db.commit()

    # Add to FAISS index
    if valid_embeddings:
        faiss_index.add_embeddings(valid_embeddings, valid_metadata)

    failed_count = len(chunks) - len(valid_embeddings)
    error_msg = None
    if failed_count > 0:
        error_msg = f"{failed_count} chunk embedding generálása sikertelen."

    return len(chunks), error_msg


async def remove_document_from_index(document_id: int, db: Session):
    """Remove a document from the RAG index.

    Args:
        document_id: ID of the document to remove
        db: Database session
    """
    # Delete chunks from database
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()
    db.commit()

    # Remove from FAISS index
    faiss_index = get_faiss_index()
    faiss_index.remove_document(document_id)


async def search_similar_chunks(
    query: str,
    db: Session,
    k: int = 5,
) -> List[Dict[str, Any]]:
    """Search for document chunks similar to the query.

    Args:
        query: Search query text
        db: Database session
        k: Number of results to return

    Returns:
        List of results with chunk content, document info, and similarity score
    """
    settings = get_ollama_settings(db)
    ollama_url = settings.get("ollama_url") or settings.get("ollama_base_url") or DEFAULT_OLLAMA_URL
    embedding_model = settings.get("embedding_model") or DEFAULT_EMBEDDING_MODEL

    # Generate query embedding
    query_embedding = await generate_embedding_ollama(query, ollama_url, embedding_model)

    if not query_embedding:
        return []

    # Search in FAISS index
    faiss_index = get_faiss_index()
    results = faiss_index.search(query_embedding, k)

    # Enrich with chunk content from database
    enriched_results = []
    for metadata, score in results:
        doc_id = metadata.get("document_id")
        chunk_index = metadata.get("chunk_index")

        # Get chunk from database
        chunk = db.query(DocumentChunk).filter(
            DocumentChunk.document_id == doc_id,
            DocumentChunk.chunk_index == chunk_index,
        ).first()

        if chunk:
            # Get document info
            document = db.query(Document).filter(Document.id == doc_id).first()

            enriched_results.append({
                "document_id": doc_id,
                "document_filename": document.original_filename if document else "Unknown",
                "chunk_index": chunk_index,
                "content": chunk.content,
                "score": score,
            })

    return enriched_results


async def reindex_all_knowledge_documents(db: Session) -> Dict[str, Any]:
    """Reindex all documents marked as knowledge base.

    Returns:
        Statistics about the reindexing operation
    """
    documents = db.query(Document).filter(Document.is_knowledge == True).all()

    total = len(documents)
    success = 0
    failed = 0
    errors = []

    for doc in documents:
        try:
            chunks, error = await index_document(doc, db)
            if error:
                errors.append(f"{doc.original_filename}: {error}")
                failed += 1
            else:
                success += 1
        except Exception as e:
            errors.append(f"{doc.original_filename}: {str(e)}")
            failed += 1

    return {
        "total_documents": total,
        "successful": success,
        "failed": failed,
        "errors": errors[:10],  # Limit error list
    }


def get_index_stats(db: Session) -> Dict[str, Any]:
    """Get RAG index statistics.

    Returns:
        Dictionary with index statistics
    """
    faiss_index = get_faiss_index()
    faiss_stats = faiss_index.get_stats()

    # Database stats
    total_chunks = db.query(DocumentChunk).count()
    knowledge_docs = db.query(Document).filter(Document.is_knowledge == True).count()

    return {
        **faiss_stats,
        "total_chunks_in_db": total_chunks,
        "knowledge_base_documents": knowledge_docs,
    }
