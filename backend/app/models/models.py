from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ProcessStatusEnum(str, enum.Enum):
    TERVEZES = "Tervezés"
    FEJLESZTES = "Fejlesztés"
    TESZTELES = "Tesztelés"
    REVIEW = "Review"
    KESZ = "Kész"


class AIProviderEnum(str, enum.Enum):
    OLLAMA = "ollama"
    OPENROUTER = "openrouter"


class IdeaStatusEnum(str, enum.Enum):
    UJ = "Új"
    ATGONDOLVA = "Átgondolva"
    MEGVALOSITVA = "Megvalósítva"
    ELVETVE = "Elvetve"


class PriorityEnum(str, enum.Enum):
    LOW = "Alacsony"
    MEDIUM = "Közepes"
    HIGH = "Magas"
    CRITICAL = "Kritikus"


# --- Status definitions (dynamic) ---
class StatusDefinition(Base):
    __tablename__ = "status_definitions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    order = Column(Integer, nullable=False, default=0)
    color = Column(String(7), default="#6b7280")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


# --- Process type definitions ---
class ProcessType(Base):
    __tablename__ = "process_types"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    quick_guide = Column(Text)
    order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    subtask_templates = relationship("ProcessTypeSubtask", back_populates="process_type", order_by="ProcessTypeSubtask.order")


# --- Process type subtask templates (sablon alfeladatok) ---
class ProcessTypeSubtask(Base):
    __tablename__ = "process_type_subtasks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    process_type_id = Column(Integer, ForeignKey("process_types.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    process_type = relationship("ProcessType", back_populates="subtask_templates")


# --- Monthly process instances ---
class ProcessInstance(Base):
    __tablename__ = "process_instances"
    id = Column(Integer, primary_key=True, autoincrement=True)
    process_type_id = Column(Integer, ForeignKey("process_types.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    status_id = Column(Integer, ForeignKey("status_definitions.id"))
    notes = Column(Text)
    quick_guide = Column(Text)  # Per-instance quick guide (overrides process_type default)
    quick_guide_ai_draft = Column(Text)  # AI-generated draft for quick guide
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    process_type = relationship("ProcessType")
    status = relationship("StatusDefinition")
    files = relationship("ProcessFile", back_populates="process_instance")
    comments = relationship("ProcessComment", back_populates="process_instance")
    subtasks = relationship("ProcessInstanceSubtask", back_populates="process_instance", order_by="ProcessInstanceSubtask.order")


# --- Process instance subtasks (havi feladat alfeladatai) ---
class ProcessInstanceSubtask(Base):
    __tablename__ = "process_instance_subtasks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    process_instance_id = Column(Integer, ForeignKey("process_instances.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("process_type_subtasks.id"), nullable=True)  # Lehet sablon alapú vagy egyedi
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status_id = Column(Integer, ForeignKey("status_definitions.id"), nullable=True)
    order = Column(Integer, default=0)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    process_instance = relationship("ProcessInstance", back_populates="subtasks")
    template = relationship("ProcessTypeSubtask")
    status = relationship("StatusDefinition")


class ProcessFile(Base):
    __tablename__ = "process_files"
    id = Column(Integer, primary_key=True, autoincrement=True)
    process_instance_id = Column(Integer, ForeignKey("process_instances.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"))
    created_at = Column(DateTime, server_default=func.now())

    process_instance = relationship("ProcessInstance", back_populates="files")
    document = relationship("Document")


class ProcessComment(Base):
    __tablename__ = "process_comments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    process_instance_id = Column(Integer, ForeignKey("process_instances.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    process_instance = relationship("ProcessInstance", back_populates="comments")


# --- Documents ---
class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_type = Column(String(10))
    file_size = Column(Integer)
    category = Column(String(255))
    summary = Column(Text)  # AI-generated summary
    is_knowledge = Column(Boolean, default=False)
    version = Column(Integer, default=1)
    parent_id = Column(Integer, ForeignKey("documents.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    parent = relationship("Document", remote_side="Document.id")
    chunks = relationship("DocumentChunk", back_populates="document")


# --- Document Chunks (for RAG / vector search) ---
class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, default=0)
    content = Column(Text, nullable=False)
    embedding_id = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())

    document = relationship("Document", back_populates="chunks")


# --- Emails ---
class Email(Base):
    __tablename__ = "emails"
    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(String(500), unique=True)
    subject = Column(String(1000))
    sender = Column(String(500))
    recipients = Column(Text)
    body = Column(Text)
    received_date = Column(DateTime)
    importance = Column(String(20), default="Közepes")
    category = Column(String(255))
    is_read = Column(Boolean, default=False)
    process_instance_id = Column(Integer, ForeignKey("process_instances.id"))
    ai_category = Column(String(255))
    ai_summary = Column(Text)
    ai_importance_reason = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    process_instance = relationship("ProcessInstance")
    attachments = relationship("EmailAttachment", back_populates="email")
    task_links = relationship("EmailTaskLink", back_populates="email")


class EmailAttachment(Base):
    __tablename__ = "email_attachments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    email_id = Column(Integer, ForeignKey("emails.id"), nullable=False)
    filename = Column(String(500), nullable=False)
    file_path = Column(String(1000))
    file_size = Column(Integer)
    content_type = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())

    email = relationship("Email", back_populates="attachments")


class EmailTaskLink(Base):
    __tablename__ = "email_task_links"
    id = Column(Integer, primary_key=True, autoincrement=True)
    email_id = Column(Integer, ForeignKey("emails.id"), nullable=False)
    process_instance_id = Column(Integer, ForeignKey("process_instances.id"), nullable=False)
    ai_confidence = Column(Float, nullable=True)  # AI confidence score (0-1) for auto-linked emails
    created_at = Column(DateTime, server_default=func.now())

    email = relationship("Email", back_populates="task_links")
    process_instance = relationship("ProcessInstance")


# --- AI Chat ---
class ChatConversation(Base):
    __tablename__ = "chat_conversations"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500))
    ai_provider = Column(String(20), default="ollama")
    model_name = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    messages = relationship("ChatMessage", back_populates="conversation", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("chat_conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    conversation = relationship("ChatConversation", back_populates="messages")


# --- Ideas ---
class Idea(Base):
    __tablename__ = "ideas"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    source = Column(String(20), default="manual")
    status = Column(String(50), default="Új")
    priority = Column(String(20), default="Közepes")
    process_type_id = Column(Integer, ForeignKey("process_types.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    process_type = relationship("ProcessType")


# --- Python Scripts ---
class PythonScript(Base):
    __tablename__ = "python_scripts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    file_path = Column(String(1000), nullable=False)
    process_type_id = Column(Integer, ForeignKey("process_types.id"))
    is_uploaded = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    process_type = relationship("ProcessType")
    runs = relationship("ScriptRun", back_populates="script")


class ScriptRun(Base):
    __tablename__ = "script_runs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    script_id = Column(Integer, ForeignKey("python_scripts.id"), nullable=False)
    status = Column(String(20), default="running")
    stdout = Column(Text)
    stderr = Column(Text)
    exit_code = Column(Integer)
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime)

    script = relationship("PythonScript", back_populates="runs")


# --- Token Usage ---
class TokenUsage(Base):
    __tablename__ = "token_usage"
    id = Column(Integer, primary_key=True, autoincrement=True)
    provider = Column(String(20), nullable=False)
    model_name = Column(String(255))
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())


# --- Audit Log ---
class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100))
    entity_id = Column(Integer)
    details = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


# --- AI Personality ---
class AIPersonality(Base):
    __tablename__ = "ai_personalities"
    id = Column(Integer, primary_key=True, autoincrement=True)
    provider = Column(String(20), nullable=False)
    name = Column(String(255))
    system_prompt = Column(Text)
    tone = Column(String(100))
    expertise = Column(String(500))
    language = Column(String(50), default="magyar")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# --- AI Knowledge Log ---
class AIKnowledgeLog(Base):
    __tablename__ = "ai_knowledge_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    action = Column(String(50), nullable=False)
    chunks_processed = Column(Integer, default=0)
    status = Column(String(20), default="pending")
    error_message = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    document = relationship("Document")


# --- AI Personality Change Log ---
class PersonalityChangeLog(Base):
    __tablename__ = "personality_change_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    provider = Column(String(20), nullable=False)
    field_changed = Column(String(100), nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


# --- Settings ---
class AppSetting(Base):
    __tablename__ = "app_settings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(255), unique=True, nullable=False)
    value = Column(Text)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# --- System Settings (Embedding & AI Configuration) ---
class SystemSettings(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True, default=1)

    # ── Embedding Provider Settings ──
    embedding_provider = Column(
        String(50),
        default="ollama",
        comment="'ollama' vagy 'openrouter'"
    )
    embedding_model = Column(
        String(255),
        default="bge-m3",
        comment="A használt embedding modell neve"
    )
    embedding_dimension = Column(
        Integer,
        default=1024,
        comment="Az embedding vektor dimenziója"
    )

    # ── Ollama Settings ──
    ollama_url = Column(
        String(500),
        default="http://localhost:11434",
        comment="Ollama szerver URL"
    )

    # ── OpenRouter Settings ──
    openrouter_api_key = Column(
        String(500),
        nullable=True,
        comment="OpenRouter API kulcs (titkosítva kellene tárolni)"
    )
    openrouter_embedding_url = Column(
        String(500),
        default="https://api.openrouter.ai/api/v1/embeddings",
        comment="OpenRouter API endpoint"
    )

    # ── Chat AI Settings ──
    chat_provider = Column(String(50), default="ollama")
    chat_model = Column(String(255), default="llama2")

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# --- Dashboard Widget Layout ---
class DashboardLayout(Base):
    __tablename__ = "dashboard_layout"
    id = Column(Integer, primary_key=True, autoincrement=True)
    widget_id = Column(String(100), nullable=False)
    x = Column(Integer, default=0)
    y = Column(Integer, default=0)
    w = Column(Integer, default=4)
    h = Column(Integer, default=3)
    is_visible = Column(Boolean, default=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
