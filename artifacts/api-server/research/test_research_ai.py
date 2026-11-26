"""Tests use the real cached PubChem snapshot and the model actually trained from it."""
import json
import unittest

import numpy as np
import pandas as pd

from research.chemistry import FEATURE_NAMES, feature_vector, generate_conformer, standardize_structure
from research.dataset import DATASET_PATH, prepare_dataset
from research.service import _load_model, predict_structure
from research.training import MODELS_DIR


class ResearchAITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not DATASET_PATH.exists():
            raise RuntimeError("Run the real PubChem AID 1288 training command before these tests.")
        cls.frame, cls.audit = prepare_dataset(DATASET_PATH.read_bytes())
        loaded = _load_model()
        if loaded is None:
            raise RuntimeError("No trained PubChem AID 1288 model artifact is installed.")
        cls.manifest, cls.artifact = loaded

    def test_real_dataset_is_clean_and_imbalanced_as_reported(self):
        self.assertEqual(self.audit["valid_binary_assay_records"], 773)
        self.assertEqual(self.audit["active_count"], 42)
        self.assertEqual(self.audit["inactive_count"], 731)
        self.assertEqual(self.audit["invalid_or_unparseable_structures"], 0)
        self.assertEqual(self.audit["duplicate_standardized_structures"], 0)

    def test_structure_validation_and_deterministic_features(self):
        molecule, canonical = standardize_structure("Cn1c(=O)c2c(ncn2C)n(C)c1=O")
        repeated_molecule, repeated = standardize_structure(canonical)
        self.assertEqual(canonical, repeated)
        first = feature_vector(molecule)
        second = feature_vector(repeated_molecule)
        self.assertEqual(first.shape, (len(FEATURE_NAMES),))
        self.assertTrue(np.isfinite(first).all())
        np.testing.assert_array_equal(first, second)
        with self.assertRaises(ValueError):
            standardize_structure("not a valid SMILES")

    def test_conformer_is_real_deterministic_geometry_and_bounded(self):
        smiles = "Cn1c(=O)c2c(ncn2C)n(C)c1=O"
        first = generate_conformer(smiles)
        second = generate_conformer(smiles)
        self.assertEqual(first["method"], "RDKit ETKDGv3 + MMFF94s local minimization")
        self.assertEqual(first["seed"], 42)
        self.assertEqual(len(first["atoms"]), 14)
        self.assertEqual(len(first["bonds"]), 15)
        self.assertIsNotNone(first["force_field_energy"])
        np.testing.assert_allclose(
            [[atom["x"], atom["y"], atom["z"]] for atom in first["atoms"]],
            [[atom["x"], atom["y"], atom["z"]] for atom in second["atoms"]],
            atol=1e-7,
        )
        self.assertIn("not an experimental structure", first["note"])
        with self.assertRaisesRegex(ValueError, "60 heavy atoms"):
            generate_conformer("C" * 61)

    def test_model_integrity_and_real_heldout_inference(self):
        model_dir = MODELS_DIR / self.manifest["model_version"]
        test_rows = pd.read_csv(model_dir / "heldout_test_predictions.csv")
        first = test_rows.iloc[0]
        cid = int(first["cid"])
        self.assertNotIn(cid, set(map(int, self.artifact["train_cids"])))
        data = self.frame[self.frame["PUBCHEM_CID"] == cid]
        self.assertEqual(len(data), 1)
        molecule, _ = standardize_structure(data.iloc[0]["PUBCHEM_EXT_DATASOURCE_SMILES"])
        score = float(self.artifact["model"].predict_proba(feature_vector(molecule).reshape(1, -1))[0, 1])
        self.assertAlmostEqual(score, float(first["exploratory_score_not_calibrated_probability"]), places=10)
        self.assertFalse(self.manifest["metrics"]["eligible_for_reliable_prediction"])
        self.assertFalse(self.artifact["eligible_for_reliable_prediction"])
        self.assertFalse(self.manifest["metrics"]["test_set_was_used_for_model_selection_or_threshold_tuning"])

    def test_known_compound_returns_experimental_evidence_not_prediction(self):
        row = self.frame.iloc[0]
        result = predict_structure(row["PUBCHEM_EXT_DATASOURCE_SMILES"])
        self.assertFalse(result["prediction_available"])
        self.assertIsNotNone(result["evidence"])
        self.assertEqual(result["evidence"]["cid"], int(row["PUBCHEM_CID"]))
        self.assertIsNone(result["exploratory_score"])
        self.assertIn("not a model prediction", result["evidence"]["interpretation"])

    def test_new_compound_never_claims_validated_probability_or_physics_link(self):
        result = predict_structure("C1CCCCCCCCCC1")
        self.assertIsNone(result["evidence"])
        self.assertFalse(result["prediction_available"])
        self.assertFalse(result["score_is_calibrated_probability"])
        self.assertFalse(result["uncertainty_available"])
        self.assertIn("never alter", result["physics_integration"].lower())


if __name__ == "__main__":
    unittest.main()
