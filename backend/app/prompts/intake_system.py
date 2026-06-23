# v1.5 - Composed from default agent config (see app/prompts/compose.py)

from app.prompts.compose import compose_system_prompt, default_config

INTAKE_SYSTEM_PROMPT = compose_system_prompt(default_config())
