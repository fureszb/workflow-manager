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
    name: Optional[str] = None
    description: Optional[str] = None
    quick_guide: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class ProcessTypeResponse(ProcessTypeBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- ProcessTypeSubtask Schemas (sablon alfeladatok) ---
class ProcessTypeSubtaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    order: int = 0
    is_active: bool = True


class ProcessTypeSubtaskCreate(ProcessTypeSubtaskBase):
    process_type_id: int


class ProcessTypeSubtaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class ProcessTypeSubtaskResponse(ProcessTypeSubtaskBase):
    id: int
    process_type_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ProcessTypeWithSubtasks(ProcessTypeResponse):
    subtask_templates: List["ProcessTypeSubtaskResponse"] = []


# --- ProcessInstanceSubtask Schemas (havi feladat alfeladatai) ---
class ProcessInstanceSubtaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    status_id: Optional[int] = None
    order: int = 0


class ProcessInstanceSubtaskCreate(ProcessInstanceSubtaskBase):
    process_instance_id: int
    template_id: Optional[int] = None


class ProcessInstanceSubtaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status_id: Optional[int] = None
    order: Optional[int] = None


class ProcessInstanceSubtaskResponse(ProcessInstanceSubtaskBase):
    id: int
    process_instance_id: int
    template_id: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    status: Optional[StatusDefinitionResponse] = None

    class Config:
        from_attributes = True


# --- ProcessInstance Schemas ---
class ProcessInstanceBase(BaseModel):
    process_type_id: int
    year: int
    month: int
    status_id: Optional[int] = None
    notes: Optional[str] = None
    quick_guide: Optional[str] = None
    quick_guide_ai_draft: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ProcessInstanceCreate(ProcessInstanceBase):
    pass


class ProcessInstanceUpdate(BaseModel):
    status_id: Optional[int] = None
    notes: Optional[str] = None
    quick_guide: Optional[str] = None
    quick_guide_ai_draft: Optional[str] = None
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
    summary: Optional[str] = None
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
    ai_importance_reason: Optional[str] = None


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


class EmailAttachmentResponse(BaseModel):
    id: int
    email_id: int
    filename: str
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    content_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EmailTaskLinkBrief(BaseModel):
    id: int
    process_instance_id: int
    process_name: Optional[str] = None
    ai_confidence: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EmailWithAttachments(EmailResponse):
    attachments: List[EmailAttachmentResponse] = []
    task_links: List[EmailTaskLinkBrief] = []


class PSTImportProgress(BaseModel):
    status: str  # "processing", "completed", "error"
    current: int
    total: int
    imported: int
    skipped: int
    message: str


class PSTImportResult(BaseModel):
    success: bool
    total_emails: int
    imported: int
    skipped: int
    errors: List[str] = []


# --- Email Categorization Schemas ---
class EmailCategorizationItem(BaseModel):
    email_id: int
    importance: str
    ai_importance_reason: str


class EmailCategorizationResult(BaseModel):
    success: bool
    total_processed: int
    categorized: int
    errors: List[str] = []
    results: List[EmailCategorizationItem] = []


class EmailImportanceUpdate(BaseModel):
    importance: str
    ai_importance_reason: Optional[str] = None


# --- ChatConversation Schemas ---
class ChatConversationBase(BaseModel):
    title: Optional[str] = None
    ai_provider: str = "ollama"
    model_name: Optional[str] = None


class ChatConversationCreate(ChatConversationBase):
    pass


class ChatConversationUpdate(BaseModel):
    title: Optional[str] = None
    ai_provider: Optional[str] = None
    model_name: Optional[str] = None


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


class PythonScriptCreate(BaseModel):
    name: str
    description: Optional[str] = None
    file_path: Optional[str] = None  # For server path registration (optional if uploading)
    process_type_id: Optional[int] = None


class PythonScriptUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    process_type_id: Optional[int] = None


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


class ScriptOutputFileResponse(BaseModel):
    filename: str
    file_path: str
    file_size: int
    created_at: datetime


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
class DashboardWidgetData(BaseModel):
    """Data for a single dashboard widget."""
    active_processes: int = 0
    completed_processes: int = 0
    total_processes: int = 0
    unread_emails: int = 0
    total_emails: int = 0
    high_importance_emails: int = 0
    total_documents: int = 0
    knowledge_documents: int = 0
    chat_sessions_today: int = 0
    total_chat_sessions: int = 0
    active_ideas: int = 0
    total_ideas: int = 0
    scripts_count: int = 0
    recent_script_runs: int = 0


class RecentActivity(BaseModel):
    """A recent activity item for the dashboard."""
    type: str  # process, email, document, chat, script
    text: str
    timestamp: datetime
    entity_id: Optional[int] = None


class DashboardResponse(BaseModel):
    """Full dashboard data response."""
    stats: DashboardWidgetData
    recent_activities: List[RecentActivity] = []
    current_month_processes: List[ProcessInstanceResponse] = []


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


# --- ProcessFile Schemas ---
class ProcessFileBase(BaseModel):
    process_instance_id: int
    document_id: Optional[int] = None


class ProcessFileCreate(ProcessFileBase):
    pass


class ProcessFileResponse(ProcessFileBase):
    id: int
    created_at: datetime
    document: Optional[DocumentResponse] = None

    class Config:
        from_attributes = True


# --- Email link response for task detail ---
class EmailBriefResponse(BaseModel):
    id: int
    subject: Optional[str] = None
    sender: Optional[str] = None
    received_date: Optional[datetime] = None
    ai_summary: Optional[str] = None

    class Config:
        from_attributes = True


# --- Process Detail with nested data ---
class ProcessInstanceDetail(ProcessInstanceResponse):
    comments: List[ProcessCommentResponse] = []
    files: List[ProcessFileResponse] = []
    linked_emails: List[EmailBriefResponse] = []


# --- Archive Schemas ---
class ArchiveMonthSummary(BaseModel):
    month: int
    month_name: str
    task_count: int
    completed_count: int


class ArchiveYearSummary(BaseModel):
    year: int
    months: List[ArchiveMonthSummary] = []
    total_tasks: int
    total_completed: int


class ArchiveSearchResult(BaseModel):
    id: int
    year: int
    month: int
    process_type_name: str
    status_name: Optional[str] = None
    status_color: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# --- AI Guide Generation Schemas ---
class GenerateGuideResponse(BaseModel):
    task_id: int
    quick_guide_ai_draft: str
    message: str


# --- Document Preview and Search Schemas ---
class SearchMatch(BaseModel):
    line_number: int
    text: str
    highlighted_text: str


class DocumentPreviewResponse(BaseModel):
    id: int
    original_filename: str
    file_type: Optional[str] = None
    content: Optional[str] = None
    table_data: Optional[List[List[str]]] = None
    preview_url: Optional[str] = None
    error: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentSearchResult(BaseModel):
    id: int
    original_filename: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    category: Optional[str] = None
    created_at: datetime
    matches: List[SearchMatch] = []
    match_count: int = 0

    class Config:
        from_attributes = True


class DocumentSummaryResponse(BaseModel):
    id: int
    original_filename: str
    summary: str
    message: str

    class Config:
        from_attributes = True


# --- Email-Task Link Schemas ---
class EmailTaskLinkCreate(BaseModel):
    process_instance_id: int


class EmailTaskLinkResponse(BaseModel):
    id: int
    email_id: int
    process_instance_id: int
    ai_confidence: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EmailAutoLinkItem(BaseModel):
    email_id: int
    process_instance_id: int
    process_name: str
    confidence: float
    reason: str


class EmailAutoLinkResult(BaseModel):
    success: bool
    total_processed: int
    linked: int
    errors: List[str] = []
    results: List[EmailAutoLinkItem] = []


# --- Statistics Schemas ---
class ProcessStatsByStatus(BaseModel):
    name: str
    count: int
    color: str


class ProcessStatsByMonth(BaseModel):
    month: str
    count: int


class ProcessStatsResponse(BaseModel):
    total: int
    completed: int
    in_progress: int
    by_status: List[ProcessStatsByStatus] = []
    by_month: List[ProcessStatsByMonth] = []
    avg_completion_days: Optional[float] = None


class EmailStatsByImportance(BaseModel):
    importance: str
    count: int
    color: str


class EmailStatsByDay(BaseModel):
    date: str
    count: int


class EmailStatsResponse(BaseModel):
    total: int
    unread: int
    read: int
    by_importance: List[EmailStatsByImportance] = []
    by_day: List[EmailStatsByDay] = []
    response_rate: float = 0.0


class TokenStatsByDay(BaseModel):
    date: str
    input_tokens: int
    output_tokens: int
    cost: float


class TokenStatsByProvider(BaseModel):
    provider: str
    input_tokens: int
    output_tokens: int
    cost: float
    color: str


class TokenStatsResponse(BaseModel):
    total_input_tokens: int
    total_output_tokens: int
    total_cost: float
    by_provider: List[TokenStatsByProvider] = []
    by_day: List[TokenStatsByDay] = []


# --- Statistics Export Schemas ---
class StatisticsExportRequest(BaseModel):
    format: str = Field(..., description="Export format: 'pdf' or 'excel'")
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")


# --- AI Knowledge Log Schemas ---
class AIKnowledgeLogBase(BaseModel):
    document_id: Optional[int] = None
    action: str
    chunks_processed: int = 0
    status: str = "pending"
    error_message: Optional[str] = None


class AIKnowledgeLogCreate(AIKnowledgeLogBase):
    pass


class AIKnowledgeLogResponse(AIKnowledgeLogBase):
    id: int
    created_at: datetime
    document_filename: Optional[str] = None

    class Config:
        from_attributes = True


# --- Knowledge Base Statistics ---
class KnowledgeBaseStats(BaseModel):
    total_documents: int
    total_chunks: int
    total_vectors: int
    last_update: Optional[datetime] = None
    documents_by_type: dict = {}


# --- Knowledge Document Response ---
class KnowledgeDocumentResponse(BaseModel):
    id: int
    original_filename: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    category: Optional[str] = None
    chunk_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Personality Change Log ---
class PersonalityChangeLogResponse(BaseModel):
    id: int
    provider: str
    field_changed: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
