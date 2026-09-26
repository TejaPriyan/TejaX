"""Shared enums / constants for the TejaX system.

Kept in one place so backend, agents and the web client stay in sync.
"""

from __future__ import annotations


class MissionStatus:
    CREATED = "CREATED"
    PLANNING = "PLANNING"
    RESEARCHING = "RESEARCHING"
    DEVELOPING = "DEVELOPING"
    EXPERIMENTING = "EXPERIMENTING"
    EVALUATING = "EVALUATING"
    IMPROVING = "IMPROVING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PAUSED = "PAUSED"
    CANCELLED = "CANCELLED"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    REJECTED = "REJECTED"


# Pipeline phases shown in the UI, in order.
PIPELINE_PHASES = [
    "UNDERSTANDING",
    "PLANNING",
    "RESEARCH",
    "APPROVAL",
    "DEVELOPMENT",
    "EXPERIMENT",
    "CRITIQUE",
    "IMPROVEMENT",
    "FINAL_RESULT",
]


class TaskStatus:
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"
    CANCELLED = "CANCELLED"
    TIMED_OUT = "TIMED_OUT"
    BLOCKED = "BLOCKED"


class AgentStatus:
    OFFLINE = "OFFLINE"
    ONLINE = "ONLINE"
    ACTIVE = "ACTIVE"
    WAITING = "WAITING"
    WARNING = "WARNING"
    ERROR = "ERROR"


class ExperimentStatus:
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    PASSED = "PASSED"
    FAILED = "FAILED"
    TIMED_OUT = "TIMED_OUT"
    CANCELLED = "CANCELLED"


class EvidenceType:
    """How trustworthy is the data behind an experiment result?"""
    REAL = "REAL"              # validated against user-uploaded or external dataset
    SYNTHETIC = "SYNTHETIC"    # algorithmic / generated data
    DEMO = "DEMO"              # offline deterministic simulation
    UNKNOWN = "UNKNOWN"        # source not classified


class SandboxSecurity:
    """Security posture of the execution environment."""
    LOCAL = "LOCAL"                # subprocess, no kernel isolation
    DOCKER = "DOCKER"             # disposable container, network disabled
    RESTRICTED = "RESTRICTED"     # future: gVisor, Firecracker, etc.

    LABELS = {
        "LOCAL": "Local Development Sandbox",
        "DOCKER": "Restricted Docker Container",
        "RESTRICTED": "Hardened Sandbox",
    }

    WARNINGS = {
        "LOCAL": "Host network accessible; not suitable for untrusted code.",
        "DOCKER": "Network disabled, read-only root FS, memory-limited.",
        "RESTRICTED": "Full kernel isolation with capability restrictions.",
    }


class AgentType:
    PLANNER = "planner"
    RESEARCHER = "researcher"
    CODER = "coder"
    SCIENTIST = "scientist"
    CRITIC = "critic"
    ANALYST = "analyst"
    MEMORY = "memory"
    TESTER = "tester"

    ALL = [PLANNER, RESEARCHER, CODER, SCIENTIST, CRITIC, ANALYST, MEMORY, TESTER]

    LABELS = {
        PLANNER: "Planner",
        RESEARCHER: "Researcher",
        CODER: "Coder",
        SCIENTIST: "Scientist",
        CRITIC: "Critic",
        ANALYST: "Analyst",
        MEMORY: "Memory",
        TESTER: "Tester",
    }


class MemoryType:
    FACT = "FACT"
    EXPERIENCE = "EXPERIENCE"
    SOLUTION = "SOLUTION"
    FAILURE = "FAILURE"
    STRATEGY = "STRATEGY"
    EXPERIMENT = "EXPERIMENT"
    RESEARCH = "RESEARCH"
    USER_PREFERENCE = "USER_PREFERENCE"


class EventType:
    MISSION_CREATED = "MISSION_CREATED"
    MISSION_STARTED = "MISSION_STARTED"
    MISSION_COMPLETED = "MISSION_COMPLETED"
    MISSION_FAILED = "MISSION_FAILED"
    MISSION_PAUSED = "MISSION_PAUSED"
    MISSION_CANCELLED = "MISSION_CANCELLED"

    PLANNING_STARTED = "PLANNING_STARTED"
    PLANNING_COMPLETED = "PLANNING_COMPLETED"

    TASK_CREATED = "TASK_CREATED"
    TASK_STARTED = "TASK_STARTED"
    TASK_COMPLETED = "TASK_COMPLETED"
    TASK_FAILED = "TASK_FAILED"

    RESEARCH_STARTED = "RESEARCH_STARTED"
    RESEARCH_COMPLETED = "RESEARCH_COMPLETED"

    CODE_GENERATED = "CODE_GENERATED"
    CODE_REVISED = "CODE_REVISED"

    TEST_STARTED = "TEST_STARTED"
    TEST_COMPLETED = "TEST_COMPLETED"

    EXPERIMENT_STARTED = "EXPERIMENT_STARTED"
    EXPERIMENT_COMPLETED = "EXPERIMENT_COMPLETED"

    CRITIQUE_CREATED = "CRITIQUE_CREATED"
    IMPROVEMENT_CREATED = "IMPROVEMENT_CREATED"
    MEMORY_CREATED = "MEMORY_CREATED"

    APPROVAL_REQUESTED = "APPROVAL_REQUESTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

    AGENT_STATUS = "AGENT_STATUS"
    AGENT_ACTIVITY = "AGENT_ACTIVITY"
    METRIC_RECORDED = "METRIC_RECORDED"
    LOG = "LOG"


class MetricName:
    TASKS_COMPLETED = "tasks_completed"
    SUCCESSFUL_EXPERIMENTS = "successful_experiments"
    FAILED_EXPERIMENTS = "failed_experiments"
    AVERAGE_ITERATIONS = "average_iterations"
    IMPROVEMENT_PERCENTAGE = "improvement_percentage"
    AGENT_UTILIZATION = "agent_utilization"
    MISSION_COMPLETION_RATE = "mission_completion_rate"
    MEMORY_RETRIEVALS = "memory_retrievals"
    ERROR_RECOVERY_RATE = "error_recovery_rate"
