import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class WorkflowExecution(Base):
    __tablename__ = "workflow_executions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), default="Pending", nullable=False)  # Pending, Running, Completed, Failed
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    current_agent: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )
    progress_percentage: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    error_log: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    avg_confidence_score: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    total_retries: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    validation_failures_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="executions")
    outputs: Mapped[list["AgentOutput"]] = relationship(
        "AgentOutput",
        back_populates="execution",
        cascade="all, delete-orphan"
    )

class AgentOutput(Base):
    __tablename__ = "agent_outputs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    execution_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflow_executions.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False)
    output: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    confidence_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )
    retry_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    validation_issues: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    # Relationships
    execution: Mapped["WorkflowExecution"] = relationship("WorkflowExecution", back_populates="outputs")
