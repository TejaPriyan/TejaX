from .base import AgentContext, BaseAgent, agent_system_prompt, agent_uid
from .planner import Planner
from .researcher import Researcher
from .coder import Coder, build_experiment_code
from .scientist import Scientist
from .critic import Critic
from .analyst import Analyst
from .memory import MemoryAgent
from .tester import Tester

AGENT_REGISTRY = {
    Planner.agent_type: Planner,
    Researcher.agent_type: Researcher,
    Coder.agent_type: Coder,
    Scientist.agent_type: Scientist,
    Critic.agent_type: Critic,
    Analyst.agent_type: Analyst,
    MemoryAgent.agent_type: MemoryAgent,
    Tester.agent_type: Tester,
}

__all__ = [
    "AgentContext",
    "BaseAgent",
    "agent_system_prompt",
    "agent_uid",
    "AGENT_REGISTRY",
    "Planner",
    "Researcher",
    "Coder",
    "Scientist",
    "Critic",
    "Analyst",
    "MemoryAgent",
    "Tester",
    "build_experiment_code",
]
