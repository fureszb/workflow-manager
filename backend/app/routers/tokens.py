from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import TokenUsage, AppSetting


router = APIRouter(prefix="/tokens")


# === Pydantic Schemas ===

class DailyTokenUsage(BaseModel):
    date: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost: float
    request_count: int


class MonthlyTokenUsage(BaseModel):
    month: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost: float
    request_count: int


class ModelTokenUsage(BaseModel):
    model_name: str
    provider: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost: float
    request_count: int
    color: str


class CostBreakdown(BaseModel):
    provider: str
    model_name: Optional[str]
    input_tokens: int
    output_tokens: int
    calculated_cost: float
    actual_cost: float


class CostResponse(BaseModel):
    total_cost: float
    total_input_tokens: int
    total_output_tokens: int
    total_tokens: int
    total_requests: int
    avg_cost_per_request: float
    breakdown: List[CostBreakdown]
    currency: str = "USD"


class OllamaStats(BaseModel):
    total_requests: int
    avg_response_time_ms: Optional[float]
    total_input_tokens: int
    total_output_tokens: int


# === Helper Functions ===

def parse_date_range(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> tuple[datetime, datetime]:
    """Parse date range from query params, default to last 30 days."""
    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    else:
        end = datetime.now()

    if start_date:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(hour=0, minute=0, second=0)
    else:
        start = end - timedelta(days=30)

    return start, end


def get_model_color(model_name: str, provider: str) -> str:
    """Return a consistent color for a model."""
    colors = {
        "ollama": {
            "llama3": "#10b981",
            "llama3.1": "#059669",
            "llama3.2": "#047857",
            "mistral": "#6366f1",
            "mixtral": "#4f46e5",
            "codellama": "#8b5cf6",
            "phi": "#a855f7",
            "gemma": "#ec4899",
            "qwen": "#f43f5e",
            "deepseek": "#06b6d4",
            "default": "#6b7280",
        },
        "openrouter": {
            "gpt-4": "#10a37f",
            "gpt-4-turbo": "#0d9668",
            "gpt-3.5-turbo": "#74aa9c",
            "claude-3": "#d97706",
            "claude-3.5": "#b45309",
            "claude-2": "#f59e0b",
            "gemini": "#4285f4",
            "llama": "#0ea5e9",
            "mistral": "#6366f1",
            "default": "#8b5cf6",
        },
        "openai": {
            "gpt-4": "#10a37f",
            "gpt-4-turbo": "#0d9668",
            "gpt-4o": "#059669",
            "gpt-3.5-turbo": "#74aa9c",
            "default": "#10a37f",
        },
        "anthropic": {
            "claude-3-opus": "#d97706",
            "claude-3-sonnet": "#f59e0b",
            "claude-3-haiku": "#fbbf24",
            "claude-3.5-sonnet": "#b45309",
            "default": "#d97706",
        },
    }

    provider_colors = colors.get(provider.lower(), {})

    # Try to match model name
    model_lower = (model_name or "default").lower()
    for key in provider_colors:
        if key in model_lower:
            return provider_colors[key]

    return provider_colors.get("default", "#6b7280")


def get_cost_override(db: Session, provider: str, model_name: str) -> Optional[dict]:
    """Get manually overridden cost rates from settings."""
    setting = db.query(AppSetting).filter(
        AppSetting.key == f"cost_rate_{provider}_{model_name}"
    ).first()

    if setting and setting.value:
        try:
            import json
            return json.loads(setting.value)
        except:
            pass
    return None


# === API Endpoints ===

@router.get("/usage/daily", response_model=List[DailyTokenUsage])
def daily_usage(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    db: Session = Depends(get_db),
):
    """Get daily token usage breakdown (for bar chart)."""
    start, end = parse_date_range(start_date, end_date)

    query = db.query(
        func.date(TokenUsage.created_at).label("date"),
        func.sum(TokenUsage.input_tokens).label("input_tokens"),
        func.sum(TokenUsage.output_tokens).label("output_tokens"),
        func.sum(TokenUsage.cost).label("cost"),
        func.count(TokenUsage.id).label("request_count"),
    ).filter(
        TokenUsage.created_at >= start,
        TokenUsage.created_at <= end,
    )

    if provider:
        query = query.filter(TokenUsage.provider == provider)

    daily_data = query.group_by(
        func.date(TokenUsage.created_at)
    ).order_by(
        func.date(TokenUsage.created_at)
    ).all()

    return [
        DailyTokenUsage(
            date=str(date),
            input_tokens=int(input_tokens or 0),
            output_tokens=int(output_tokens or 0),
            total_tokens=int((input_tokens or 0) + (output_tokens or 0)),
            cost=float(cost or 0),
            request_count=int(request_count or 0),
        )
        for date, input_tokens, output_tokens, cost, request_count in daily_data
    ]


@router.get("/usage/monthly", response_model=List[MonthlyTokenUsage])
def monthly_usage(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    db: Session = Depends(get_db),
):
    """Get monthly token usage summary (for area chart)."""
    start, end = parse_date_range(start_date, end_date)

    # Extend range to get more months for context
    extended_start = start - timedelta(days=180)

    query = db.query(
        extract('year', TokenUsage.created_at).label("year"),
        extract('month', TokenUsage.created_at).label("month"),
        func.sum(TokenUsage.input_tokens).label("input_tokens"),
        func.sum(TokenUsage.output_tokens).label("output_tokens"),
        func.sum(TokenUsage.cost).label("cost"),
        func.count(TokenUsage.id).label("request_count"),
    ).filter(
        TokenUsage.created_at >= extended_start,
        TokenUsage.created_at <= end,
    )

    if provider:
        query = query.filter(TokenUsage.provider == provider)

    monthly_data = query.group_by(
        extract('year', TokenUsage.created_at),
        extract('month', TokenUsage.created_at),
    ).order_by(
        extract('year', TokenUsage.created_at),
        extract('month', TokenUsage.created_at),
    ).all()

    return [
        MonthlyTokenUsage(
            month=f"{int(year)}-{str(int(month)).zfill(2)}",
            input_tokens=int(input_tokens or 0),
            output_tokens=int(output_tokens or 0),
            total_tokens=int((input_tokens or 0) + (output_tokens or 0)),
            cost=float(cost or 0),
            request_count=int(request_count or 0),
        )
        for year, month, input_tokens, output_tokens, cost, request_count in monthly_data
    ]


@router.get("/usage/by-model", response_model=List[ModelTokenUsage])
def usage_by_model(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """Get token usage breakdown by model (for pie chart)."""
    start, end = parse_date_range(start_date, end_date)

    model_data = db.query(
        TokenUsage.model_name,
        TokenUsage.provider,
        func.sum(TokenUsage.input_tokens).label("input_tokens"),
        func.sum(TokenUsage.output_tokens).label("output_tokens"),
        func.sum(TokenUsage.cost).label("cost"),
        func.count(TokenUsage.id).label("request_count"),
    ).filter(
        TokenUsage.created_at >= start,
        TokenUsage.created_at <= end,
    ).group_by(
        TokenUsage.model_name,
        TokenUsage.provider,
    ).order_by(
        func.sum(TokenUsage.input_tokens + TokenUsage.output_tokens).desc()
    ).all()

    return [
        ModelTokenUsage(
            model_name=model_name or "unknown",
            provider=provider or "unknown",
            input_tokens=int(input_tokens or 0),
            output_tokens=int(output_tokens or 0),
            total_tokens=int((input_tokens or 0) + (output_tokens or 0)),
            cost=float(cost or 0),
            request_count=int(request_count or 0),
            color=get_model_color(model_name, provider),
        )
        for model_name, provider, input_tokens, output_tokens, cost, request_count in model_data
    ]


@router.get("/cost", response_model=CostResponse)
def get_cost(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """Get cost calculation with breakdown."""
    start, end = parse_date_range(start_date, end_date)

    # Get totals
    totals = db.query(
        func.coalesce(func.sum(TokenUsage.input_tokens), 0).label("input"),
        func.coalesce(func.sum(TokenUsage.output_tokens), 0).label("output"),
        func.coalesce(func.sum(TokenUsage.cost), 0.0).label("cost"),
        func.count(TokenUsage.id).label("count"),
    ).filter(
        TokenUsage.created_at >= start,
        TokenUsage.created_at <= end,
    ).first()

    total_input = int(totals.input) if totals else 0
    total_output = int(totals.output) if totals else 0
    total_cost = float(totals.cost) if totals else 0.0
    total_count = int(totals.count) if totals else 0

    # Get breakdown by provider and model
    breakdown_data = db.query(
        TokenUsage.provider,
        TokenUsage.model_name,
        func.sum(TokenUsage.input_tokens).label("input_tokens"),
        func.sum(TokenUsage.output_tokens).label("output_tokens"),
        func.sum(TokenUsage.cost).label("cost"),
    ).filter(
        TokenUsage.created_at >= start,
        TokenUsage.created_at <= end,
    ).group_by(
        TokenUsage.provider,
        TokenUsage.model_name,
    ).all()

    breakdown = []
    for provider, model_name, input_tokens, output_tokens, actual_cost in breakdown_data:
        input_t = int(input_tokens or 0)
        output_t = int(output_tokens or 0)
        actual = float(actual_cost or 0)

        # Check for cost override
        override = get_cost_override(db, provider, model_name or "default")
        if override:
            # Calculate cost from override rates (per 1M tokens)
            input_rate = override.get("input_rate", 0) / 1_000_000
            output_rate = override.get("output_rate", 0) / 1_000_000
            calculated = (input_t * input_rate) + (output_t * output_rate)
        else:
            calculated = actual

        breakdown.append(CostBreakdown(
            provider=provider or "unknown",
            model_name=model_name,
            input_tokens=input_t,
            output_tokens=output_t,
            calculated_cost=round(calculated, 6),
            actual_cost=round(actual, 6),
        ))

    avg_cost = total_cost / total_count if total_count > 0 else 0.0

    return CostResponse(
        total_cost=round(total_cost, 4),
        total_input_tokens=total_input,
        total_output_tokens=total_output,
        total_tokens=total_input + total_output,
        total_requests=total_count,
        avg_cost_per_request=round(avg_cost, 6),
        breakdown=breakdown,
        currency="USD",
    )


@router.get("/ollama-stats", response_model=OllamaStats)
def get_ollama_stats(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """Get Ollama-specific statistics (local AI)."""
    start, end = parse_date_range(start_date, end_date)

    stats = db.query(
        func.count(TokenUsage.id).label("count"),
        func.coalesce(func.sum(TokenUsage.input_tokens), 0).label("input"),
        func.coalesce(func.sum(TokenUsage.output_tokens), 0).label("output"),
    ).filter(
        TokenUsage.created_at >= start,
        TokenUsage.created_at <= end,
        TokenUsage.provider == "ollama",
    ).first()

    return OllamaStats(
        total_requests=int(stats.count) if stats else 0,
        avg_response_time_ms=None,  # Would need response time tracking in TokenUsage
        total_input_tokens=int(stats.input) if stats else 0,
        total_output_tokens=int(stats.output) if stats else 0,
    )


@router.post("/cost-rate")
def set_cost_rate(
    provider: str,
    model_name: str,
    input_rate: float,
    output_rate: float,
    db: Session = Depends(get_db),
):
    """Manually set cost rate for a provider/model (per 1M tokens)."""
    import json

    key = f"cost_rate_{provider}_{model_name}"
    value = json.dumps({
        "input_rate": input_rate,
        "output_rate": output_rate,
        "updated_at": datetime.now().isoformat(),
    })

    setting = db.query(AppSetting).filter(AppSetting.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = AppSetting(key=key, value=value)
        db.add(setting)

    db.commit()

    return {
        "success": True,
        "message": f"Cost rate set for {provider}/{model_name}",
        "input_rate": input_rate,
        "output_rate": output_rate,
    }


@router.get("/cost-rates")
def get_cost_rates(db: Session = Depends(get_db)):
    """Get all manually configured cost rates."""
    import json

    settings = db.query(AppSetting).filter(
        AppSetting.key.like("cost_rate_%")
    ).all()

    rates = []
    for setting in settings:
        try:
            # Parse key: cost_rate_provider_model
            parts = setting.key.replace("cost_rate_", "").split("_", 1)
            provider = parts[0]
            model_name = parts[1] if len(parts) > 1 else "default"
            data = json.loads(setting.value) if setting.value else {}
            rates.append({
                "provider": provider,
                "model_name": model_name,
                "input_rate": data.get("input_rate", 0),
                "output_rate": data.get("output_rate", 0),
                "updated_at": data.get("updated_at"),
            })
        except:
            pass

    return rates
