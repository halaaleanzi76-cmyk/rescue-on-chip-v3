"""Explicit input contract for a concept-stage bench model (SI conversions in engine)."""
from pydantic import BaseModel, ConfigDict, Field, model_validator


class ExperimentInput(BaseModel):
    # validate_default: integer literals used as float defaults (e.g. 1000) are coerced to 1000.0,
    # so the fingerprinted config is byte-identical to the config the API publishes and exports.
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, validate_default=True)
    name: str = Field("Pressure-equilibrated crossover", min_length=1, max_length=100)
    seed: int = Field(42, ge=0, le=2147483647)
    replicates: int = Field(6, ge=3, le=100)
    pressure_pa: float = Field(1000, ge=10, le=10000)
    radius_um: float = Field(25, ge=5, le=100)
    length_mm: float = Field(10, ge=1, le=100)
    channels: int = Field(16, ge=1, le=200)
    viscosity_mpas: float = Field(1.2, ge=0.5, le=10)
    altered_viscosity_ratio: float = Field(1.8, ge=1, le=5)
    narrowing_pct: float = Field(20, ge=0, le=70)
    occlusion_pct: float = Field(15, ge=0, le=90)
    radius_cv_pct: float = Field(3, ge=0, le=15)
    duration_s: float = Field(60, ge=20, le=600)
    switch_s: float = Field(10, ge=1, le=300)
    offset_pct: float = Field(25, ge=-150, le=150)
    regulated_tau_s: float = Field(2, ge=0.1, le=10)
    equalized_tau_s: float = Field(2, ge=0.1, le=10)
    regulated_wait_s: float = Field(0, ge=0, le=60)
    equalization_s: float = Field(5, ge=0, le=60)
    stop_duration_s: float = Field(1.5, ge=0.1, le=10)
    dead_volume_ul: float = Field(0.1, ge=0.01, le=10)
    permeability_um_s: float = Field(0.01, ge=0.0001, le=1)
    injury_permeability_ratio: float = Field(3, ge=1, le=20)
    receiver_volume_ul: float = Field(1, ge=0.1, le=100)
    rescue_fraction: float = Field(0, ge=0, le=1)
    barrier_margin_pct: float = Field(10, ge=0, le=100)

    @model_validator(mode="after")
    def time_window(self):
        if self.switch_s + self.stop_duration_s + 5 >= self.duration_s:
            raise ValueError("Duration must exceed switch time + stop duration + 5 seconds.")
        if not self.name.strip():
            raise ValueError("Experiment name must not be blank.")
        return self
