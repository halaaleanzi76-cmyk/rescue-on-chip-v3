"""Deterministic, connected cerebral microvascular teaching graph.

No patient-specific anatomy or imaging reconstruction is implied. The
coordinates and class radii are explicit numerical fixture values so that the
network can be solved and inspected; they are not presented as measured human
vessel dimensions.
"""

from math import dist

from .contracts import VascularNetwork

NETWORK_VERSION = "cerebral-microvascular-idealized-0.1"
GEOMETRY_BASIS = "Idealized engineering fixture; not an anatomical measurement or patient reconstruction."
GEOMETRY_NOTE = (
    "The proposal identifies a cerebral neurovascular research scope but supplies no vascular imaging or "
    "segment measurements. This graph is an idealized, configurable topology for solver verification only. "
    "Its coordinates and class radii are illustrative numerical inputs, not measured human anatomy."
)

PHYSICAL_ASSUMPTIONS = [
    "Research-only, concept-stage cerebral microvascular perfusion unit; not a whole-circulation or patient-specific model.",
    "Topology is an idealized connected artery → arterioles → anastomosing capillary bed → venules → vein graph.",
    "Node coordinates and default radii are illustrative engineering fixture values because no anatomical imaging or measured geometry was supplied.",
    "Visual tube thickness is exaggerated independently of the physical radii; geometry is not reconstructed human anatomy.",
    "No blood cells, hematocrit, phase separation, compliance, pulsatility, active regulation, exchange, thrombosis, or injury are modeled.",
    "No clinical efficacy, safety, diagnosis, or treatment conclusion is computed.",
]

# Positions use meters and are arranged left-to-right for visualization. The
# dimensions make a compact deterministic example, not a measured brain volume.
_NODE_UM = {
    "inlet": (-1800.0, 0.0, 0.0),
    "arterial_split": (-1200.0, 0.0, 0.0),
    "arteriole_upper": (-700.0, 200.0, 0.0),
    "arteriole_lower": (-700.0, -200.0, 0.0),
    "cap_u0": (-400.0, 200.0, 0.0),
    "cap_u1": (-300.0, 200.0, 0.0),
    "cap_u2": (-200.0, 200.0, 0.0),
    "cap_u3": (-100.0, 200.0, 0.0),
    "cap_l0": (-400.0, -200.0, 0.0),
    "cap_l1": (-300.0, -200.0, 0.0),
    "cap_l2": (-200.0, -200.0, 0.0),
    "cap_l3": (-100.0, -200.0, 0.0),
    "venous_join": (400.0, 0.0, 0.0),
    "outlet": (1000.0, 0.0, 0.0),
}

_CLASS_RADIUS_UM = {
    "artery": 60.0,
    "arteriole": 15.0,
    "capillary": 4.0,
    "venule": 12.0,
    "vein": 50.0,
}


def _position_m(node_id: str) -> tuple[float, float, float]:
    return tuple(value * 1e-6 for value in _NODE_UM[node_id])


def build_default_network() -> VascularNetwork:
    node_roles = {
        "inlet": "inlet",
        "arterial_split": "junction",
        "arteriole_upper": "junction",
        "arteriole_lower": "junction",
        "venous_join": "junction",
        "outlet": "outlet",
        **{f"cap_{row}{column}": "junction" for row in ("u", "l") for column in range(4)},
    }
    nodes = [
        {
            "node_id": node_id,
            "role": node_roles[node_id],
            "position_m": _position_m(node_id),
        }
        for node_id in _NODE_UM
    ]

    edge_rows: list[tuple[str, str, str, str]] = [
        ("artery_feed", "inlet", "arterial_split", "artery"),
        ("arteriole_upper", "arterial_split", "arteriole_upper", "arteriole"),
        ("arteriole_lower", "arterial_split", "arteriole_lower", "arteriole"),
        ("arteriole_to_cap_upper", "arteriole_upper", "cap_u0", "arteriole"),
        ("arteriole_to_cap_lower", "arteriole_lower", "cap_l0", "arteriole"),
    ]
    for row, prefix in (("upper", "u"), ("lower", "l")):
        for column in range(3):
            edge_rows.append(
                (
                    f"capillary_{prefix}_{column}_{column + 1}",
                    f"cap_{prefix}{column}",
                    f"cap_{prefix}{column + 1}",
                    "capillary",
                )
            )
    for column in range(4):
        edge_rows.append(
            (
                f"capillary_anastomosis_{column}",
                f"cap_u{column}",
                f"cap_l{column}",
                "capillary",
            )
        )
    edge_rows.extend(
        [
            ("venule_upper", "cap_u3", "venous_join", "venule"),
            ("venule_lower", "cap_l3", "venous_join", "venule"),
            ("draining_vein", "venous_join", "outlet", "vein"),
        ]
    )

    segments = []
    for segment_id, start_id, end_id, vessel_class in edge_rows:
        start = _position_m(start_id)
        end = _position_m(end_id)
        segments.append(
            {
                "segment_id": segment_id,
                "start_node_id": start_id,
                "end_node_id": end_id,
                "vessel_class": vessel_class,
                "length_m": dist(start, end),
                "radius_m": _CLASS_RADIUS_UM[vessel_class] * 1e-6,
                "start_position_m": start,
                "end_position_m": end,
                "geometry_basis": GEOMETRY_BASIS,
            }
        )

    graph = VascularNetwork(
        network_version=NETWORK_VERSION,
        tissue_scope="Idealized cerebral microvascular perfusion unit",
        inlet_node_id="inlet",
        outlet_node_id="outlet",
        nodes=nodes,
        segments=segments,
        geometry_note=GEOMETRY_NOTE,
        physical_assumptions=PHYSICAL_ASSUMPTIONS,
    )
    validate_network(graph)
    return graph


def validate_network(network: VascularNetwork) -> None:
    node_ids = [node.node_id for node in network.nodes]
    segment_ids = [segment.segment_id for segment in network.segments]
    if len(node_ids) != len(set(node_ids)) or len(segment_ids) != len(set(segment_ids)):
        raise ValueError("Vascular node and segment identifiers must be unique.")
    node_set = set(node_ids)
    if network.inlet_node_id not in node_set or network.outlet_node_id not in node_set:
        raise ValueError("The vascular inlet and outlet must refer to graph nodes.")
    adjacency = {node_id: set() for node_id in node_ids}
    for segment in network.segments:
        if segment.start_node_id not in node_set or segment.end_node_id not in node_set:
            raise ValueError(f"Segment {segment.segment_id} refers to a missing node.")
        if segment.start_node_id == segment.end_node_id:
            raise ValueError(f"Segment {segment.segment_id} cannot begin and end at the same node.")
        adjacency[segment.start_node_id].add(segment.end_node_id)
        adjacency[segment.end_node_id].add(segment.start_node_id)
    reached = {network.inlet_node_id}
    stack = [network.inlet_node_id]
    while stack:
        current = stack.pop()
        for neighbor in adjacency[current] - reached:
            reached.add(neighbor)
            stack.append(neighbor)
    if reached != node_set or network.outlet_node_id not in reached:
        raise ValueError("Every vascular node must be connected to the inlet/outlet graph.")
