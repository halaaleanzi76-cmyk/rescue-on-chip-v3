"""Deterministic small-molecule parsing and descriptor calculation."""
from __future__ import annotations

import math

import numpy as np
from rdkit import Chem, DataStructs, rdBase
from rdkit.Chem import Crippen, Descriptors, Lipinski, rdFingerprintGenerator, rdMolDescriptors
from rdkit.Chem import AllChem
from rdkit.Chem.MolStandardize import rdMolStandardize


FINGERPRINT_BITS = 2048
MORGAN_RADIUS = 2
DESCRIPTOR_NAMES = [
    "molecular_weight_da",
    "computed_logp",
    "topological_polar_surface_area_a2",
    "hydrogen_bond_donors",
    "hydrogen_bond_acceptors",
    "rotatable_bonds",
    "ring_count",
    "aromatic_ring_count",
    "fraction_csp3",
    "heavy_atom_count",
    "formal_charge",
    "aliphatic_ring_count",
]
FEATURE_NAMES = [f"morgan_r{MORGAN_RADIUS}_{i}" for i in range(FINGERPRINT_BITS)] + DESCRIPTOR_NAMES
_FINGERPRINT_GENERATOR = rdFingerprintGenerator.GetMorganGenerator(
    radius=MORGAN_RADIUS, fpSize=FINGERPRINT_BITS
)


def standardize_structure(value: str, representation: str = "smiles"):
    if not value or len(value) > 2048:
        raise ValueError("Provide a structure with at most 2,048 characters.")
    if representation not in {"smiles", "inchi"}:
        raise ValueError("Supported structure formats are SMILES and InChI.")
    with rdBase.BlockLogs():
        if representation == "smiles":
            molecule = Chem.MolFromSmiles(value)
        else:
            molecule = Chem.MolFromInchi(value, sanitize=True, removeHs=True)
    if molecule is None:
        raise ValueError("The structure could not be parsed as valid SMILES or InChI.")
    try:
        molecule = rdMolStandardize.Cleanup(molecule)
        molecule = rdMolStandardize.FragmentParent(molecule)
        molecule = rdMolStandardize.Uncharger().uncharge(molecule)
        Chem.SanitizeMol(molecule)
        Chem.GetSymmSSSR(molecule)
        canonical = Chem.MolToSmiles(molecule, isomericSmiles=True, canonical=True)
        if not canonical:
            raise ValueError("The structure is empty after standardization.")
        return molecule, canonical
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError("The structure could not be standardized.") from exc


def fingerprint(molecule) -> np.ndarray:
    bit_vector = _FINGERPRINT_GENERATOR.GetFingerprint(molecule)
    result = np.zeros((FINGERPRINT_BITS,), dtype=np.uint8)
    DataStructs.ConvertToNumpyArray(bit_vector, result)
    return result


def descriptors(molecule) -> dict[str, float]:
    values = [
        Descriptors.MolWt(molecule),
        Crippen.MolLogP(molecule),
        rdMolDescriptors.CalcTPSA(molecule),
        Lipinski.NumHDonors(molecule),
        Lipinski.NumHAcceptors(molecule),
        Lipinski.NumRotatableBonds(molecule),
        rdMolDescriptors.CalcNumRings(molecule),
        rdMolDescriptors.CalcNumAromaticRings(molecule),
        rdMolDescriptors.CalcFractionCSP3(molecule),
        Descriptors.HeavyAtomCount(molecule),
        Chem.GetFormalCharge(molecule),
        rdMolDescriptors.CalcNumAliphaticRings(molecule),
    ]
    if not all(math.isfinite(float(value)) for value in values):
        raise ValueError("RDKit could not calculate finite descriptors for this structure.")
    return {name: float(value) for name, value in zip(DESCRIPTOR_NAMES, values)}


def feature_vector(molecule) -> np.ndarray:
    return np.concatenate(
        [fingerprint(molecule).astype(np.float32), np.asarray(list(descriptors(molecule).values()), dtype=np.float32)]
    )


def scaffold_key(molecule, canonical_smiles: str) -> str:
    from rdkit.Chem.Scaffolds import MurckoScaffold

    # Acyclic compounds have an empty Murcko scaffold; treat each canonical
    # molecule as its own group rather than placing all acyclics in one fold.
    return MurckoScaffold.MurckoScaffoldSmiles(mol=molecule, includeChirality=False) or canonical_smiles


def generate_conformer(value: str, representation: str = "smiles") -> dict:
    molecule, canonical = standardize_structure(value, representation)
    heavy_atoms = molecule.GetNumHeavyAtoms()
    if heavy_atoms > 60:
        raise ValueError("The interactive conformer preview is limited to 60 heavy atoms.")
    if heavy_atoms == 0:
        raise ValueError("The structure contains no heavy atoms.")

    hydrogenated = Chem.AddHs(molecule)
    parameters = AllChem.ETKDGv3()
    parameters.randomSeed = 42
    parameters.maxIterations = 200
    parameters.numThreads = 1
    conformer_id = AllChem.EmbedMolecule(hydrogenated, parameters)
    if conformer_id < 0:
        raise ValueError("RDKit could not generate a 3D conformer for this structure.")

    energy = None
    method = "RDKit ETKDGv3 conformer"
    force_field = None
    properties = AllChem.MMFFGetMoleculeProperties(hydrogenated)
    if properties is not None:
        force_field = AllChem.MMFFGetMoleculeForceField(hydrogenated, properties, confId=conformer_id)
        if force_field is not None:
            force_field.Minimize(maxIts=200)
            energy = float(force_field.CalcEnergy())
            method = "RDKit ETKDGv3 + MMFF94s local minimization"
    if energy is None and AllChem.UFFHasAllMoleculeParams(hydrogenated):
        force_field = AllChem.UFFGetMoleculeForceField(hydrogenated, confId=conformer_id)
        if force_field is not None:
            force_field.Minimize(maxIts=200)
            energy = float(force_field.CalcEnergy())
            method = "RDKit ETKDGv3 + UFF local minimization"

    conformer = hydrogenated.GetConformer(conformer_id)
    coordinates = np.asarray(conformer.GetPositions()[:heavy_atoms], dtype=np.float64)
    if not np.isfinite(coordinates).all():
        raise ValueError("RDKit generated non-finite conformer coordinates.")
    coordinates -= coordinates.mean(axis=0, keepdims=True)
    atoms = [
        {
            "index": index,
            "element": molecule.GetAtomWithIdx(index).GetSymbol(),
            "x": float(coordinates[index, 0]),
            "y": float(coordinates[index, 1]),
            "z": float(coordinates[index, 2]),
        }
        for index in range(heavy_atoms)
    ]
    bonds = [
        {
            "begin": int(bond.GetBeginAtomIdx()),
            "end": int(bond.GetEndAtomIdx()),
            "order": float(bond.GetBondTypeAsDouble()),
        }
        for bond in molecule.GetBonds()
        if bond.GetBeginAtomIdx() < heavy_atoms and bond.GetEndAtomIdx() < heavy_atoms
    ]
    return {
        "canonical_smiles": canonical,
        "atoms": atoms,
        "bonds": bonds,
        "force_field_energy": energy,
        "method": method,
        "seed": 42,
        "note": (
            "One computed gas-phase-style conformer, centered for display. It is not an experimental "
            "structure, solvated ensemble, protein-bound pose, or prediction of biological activity. "
            "Force-field energy is a model value, not a measurement or comparable cross-compound metric."
        ),
    }
