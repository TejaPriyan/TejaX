"""Planner agent — decomposes a mission into objectives and a task graph."""

from __future__ import annotations

import re
from typing import Any

from ..constants import AgentType
from ..providers import extract_json
from ..schemas import Plan, PlanObjective, PlanTask
from .base import AgentContext, BaseAgent, agent_system_prompt
from .knowledge import topic_for

_TOPIC_OBJECTIVES: dict[str, list[str]] = {
    "genomics": [
        "Define canonical human genome reference boundaries (GRCh38) and nucleotide sequence specs",
        "Research GC distribution, dinucleotide CpG odds ratios, and mutation rate literature",
        "Design synthetic sequence ingestion pipeline, quality scoring (Q-scores), and FASTA architecture",
        "Build a baseline sequence generator and validation suite",
        "Evaluate nucleotide balance, GC content distribution, and mutation variance",
        "Critique k-mer representation, homopolymer run artifacts, and clinical compliance",
        "Improve generator with Markov nucleotide transitions and re-evaluate",
        "Synthesize exportable genomic dataset records (FASTA/CSV) and scientific whitepaper",
    ],
    "cybersecurity": [
        "Define target API attack surface, endpoint schema, and OWASP Top 10 threat model",
        "Research adversarial grammar fuzzing techniques and AST vulnerability patterns",
        "Design automated fuzzing engine, authentication harness, and taint analyzer",
        "Build a baseline payload generator and endpoint fuzzer",
        "Evaluate fuzzing code coverage, anomaly detection, and exploit reproducibility",
        "Critique false positive rates, blind spots, and rate-limiting resilience",
        "Improve payload mutation strategies and synthesize remediation patches",
        "Produce security audit whitepaper with CVE mappings and verified patch diffs",
    ],
    "astrophysics": [
        "Define transit light-curve parameters, stellar flux noise models, and Kepler/TESS baseline",
        "Research Box-Least-Squares (BLS) periodograms and Gaussian Process detrending",
        "Design transit detection architecture and orbital radius estimation pipeline",
        "Build a baseline transit signal classification model",
        "Evaluate false-positive discrimination against stellar flare contamination",
        "Critique limb-darkening approximations and transit depth precision",
        "Improve detrending filters and recalculate orbital ephemerides",
        "Produce peer-reviewed astrophysical briefing report and catalog deliverables",
    ],
    "traffic": [
        "Define measurable accident-prediction requirements and success metrics",
        "Research available datasets and predictive modeling approaches",
        "Design the prediction system architecture and data pipeline",
        "Build a baseline prototype model",
        "Evaluate the prototype against the defined metrics",
        "Critique weaknesses, biases and failure modes",
        "Improve the prototype and re-evaluate",
        "Produce the final report with confidence and limitations",
    ],
    "vision": [
        "Define detection requirements, classes and evaluation metrics",
        "Research object-detection architectures and datasets",
        "Design the vision system architecture",
        "Build a baseline detection prototype",
        "Evaluate the prototype on held-out data",
        "Identify weaknesses and error modes",
        "Improve the prototype and re-evaluate",
        "Produce the final report with confidence and limitations",
    ],
    "road safety": [
        "Define violation classes and measurable detection requirements",
        "Research detection, tracking and rule-engine approaches",
        "Design the violation-detection system architecture",
        "Build a baseline detection + rule prototype",
        "Evaluate prototype precision and recall",
        "Identify weaknesses (occlusion, lighting, edge cases)",
        "Improve the prototype and re-evaluate",
        "Produce the final report with confidence and limitations",
    ],
    "agriculture": [
        "Define disease classes, imaging conditions and success metrics",
        "Research disease-detection datasets and model approaches",
        "Design the detection system architecture",
        "Build a baseline classifier prototype",
        "Evaluate accuracy and robustness",
        "Identify weaknesses and failure modes",
        "Improve the prototype and re-evaluate",
        "Produce the final report with confidence and limitations",
    ],
    "generic": [
        "Clarify the problem statement and define measurable success criteria",
        "Research existing approaches and relevant evidence",
        "Design a candidate solution architecture",
        "Build a baseline prototype",
        "Evaluate the prototype with a reproducible experiment",
        "Critique weaknesses, assumptions and risks",
        "Improve the solution and re-evaluate",
        "Produce the final report with confidence and limitations",
    ],
}


class Planner(BaseAgent):
    agent_type = AgentType.PLANNER
    display_name = "Planner"
    description = "Understands missions, decomposes them into objectives and builds the task graph."

    async def run(self, ctx: AgentContext, task: dict[str, Any] | None = None) -> dict[str, Any]:
        await ctx.set_agent(self.agent_type, status="ACTIVE", task="Decomposing mission", progress=0.05)
        await ctx.activity(None, "planner: understanding mission")
        await ctx.log(None, "Planner analyzing mission statement")
        await ctx.pacing()

        plan = await self._build_plan(ctx)
        await ctx.pacing(0.6)
        await ctx.set_agent(self.agent_type, status="ONLINE", task="Planning complete", progress=1.0)
        return plan.model_dump()

    async def _build_plan(self, ctx: AgentContext) -> Plan:
        description = ctx.mission.description or ctx.mission.title
        topic = topic_for(description)
        default_objectives = [
            PlanObjective(title=t, description="")
            for t in _TOPIC_OBJECTIVES[topic]
        ]
        default_tasks = [
            PlanTask(agent_type=AgentType.RESEARCHER, description="Research the problem domain and existing approaches", dependencies=[]),
            PlanTask(agent_type=AgentType.RESEARCHER, description="Summarize candidate methods and datasets", dependencies=[0]),
            PlanTask(agent_type=AgentType.CODER, description="Design and write the baseline prototype", dependencies=[1]),
            PlanTask(agent_type=AgentType.SCIENTIST, description="Design and run the evaluation experiment", dependencies=[2]),
            PlanTask(agent_type=AgentType.CRITIC, description="Adversarial review of solution and results", dependencies=[3]),
            PlanTask(agent_type=AgentType.CODER, description="Revise the prototype from critique", dependencies=[4]),
            PlanTask(agent_type=AgentType.ANALYST, description="Final evaluation and report synthesis", dependencies=[5]),
        ]
        understanding = (
            f"The mission is to design and prototype a solution for: {ctx.mission.title}. "
            f"Domain signals detected: {topic}. The plan follows a research → build → experiment → "
            f"critique → improve → report cycle with measurable evaluation at each step."
        )

        # Try a configured model first; fall back to the deterministic planner.
        if ctx.provider.name != "demo":
            prompt = (
                f"Mission title: {ctx.mission.title}\n"
                f"Mission description: {description}\n\n"
                "Return JSON with 6 to 8 step-by-step milestone objectives and tasks: {\n"
                "  \"understanding\": str,\n"
                "  \"objectives\": [{\"title\": str, \"description\": str}],\n"
                "  \"tasks\": [{\"agent_type\": str, \"description\": str, \"dependencies\": [int]}]\n"
                "}\n"
                "Objectives MUST cover: requirements definition, literature & dataset research, baseline architecture design, "
                "sandbox experimentation, adversarial critique, iterative revision, and final evaluation synthesis."
            )
            raw = await ctx.call_model(self.agent_type, agent_system_prompt(self), prompt)
            parsed = extract_json(raw)
            if parsed and isinstance(parsed, dict):
                try:
                    plan = Plan(**parsed)
                    if len(plan.objectives) < 6:
                        plan.objectives.extend(default_objectives[len(plan.objectives):])
                    if len(plan.tasks) < 6:
                        plan.tasks.extend(default_tasks[len(plan.tasks):])
                    return plan
                except Exception:
                    pass

        return Plan(understanding=understanding, objectives=default_objectives, tasks=default_tasks)
