# Vascular model milestone (Stages 1–5)

## Existing project scope

The uploaded Neuro-Reflow proposal describes a **concept-stage, ex-vivo cerebral neurovascular microfluidic research platform**. It does not provide a patient-specific vascular image, measured cerebral network geometry, calibrated vascular values, or a validated human model. The existing chip engine is a separate research model and is not modified by this subsystem.

## Implemented model boundary

This module adds an independently versioned, idealized perfusion-unit graph connecting an inlet artery, branching arterioles, an anastomosing capillary bed, collecting venules, and an outlet vein. Segment IDs are stable and every segment is joined at graph nodes. Node coordinates and class radii are explicit engineering fixtures for software and solver verification only. They are not measurements or anatomical reconstruction.

The solver uses the equation set supplied in the V2 implementation specification:

- `R = 8 μ L / (π r⁴)`
- `Q = (Pstart − Pend) / R`
- `v = Q / (π r²)`
- `τ = 4 μ |Q| / (π r³)`

It solves internal pressures with a sparse conductance/Laplacian system and checks mass conservation at all internal nodes. Inputs and outputs are SI; convenience conversions use `1 m³/s = 6×10¹⁰ µL/min`, `1 m/s = 1000 mm/s`, and `1 mmHg = 133.322387415 Pa`.

## Limitations

The current solver is steady-state, rigid-wall, laminar, Newtonian and reduced-order. It does not model pulsatility, autoregulation, blood-cell deformation or distribution, hematocrit, phase separation, oxygen exchange, BBB transport, thrombosis, disease, or treatment effects. The default viscosity and boundary values are illustrative numerical test inputs, not blood-property claims or physiological reference presets. Visual radii are exaggerated separately from physical radii.

The equations and validity assumptions are sourced to the user's uploaded V2 specification, §5. No external anatomical measurements were supplied in the project proposal; none are claimed by this fixture.

## API and reproduction

- `GET /api/vascular/network` returns the fixed, versioned topology and the segment-to-node coordinates.
- `POST /api/vascular/solve` accepts a complete boundary mode, viscosity, optional radius overrides in µm, and explicit occluded segment IDs. It returns pressures, signed flows, velocity, resistance, shear, an input fingerprint, and a normalized internal mass-balance residual for each solve.
- Run analytical and API tests with `cd artifacts/api-server && python -m unittest vascular.test_solver vascular.test_api -v`.
