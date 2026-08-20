"""
Loads the model/preprocessor/calibrator/config bundle produced by the notebook's
Section 33 ("Production Artifacts") exactly once, at process startup.

Expected directory (matches the notebook's ARTIFACT_DIR structure):

    model_artifacts/
        model/model.pkl
        model/preprocessor.pkl
        model/calibrator.pkl
        config/config.json
        config/feature_names.json

Nothing here retrains or refits anything -- this module only deserializes objects
that were already fit in the notebook, and reproduces the same
raw features -> preprocessor.transform -> model.predict_proba -> calibrator -> risk_score -> band
chain the notebook itself uses (Section J of the audit).
"""
from __future__ import annotations

import json
import pickle
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ARTIFACT_DIR = Path(__file__).resolve().parent.parent / "model_artifacts"


@dataclass
class RiskBand:
    lo: int
    hi: int
    label: str


@dataclass
class ModelBundle:
    model: Any
    preprocessor: Any
    calibrator: Any
    config: dict
    feature_spec: dict
    risk_bands: list[RiskBand]

    @property
    def model_family(self) -> str:
        return self.config["model_family"]

    @property
    def decision_threshold(self) -> float:
        return self.config["decision_threshold"]

    @property
    def calibration_method(self) -> str:
        return self.config["calibration_method"]

    @property
    def required_columns(self) -> list[str]:
        return (
            self.feature_spec["raw_numerical_columns"]
            + self.feature_spec["raw_categorical_columns"]
        )

    def score_to_band(self, score: float) -> str:
        for band in self.risk_bands:
            if band.lo <= score <= band.hi:
                return band.label
        # Fall back to the closest band rather than raising -- a malformed score
        # (e.g. a future model producing >100 due to a calibration bug) should still
        # get *a* label so the API degrades gracefully, but this is worth alerting on.
        return self.risk_bands[-1].label if score > self.risk_bands[-1].hi else self.risk_bands[0].label


def _load_pickle(path: Path) -> Any:
    if not path.exists():
        raise FileNotFoundError(
            f"Missing artifact: {path}. Run the notebook's Section 33 and copy "
            f"'fraud_detection_output/' into '{ARTIFACT_DIR}' before starting the API."
        )
    with open(path, "rb") as f:
        return pickle.load(f)


def load_bundle(artifact_dir: Path = ARTIFACT_DIR) -> ModelBundle:
    model = _load_pickle(artifact_dir / "model" / "model.pkl")
    preprocessor = _load_pickle(artifact_dir / "model" / "preprocessor.pkl")
    calibrator = _load_pickle(artifact_dir / "model" / "calibrator.pkl")

    config_path = artifact_dir / "config" / "config.json"
    feature_spec_path = artifact_dir / "config" / "feature_names.json"
    if not config_path.exists() or not feature_spec_path.exists():
        raise FileNotFoundError(
            f"Missing config.json / feature_names.json under {artifact_dir / 'config'}."
        )
    config = json.loads(config_path.read_text())
    feature_spec = json.loads(feature_spec_path.read_text())

    risk_bands = [
        RiskBand(lo=b["min"], hi=b["max"], label=b["label"]) for b in config["risk_bands"]
    ]

    return ModelBundle(
        model=model,
        preprocessor=preprocessor,
        calibrator=calibrator,
        config=config,
        feature_spec=feature_spec,
        risk_bands=risk_bands,
    )
