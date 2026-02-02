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


# --- Monthly process instances ---
class ProcessInstance(Base):
    __tablename__ = "process_instances"
    id = Column(Integer, primary_key=True, autoincrement=True)
    process_type_id = Column(Integer, ForeignKey("process_types.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    status_id = Column(Integer, ForeignKey("status_definitions.id"))
    notes = Column(Text)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    process_type = relationship("ProcessType")
    status = relationship("StatusDefinition")
    files = relationship("ProcessFile", back_populates="process_instance")
    comments = relationship("ProcessComment", back_populates="process_instance")


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
    is_knowledge = Column(Boolean, default=False)
    version = Column(Integer, default=1)
    parent_id = Column(Integer, ForeignKey("documents.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    parent = relationship("Document", remote_side="Document.id")


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
    created_at = Column(DateTime, server_default=func.now())

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


# --- Settings ---
class AppSetting(Base):
    __tablename__ = "app_settings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(255), unique=True, nullable=False)
    value = Column(Text)
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
