from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


# --- StatusDefinition Schemas ---
class StatusDefinitionBase(BaseModel):
    name: str
    order: int = 0
    color: str = "#6b7280"
    is_active: bool = True


class StatusDefinitionCreate(StatusDefinitionBase):
    pass


class StatusDefinitionUpdate(BaseModel):
    name: Optional[str] = None
    order: Optional[int] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class StatusDefinitionResponse(StatusDefinitionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- ProcessType Schemas ---
class ProcessTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    quick_guide: Optional[str] = None
    order: int = 0
    is_active: bool = True


class ProcessTypeCreate(ProcessTypeBase):
    pass


class ProcessTypeUpdate(BaseModel):
    description: Optional[str] = None
    quick_guide: Optional[str] = None


class ProcessTypeResponse(ProcessTypeBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- ProcessInstance Schemas ---
class ProcessInstanceBase(BaseModel):
    process_type_id: int
    year: int
    month: int
    status_id: Optional[int] = None
    notes: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ProcessInstanceCreate(ProcessInstanceBase):
    pass


class ProcessInstanceUpdate(BaseModel):
    status_id: Optional[int] = None
    notes: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ProcessInstanceResponse(ProcessInstanceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    process_type: Optional[ProcessTypeResponse] = None
    status: Optional[StatusDefinitionResponse] = None

    class Config:
        from_attributes = True


# --- ProcessComment Schemas ---
class ProcessCommentBase(BaseModel):
    content: str


class ProcessCommentCreate(ProcessCommentBase):
    process_instance_id: int


class ProcessCommentResponse(ProcessCommentBase):
    id: int
    process_instance_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Document Schemas ---
class DocumentBase(BaseModel):
    filename: str
    original_filename: str
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    category: Optional[str] = None
    is_knowledge: bool = False
    version: int = 1
    parent_id: Optional[int] = None


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(BaseModel):
    category: Optional[str] = None
    is_knowledge: Optional[bool] = None


class DocumentResponse(DocumentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Email Schemas ---
class EmailBase(BaseModel):
    message_id: Optional[str] = None
    subject: Optional[str] = None
    sender: Optional[str] = None
    recipients: Optional[str] = None
    body: Optional[str] = None
    received_date: Optional[datetime] = None
    importance: str = "Közepes"
    category: Optional[str] = None
    is_read: bool = False
    process_instance_id: Optional[int] = None
    ai_category: Optional[str] = None
    ai_summary: Optional[str] = None


class EmailCreate(EmailBase):
    pass


class EmailUpdate(BaseModel):
    importance: Optional[str] = None
    category: Optional[str] = None
    is_read: Optional[bool] = None
    process_instance_id: Optional[int] = None


class EmailResponse(EmailBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class EmailStats(BaseModel):
    by_importance: dict
    by_category: dict
    total: int


# --- ChatConversation Schemas ---
class ChatConversationBase(BaseModel):
    title: Optional[str] = None
    ai_provider: str = "ollama"
    model_name: Optional[str] = None


class ChatConversationCreate(ChatConversationBase):
    pass


class ChatConversationResponse(ChatConversationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- ChatMessage Schemas ---
class ChatMessageBase(BaseModel):
    role: str
    content: str
    tokens_used: int = 0


class ChatMessageCreate(ChatMessageBase):
    conversation_id: int


class ChatMessageResponse(ChatMessageBase):
    id: int
    conversation_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChatConversationWithMessages(ChatConversationResponse):
    messages: List[ChatMessageResponse] = []


# --- Idea Schemas ---
class IdeaBase(BaseModel):
    title: str
    description: Optional[str] = None
    source: str = "manual"
    status: str = "Új"
    priority: str = "Közepes"
    process_type_id: Optional[int] = None


class IdeaCreate(IdeaBase):
    pass


class IdeaUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    process_type_id: Optional[int] = None


class IdeaResponse(IdeaBase):
    id: int
    created_at: datetime
    updated_at: datetime
    process_type: Optional[ProcessTypeResponse] = None

    class Config:
        from_attributes = True


# --- PythonScript Schemas ---
class PythonScriptBase(BaseModel):
    name: str
    description: Optional[str] = None
    file_path: str
    process_type_id: Optional[int] = None
    is_uploaded: bool = False


class PythonScriptCreate(PythonScriptBase):
    pass


class PythonScriptResponse(PythonScriptBase):
    id: int
    created_at: datetime
    process_type: Optional[ProcessTypeResponse] = None

    class Config:
        from_attributes = True


# --- ScriptRun Schemas ---
class ScriptRunBase(BaseModel):
    script_id: int
    status: str = "running"
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    exit_code: Optional[int] = None


class ScriptRunCreate(ScriptRunBase):
    pass


class ScriptRunResponse(ScriptRunBase):
    id: int
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PythonScriptWithRuns(PythonScriptResponse):
    runs: List[ScriptRunResponse] = []


# --- TokenUsage Schemas ---
class TokenUsageBase(BaseModel):
    provider: str
    model_name: Optional[str] = None
    input_tokens: int = 0
    output_tokens: int = 0
    cost: float = 0.0


class TokenUsageCreate(TokenUsageBase):
    pass


class TokenUsageResponse(TokenUsageBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TokenUsageSummary(BaseModel):
    total_input_tokens: int
    total_output_tokens: int
    total_cost: float
    by_provider: dict
    by_model: dict
    daily_stats: Optional[List[dict]] = None
    monthly_stats: Optional[List[dict]] = None


# --- AuditLog Schemas ---
class AuditLogBase(BaseModel):
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    details: Optional[str] = None


class AuditLogCreate(AuditLogBase):
    pass


class AuditLogResponse(AuditLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- AIPersonality Schemas ---
class AIPersonalityBase(BaseModel):
    provider: str
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    tone: Optional[str] = None
    expertise: Optional[str] = None
    language: str = "magyar"
    is_active: bool = True


class AIPersonalityCreate(AIPersonalityBase):
    pass


class AIPersonalityUpdate(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    tone: Optional[str] = None
    expertise: Optional[str] = None
    language: Optional[str] = None
    is_active: Optional[bool] = None


class AIPersonalityResponse(AIPersonalityBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- AppSetting Schemas ---
class AppSettingBase(BaseModel):
    key: str
    value: Optional[str] = None


class AppSettingCreate(AppSettingBase):
    pass


class AppSettingUpdate(BaseModel):
    value: Optional[str] = None


class AppSettingResponse(AppSettingBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True


# --- DashboardLayout Schemas ---
class DashboardLayoutBase(BaseModel):
    widget_id: str
    x: int = 0
    y: int = 0
    w: int = 4
    h: int = 3
    is_visible: bool = True


class DashboardLayoutCreate(DashboardLayoutBase):
    pass


class DashboardLayoutUpdate(BaseModel):
    x: Optional[int] = None
    y: Optional[int] = None
    w: Optional[int] = None
    h: Optional[int] = None
    is_visible: Optional[bool] = None


class DashboardLayoutResponse(DashboardLayoutBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Dashboard Summary ---
class DashboardSummary(BaseModel):
    current_month_processes: List[ProcessInstanceResponse]
    total_documents: int
    total_emails: int
    unread_emails: int
    active_ideas: int
    recent_scripts_runs: List[ScriptRunResponse]
    token_usage_this_month: TokenUsageSummary


# --- Bulk Generate Processes ---
class ProcessGenerateRequest(BaseModel):
    year: int
    month: int


# --- Process Detail with nested data ---
class ProcessInstanceDetail(ProcessInstanceResponse):
    comments: List[ProcessCommentResponse] = []
    files: List[DocumentResponse] = []
