from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, AsyncGenerator
from sqlalchemy.orm import Session
import json
import httpx

from app.core.database import get_db
from app.models.models import ChatConversation, ChatMessage, AppSetting, AIPersonality
from app.schemas.schemas import (
    ChatConversationCreate,
    ChatConversationUpdate,
    ChatConversationResponse,
    ChatConversationWithMessages,
    ChatMessageResponse,
)
from app.services.ai_service import (
    send_chat_message,
    get_ai_settings,
    send_chat_message_with_provider,
    save_token_usage,
    estimate_tokens,
    DEFAULT_OLLAMA_URL,
    DEFAULT_OLLAMA_MODEL,
    DEFAULT_OPENROUTER_URL,
    DEFAULT_OPENROUTER_MODEL,
)
from app.services.rag_service import search_similar_chunks

router = APIRouter(prefix="/chat")

# Default context size (number of messages to include in history)
DEFAULT_CONTEXT_SIZE = 20


def get_personality_system_prompt(db: Session, provider: str) -> str | None:
    """Get the system prompt from AI personality for the given provider.

    Args:
        db: Database session
        provider: 'ollama' or 'openrouter'

    Returns:
        The system prompt string or None if not configured
    """
    personality = db.query(AIPersonality).filter(
        AIPersonality.provider == provider,
        AIPersonality.is_active == True,
    ).first()

    if personality and personality.system_prompt:
        # Build enhanced system prompt with personality settings
        parts = [personality.system_prompt]

        # Add tone guidance
        tone_map = {
            "professional": "Válaszolj professzionális és formális stílusban.",
            "friendly": "Válaszolj barátságos és közvetlen stílusban.",
            "concise": "Válaszolj tömören és lényegre törően.",
            "detailed": "Válaszolj részletesen és alaposan.",
        }
        if personality.tone and personality.tone in tone_map:
            parts.append(tone_map[personality.tone])

        # Add expertise guidance
        if personality.expertise:
            parts.append(f"Szakterületeid: {personality.expertise}.")

        # Add language guidance
        if personality.language:
            lang_map = {
                "magyar": "Mindig magyarul válaszolj.",
                "english": "Always respond in English.",
                "german": "Antworte immer auf Deutsch.",
            }
            if personality.language in lang_map:
                parts.append(lang_map[personality.language])

        return " ".join(parts)

    return None


def get_context_size(db: Session) -> int:
    """Get the chat context size from settings.

    Returns the number of most recent messages to include in conversation history.
    """
    setting = db.query(AppSetting).filter(AppSetting.key == "chat_context_size").first()
    if setting and setting.value:
        try:
            return int(setting.value)
        except ValueError:
            pass
    return DEFAULT_CONTEXT_SIZE


def build_message_history(
    db: Session,
    conversation_id: int,
    context_size: Optional[int] = None,
) -> list:
    """Build message history for AI context with context size limit.

    Args:
        db: Database session
        conversation_id: ID of the conversation
        context_size: Max number of messages to include (None = use settings)

    Returns:
        List of message dicts with role and content
    """
    if context_size is None:
        context_size = get_context_size(db)

    # Get messages ordered by creation time, limited to context size
    messages = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id
    ).order_by(ChatMessage.created_at.desc()).limit(context_size).all()

    # Reverse to get chronological order
    messages = list(reversed(messages))

    return [
        {"role": msg.role, "content": msg.content}
        for msg in messages
    ]


class SendMessageRequest(BaseModel):
    content: str
    system_prompt: Optional[str] = None
    documents_only: Optional[bool] = False  # Ha True, csak dokumentumokból válaszol


class SendMessageResponse(BaseModel):
    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse


@router.get("/conversations", response_model=List[ChatConversationResponse])
def list_conversations(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all chat conversations with optional search.

    Search matches against conversation titles and message content.
    """
    query = db.query(ChatConversation)

    if search:
        search_term = f"%{search}%"
        # Search in conversation titles
        title_matches = query.filter(ChatConversation.title.ilike(search_term))

        # Search in message content - get conversation IDs that have matching messages
        message_matches_subq = db.query(ChatMessage.conversation_id).filter(
            ChatMessage.content.ilike(search_term)
        ).distinct().subquery()

        content_matches = query.filter(ChatConversation.id.in_(message_matches_subq))

        # Union both queries
        query = title_matches.union(content_matches)

    conversations = query.order_by(ChatConversation.updated_at.desc()).all()
    return conversations


@router.post("/conversations", response_model=ChatConversationResponse)
def create_conversation(
    request: ChatConversationCreate,
    db: Session = Depends(get_db),
):
    """Create a new chat conversation."""
    settings = get_ai_settings(db)
    provider = settings.get("ai_provider", "ollama")

    if provider == "ollama":
        model_name = settings.get("ollama_model", "ajindal/llama3.1-storm:8b-q4_k_m")
    else:
        model_name = settings.get("openrouter_model", "meta-llama/llama-3.2-3b-instruct:free")

    conversation = ChatConversation(
        title=request.title or "Új beszélgetés",
        ai_provider=provider,
        model_name=model_name,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get("/conversations/{conv_id}", response_model=ChatConversationWithMessages)
def get_conversation(conv_id: int, db: Session = Depends(get_db)):
    """Get a conversation with all its messages."""
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conv_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Beszélgetés nem található")

    return conversation


@router.patch("/conversations/{conv_id}", response_model=ChatConversationResponse)
def update_conversation(
    conv_id: int,
    request: ChatConversationUpdate,
    db: Session = Depends(get_db),
):
    """Update a conversation's settings (provider, model, title)."""
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conv_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Beszélgetés nem található")

    if request.title is not None:
        conversation.title = request.title
    if request.ai_provider is not None:
        conversation.ai_provider = request.ai_provider
    if request.model_name is not None:
        conversation.model_name = request.model_name

    db.commit()
    db.refresh(conversation)
    return conversation


@router.post("/conversations/{conv_id}/message", response_model=SendMessageResponse)
async def send_message(
    conv_id: int,
    request: SendMessageRequest,
    db: Session = Depends(get_db),
):
    """Send a message in a conversation and get AI response."""
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conv_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Beszélgetés nem található")

    # Save user message
    user_message = ChatMessage(
        conversation_id=conv_id,
        role="user",
        content=request.content,
        tokens_used=0,
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    # Build message history with context size limit from settings
    message_history = build_message_history(db, conv_id)

    # Get system prompt from personality settings (request.system_prompt can override)
    provider = conversation.ai_provider or "ollama"
    system_prompt = request.system_prompt or get_personality_system_prompt(db, provider)

    # Get AI response using conversation's provider and model
    try:
        response_text, input_tokens, output_tokens = await send_chat_message_with_provider(
            messages=message_history,
            db=db,
            provider=provider,
            model_name=conversation.model_name or "",
            system_prompt=system_prompt,
        )
    except Exception as e:
        # Rollback user message on failure
        db.delete(user_message)
        db.commit()
        raise HTTPException(status_code=500, detail=f"AI hiba: {str(e)}")

    # Save assistant message
    assistant_message = ChatMessage(
        conversation_id=conv_id,
        role="assistant",
        content=response_text,
        tokens_used=output_tokens,
    )
    db.add(assistant_message)

    # Update user message with input token count
    user_message.tokens_used = input_tokens
    db.add(user_message)

    db.commit()
    db.refresh(assistant_message)
    db.refresh(user_message)

    return SendMessageResponse(
        user_message=ChatMessageResponse.model_validate(user_message),
        assistant_message=ChatMessageResponse.model_validate(assistant_message),
    )


@router.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: int, db: Session = Depends(get_db)):
    """Delete a conversation and all its messages."""
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conv_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Beszélgetés nem található")

    # Delete all messages first
    db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conv_id
    ).delete()

    db.delete(conversation)
    db.commit()

    return {"message": "Beszélgetés törölve"}


# Default RAG settings
RAG_TOP_K = 5  # Number of similar chunks to retrieve
RAG_MIN_SCORE = 0.3  # Minimum similarity score to include

# Strict RAG system prompt that prevents hallucination
STRICT_RAG_SYSTEM_PROMPT = """Te egy dokumentum-alapú AI asszisztens vagy.

FELADATOD: Válaszolj a felhasználó kérdésére KIZÁRÓLAG az alább megadott DOKUMENTUM KONTEXTUS alapján.

SZABÁLYOK:
- Használd a DOKUMENTUM KONTEXTUS-ban található információkat a válaszodhoz.
- Ha a kontextusban megtalálod az információt, válaszolj értelmesen és magyarul.
- Hivatkozz a forrás dokumentumra (pl. "A dokumentum szerint...").
- Ha a kontextusban TÉNYLEG nincs válasz, akkor mondd: "Sajnos erre nem találtam információt a dokumentumokban."
- NE találj ki információt a saját tudásodból!"""

# Normal RAG system prompt (allows general knowledge if no context found)
NORMAL_RAG_SYSTEM_PROMPT = """Te egy segítőkész AI asszisztens vagy. Ha kapsz dokumentum kontextust, 
próbáld azt felhasználni a válaszodban és hivatkozz a forrásra. 
Ha nincs releváns kontextus, válaszolhatsz a saját tudásod alapján is, 
de jelezd hogy ez nem a dokumentumokból származik."""


async def build_rag_context(query: str, db: Session, documents_only: bool = False) -> tuple:
    """Build RAG context from similar document chunks.

    Args:
        query: The user's question
        db: Database session
        documents_only: If True, use stricter matching for documents-only mode

    Returns:
        Tuple of (formatted context string, has_relevant_context boolean)
    """
    try:
        # Use more results for documents_only mode to increase chances of finding relevant content
        k = RAG_TOP_K * 2 if documents_only else RAG_TOP_K
        results = await search_similar_chunks(query, db, k=k)

        if not results:
            return "", False

        # Use lower threshold for documents_only to get more potential matches
        min_score = RAG_MIN_SCORE * 0.8 if documents_only else RAG_MIN_SCORE
        
        # Filter by minimum score and build context
        relevant_chunks = [r for r in results if r.get("score", 0) >= min_score]

        if not relevant_chunks:
            return "", False

        context_parts = ["\n\nDOKUMENTUM KONTEXTUS (használd ezt a válaszhoz):"]
        context_parts.append("="*50)
        for i, chunk in enumerate(relevant_chunks, 1):
            filename = chunk.get("document_filename", "Ismeretlen")
            content = chunk.get("content", "")
            context_parts.append(f"\n[Részlet {i} - {filename}]\n{content}")
        context_parts.append("\n" + "="*50)
        context_parts.append("KONTEXTUS VÉGE - Válaszolj a fenti információk alapján!")

        return "\n".join(context_parts), True
    except Exception as e:
        # Silently fail if RAG is not available
        print(f"RAG context error: {e}")
        return "", False


async def stream_ollama_response(
    messages: list,
    ollama_url: str,
    model: str,
    system_prompt: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Stream response from Ollama token by token.

    Yields JSON strings with format: {"token": "...", "done": false}
    Final message: {"done": true, "input_tokens": ..., "output_tokens": ...}
    """
    # Build the prompt from messages
    prompt_parts = []
    if system_prompt:
        prompt_parts.append(f"System: {system_prompt}\n\n")

    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "user":
            prompt_parts.append(f"User: {content}\n")
        elif role == "assistant":
            prompt_parts.append(f"Assistant: {content}\n")

    full_prompt = "".join(prompt_parts)
    input_tokens = estimate_tokens(full_prompt)
    output_text = ""

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{ollama_url}/api/generate",
            json={
                "model": model,
                "prompt": full_prompt,
                "stream": True,
            }
        ) as response:
            async for line in response.aiter_lines():
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    token = data.get("response", "")
                    done = data.get("done", False)
                    output_text += token

                    if done:
                        # Final message with token counts
                        output_tokens = data.get("eval_count", estimate_tokens(output_text))
                        final_input = data.get("prompt_eval_count", input_tokens)
                        yield json.dumps({
                            "done": True,
                            "input_tokens": final_input,
                            "output_tokens": output_tokens,
                        })
                    else:
                        yield json.dumps({"token": token, "done": False})
                except json.JSONDecodeError:
                    continue


async def stream_openrouter_response(
    messages: list,
    api_key: str,
    model: str,
    system_prompt: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Stream response from OpenRouter token by token.

    Yields JSON strings with format: {"token": "...", "done": false}
    Final message: {"done": true, "input_tokens": ..., "output_tokens": ...}
    """
    api_messages = []
    if system_prompt:
        api_messages.append({"role": "system", "content": system_prompt})

    for msg in messages:
        api_messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", ""),
        })

    output_text = ""
    input_tokens = estimate_tokens(str(api_messages))

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{DEFAULT_OPENROUTER_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": api_messages,
                "stream": True,
            }
        ) as response:
            async for line in response.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue

                data_str = line[6:]  # Remove "data: " prefix
                if data_str == "[DONE]":
                    output_tokens = estimate_tokens(output_text)
                    yield json.dumps({
                        "done": True,
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                    })
                    break

                try:
                    data = json.loads(data_str)
                    choices = data.get("choices", [])
                    if choices:
                        delta = choices[0].get("delta", {})
                        token = delta.get("content", "")
                        if token:
                            output_text += token
                            yield json.dumps({"token": token, "done": False})
                except json.JSONDecodeError:
                    continue


@router.websocket("/conversations/{conv_id}/stream")
async def stream_message(websocket: WebSocket, conv_id: int):
    """WebSocket endpoint for streaming AI responses.

    Protocol:
    1. Client sends: {"content": "user message", "use_rag": true/false}
    2. Server streams: {"token": "...", "done": false}
    3. Server finishes: {"done": true, "input_tokens": ..., "output_tokens": ..., "message_id": ...}
    """
    await websocket.accept()

    # Get database session
    from app.core.database import SessionLocal
    db = SessionLocal()

    try:
        # Get conversation
        conversation = db.query(ChatConversation).filter(
            ChatConversation.id == conv_id
        ).first()

        if not conversation:
            await websocket.send_json({"error": "Beszélgetés nem található"})
            await websocket.close()
            return

        while True:
            # Wait for message from client
            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                break

            content = data.get("content", "").strip()
            use_rag = data.get("use_rag", True)
            documents_only = data.get("documents_only", False)

            if not content:
                await websocket.send_json({"error": "Üres üzenet"})
                continue

            # Save user message
            user_message = ChatMessage(
                conversation_id=conv_id,
                role="user",
                content=content,
                tokens_used=0,
            )
            db.add(user_message)
            db.commit()
            db.refresh(user_message)

            # Build message history with context size limit
            message_history = build_message_history(db, conv_id)

            # Build RAG context if enabled
            rag_context = ""
            has_context = False
            if use_rag or documents_only:
                rag_context, has_context = await build_rag_context(content, db, documents_only)

            # Get settings and provider
            settings = get_ai_settings(db)
            provider = conversation.ai_provider or "ollama"

            # Get system prompt from personality settings
            personality_prompt = get_personality_system_prompt(db, provider)

            # Build system prompt based on mode
            if documents_only:
                # Strict mode: only answer from documents, no hallucination
                if has_context:
                    system_prompt = f"{STRICT_RAG_SYSTEM_PROMPT}\n\n{rag_context}"
                else:
                    # No context found in documents_only mode
                    system_prompt = STRICT_RAG_SYSTEM_PROMPT + "\n\nFIGYELEM: Nem találtam releváns dokumentumot a tudásbázisban ehhez a kérdéshez. Válaszolj ennek megfelelően."
            elif has_context:
                # Normal RAG mode with context found
                system_prompt = f"{NORMAL_RAG_SYSTEM_PROMPT}\n\n{rag_context}"
                if personality_prompt:
                    system_prompt = f"{personality_prompt}\n\n{system_prompt}"
            else:
                # No RAG or no context - use personality or default
                system_prompt = personality_prompt or "Te egy segítőkész AI asszisztens vagy."

            try:
                full_response = ""
                input_tokens = 0
                output_tokens = 0

                if provider == "openrouter":
                    api_key = settings.get("openrouter_api_key")
                    if not api_key:
                        await websocket.send_json({"error": "OpenRouter API kulcs nincs beállítva."})
                        continue

                    model = conversation.model_name or settings.get("openrouter_model") or DEFAULT_OPENROUTER_MODEL

                    async for chunk in stream_openrouter_response(
                        messages=message_history,
                        api_key=api_key,
                        model=model,
                        system_prompt=system_prompt,
                    ):
                        data = json.loads(chunk)
                        if data.get("done"):
                            input_tokens = data.get("input_tokens", 0)
                            output_tokens = data.get("output_tokens", 0)
                        else:
                            full_response += data.get("token", "")
                        await websocket.send_text(chunk)
                else:
                    ollama_url = settings.get("ollama_url") or settings.get("ollama_base_url") or DEFAULT_OLLAMA_URL
                    model = conversation.model_name or settings.get("ollama_model") or DEFAULT_OLLAMA_MODEL

                    async for chunk in stream_ollama_response(
                        messages=message_history,
                        ollama_url=ollama_url,
                        model=model,
                        system_prompt=system_prompt,
                    ):
                        data = json.loads(chunk)
                        if data.get("done"):
                            input_tokens = data.get("input_tokens", 0)
                            output_tokens = data.get("output_tokens", 0)
                        else:
                            full_response += data.get("token", "")
                        await websocket.send_text(chunk)

                # Save assistant message
                assistant_message = ChatMessage(
                    conversation_id=conv_id,
                    role="assistant",
                    content=full_response,
                    tokens_used=output_tokens,
                )
                db.add(assistant_message)

                # Update user message with token count
                user_message.tokens_used = input_tokens
                db.add(user_message)

                db.commit()
                db.refresh(assistant_message)

                # Save token usage
                save_token_usage(
                    db=db,
                    provider=provider,
                    model_name=model,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    cost=0.0,  # Cost tracking handled separately for OpenRouter
                )

                # Send final message with IDs
                await websocket.send_json({
                    "done": True,
                    "user_message_id": user_message.id,
                    "assistant_message_id": assistant_message.id,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                })

            except Exception as e:
                # Rollback user message on failure
                db.delete(user_message)
                db.commit()
                await websocket.send_json({"error": f"AI hiba: {str(e)}"})

    except WebSocketDisconnect:
        pass
    finally:
        db.close()


@router.post("/conversations/{conv_id}/message-with-rag", response_model=SendMessageResponse)
async def send_message_with_rag(
    conv_id: int,
    request: SendMessageRequest,
    db: Session = Depends(get_db),
):
    """Send a message with RAG context (non-streaming version).
    
    If request.documents_only is True, the AI will ONLY answer from documents
    and will explicitly say if information is not found (no hallucination).
    """
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conv_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Beszélgetés nem található")

    # Save user message
    user_message = ChatMessage(
        conversation_id=conv_id,
        role="user",
        content=request.content,
        tokens_used=0,
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    # Build message history with context size limit
    message_history = build_message_history(db, conv_id)

    # Build RAG context
    documents_only = request.documents_only or False
    rag_context, has_context = await build_rag_context(request.content, db, documents_only)

    # Get provider
    provider = conversation.ai_provider or "ollama"

    # Get system prompt from personality settings (request.system_prompt can override)
    personality_prompt = request.system_prompt or get_personality_system_prompt(db, provider)

    # Build system prompt based on mode
    if documents_only:
        # Strict mode: only answer from documents, no hallucination
        if has_context:
            system_prompt = f"{STRICT_RAG_SYSTEM_PROMPT}\n\n{rag_context}"
        else:
            # No context found in documents_only mode
            system_prompt = STRICT_RAG_SYSTEM_PROMPT + "\n\nFIGYELEM: Nem találtam releváns dokumentumot a tudásbázisban ehhez a kérdéshez. Válaszolj ennek megfelelően."
    elif has_context:
        # Normal RAG mode with context found
        system_prompt = f"{NORMAL_RAG_SYSTEM_PROMPT}\n\n{rag_context}"
        if personality_prompt:
            system_prompt = f"{personality_prompt}\n\n{system_prompt}"
    else:
        # No RAG or no context - use personality or default
        system_prompt = personality_prompt or "Te egy segítőkész AI asszisztens vagy."

    # Get AI response
    try:
        response_text, input_tokens, output_tokens = await send_chat_message_with_provider(
            messages=message_history,
            db=db,
            provider=provider,
            model_name=conversation.model_name or "",
            system_prompt=system_prompt,
        )
    except Exception as e:
        db.delete(user_message)
        db.commit()
        raise HTTPException(status_code=500, detail=f"AI hiba: {str(e)}")

    # Save assistant message
    assistant_message = ChatMessage(
        conversation_id=conv_id,
        role="assistant",
        content=response_text,
        tokens_used=output_tokens,
    )
    db.add(assistant_message)

    user_message.tokens_used = input_tokens
    db.add(user_message)

    db.commit()
    db.refresh(assistant_message)
    db.refresh(user_message)

    return SendMessageResponse(
        user_message=ChatMessageResponse.model_validate(user_message),
        assistant_message=ChatMessageResponse.model_validate(assistant_message),
    )
