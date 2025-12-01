from dataclasses import dataclass
from typing import Optional
try:
    from ..data_storage.models import FinancialData  # type: ignore
except ImportError:
    from data_storage.models import FinancialData  # type: ignore

@dataclass
class Summary:
    net_worth: float
    total_assets: float
    total_liabilities: float
    dti: Optional[float]
    utilization: Optional[float]
    risk_score: float
    credit_tier: str
    income_band: str

class FinancialDataService:
    def __init__(
        self,
        income_band_thresholds: Optional[list[tuple[float, str]]] = None,
        tier_thresholds: Optional[list[tuple[float, str]]] = None,
    ):
        self.tier_thresholds = tier_thresholds or [
            (800, "HighPlatinum"), (740, "MidPlatinum"), (700, "LowPlatinum"),
            (660, "HighGold"), (620, "MidGold"), (580, "LowGold"),
            (540, "HighSilver"), (500, "MidSilver"), (460, "LowSilver"),
            (420, "HighBronze"), (380, "MidBronze"), (340, "LowBronze"),
            (0, "None"),
        ]
        self.income_bands = income_band_thresholds or [
            (25_000, "upto25k"), (50_000, "upto50k"), (75_000, "upto75k"),
            (100_000, "upto100k"), (150_000, "upto150k"), (200_000, "upto200k"),
            (250_000, "upto250k"), (300_000, "upto300k"), (350_000, "upto350k"),
            (400_000, "upto400k"), (450_000, "upto450k"), (500_000, "upto500k"),
        ]
    def compute_summary(
        self,
        financial_data: FinancialData,
        annual_income: Optional[float] = None,
        total_credit_limit: Optional[float] = None,
    ) -> Summary:
        total_assets = sum(a.value * (a.ownershipPercentage / 100) for a in financial_data.assets)
        total_liabilities = sum(l.amount for l in financial_data.liabilities)
        net_worth = total_assets - total_liabilities

        dti = None
        if annual_income and annual_income > 0:
            monthly_income = annual_income / 12
            monthly_liabilities = sum(l.monthlyPayment for l in financial_data.liabilities)
            dti = monthly_liabilities / monthly_income

        utilization = None
        if total_credit_limit and total_credit_limit > 0:
            revolving = sum(l.amount for l in financial_data.liabilities)
            utilization = revolving / total_credit_limit

        risk_score = self._risk_score(net_worth, dti, utilization)
        credit_tier = self._map_tier(risk_score)
        income_band = self._map_income_band(annual_income)

        return Summary(
            net_worth=net_worth,
            total_assets=total_assets,
            total_liabilities=total_liabilities,
            dti=dti,
            utilization=utilization,
            risk_score=risk_score,
            credit_tier=credit_tier,
            income_band=income_band,
        )
    def _risk_score(self, net_worth, dti, utilization) -> float:
        score = 500.0
        score += min(max(net_worth / 10_000, -200), 300)
        if dti is not None:
            score -= min(max(dti * 200, 0), 250)
        if utilization is not None:
            score -= min(max(utilization * 400, 0), 250)
        return max(0.0, min(score, 1000.0))

    def _map_tier(self, score: float) -> str:
        for threshold, tier in self.tier_thresholds:
            if score >= threshold:
                return tier
        return "None"

    def _map_income_band(self, annual_income: Optional[float]) -> str:
        if annual_income is None:
            return "None"
        for max_income, band in self.income_bands:
            if annual_income <= max_income:
                return band
        return "moreThan500k"
