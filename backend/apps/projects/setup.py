"""
Project Setup Engine.

When a project is created, this service initializes construction-aware
defaults based on project_type and contract_type. It prepares:

1. Phase template skeletons (task groups ready for Phase 2 scheduling)
2. Milestone template skeletons (ready for Phase 2 milestone tracking)
3. Contract-type modifiers (e.g., design phases for D&B/Turnkey/BOT)
4. Project setup_complete flag

The actual Task and Milestone models live in the scheduling app (Phase 2).
This engine stores template definitions that the scheduling module will
consume when it's built. For now, templates are stored as project metadata
in ProjectSetupConfig.
"""
from django.db import models
from apps.core.models import TimestampedModel


class ProjectSetupConfig(TimestampedModel):
    """
    Stores the setup engine output for a project.

    Contains template data that later modules (scheduling, milestones)
    will use as their starting point. This is NOT the live task data --
    it's the template skeleton from which tasks are generated.
    """

    project = models.OneToOneField(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="setup_config",
    )
    phase_templates = models.JSONField(
        default=list,
        help_text="List of phase/task group skeletons for the scheduling engine.",
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
# Phase templates by project type
# ---------------------------------------------------------------------------
# These match the prototype's TEMPLATES structure (buildpro.html lines 106-381).
# Each phase has an id, name, and children (sub-tasks with duration/budget weights).
# The scheduling engine (Phase 2) will use these to generate real Task records.

PHASE_TEMPLATES = {
    "residential": [
        {"id": "A", "name": "Preliminaries & Site Setup", "children": ["Site Survey & Setting Out", "Site Clearing & Levelling", "Temporary Facilities", "Water & Power Connection"]},
        {"id": "B", "name": "Substructure / Foundation", "children": ["Excavation to Foundation", "Foundation Concrete & Reinforcement", "Ground Floor Slab", "Damp-proof Course", "Underground Drainage"]},
        {"id": "C", "name": "Superstructure / Walling", "children": ["Blockwork to Window Level", "Lintel & Window Frames", "Blockwork to Ring Beam", "Ring Beam Concrete", "Internal Partition Walls"]},
        {"id": "D", "name": "Roofing", "children": ["Roof Timber & Trusses", "Purlins & Fascia Board", "Iron Sheet / Tile Laying", "Gutters & Downpipes", "Ceiling Installation"]},
        {"id": "E", "name": "Mechanical & Electrical", "children": ["Electrical First Fix", "Plumbing First Fix", "Electrical Second Fix", "Plumbing Second Fix", "Water Tank & Pump"]},
        {"id": "F", "name": "Finishes", "children": ["Internal Plastering", "External Rendering", "Floor Screeding", "Tiling", "Painting (Internal)", "Painting (External)"]},
        {"id": "G", "name": "Doors, Windows & Fittings", "children": ["Door Frames & Doors", "Window Installation", "Kitchen Fittings", "Bathroom Fixtures", "Security Door & Grills"]},
        {"id": "H", "name": "External Works", "children": ["Compound Wall / Fence", "Driveway & Paving", "Landscaping", "External Lighting"]},
        {"id": "I", "name": "Completion & Handover", "children": ["Cleaning & Snagging", "Final Inspection", "Handover & Documentation", "Defects Liability Period"]},
    ],
    "commercial": [
        {"id": "A", "name": "Preliminaries & Mobilisation", "children": ["Site Survey & Geotechnical", "Site Clearing & Demolition", "Temporary Works & Site Offices", "Tower Crane Erection"]},
        {"id": "B", "name": "Substructure", "children": ["Bulk Excavation", "Piling / Deep Foundation", "Pile Caps & Ground Beams", "Basement Slab & Waterproofing", "Basement Walls"]},
        {"id": "C", "name": "Superstructure", "children": ["Structural Columns & Beams", "Floor Slabs (per level)", "Staircase Construction", "Lift Shaft Construction"]},
        {"id": "D", "name": "Building Envelope", "children": ["External Walls / Curtain Wall", "Window & Glazing", "Roof Waterproofing & Insulation"]},
        {"id": "E", "name": "MEP Services", "children": ["HVAC Ductwork & Equipment", "Electrical Distribution", "Plumbing & Fire Protection", "Lift Installation", "BMS & Security Systems"]},
        {"id": "F", "name": "Interior Fit-Out", "children": ["Partitions & Drywalling", "Suspended Ceilings", "Floor Finishes", "Painting & Decoration", "Joinery & Fixtures"]},
        {"id": "G", "name": "External Works", "children": ["Parking Area & Paving", "Landscaping", "External Services & Utilities"]},
        {"id": "H", "name": "Testing & Handover", "children": ["MEP Testing & Commissioning", "Snagging & Defects", "Fire Safety Certs", "Practical Completion"]},
    ],
    "road": [
        {"id": "A", "name": "Pre-Construction", "children": ["Topographical & Geotechnical Survey", "Land Acquisition & Compensation", "Utility Relocation", "Environmental Mitigation"]},
        {"id": "B", "name": "Site Clearance & Earthworks", "children": ["Bush Clearing & Grubbing", "Cut to Fill Operations", "Embankment Formation", "Subgrade Preparation"]},
        {"id": "C", "name": "Drainage & Structures", "children": ["Culvert Construction", "Side Drains & Channels", "Mitre Drains & Scour Checks"]},
        {"id": "D", "name": "Pavement Layers", "children": ["Sub-base (Natural Gravel)", "Base Course (Crushed Stone)", "Prime Coat", "Binder Course (Asphalt)", "Wearing Course (Asphalt)"]},
        {"id": "E", "name": "Road Furniture & Finishes", "children": ["Road Markings", "Road Signs & Delineators", "Guardrails & Safety Barriers", "Street Lighting"]},
        {"id": "F", "name": "Ancillary Works", "children": ["Shoulder Formation & Grassing", "Bus Bays & Parking Areas", "Pedestrian Walkways"]},
        {"id": "G", "name": "Completion", "children": ["Final Inspection & Testing", "Snag Rectification", "As-Built Drawings & Handover"]},
    ],
    "bridge": [
        {"id": "A", "name": "Pre-Construction", "children": ["Hydrological & Geotechnical Study", "Site Access Roads", "River Diversion / Cofferdam"]},
        {"id": "B", "name": "Substructure", "children": ["Piling Works", "Pile Caps", "Abutment Construction", "Pier Construction"]},
        {"id": "C", "name": "Superstructure", "children": ["Bearing Installation", "Girder Fabrication & Launching", "Deck Slab Construction", "Post-tensioning"]},
        {"id": "D", "name": "Bridge Accessories", "children": ["Expansion Joints", "Waterproofing & Drainage", "Parapets & Handrails", "Bridge Deck Surfacing"]},
        {"id": "E", "name": "Approach Roads", "children": ["Approach Embankments", "Approach Slab", "Approach Road Pavement"]},
        {"id": "F", "name": "Testing & Handover", "children": ["Load Testing", "Snagging", "As-Built & Handover"]},
    ],
    "school": [
        {"id": "A", "name": "Preliminaries", "children": ["Site Survey & Setting Out", "Site Clearing", "Temporary Facilities"]},
        {"id": "B", "name": "Substructure", "children": ["Excavation", "Strip Foundation & Columns", "Ground Floor Slab", "Underground Services"]},
        {"id": "C", "name": "Superstructure", "children": ["Walling (Classroom Block 1)", "Walling (Classroom Block 2)", "Ring Beams & Lintels", "Administration Block"]},
        {"id": "D", "name": "Roofing", "children": ["Roof Trusses & Purlins", "Iron Sheet Laying", "Fascia & Gutters"]},
        {"id": "E", "name": "MEP Installations", "children": ["Electrical Wiring", "Plumbing & Sanitation", "IT & Computer Lab Cabling", "Lightning Protection"]},
        {"id": "F", "name": "Finishes", "children": ["Plastering", "Floor Screeding & Tiling", "Painting", "Chalkboard Installation"]},
        {"id": "G", "name": "External & Ancillary", "children": ["Toilet Block", "Rainwater Harvesting Tank", "Compound Fence", "Playground & Landscaping", "School Gate & Signage"]},
        {"id": "H", "name": "Completion", "children": ["Cleaning & Snagging", "Furniture & Equipment", "Final Inspection & Handover"]},
    ],
    "hospital": [
        {"id": "A", "name": "Preliminaries", "children": ["Site Survey & Geotechnical", "Site Preparation & Hoarding", "Temporary Utilities"]},
        {"id": "B", "name": "Substructure", "children": ["Excavation & Piling", "Foundation & Ground Beams", "Ground Floor Slab"]},
        {"id": "C", "name": "Superstructure", "children": ["Structural Frame", "Floor Slabs", "External & Internal Walls", "Staircase & Ramps"]},
        {"id": "D", "name": "Roofing & Envelope", "children": ["Roof Structure & Covering", "Windows & External Doors", "Waterproofing & Insulation"]},
        {"id": "E", "name": "MEP Services (Hospital Grade)", "children": ["Medical Gas Pipeline", "HVAC & Theatre Ventilation", "Electrical & Generator", "Plumbing & Drainage", "Fire Detection & Suppression", "Lift Installation"]},
        {"id": "F", "name": "Interior Fit-Out", "children": ["Plastering & Screeding", "Vinyl & Epoxy Flooring (Clinical)", "Tiling (Non-clinical)", "Antibacterial Painting", "Suspended Ceilings"]},
        {"id": "G", "name": "Specialist Systems", "children": ["Laboratory Fit-Out", "Operating Theatre Fit-Out", "IT & Nurse Call Systems", "Medical Equipment Installation"]},
        {"id": "H", "name": "External & Completion", "children": ["Access Roads & Parking", "Landscaping", "Testing & Commissioning", "Regulatory Inspection & Handover"]},
    ],
}

# Default template for types without a specific template
DEFAULT_PHASE_TEMPLATE = [
    {"id": "A", "name": "Planning & Mobilisation", "children": ["Detailed Survey", "Site Access & Clearing", "Temporary Works"]},
    {"id": "B", "name": "Foundation & Substructure", "children": ["Excavation Works", "Foundation Construction", "Underground Services"]},
    {"id": "C", "name": "Main Structure", "children": ["Primary Structure Phase 1", "Primary Structure Phase 2", "Secondary Elements"]},
    {"id": "D", "name": "Mechanical & Electrical", "children": ["Electrical Systems", "Mechanical Systems", "Process Equipment", "Controls & Instrumentation"]},
    {"id": "E", "name": "Finishes & Fit-Out", "children": ["Internal Finishes", "External Finishes", "Specialist Installations"]},
    {"id": "F", "name": "External Works", "children": ["Roads & Paving", "Fencing & Security", "Landscaping & Drainage"]},
    {"id": "G", "name": "Completion & Handover", "children": ["Testing & Commissioning", "Training & Documentation", "Snagging & Handover"]},
]

DESIGN_PHASE_TEMPLATE = [
    {"id": "D1", "name": "Concept Design", "children": ["Client Brief & Requirements", "Site Analysis & Feasibility", "Concept Drawings & Options"]},
    {"id": "D2", "name": "Detailed Design", "children": ["Structural Engineering Design", "MEP Services Design", "Architectural Drawings", "BOQ Preparation"]},
    {"id": "D3", "name": "Regulatory Approvals", "children": ["Building Permit Application", "Environmental Assessment", "Utility Approvals"]},
]

# Milestone templates by project type
MILESTONE_TEMPLATES = {
    "residential": ["Site Handover", "Foundation Complete", "Walling to Ring Beam", "Roof Structure Complete", "MEP First Fix Complete", "Plastering Complete", "Doors & Windows Installed", "External Works Complete", "Practical Completion"],
    "commercial": ["Site Possession", "Piling Complete", "Structural Frame Topped Out", "Building Watertight", "MEP Rough-In Complete", "Interior Fit-Out Complete", "Occupancy Certificate", "Practical Completion"],
    "road": ["Site Possession", "Right of Way Acquired", "Earthworks Complete", "Drainage Complete", "Sub-base Complete", "Base Course Complete", "Surfacing Complete", "Road Furniture Done", "Substantial Completion"],
    "bridge": ["Site Access Established", "Piling Complete", "Abutments & Piers Complete", "Superstructure Erected", "Deck Slab Complete", "Bridge Deck Surfaced", "Load Test Passed", "Bridge Open to Traffic"],
    "school": ["Site Handover", "Foundation Complete", "Superstructure Complete", "Roof Complete", "MEP Complete", "Finishes Complete", "Furniture & Equipment", "Handover"],
    "hospital": ["Site Handover", "Foundation Complete", "Structural Frame Complete", "Building Watertight", "Medical Gas Installed", "HVAC Operational", "Clinical Finishes Complete", "Medical Equipment Installed", "Practical Completion"],
}

DEFAULT_MILESTONES = ["Mobilisation Complete", "Foundation Complete", "Structure Complete", "MEP Complete", "Finishes Complete", "Testing & Commissioning", "Practical Completion"]

# All workspace modules
ALL_WORKSPACE_MODULES = [
    "overview", "schedule", "budget", "milestones", "gantt", "network", "scurve",
    "risks", "rfis", "changes", "punch", "daily-logs", "safety", "quality", "photos",
    "procurement", "timesheets", "resources", "meetings", "project-reports",
    "documents", "recycle-bin", "chat",
]


def initialize_project(project):
    """
    Run the setup engine for a newly created project.

    Creates ProjectSetupConfig with phase templates, milestone templates,
    design phase flag, and enabled workspace modules.
    """
    ptype = project.project_type
    ctype = project.contract_type

    # Determine if design phases apply
    has_design = ctype in ("design_build", "turnkey", "bot")

    # Get phase templates
    phases = PHASE_TEMPLATES.get(ptype, DEFAULT_PHASE_TEMPLATE)
    if has_design:
        phases = DESIGN_PHASE_TEMPLATE + phases

    # Get milestone templates
    milestones = MILESTONE_TEMPLATES.get(ptype, DEFAULT_MILESTONES)
    if has_design:
        milestones = ["Design Concept Approved", "Detailed Design Complete", "Regulatory Approvals Obtained"] + milestones

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
