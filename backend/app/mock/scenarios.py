"""Pre-built demo call scenarios with mock account data."""

SCENARIOS = {
    "settlement_sarah": {
        "caller_name": "Sarah Mitchell",
        "account_number": "ACC-2024-7891",
        "balance": 4200.00,
        "intent": "settlement_offer",
        "scenario_description": "Caller wants to settle for 60% of balance",
    },
    "dispute_marcus": {
        "caller_name": "Marcus Johnson",
        "account_number": "ACC-2024-3456",
        "balance": 1850.00,
        "intent": "dispute",
        "scenario_description": "Caller disputes charges, claims already paid",
    },
    "hardship_elena": {
        "caller_name": "Elena Rodriguez",
        "account_number": "ACC-2024-9012",
        "balance": 6500.00,
        "intent": "hardship",
        "scenario_description": "Caller reports job loss, requests payment plan",
    },
}
