"""
Project Setup Engine.

When a project is created, this service initializes construction-aware
defaults based on project_type and contract_type:

1. Phase/task templates with industry-standard duration and budget weights
2. Milestone templates per project type
3. Contract-type modifiers (design phases for D&B/Turnkey/BOT)
4. Project setup_complete flag

Weight sources:
  - RSMeans Building Construction Cost Data 2024 (cost allocations)
  - RIBA Plan of Work 2020 (design phases for D&B)
  - CIOB Code of Practice, 6th ed (WBS structures)
  - PMI PMBOK 7th ed (scheduling methodology)
  - Halpin & Senior, Construction Management 4th ed (duration norms)
"""
from django.db import models
from apps.core.models import TimestampedModel


class ProjectSetupConfig(TimestampedModel):
    """Stores the setup engine output for a project."""

    project = models.OneToOneField(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="setup_config",
    )
    phase_templates = models.JSONField(
        default=list,
        help_text="List of phase/task group skeletons with durP/budP weights.",
    )
    milestone_templates = models.JSONField(
        default=list,
        help_text="List of milestone skeletons.",
    )
    has_design_phase = models.BooleanField(
        default=False,
        help_text="True if contract type includes design phases (D&B, Turnkey, BOT).",
    )
    workspace_modules = models.JSONField(
        default=list,
        help_text="List of enabled workspace module keys.",
    )

    class Meta:
        db_table = "projects_setup_config"

    def __str__(self):
        return f"Setup: {self.project.code}"


# ---------------------------------------------------------------------------
# Phase templates with full durP/budP weights — exact mirror of prototype
# ---------------------------------------------------------------------------

PHASE_TEMPLATES = {
    "residential": [
        {"id": "A", "name": "Preliminaries & Site Setup", "durP": 0.053, "budP": 0.030, "res": "Site Team", "children": [
            {"id": "A1", "name": "Site Survey & Setting Out", "durP": 0.015, "budP": 0.008, "res": "Survey Team"},
            {"id": "A2", "name": "Site Clearing & Levelling", "durP": 0.020, "budP": 0.010, "res": "Clearing Crew"},
            {"id": "A3", "name": "Temporary Facilities & Hoarding", "durP": 0.010, "budP": 0.007, "res": "Site Crew"},
            {"id": "A4", "name": "Water & Power Connection", "durP": 0.008, "budP": 0.005, "res": "Utilities Team"},
        ]},
        {"id": "B", "name": "Substructure / Foundation", "durP": 0.100, "budP": 0.140, "res": "Foundation Crew", "children": [
            {"id": "B1", "name": "Excavation to Foundation", "durP": 0.020, "budP": 0.020, "res": "Excavation Crew"},
            {"id": "B2", "name": "Foundation Concrete & Reinforcement", "durP": 0.035, "budP": 0.060, "res": "Masons"},
            {"id": "B3", "name": "Ground Floor Slab", "durP": 0.025, "budP": 0.035, "res": "Masons"},
            {"id": "B4", "name": "Damp-proof Course & Membrane", "durP": 0.008, "budP": 0.010, "res": "Masons"},
            {"id": "B5", "name": "Underground Drainage", "durP": 0.012, "budP": 0.015, "res": "Plumbers"},
        ]},
        {"id": "C", "name": "Superstructure / Walling", "durP": 0.140, "budP": 0.165, "res": "Masonry Team", "children": [
            {"id": "C1", "name": "Blockwork/Brickwork to Window Level", "durP": 0.045, "budP": 0.060, "res": "Masons"},
            {"id": "C2", "name": "Lintel & Window Frames", "durP": 0.015, "budP": 0.020, "res": "Masons"},
            {"id": "C3", "name": "Blockwork to Ring Beam", "durP": 0.035, "budP": 0.040, "res": "Masons"},
            {"id": "C4", "name": "Ring Beam Concrete", "durP": 0.020, "budP": 0.025, "res": "Masons"},
            {"id": "C5", "name": "Internal Partition Walls", "durP": 0.025, "budP": 0.020, "res": "Masons"},
        ]},
        {"id": "D", "name": "Roofing", "durP": 0.083, "budP": 0.130, "res": "Roofing Crew", "children": [
            {"id": "D1", "name": "Roof Timber & Trusses", "durP": 0.025, "budP": 0.045, "res": "Carpenters"},
            {"id": "D2", "name": "Purlins & Fascia Board", "durP": 0.015, "budP": 0.020, "res": "Carpenters"},
            {"id": "D3", "name": "Iron Sheet / Tile Laying", "durP": 0.020, "budP": 0.040, "res": "Roofers"},
            {"id": "D4", "name": "Gutters & Downpipes", "durP": 0.008, "budP": 0.010, "res": "Plumbers"},
            {"id": "D5", "name": "Ceiling Installation", "durP": 0.015, "budP": 0.015, "res": "Carpenters"},
        ]},
        {"id": "E", "name": "Mechanical & Electrical", "durP": 0.080, "budP": 0.105, "res": "MEP Team", "children": [
            {"id": "E1", "name": "Electrical First Fix (Conduits & Wiring)", "durP": 0.025, "budP": 0.030, "res": "Electricians"},
            {"id": "E2", "name": "Plumbing First Fix (Pipes & Drains)", "durP": 0.020, "budP": 0.025, "res": "Plumbers"},
            {"id": "E3", "name": "Electrical Second Fix (Sockets & Switches)", "durP": 0.015, "budP": 0.020, "res": "Electricians"},
            {"id": "E4", "name": "Plumbing Second Fix (Taps & Fittings)", "durP": 0.012, "budP": 0.018, "res": "Plumbers"},
            {"id": "E5", "name": "Water Tank & Pump Installation", "durP": 0.008, "budP": 0.012, "res": "Plumbers"},
        ]},
        {"id": "F", "name": "Finishes", "durP": 0.140, "budP": 0.139, "res": "Finishing Team", "children": [
            {"id": "F1", "name": "Internal Plastering", "durP": 0.035, "budP": 0.035, "res": "Plasterers"},
            {"id": "F2", "name": "External Rendering", "durP": 0.025, "budP": 0.025, "res": "Plasterers"},
            {"id": "F3", "name": "Floor Screeding", "durP": 0.015, "budP": 0.012, "res": "Masons"},
            {"id": "F4", "name": "Tiling (Floors & Walls)", "durP": 0.025, "budP": 0.035, "res": "Tilers"},
            {"id": "F5", "name": "Painting (Internal)", "durP": 0.025, "budP": 0.020, "res": "Painters"},
            {"id": "F6", "name": "Painting (External)", "durP": 0.015, "budP": 0.012, "res": "Painters"},
        ]},
        {"id": "G", "name": "Doors, Windows & Fittings", "durP": 0.057, "budP": 0.120, "res": "Fitters", "children": [
            {"id": "G1", "name": "Door Frames & Doors", "durP": 0.015, "budP": 0.035, "res": "Carpenters"},
            {"id": "G2", "name": "Window Installation", "durP": 0.012, "budP": 0.025, "res": "Fitters"},
            {"id": "G3", "name": "Kitchen Fittings", "durP": 0.012, "budP": 0.025, "res": "Fitters"},
            {"id": "G4", "name": "Bathroom Fixtures", "durP": 0.010, "budP": 0.020, "res": "Plumbers"},
            {"id": "G5", "name": "Security Door & Grills", "durP": 0.008, "budP": 0.015, "res": "Fitters"},
        ]},
        {"id": "H", "name": "External Works", "durP": 0.048, "budP": 0.061, "res": "External Works", "children": [
            {"id": "H1", "name": "Compound Wall / Fence", "durP": 0.020, "budP": 0.030, "res": "Masons"},
            {"id": "H2", "name": "Driveway & Paving", "durP": 0.015, "budP": 0.018, "res": "Paving Crew"},
            {"id": "H3", "name": "Landscaping", "durP": 0.008, "budP": 0.008, "res": "Landscapers"},
            {"id": "H4", "name": "External Lighting", "durP": 0.005, "budP": 0.005, "res": "Electricians"},
        ]},
        {"id": "I", "name": "Completion & Handover", "durP": 0.028, "budP": 0.010, "res": "QA Team", "children": [
            {"id": "I1", "name": "Cleaning & Snagging", "durP": 0.012, "budP": 0.004, "res": "Site Crew"},
            {"id": "I2", "name": "Final Inspection & Punch List", "durP": 0.008, "budP": 0.002, "res": "QA Team"},
            {"id": "I3", "name": "Handover & Documentation", "durP": 0.005, "budP": 0.002, "res": "Project Manager"},
            {"id": "I4", "name": "Defects Liability Period Start", "durP": 0.003, "budP": 0.002, "res": "Project Manager"},
        ]},
    ],
    "commercial": [
        {"id": "A", "name": "Preliminaries & Mobilisation", "durP": 0.045, "budP": 0.040, "res": "Site Team", "children": [
            {"id": "A1", "name": "Site Survey & Geotechnical Investigation", "durP": 0.012, "budP": 0.008, "res": "Survey Team"},
            {"id": "A2", "name": "Site Clearing & Demolition", "durP": 0.015, "budP": 0.010, "res": "Demolition Crew"},
            {"id": "A3", "name": "Temporary Works & Site Offices", "durP": 0.010, "budP": 0.012, "res": "Site Crew"},
            {"id": "A4", "name": "Tower Crane Erection", "durP": 0.008, "budP": 0.010, "res": "Crane Crew"},
        ]},
        {"id": "B", "name": "Substructure", "durP": 0.113, "budP": 0.150, "res": "Foundation Team", "children": [
            {"id": "B1", "name": "Bulk Excavation", "durP": 0.020, "budP": 0.025, "res": "Excavation Crew"},
            {"id": "B2", "name": "Piling / Deep Foundation", "durP": 0.030, "budP": 0.050, "res": "Piling Contractor"},
            {"id": "B3", "name": "Pile Caps & Ground Beams", "durP": 0.025, "budP": 0.030, "res": "Concrete Crew"},
            {"id": "B4", "name": "Basement Slab & Waterproofing", "durP": 0.020, "budP": 0.025, "res": "Concrete Crew"},
            {"id": "B5", "name": "Basement Walls & Retaining", "durP": 0.018, "budP": 0.020, "res": "Concrete Crew"},
        ]},
        {"id": "C", "name": "Superstructure", "durP": 0.112, "budP": 0.155, "res": "Structural Team", "children": [
            {"id": "C1", "name": "Structural Columns & Beams", "durP": 0.040, "budP": 0.060, "res": "Structural Crew"},
            {"id": "C2", "name": "Floor Slabs (per level)", "durP": 0.045, "budP": 0.065, "res": "Concrete Crew"},
            {"id": "C3", "name": "Staircase Construction", "durP": 0.015, "budP": 0.015, "res": "Concrete Crew"},
            {"id": "C4", "name": "Lift Shaft Construction", "durP": 0.012, "budP": 0.015, "res": "Concrete Crew"},
        ]},
        {"id": "D", "name": "Building Envelope", "durP": 0.062, "budP": 0.085, "res": "Envelope Team", "children": [
            {"id": "D1", "name": "External Walls / Curtain Wall", "durP": 0.030, "budP": 0.040, "res": "Cladding Crew"},
            {"id": "D2", "name": "Window & Glazing Installation", "durP": 0.020, "budP": 0.030, "res": "Glaziers"},
            {"id": "D3", "name": "Roof Waterproofing & Insulation", "durP": 0.012, "budP": 0.015, "res": "Waterproofing Crew"},
        ]},
        {"id": "E", "name": "MEP Services", "durP": 0.107, "budP": 0.150, "res": "MEP Team", "children": [
            {"id": "E1", "name": "HVAC Ductwork & Equipment", "durP": 0.030, "budP": 0.045, "res": "HVAC Contractor"},
            {"id": "E2", "name": "Electrical Distribution & Cabling", "durP": 0.025, "budP": 0.035, "res": "Electricians"},
            {"id": "E3", "name": "Plumbing & Fire Protection", "durP": 0.020, "budP": 0.025, "res": "Plumbers"},
            {"id": "E4", "name": "Lift Installation", "durP": 0.020, "budP": 0.030, "res": "Lift Contractor"},
            {"id": "E5", "name": "BMS & Security Systems", "durP": 0.012, "budP": 0.015, "res": "Systems Contractor"},
        ]},
        {"id": "F", "name": "Interior Fit-Out", "durP": 0.095, "budP": 0.108, "res": "Fit-Out Team", "children": [
            {"id": "F1", "name": "Partitions & Drywalling", "durP": 0.025, "budP": 0.025, "res": "Drywall Crew"},
            {"id": "F2", "name": "Suspended Ceilings", "durP": 0.015, "budP": 0.018, "res": "Ceiling Crew"},
            {"id": "F3", "name": "Floor Finishes", "durP": 0.020, "budP": 0.030, "res": "Tilers"},
            {"id": "F4", "name": "Painting & Decoration", "durP": 0.020, "budP": 0.015, "res": "Painters"},
            {"id": "F5", "name": "Joinery & Fixtures", "durP": 0.015, "budP": 0.020, "res": "Joiners"},
        ]},
        {"id": "G", "name": "External Works & Landscaping", "durP": 0.035, "budP": 0.042, "res": "External Works", "children": [
            {"id": "G1", "name": "Parking Area & Paving", "durP": 0.015, "budP": 0.020, "res": "Paving Crew"},
            {"id": "G2", "name": "Landscaping & Hardscaping", "durP": 0.010, "budP": 0.010, "res": "Landscapers"},
            {"id": "G3", "name": "External Services & Utilities", "durP": 0.010, "budP": 0.012, "res": "Utilities Crew"},
        ]},
        {"id": "H", "name": "Testing, Commissioning & Handover", "durP": 0.031, "budP": 0.020, "res": "QA Team", "children": [
            {"id": "H1", "name": "MEP Testing & Commissioning", "durP": 0.012, "budP": 0.008, "res": "Commissioning Team"},
            {"id": "H2", "name": "Snagging & Defects Rectification", "durP": 0.010, "budP": 0.005, "res": "QA Team"},
            {"id": "H3", "name": "Fire Safety & Compliance Certs", "durP": 0.005, "budP": 0.004, "res": "Fire Consultant"},
            {"id": "H4", "name": "Practical Completion & Handover", "durP": 0.004, "budP": 0.003, "res": "Project Manager"},
        ]},
    ],
    "road": [
        {"id": "A", "name": "Pre-Construction", "durP": 0.075, "budP": 0.070, "res": "Pre-Con Team", "children": [
            {"id": "A1", "name": "Topographical & Geotechnical Survey", "durP": 0.020, "budP": 0.010, "res": "Survey Team"},
            {"id": "A2", "name": "Land Acquisition & Compensation", "durP": 0.030, "budP": 0.040, "res": "Legal Team"},
            {"id": "A3", "name": "Utility Relocation", "durP": 0.015, "budP": 0.015, "res": "Utilities Team"},
            {"id": "A4", "name": "Environmental Mitigation Setup", "durP": 0.010, "budP": 0.005, "res": "Environmental Team"},
        ]},
        {"id": "B", "name": "Site Clearance & Earthworks", "durP": 0.120, "budP": 0.130, "res": "Earthworks", "children": [
            {"id": "B1", "name": "Bush Clearing & Grubbing", "durP": 0.025, "budP": 0.020, "res": "Clearing Crew"},
            {"id": "B2", "name": "Cut to Fill Operations", "durP": 0.040, "budP": 0.050, "res": "Earthworks Crew"},
            {"id": "B3", "name": "Embankment Formation", "durP": 0.030, "budP": 0.035, "res": "Earthworks Crew"},
            {"id": "B4", "name": "Subgrade Preparation & Compaction", "durP": 0.025, "budP": 0.025, "res": "Compaction Crew"},
        ]},
        {"id": "C", "name": "Drainage & Structures", "durP": 0.070, "budP": 0.077, "res": "Drainage Team", "children": [
            {"id": "C1", "name": "Culvert Construction", "durP": 0.030, "budP": 0.040, "res": "Structures Crew"},
            {"id": "C2", "name": "Side Drains & Lined Channels", "durP": 0.025, "budP": 0.025, "res": "Drainage Crew"},
            {"id": "C3", "name": "Mitre Drains & Scour Checks", "durP": 0.015, "budP": 0.012, "res": "Drainage Crew"},
        ]},
        {"id": "D", "name": "Pavement Layers", "durP": 0.135, "budP": 0.260, "res": "Paving Team", "children": [
            {"id": "D1", "name": "Sub-base (Natural Gravel)", "durP": 0.035, "budP": 0.060, "res": "Paving Crew"},
            {"id": "D2", "name": "Base Course (Crushed Stone)", "durP": 0.035, "budP": 0.070, "res": "Paving Crew"},
            {"id": "D3", "name": "Prime Coat Application", "durP": 0.010, "budP": 0.010, "res": "Asphalt Crew"},
            {"id": "D4", "name": "Binder Course (Asphalt)", "durP": 0.030, "budP": 0.065, "res": "Asphalt Crew"},
            {"id": "D5", "name": "Wearing Course (Asphalt)", "durP": 0.025, "budP": 0.055, "res": "Asphalt Crew"},
        ]},
        {"id": "E", "name": "Road Furniture & Finishes", "durP": 0.047, "budP": 0.062, "res": "Furniture Team", "children": [
            {"id": "E1", "name": "Road Markings (Thermoplastic)", "durP": 0.010, "budP": 0.015, "res": "Marking Crew"},
            {"id": "E2", "name": "Road Signs & Delineators", "durP": 0.010, "budP": 0.012, "res": "Signs Crew"},
            {"id": "E3", "name": "Guardrails & Safety Barriers", "durP": 0.012, "budP": 0.015, "res": "Safety Crew"},
            {"id": "E4", "name": "Street Lighting", "durP": 0.015, "budP": 0.020, "res": "Electricians"},
        ]},
        {"id": "F", "name": "Ancillary Works", "durP": 0.042, "budP": 0.050, "res": "Ancillary Crew", "children": [
            {"id": "F1", "name": "Shoulder Formation & Grassing", "durP": 0.015, "budP": 0.015, "res": "Landscapers"},
            {"id": "F2", "name": "Bus Bays & Parking Areas", "durP": 0.015, "budP": 0.020, "res": "Paving Crew"},
            {"id": "F3", "name": "Pedestrian Walkways", "durP": 0.012, "budP": 0.015, "res": "Paving Crew"},
        ]},
        {"id": "G", "name": "Completion", "durP": 0.019, "budP": 0.011, "res": "QA Team", "children": [
            {"id": "G1", "name": "Final Inspection & Testing", "durP": 0.006, "budP": 0.003, "res": "QA Team"},
            {"id": "G2", "name": "Snag Rectification", "durP": 0.008, "budP": 0.005, "res": "Site Crew"},
            {"id": "G3", "name": "As-Built Drawings & Handover", "durP": 0.005, "budP": 0.003, "res": "Project Manager"},
        ]},
    ],
    "bridge": [
        {"id": "A", "name": "Pre-Construction", "durP": 0.060, "budP": 0.052, "res": "Pre-Con Team", "children": [
            {"id": "A1", "name": "Hydrological & Geotechnical Study", "durP": 0.020, "budP": 0.012, "res": "Geo Team"},
            {"id": "A2", "name": "Site Access Roads", "durP": 0.015, "budP": 0.015, "res": "Site Crew"},
            {"id": "A3", "name": "River Diversion / Cofferdam", "durP": 0.025, "budP": 0.025, "res": "Marine Crew"},
        ]},
        {"id": "B", "name": "Substructure", "durP": 0.140, "budP": 0.230, "res": "Substructure Team", "children": [
            {"id": "B1", "name": "Piling Works", "durP": 0.040, "budP": 0.080, "res": "Piling Crew"},
            {"id": "B2", "name": "Pile Caps", "durP": 0.025, "budP": 0.040, "res": "Concrete Crew"},
            {"id": "B3", "name": "Abutment Construction", "durP": 0.035, "budP": 0.050, "res": "Concrete Crew"},
            {"id": "B4", "name": "Pier Construction", "durP": 0.040, "budP": 0.060, "res": "Concrete Crew"},
        ]},
        {"id": "C", "name": "Superstructure", "durP": 0.130, "budP": 0.220, "res": "Superstructure Team", "children": [
            {"id": "C1", "name": "Bearing Installation", "durP": 0.010, "budP": 0.015, "res": "Structural Crew"},
            {"id": "C2", "name": "Girder/Beam Fabrication & Launching", "durP": 0.060, "budP": 0.120, "res": "Steel Crew"},
            {"id": "C3", "name": "Deck Slab Construction", "durP": 0.040, "budP": 0.060, "res": "Concrete Crew"},
            {"id": "C4", "name": "Post-tensioning (if applicable)", "durP": 0.020, "budP": 0.025, "res": "Specialist Crew"},
        ]},
        {"id": "D", "name": "Bridge Accessories", "durP": 0.054, "budP": 0.073, "res": "Accessories Team", "children": [
            {"id": "D1", "name": "Expansion Joints", "durP": 0.012, "budP": 0.020, "res": "Specialist Crew"},
            {"id": "D2", "name": "Waterproofing & Drainage", "durP": 0.015, "budP": 0.018, "res": "Waterproofing Crew"},
            {"id": "D3", "name": "Parapets & Handrails", "durP": 0.015, "budP": 0.020, "res": "Steel Crew"},
            {"id": "D4", "name": "Bridge Deck Surfacing", "durP": 0.012, "budP": 0.015, "res": "Paving Crew"},
        ]},
        {"id": "E", "name": "Approach Roads", "durP": 0.060, "budP": 0.075, "res": "Road Team", "children": [
            {"id": "E1", "name": "Approach Embankments", "durP": 0.025, "budP": 0.030, "res": "Earthworks"},
            {"id": "E2", "name": "Approach Slab", "durP": 0.015, "budP": 0.020, "res": "Concrete Crew"},
            {"id": "E3", "name": "Approach Road Pavement", "durP": 0.020, "budP": 0.025, "res": "Paving Crew"},
        ]},
        {"id": "F", "name": "Testing & Handover", "durP": 0.023, "budP": 0.016, "res": "QA Team", "children": [
            {"id": "F1", "name": "Load Testing", "durP": 0.010, "budP": 0.008, "res": "Testing Team"},
            {"id": "F2", "name": "Snagging & Final Works", "durP": 0.008, "budP": 0.005, "res": "Site Crew"},
            {"id": "F3", "name": "As-Built & Handover", "durP": 0.005, "budP": 0.003, "res": "Project Manager"},
        ]},
    ],
    "school": [
        {"id": "A", "name": "Preliminaries", "durP": 0.035, "budP": 0.020, "res": "Site Team", "children": [
            {"id": "A1", "name": "Site Survey & Setting Out", "durP": 0.012, "budP": 0.006, "res": "Survey Team"},
            {"id": "A2", "name": "Site Clearing", "durP": 0.015, "budP": 0.008, "res": "Clearing Crew"},
            {"id": "A3", "name": "Temporary Facilities", "durP": 0.008, "budP": 0.006, "res": "Site Crew"},
        ]},
        {"id": "B", "name": "Substructure", "durP": 0.090, "budP": 0.132, "res": "Foundation", "children": [
            {"id": "B1", "name": "Excavation", "durP": 0.020, "budP": 0.025, "res": "Excavation Crew"},
            {"id": "B2", "name": "Strip Foundation & Columns", "durP": 0.035, "budP": 0.060, "res": "Masons"},
            {"id": "B3", "name": "Ground Floor Slab", "durP": 0.025, "budP": 0.035, "res": "Masons"},
            {"id": "B4", "name": "Underground Services", "durP": 0.010, "budP": 0.012, "res": "Plumbers"},
        ]},
        {"id": "C", "name": "Superstructure (Classroom Blocks)", "durP": 0.120, "budP": 0.150, "res": "Masonry", "children": [
            {"id": "C1", "name": "Walling (Classroom Block 1)", "durP": 0.040, "budP": 0.050, "res": "Masons"},
            {"id": "C2", "name": "Walling (Classroom Block 2)", "durP": 0.035, "budP": 0.045, "res": "Masons"},
            {"id": "C3", "name": "Ring Beams & Lintels", "durP": 0.020, "budP": 0.025, "res": "Masons"},
            {"id": "C4", "name": "Administration Block", "durP": 0.025, "budP": 0.030, "res": "Masons"},
        ]},
        {"id": "D", "name": "Roofing", "durP": 0.055, "budP": 0.087, "res": "Roofing", "children": [
            {"id": "D1", "name": "Roof Trusses & Purlins", "durP": 0.025, "budP": 0.040, "res": "Carpenters"},
            {"id": "D2", "name": "Iron Sheet Laying", "durP": 0.020, "budP": 0.035, "res": "Roofers"},
            {"id": "D3", "name": "Fascia & Gutters", "durP": 0.010, "budP": 0.012, "res": "Roofers"},
        ]},
        {"id": "E", "name": "MEP Installations", "durP": 0.060, "budP": 0.086, "res": "MEP", "children": [
            {"id": "E1", "name": "Electrical Wiring & Distribution", "durP": 0.025, "budP": 0.035, "res": "Electricians"},
            {"id": "E2", "name": "Plumbing & Sanitation", "durP": 0.020, "budP": 0.028, "res": "Plumbers"},
            {"id": "E3", "name": "IT & Computer Lab Cabling", "durP": 0.010, "budP": 0.015, "res": "IT Contractor"},
            {"id": "E4", "name": "Lightning Protection", "durP": 0.005, "budP": 0.008, "res": "Electricians"},
        ]},
        {"id": "F", "name": "Finishes", "durP": 0.085, "budP": 0.090, "res": "Finishers", "children": [
            {"id": "F1", "name": "Plastering", "durP": 0.030, "budP": 0.030, "res": "Plasterers"},
            {"id": "F2", "name": "Floor Screeding & Tiling", "durP": 0.025, "budP": 0.035, "res": "Tilers"},
            {"id": "F3", "name": "Painting", "durP": 0.025, "budP": 0.020, "res": "Painters"},
            {"id": "F4", "name": "Chalkboard Installation", "durP": 0.005, "budP": 0.005, "res": "Fitters"},
        ]},
        {"id": "G", "name": "External & Ancillary Works", "durP": 0.067, "budP": 0.093, "res": "External", "children": [
            {"id": "G1", "name": "Toilet Block (VIP Latrines)", "durP": 0.025, "budP": 0.040, "res": "Masons"},
            {"id": "G2", "name": "Rainwater Harvesting Tank", "durP": 0.012, "budP": 0.018, "res": "Plumbers"},
            {"id": "G3", "name": "Compound Fence", "durP": 0.015, "budP": 0.020, "res": "Masons"},
            {"id": "G4", "name": "Playground & Landscaping", "durP": 0.010, "budP": 0.010, "res": "Landscapers"},
            {"id": "G5", "name": "School Gate & Signage", "durP": 0.005, "budP": 0.005, "res": "Fitters"},
        ]},
        {"id": "H", "name": "Completion", "durP": 0.023, "budP": 0.037, "res": "QA Team", "children": [
            {"id": "H1", "name": "Cleaning & Snagging", "durP": 0.008, "budP": 0.004, "res": "Site Crew"},
            {"id": "H2", "name": "Furniture & Equipment", "durP": 0.010, "budP": 0.030, "res": "Supplier"},
            {"id": "H3", "name": "Final Inspection & Handover", "durP": 0.005, "budP": 0.003, "res": "QA Team"},
        ]},
    ],
    "hospital": [
        {"id": "A", "name": "Preliminaries", "durP": 0.030, "budP": 0.020, "res": "Site Team", "children": [
            {"id": "A1", "name": "Site Survey & Geotechnical", "durP": 0.010, "budP": 0.005, "res": "Survey Team"},
            {"id": "A2", "name": "Site Preparation & Hoarding", "durP": 0.012, "budP": 0.008, "res": "Site Crew"},
            {"id": "A3", "name": "Temporary Utilities & Site Office", "durP": 0.008, "budP": 0.007, "res": "Site Crew"},
        ]},
        {"id": "B", "name": "Substructure", "durP": 0.080, "budP": 0.115, "res": "Foundation", "children": [
            {"id": "B1", "name": "Excavation & Piling", "durP": 0.025, "budP": 0.035, "res": "Piling Crew"},
            {"id": "B2", "name": "Foundation & Ground Beams", "durP": 0.035, "budP": 0.055, "res": "Concrete Crew"},
            {"id": "B3", "name": "Ground Floor Slab", "durP": 0.020, "budP": 0.025, "res": "Concrete Crew"},
        ]},
        {"id": "C", "name": "Superstructure", "durP": 0.135, "budP": 0.160, "res": "Structure", "children": [
            {"id": "C1", "name": "Structural Frame (RC/Steel)", "durP": 0.050, "budP": 0.065, "res": "Structural Crew"},
            {"id": "C2", "name": "Floor Slabs (Multiple Levels)", "durP": 0.035, "budP": 0.045, "res": "Concrete Crew"},
            {"id": "C3", "name": "External & Internal Walls", "durP": 0.035, "budP": 0.035, "res": "Masons"},
            {"id": "C4", "name": "Staircase & Ramps", "durP": 0.015, "budP": 0.015, "res": "Concrete Crew"},
        ]},
        {"id": "D", "name": "Roofing & Envelope", "durP": 0.045, "budP": 0.062, "res": "Envelope", "children": [
            {"id": "D1", "name": "Roof Structure & Covering", "durP": 0.020, "budP": 0.030, "res": "Roofers"},
            {"id": "D2", "name": "Windows & External Doors", "durP": 0.015, "budP": 0.020, "res": "Glaziers"},
            {"id": "D3", "name": "Waterproofing & Insulation", "durP": 0.010, "budP": 0.012, "res": "Waterproofing"},
        ]},
        {"id": "E", "name": "MEP Services (Hospital Grade)", "durP": 0.115, "budP": 0.155, "res": "MEP", "children": [
            {"id": "E1", "name": "Medical Gas Pipeline System", "durP": 0.020, "budP": 0.030, "res": "Medical Gas Contractor"},
            {"id": "E2", "name": "HVAC & Theatre Ventilation", "durP": 0.025, "budP": 0.035, "res": "HVAC Contractor"},
            {"id": "E3", "name": "Electrical & Standby Generator", "durP": 0.025, "budP": 0.035, "res": "Electricians"},
            {"id": "E4", "name": "Plumbing & Drainage", "durP": 0.018, "budP": 0.020, "res": "Plumbers"},
            {"id": "E5", "name": "Fire Detection & Suppression", "durP": 0.012, "budP": 0.015, "res": "Fire Contractor"},
            {"id": "E6", "name": "Lift Installation", "durP": 0.015, "budP": 0.020, "res": "Lift Contractor"},
        ]},
        {"id": "F", "name": "Interior Fit-Out", "durP": 0.083, "budP": 0.087, "res": "Finishers", "children": [
            {"id": "F1", "name": "Plastering & Screeding", "durP": 0.025, "budP": 0.020, "res": "Plasterers"},
            {"id": "F2", "name": "Vinyl & Epoxy Flooring (Clinical)", "durP": 0.018, "budP": 0.025, "res": "Flooring Crew"},
            {"id": "F3", "name": "Tiling (Non-clinical Areas)", "durP": 0.012, "budP": 0.015, "res": "Tilers"},
            {"id": "F4", "name": "Painting (Antibacterial)", "durP": 0.018, "budP": 0.015, "res": "Painters"},
            {"id": "F5", "name": "Suspended Ceilings", "durP": 0.010, "budP": 0.012, "res": "Ceiling Crew"},
        ]},
        {"id": "G", "name": "Specialist Systems", "durP": 0.052, "budP": 0.110, "res": "Specialist", "children": [
            {"id": "G1", "name": "Laboratory Fit-Out", "durP": 0.015, "budP": 0.025, "res": "Lab Specialist"},
            {"id": "G2", "name": "Operating Theatre Fit-Out", "durP": 0.015, "budP": 0.030, "res": "Theatre Specialist"},
            {"id": "G3", "name": "IT & Nurse Call Systems", "durP": 0.010, "budP": 0.015, "res": "IT Contractor"},
            {"id": "G4", "name": "Medical Equipment Installation", "durP": 0.012, "budP": 0.040, "res": "Equipment Supplier"},
        ]},
        {"id": "H", "name": "External & Completion", "durP": 0.038, "budP": 0.038, "res": "Completion", "children": [
            {"id": "H1", "name": "Access Roads & Parking", "durP": 0.012, "budP": 0.015, "res": "Paving Crew"},
            {"id": "H2", "name": "Landscaping & Waste Management", "durP": 0.008, "budP": 0.008, "res": "Landscapers"},
            {"id": "H3", "name": "Testing & Commissioning", "durP": 0.012, "budP": 0.010, "res": "Commissioning Team"},
            {"id": "H4", "name": "Regulatory Inspection & Handover", "durP": 0.006, "budP": 0.005, "res": "QA Team"},
        ]},
    ],
}

# Default template for Water Treatment, Dam, Custom
DEFAULT_PHASE_TEMPLATE = [
    {"id": "A", "name": "Planning & Mobilisation", "durP": 0.040, "budP": 0.026, "res": "Site Team", "children": [
        {"id": "A1", "name": "Detailed Survey & Investigation", "durP": 0.015, "budP": 0.008, "res": "Survey Team"},
        {"id": "A2", "name": "Site Access & Clearing", "durP": 0.015, "budP": 0.010, "res": "Site Crew"},
        {"id": "A3", "name": "Temporary Works", "durP": 0.010, "budP": 0.008, "res": "Site Crew"},
    ]},
    {"id": "B", "name": "Foundation & Substructure", "durP": 0.080, "budP": 0.108, "res": "Foundation", "children": [
        {"id": "B1", "name": "Excavation Works", "durP": 0.025, "budP": 0.030, "res": "Excavation Crew"},
        {"id": "B2", "name": "Foundation Construction", "durP": 0.040, "budP": 0.060, "res": "Foundation Crew"},
        {"id": "B3", "name": "Underground Services", "durP": 0.015, "budP": 0.018, "res": "Services Crew"},
    ]},
    {"id": "C", "name": "Main Structure", "durP": 0.125, "budP": 0.190, "res": "Structure", "children": [
        {"id": "C1", "name": "Primary Structure Phase 1", "durP": 0.050, "budP": 0.080, "res": "Structure Crew"},
        {"id": "C2", "name": "Primary Structure Phase 2", "durP": 0.045, "budP": 0.070, "res": "Structure Crew"},
        {"id": "C3", "name": "Secondary Elements", "durP": 0.030, "budP": 0.040, "res": "Structure Crew"},
    ]},
    {"id": "D", "name": "Mechanical & Electrical", "durP": 0.100, "budP": 0.160, "res": "MEP", "children": [
        {"id": "D1", "name": "Electrical Systems", "durP": 0.030, "budP": 0.040, "res": "Electricians"},
        {"id": "D2", "name": "Mechanical Systems", "durP": 0.030, "budP": 0.045, "res": "Mechanical Crew"},
        {"id": "D3", "name": "Process Equipment", "durP": 0.025, "budP": 0.050, "res": "Equipment Supplier"},
        {"id": "D4", "name": "Controls & Instrumentation", "durP": 0.015, "budP": 0.025, "res": "Controls Crew"},
    ]},
    {"id": "E", "name": "Finishes & Fit-Out", "durP": 0.065, "budP": 0.080, "res": "Finishers", "children": [
        {"id": "E1", "name": "Internal Finishes", "durP": 0.030, "budP": 0.035, "res": "Finishing Crew"},
        {"id": "E2", "name": "External Finishes", "durP": 0.020, "budP": 0.020, "res": "Finishing Crew"},
        {"id": "E3", "name": "Specialist Installations", "durP": 0.015, "budP": 0.025, "res": "Specialist Crew"},
    ]},
    {"id": "F", "name": "External Works", "durP": 0.035, "budP": 0.042, "res": "External", "children": [
        {"id": "F1", "name": "Roads & Paving", "durP": 0.015, "budP": 0.020, "res": "Paving Crew"},
        {"id": "F2", "name": "Fencing & Security", "durP": 0.010, "budP": 0.012, "res": "Fencing Crew"},
        {"id": "F3", "name": "Landscaping & Drainage", "durP": 0.010, "budP": 0.010, "res": "Landscapers"},
    ]},
    {"id": "G", "name": "Completion & Handover", "durP": 0.026, "budP": 0.017, "res": "QA Team", "children": [
        {"id": "G1", "name": "Testing & Commissioning", "durP": 0.012, "budP": 0.008, "res": "Commissioning"},
        {"id": "G2", "name": "Training & Documentation", "durP": 0.006, "budP": 0.004, "res": "Project Manager"},
        {"id": "G3", "name": "Snagging & Handover", "durP": 0.008, "budP": 0.005, "res": "QA Team"},
    ]},
]

DESIGN_PHASE_TEMPLATE = [
    {"id": "D1", "name": "Concept Design", "durP": 0.028, "budP": 0.017, "res": "Design Team", "children": [
        {"id": "D1a", "name": "Client Brief & Requirements", "durP": 0.008, "budP": 0.005, "res": "Architect"},
        {"id": "D1b", "name": "Site Analysis & Feasibility", "durP": 0.008, "budP": 0.004, "res": "Design Team"},
        {"id": "D1c", "name": "Concept Drawings & Options", "durP": 0.012, "budP": 0.008, "res": "Architect"},
    ]},
    {"id": "D2", "name": "Detailed Design", "durP": 0.047, "budP": 0.035, "res": "Design Team", "children": [
        {"id": "D2a", "name": "Structural Engineering Design", "durP": 0.015, "budP": 0.012, "res": "Structural Engineer"},
        {"id": "D2b", "name": "MEP Services Design", "durP": 0.012, "budP": 0.010, "res": "MEP Consultant"},
        {"id": "D2c", "name": "Architectural Drawings", "durP": 0.012, "budP": 0.008, "res": "Architect"},
        {"id": "D2d", "name": "BOQ Preparation", "durP": 0.008, "budP": 0.005, "res": "Quantity Surveyor"},
    ]},
    {"id": "D3", "name": "Regulatory Approvals", "durP": 0.024, "budP": 0.009, "res": "Project Manager", "children": [
        {"id": "D3a", "name": "Building Permit Application", "durP": 0.010, "budP": 0.003, "res": "Architect"},
        {"id": "D3b", "name": "Environmental Assessment", "durP": 0.008, "budP": 0.004, "res": "Environmental Team"},
        {"id": "D3c", "name": "Utility Approvals", "durP": 0.006, "budP": 0.002, "res": "Project Manager"},
    ]},
]

DESIGN_MILESTONE_TEMPLATES = [
    {"name": "Design Concept Approved", "task_code": "D1"},
    {"name": "Detailed Design Complete", "task_code": "D2"},
    {"name": "Regulatory Approvals Obtained", "task_code": "D3"},
]

# Milestone templates by project type -- exact task-code linkage from the prototype
MILESTONE_TEMPLATES = {
    "residential": [
        {"name": "Site Handover & Mobilisation", "task_code": "A"},
        {"name": "Foundation Complete", "task_code": "B"},
        {"name": "Walling to Ring Beam", "task_code": "C"},
        {"name": "Roof Structure Complete", "task_code": "D"},
        {"name": "MEP First Fix Complete", "task_code": "E"},
        {"name": "Plastering & Rendering Complete", "task_code": "F1"},
        {"name": "Tiling Complete", "task_code": "F3"},
        {"name": "Doors & Windows Installed", "task_code": "G"},
        {"name": "External Works Complete", "task_code": "H"},
        {"name": "Practical Completion", "task_code": "I"},
        {"name": "Defects Liability Period Start", "task_code": "I"},
    ],
    "commercial": [
        {"name": "Site Possession", "task_code": "A"},
        {"name": "Piling / Foundation Complete", "task_code": "B"},
        {"name": "Structural Frame Topped Out", "task_code": "C"},
        {"name": "Building Watertight (Envelope Sealed)", "task_code": "D"},
        {"name": "MEP Rough-In Complete", "task_code": "E1"},
        {"name": "Interior Fit-Out Complete", "task_code": "F"},
        {"name": "MEP Commissioning Complete", "task_code": "E4"},
        {"name": "Occupancy Certificate Obtained", "task_code": "H"},
        {"name": "Practical Completion & Handover", "task_code": "H"},
    ],
    "road": [
        {"name": "Site Possession & Mobilisation", "task_code": "A"},
        {"name": "Right of Way Acquired", "task_code": "A3"},
        {"name": "Earthworks Complete", "task_code": "B"},
        {"name": "Drainage & Culverts Complete", "task_code": "C"},
        {"name": "Sub-base Complete", "task_code": "D1"},
        {"name": "Base Course Complete", "task_code": "D2"},
        {"name": "First Coat of Asphalt", "task_code": "D3"},
        {"name": "Surfacing Complete", "task_code": "D4"},
        {"name": "Road Furniture & Markings Done", "task_code": "E"},
        {"name": "Substantial Completion", "task_code": "G"},
        {"name": "Defects Liability Period Start", "task_code": "G"},
    ],
    "bridge": [
        {"name": "Site Access Established", "task_code": "A"},
        {"name": "Piling Complete", "task_code": "B1"},
        {"name": "Abutments & Piers Complete", "task_code": "B3"},
        {"name": "Superstructure Erected", "task_code": "C"},
        {"name": "Deck Slab Complete", "task_code": "C3"},
        {"name": "Bridge Deck Surfaced", "task_code": "D"},
        {"name": "Approach Roads Connected", "task_code": "E"},
        {"name": "Load Test Passed", "task_code": "F"},
        {"name": "Bridge Open to Traffic", "task_code": "F"},
    ],
    "school": [
        {"name": "Site Handover", "task_code": "A"},
        {"name": "Foundation Complete", "task_code": "B"},
        {"name": "Classroom Block Walls Complete", "task_code": "C"},
        {"name": "Roofing Complete", "task_code": "D"},
        {"name": "MEP Installation Complete", "task_code": "E"},
        {"name": "Internal Finishes Complete", "task_code": "F"},
        {"name": "Furniture & Fittings Installed", "task_code": "G3"},
        {"name": "Sanitation Block Complete", "task_code": "G5"},
        {"name": "External Works & Playground Ready", "task_code": "G"},
        {"name": "Certificate of Completion", "task_code": "H"},
    ],
    "hospital": [
        {"name": "Site Handover & Mobilisation", "task_code": "A"},
        {"name": "Foundation Complete", "task_code": "B"},
        {"name": "Structural Frame Complete", "task_code": "C"},
        {"name": "Building Watertight", "task_code": "D"},
        {"name": "Medical Gas System Installed", "task_code": "E1"},
        {"name": "HVAC & Filtration Operational", "task_code": "E2"},
        {"name": "General MEP Complete", "task_code": "F"},
        {"name": "Clinical Finishes Complete", "task_code": "G"},
        {"name": "Medical Equipment Installed", "task_code": "H"},
        {"name": "Infection Control Audit Passed", "task_code": "H3"},
        {"name": "Practical Completion", "task_code": "H"},
    ],
    "water_treatment": [
        {"name": "Site Mobilisation", "task_code": "A"},
        {"name": "Foundation Complete", "task_code": "B"},
        {"name": "Treatment Units Constructed", "task_code": "C"},
        {"name": "Mechanical & Electrical Installed", "task_code": "D"},
        {"name": "Hydraulic Testing Passed", "task_code": "G1"},
        {"name": "Water Quality Test Passed", "task_code": "G2"},
        {"name": "Performance Test Run Complete", "task_code": "G"},
        {"name": "Operator Training Complete", "task_code": "G"},
    ],
    "dam": [
        {"name": "River Diversion Complete", "task_code": "A"},
        {"name": "Foundation Treatment Complete", "task_code": "B"},
        {"name": "Dam Body 50% Complete", "task_code": "C"},
        {"name": "Dam Body Complete", "task_code": "C"},
        {"name": "Spillway Constructed", "task_code": "D"},
        {"name": "Outlet Works Operational", "task_code": "D"},
        {"name": "Instrumentation Installed", "task_code": "E"},
        {"name": "First Filling Commenced", "task_code": "G"},
        {"name": "Dam Safety Review Passed", "task_code": "G"},
    ],
    "custom": [
        {"name": "Site Mobilisation", "task_code": "A"},
        {"name": "Foundation Complete", "task_code": "B"},
        {"name": "Main Structure 50% Complete", "task_code": "C"},
        {"name": "Main Structure Complete", "task_code": "C"},
        {"name": "Services Installation Complete", "task_code": "D"},
        {"name": "Finishes Complete", "task_code": "E"},
        {"name": "Practical Completion", "task_code": "G"},
        {"name": "Defects Liability Period Start", "task_code": "G"},
    ],
}

DEFAULT_MILESTONES = MILESTONE_TEMPLATES["custom"]

ALL_WORKSPACE_MODULES = [
    "overview", "schedule", "budget", "milestones", "gantt", "network", "scurve",
    "risks", "rfis", "changes", "punch", "daily-logs", "safety", "quality", "photos",
    "procurement", "timesheets", "resources", "meetings", "project-reports",
    "documents", "recycle-bin", "chat",
]


def initialize_project(project):
    """
    Run the setup engine for a newly created project.

    Creates ProjectSetupConfig with weighted phase templates, milestone templates,
    design phase flag, and enabled workspace modules.
    """
    ptype = project.project_type
    ctype = project.contract_type

    has_design = ctype in ("design_build", "turnkey", "bot")

    phases = PHASE_TEMPLATES.get(ptype, DEFAULT_PHASE_TEMPLATE)
    if has_design:
        phases = DESIGN_PHASE_TEMPLATE + phases

    milestones = MILESTONE_TEMPLATES.get(ptype, DEFAULT_MILESTONES)
    if has_design:
        milestones = DESIGN_MILESTONE_TEMPLATES + milestones

    config, created = ProjectSetupConfig.objects.update_or_create(
        project=project,
        defaults={
            "phase_templates": phases,
            "milestone_templates": milestones,
            "has_design_phase": has_design,
            "workspace_modules": ALL_WORKSPACE_MODULES,
        },
    )

    project.setup_complete = True
    project.save(update_fields=["setup_complete"])

    return config
