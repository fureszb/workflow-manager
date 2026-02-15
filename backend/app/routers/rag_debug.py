"""RAG (Retrieval-Augmented Generation) debugging and diagnostics endpoint."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Document, DocumentChunk
from app.services.rag_service import search_similar_chunks, get_faiss_index, estimate_tokens

router = APIRouter(prefix="/rag-debug")


class ChunkInfo(BaseModel):
    """Information about a document chunk."""
    chunk_index: int
    content: str
    tokens: int
    document_id: int
    document_name: str


class DocumentIndexInfo(BaseModel):
    """Information about indexed documents."""
    document_id: int
    filename: str
    chunk_count: int
    is_indexed: bool


class RAGIndexStatus(BaseModel):
    """Status of RAG index."""
    total_documents: int
    indexed_documents: int
    total_chunks: int
    total_vectors: int
    faiss_dimension: Optional[int]
    indexed_docs: List[DocumentIndexInfo]


class SearchResult(BaseModel):
    """Result from a RAG search test."""
    query: str
    results_count: int
    results: List[Dict[str, Any]]


@router.get("/status", response_model=RAGIndexStatus)
def get_rag_status(db: Session = Depends(get_db)):
    """Get RAG index status and statistics.

    Shows which documents are indexed and how many chunks in total.
    """
    # Get all knowledge base documents
    knowledge_docs = db.query(Document).filter(Document.is_knowledge == True).all()

    indexed_docs = []
    total_chunks = 0

    for doc in knowledge_docs:
        chunk_count = db.query(DocumentChunk).filter(
            DocumentChunk.document_id == doc.id
        ).count()

        total_chunks += chunk_count

        indexed_docs.append(DocumentIndexInfo(
            document_id=doc.id,
            filename=doc.original_filename,
            chunk_count=chunk_count,
            is_indexed=chunk_count > 0
        ))

    # Get FAISS index stats
    faiss_index = get_faiss_index()
    faiss_stats = faiss_index.get_stats()

    return RAGIndexStatus(
        total_documents=len(knowledge_docs),
        indexed_documents=sum(1 for d in indexed_docs if d.is_indexed),
        total_chunks=total_chunks,
        total_vectors=faiss_stats.get("total_vectors", 0),
        faiss_dimension=faiss_stats.get("dimension"),
        indexed_docs=indexed_docs,
    )


@router.get("/chunks/{document_id}", response_model=List[ChunkInfo])
def get_document_chunks(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get all chunks for a specific document."""
    doc = db.query(Document).filter(Document.id == document_id).first()

    if not doc:
        return []

    chunks = db.query(DocumentChunk).filter(
        DocumentChunk.document_id == document_id
    ).order_by(DocumentChunk.chunk_index).all()

    return [
        ChunkInfo(
            chunk_index=chunk.chunk_index,
            content=chunk.content,
            tokens=estimate_tokens(chunk.content),
            document_id=chunk.document_id,
            document_name=doc.original_filename,
        )
        for chunk in chunks
    ]


@router.post("/test-search")
async def test_rag_search(
    query: str = Query(..., description="Test search query"),
    k: int = Query(5, description="Number of results to return"),
    min_score: float = Query(0.3, description="Minimum similarity score"),
    db: Session = Depends(get_db)
):
    """Test RAG search functionality.

    This endpoint allows testing the RAG retrieval without sending it to the LLM.
    Useful for debugging why certain documents are or aren't retrieved.

    Args:
        query: The search query text
        k: Number of results to return
        min_score: Minimum similarity score threshold

    Returns:
        Search results with document chunks and their similarity scores
    """
    if not query or not query.strip():
        return SearchResult(query="", results_count=0, results=[])

    # Use the same search function as RAG
    results = await search_similar_chunks(query, db, k=k)

    # Filter by minimum score and enrich with additional info
    filtered_results = []
    for result in results:
        if result.get("score", 0) >= min_score:
            filtered_results.append({
                "document_id": result.get("document_id"),
                "document_filename": result.get("document_filename"),
                "chunk_index": result.get("chunk_index"),
                "score": result.get("score"),
                "content_preview": result.get("content", "")[:200] + "..." if len(result.get("content", "")) > 200 else result.get("content", ""),
                "full_content": result.get("content"),
                "tokens": estimate_tokens(result.get("content", "")),
            })

    return SearchResult(
        query=query,
        results_count=len(filtered_results),
        results=filtered_results,
    )


@router.get("/embedding-model")
def get_embedding_model_info(db: Session = Depends(get_db)):
    """Get information about the embedding model being used."""
    from app.services.rag_service import get_ollama_settings, DEFAULT_EMBEDDING_MODEL

    settings = get_ollama_settings(db)
    ollama_url = settings.get("ollama_url") or settings.get("ollama_base_url") or "http://localhost:11434"
    embedding_model = settings.get("embedding_model") or DEFAULT_EMBEDDING_MODEL

    return {
        "embedding_model": embedding_model,
        "ollama_url": ollama_url,
        "configured": bool(settings.get("embedding_model")),
    }


@router.post("/reindex-document/{document_id}")
async def reindex_single_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Force reindex a specific document.

    Useful for fixing indexing issues without reindexing all documents.
    """
    from app.services.rag_service import index_document

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        return {"success": False, "message": "Dokumentum nem található"}

    try:
        chunks_created, error = await index_document(doc, db)
        return {
            "success": error is None,
            "document_id": document_id,
            "filename": doc.original_filename,
            "chunks_created": chunks_created,
            "error": error,
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Hiba az indexelés során: {str(e)}",
            "document_id": document_id,
        }


@router.post("/reindex-all")
async def reindex_all_documents(db: Session = Depends(get_db)):
    """Force reindex all knowledge base documents.

    This can take a while for large documents.
    """
    from app.services.rag_service import reindex_all_knowledge_documents

    try:
        result = await reindex_all_knowledge_documents(db)
        return {
            "success": True,
            **result,
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Hiba az indexelés során: {str(e)}",
        }
