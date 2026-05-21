# agents/__init__.py
from .ava_hr import AvaHRAgent
from .orion_cto import OrionCTOAgent
from .nova_cfo import NovaCFOAgent
from .atlas_ceo import AtlasCEOAgent
from .marketing_agent import MarketingAgent
from .developer_agent import DeveloperAgent
from .accountant_agent import AccountantAgent

ava_agent = AvaHRAgent()
orion_agent = OrionCTOAgent()
nova_agent = NovaCFOAgent()
atlas_agent = AtlasCEOAgent()
marketing_agent = MarketingAgent()
developer_agent = DeveloperAgent()
accountant_agent = AccountantAgent()

AGENTS = {
    "ava": ava_agent,
    "orion": orion_agent,
    "nova": nova_agent,
    "atlas": atlas_agent,
    "marketing": marketing_agent,
    "developer": developer_agent,
    "accountant": accountant_agent
}
