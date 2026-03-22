# Siteflo — Stock Templates: Gate & Door Automation

## Trade: Gate & Door Automation

### Relevant UK Standards & Regulations

- **BS EN 12453:2017** — Safety in use of power operated doors and gates. Defines force limits (max 400N crushing, 1400N impact) and safeguarding requirements.
- **BS EN 12445** — Test methods for power operated doors and gates (defines force testing methodology and test positions).
- **BS EN 13241** — Product standard for industrial, commercial and garage doors and gates.
- **BS EN 12604 & 12605** — Mechanical requirements and tests for powered gates.
- **BS EN 12635** — Installation and use of powered gates.
- **BS EN 12978** — Safety devices for power operated doors and gates (safety edges, photocells, etc).
- **Supply of Machinery (Safety) Regulations 2008** — UK implementation of the EU Machinery Directive 2006/42/EC. Automated gates are classified as machines.
- **DHF TS 011** — Door & Hardware Federation Technical Standard / Code of Practice for automated gates and barriers.
- **Health & Safety at Work Act 1974** (Section 3) — Duty of care for owners of automated gates in workplaces and shared premises.
- **PUWER (Provision and Use of Work Equipment Regulations 1998)** — Requires powered machinery in workplaces to be regularly maintained.
- **GateSafe** — Industry awareness scheme for gate safety.

### Service Intervals

- **Domestic (private residence, low usage <12 operations/day):** Annual service + annual force test
- **Commercial (apartments, schools, business premises):** 6-monthly service (PPM) + annual force test
- **High usage commercial:** Quarterly PPM + annual force test
- Force testing required annually AND after any modifications to the system
- Testing must use calibrated equipment compliant with EN 12445 / EN 12453

---

**Template 1: Automated Gate Force Test Report**

The critical annual safety compliance document. Records force measurements at all crush/impact zones to verify the installation meets BS EN 12453 limits. This is the gate equivalent of a CP12.

```json
{
  "name": "Force Test Report (BS EN 12453)",
  "description": "Annual force test record for automated gates, doors and barriers. Measures closing and opening forces at all crush zones to verify compliance with BS EN 12453:2017 (max 400N crushing, 1400N impact). Required annually and after any system modifications.",
  "category": "Safety Testing",
  "pdfConfig": {
    "title": "Automated Gate Force Test Report",
    "showLogo": true,
    "showSignature": true,
    "headerText": "Force Testing to BS EN 12445 / BS EN 12453:2017",
    "footerText": "Force limits: Max 400N crushing, Max 1400N impact. Testing carried out with calibrated equipment. This report should be retained for a minimum of 10 years as part of the technical file.",
    "layout": "single-column"
  },
  "fieldSchema": [
    {
      "id": "section_installation",
      "label": "Installation Details",
      "type": "section-header",
      "required": false,
      "sortOrder": 0
    },
    {
      "id": "gate_type",
      "label": "Gate / Door Type",
      "type": "select",
      "required": true,
      "options": ["Sliding Gate", "Swing Gate (Single)", "Swing Gate (Double/Bi-Parting)", "Cantilever Gate", "Bi-Folding Gate", "Roller Shutter", "Sectional Door", "Barrier", "Bollard", "Other"],
      "sortOrder": 1,
      "group": "Installation Details"
    },
    {
      "id": "gate_make",
      "label": "Gate / Door Manufacturer",
      "type": "text",
      "required": true,
      "placeholder": "e.g. CAME, BFT, Nice, Faac",
      "sortOrder": 2,
      "group": "Installation Details"
    },
    {
      "id": "operator_make",
      "label": "Operator / Motor Make",
      "type": "text",
      "required": true,
      "placeholder": "e.g. CAME BXV, Nice RB600",
      "sortOrder": 3,
      "group": "Installation Details"
    },
    {
      "id": "operator_model",
      "label": "Operator Model / Serial Number",
      "type": "text",
      "required": true,
      "sortOrder": 4,
      "group": "Installation Details"
    },
    {
      "id": "control_panel",
      "label": "Control Panel Make & Model",
      "type": "text",
      "required": true,
      "sortOrder": 5,
      "group": "Installation Details"
    },
    {
      "id": "installation_type",
      "label": "Installation Classification",
      "type": "select",
      "required": true,
      "options": ["Type 1 — Domestic / Low Risk", "Type 2 — Shared Residential (Apartments)", "Type 3 — Commercial / Industrial", "Type 4 — High Security"],
      "sortOrder": 6,
      "group": "Installation Details"
    },
    {
      "id": "usage_estimate",
      "label": "Estimated Daily Operations",
      "type": "select",
      "required": true,
      "options": ["Low (<12 per day)", "Medium (12-50 per day)", "High (50-200 per day)", "Very High (200+ per day)"],
      "sortOrder": 7,
      "group": "Installation Details"
    },
    {
      "id": "section_equipment",
      "label": "Test Equipment",
      "type": "section-header",
      "required": false,
      "sortOrder": 10
    },
    {
      "id": "test_gauge_make",
      "label": "Force Test Gauge Make & Model",
      "type": "text",
      "required": true,
      "placeholder": "e.g. GFA MFDS-1, KMG Lite",
      "sortOrder": 11,
      "group": "Test Equipment"
    },
    {
      "id": "test_gauge_serial",
      "label": "Gauge Serial Number",
      "type": "text",
      "required": true,
      "sortOrder": 12,
      "group": "Test Equipment"
    },
    {
      "id": "calibration_date",
      "label": "Gauge Calibration Date",
      "type": "date",
      "required": true,
      "sortOrder": 13,
      "group": "Test Equipment"
    },
    {
      "id": "calibration_due",
      "label": "Calibration Due Date",
      "type": "date",
      "required": true,
      "sortOrder": 14,
      "group": "Test Equipment"
    },
    {
      "id": "section_force_closing",
      "label": "Force Test Results — Closing",
      "type": "section-header",
      "required": false,
      "sortOrder": 20
    },
    {
      "id": "closing_500mm",
      "label": "Closing Edge — 500mm Height",
      "type": "number",
      "required": true,
      "unit": "N",
      "validation": { "min": 0, "max": 2000 },
      "sortOrder": 21,
      "group": "Force Test — Closing"
    },
    {
      "id": "closing_300mm",
      "label": "Closing Edge — 300mm Height",
      "type": "number",
      "required": true,
      "unit": "N",
      "validation": { "min": 0, "max": 2000 },
      "sortOrder": 22,
      "group": "Force Test — Closing"
    },
    {
      "id": "closing_50mm",
      "label": "Closing Edge — 50mm Height",
      "type": "number",
      "required": true,
      "unit": "N",
      "validation": { "min": 0, "max": 2000 },
      "sortOrder": 23,
      "group": "Force Test — Closing"
    },
    {
      "id": "closing_result",
      "label": "Closing Edge Overall Result",
      "type": "select",
      "required": true,
      "options": ["Pass — All readings within limits", "Fail — Exceeds 400N crushing limit", "Fail — Exceeds 1400N impact limit"],
      "sortOrder": 24,
      "group": "Force Test — Closing"
    },
    {
      "id": "section_force_opening",
      "label": "Force Test Results — Opening (if applicable)",
      "type": "section-header",
      "required": false,
      "sortOrder": 30
    },
    {
      "id": "opening_applicable",
      "label": "Opening Edge Force Test Required?",
      "type": "select",
      "required": true,
      "options": ["Yes — Wall/obstruction within 500mm", "No — Clear space behind gate"],
      "sortOrder": 31,
      "group": "Force Test — Opening"
    },
    {
      "id": "opening_500mm",
      "label": "Opening Edge — 500mm Height",
      "type": "number",
      "required": false,
      "unit": "N",
      "sortOrder": 32,
      "group": "Force Test — Opening"
    },
    {
      "id": "opening_300mm",
      "label": "Opening Edge — 300mm Height",
      "type": "number",
      "required": false,
      "unit": "N",
      "sortOrder": 33,
      "group": "Force Test — Opening"
    },
    {
      "id": "opening_result",
      "label": "Opening Edge Overall Result",
      "type": "select",
      "required": false,
      "options": ["Pass", "Fail", "N/A — Not tested"],
      "sortOrder": 34,
      "group": "Force Test — Opening"
    },
    {
      "id": "section_force_secondary",
      "label": "Secondary Crush Zones",
      "type": "section-header",
      "required": false,
      "sortOrder": 40
    },
    {
      "id": "secondary_between_leaves",
      "label": "Between Gate Leaves (bi-parting only)",
      "type": "number",
      "required": false,
      "unit": "N",
      "sortOrder": 41,
      "group": "Secondary Zones"
    },
    {
      "id": "secondary_post_gap",
      "label": "Gate-to-Post Gap (if applicable)",
      "type": "number",
      "required": false,
      "unit": "N",
      "sortOrder": 42,
      "group": "Secondary Zones"
    },
    {
      "id": "secondary_run_back",
      "label": "Run-Back / Rear Edge (sliding gates)",
      "type": "number",
      "required": false,
      "unit": "N",
      "sortOrder": 43,
      "group": "Secondary Zones"
    },
    {
      "id": "secondary_result",
      "label": "Secondary Zones Overall Result",
      "type": "select",
      "required": true,
      "options": ["Pass", "Fail", "N/A — No secondary zones"],
      "sortOrder": 44,
      "group": "Secondary Zones"
    },
    {
      "id": "section_safety_devices",
      "label": "Safety Device Testing",
      "type": "section-header",
      "required": false,
      "sortOrder": 50
    },
    {
      "id": "safety_edges_fitted",
      "label": "Safety Edges Fitted",
      "type": "select",
      "required": true,
      "options": ["Yes — Closing edge", "Yes — Closing + opening edges", "Yes — All edges", "No — Not fitted"],
      "sortOrder": 51,
      "group": "Safety Devices"
    },
    {
      "id": "safety_edges_tested",
      "label": "Safety Edges Tested — Gate Stops/Reverses on Contact",
      "type": "select",
      "required": true,
      "options": ["Pass — All edges functional", "Fail — Edge(s) not responding", "N/A — None fitted"],
      "sortOrder": 52,
      "group": "Safety Devices"
    },
    {
      "id": "photocells_fitted",
      "label": "Photocells / Beams Fitted",
      "type": "select",
      "required": true,
      "options": ["Yes — Internal only", "Yes — Internal + External", "Yes — Internal + External + Column mounted", "No — Not fitted"],
      "sortOrder": 53,
      "group": "Safety Devices"
    },
    {
      "id": "photocells_tested",
      "label": "Photocells Tested — Gate Stops When Beam Broken",
      "type": "select",
      "required": true,
      "options": ["Pass — All beams functional", "Fail — Beam(s) not responding", "N/A — None fitted"],
      "sortOrder": 54,
      "group": "Safety Devices"
    },
    {
      "id": "test_piece_b",
      "label": "Test Piece B Presented (EN 12978 non-contact detection)",
      "type": "select",
      "required": true,
      "options": ["Pass — Detected at all positions", "Fail — Not detected at one or more positions", "N/A — No non-contact devices fitted"],
      "sortOrder": 55,
      "group": "Safety Devices"
    },
    {
      "id": "emergency_stop",
      "label": "Emergency Stop Tested (if fitted)",
      "type": "select",
      "required": true,
      "options": ["Pass — Immediate stop", "Fail", "N/A — Not fitted"],
      "sortOrder": 56,
      "group": "Safety Devices"
    },
    {
      "id": "manual_release",
      "label": "Manual Release Tested",
      "type": "select",
      "required": true,
      "options": ["Pass — Gate releases and can be moved manually", "Fail — Release mechanism jammed or non-functional"],
      "sortOrder": 57,
      "group": "Safety Devices"
    },
    {
      "id": "section_overall",
      "label": "Overall Assessment",
      "type": "section-header",
      "required": false,
      "sortOrder": 70
    },
    {
      "id": "overall_result",
      "label": "Overall Force Test Result",
      "type": "select",
      "required": true,
      "options": ["Pass — All forces within limits, all safety devices functional", "Conditional Pass — Minor issues noted, remedial work advised", "Fail — Forces exceed limits and/or safety device failure"],
      "sortOrder": 71,
      "group": "Overall"
    },
    {
      "id": "defects_noted",
      "label": "Defects / Observations",
      "type": "textarea",
      "required": false,
      "placeholder": "Note any defects, non-compliances, or areas of concern",
      "sortOrder": 72,
      "group": "Overall"
    },
    {
      "id": "remedial_action",
      "label": "Remedial Action Required",
      "type": "textarea",
      "required": false,
      "placeholder": "Describe any work needed to bring installation into compliance",
      "sortOrder": 73,
      "group": "Overall"
    },
    {
      "id": "gate_condemned",
      "label": "Gate Condemned / Taken Out of Service?",
      "type": "select",
      "required": true,
      "options": ["No — Safe for continued use", "Yes — Gate isolated and locked off", "Yes — Gate set to manual operation only"],
      "sortOrder": 74,
      "group": "Overall"
    },
    {
      "id": "force_test_photo",
      "label": "Photo of Force Test Readings",
      "type": "photo",
      "required": false,
      "sortOrder": 75,
      "group": "Evidence"
    },
    {
      "id": "section_signoff",
      "label": "Engineer Sign-Off",
      "type": "section-header",
      "required": false,
      "sortOrder": 90
    },
    {
      "id": "engineer_company",
      "label": "Company Name",
      "type": "text",
      "required": true,
      "sortOrder": 91,
      "group": "Sign-Off"
    },
    {
      "id": "engineer_qualifications",
      "label": "Qualifications / Accreditations",
      "type": "text",
      "required": false,
      "placeholder": "e.g. GateSafe Aware, DHF Member, CSCS",
      "sortOrder": 92,
      "group": "Sign-Off"
    },
    {
      "id": "test_date",
      "label": "Date of Force Test",
      "type": "date",
      "required": true,
      "sortOrder": 93,
      "group": "Sign-Off"
    },
    {
      "id": "next_test_due",
      "label": "Next Force Test Due",
      "type": "date",
      "required": true,
      "sortOrder": 94,
      "group": "Sign-Off"
    },
    {
      "id": "engineer_sig",
      "label": "Engineer Signature",
      "type": "signature",
      "required": true,
      "sortOrder": 95,
      "group": "Sign-Off"
    }
  ]
}
```

---

**Template 2: Automated Gate Service / PPM Record**

The preventative maintenance record covering all mechanical, electrical, and safety checks performed during a routine service visit.

```json
{
  "name": "Gate Service & Maintenance Record",
  "description": "Planned Preventative Maintenance (PPM) record for automated gates, doors and barriers. Covers mechanical inspection, electrical checks, safety device testing, lubrication, and general condition assessment. Domestic: annual. Commercial: 6-monthly or quarterly.",
  "category": "Service",
  "pdfConfig": {
    "title": "Automated Gate Service Record",
    "showLogo": true,
    "showSignature": true,
    "headerText": "Planned Preventative Maintenance",
    "layout": "single-column"
  },
  "fieldSchema": [
    {
      "id": "section_system",
      "label": "System Details",
      "type": "section-header",
      "required": false,
      "sortOrder": 0
    },
    {
      "id": "gate_type",
      "label": "Gate / Door Type",
      "type": "select",
      "required": true,
      "options": ["Sliding Gate", "Swing Gate (Single)", "Swing Gate (Double)", "Cantilever Gate", "Bi-Folding Gate", "Roller Shutter", "Sectional Door", "Barrier", "Bollard", "Other"],
      "sortOrder": 1,
      "group": "System Details"
    },
    {
      "id": "operator_make_model",
      "label": "Operator Make & Model",
      "type": "text",
      "required": true,
      "placeholder": "e.g. CAME BXV-10, Nice RB600",
      "sortOrder": 2,
      "group": "System Details"
    },
    {
      "id": "control_panel",
      "label": "Control Panel Make & Model",
      "type": "text",
      "required": true,
      "sortOrder": 3,
      "group": "System Details"
    },
    {
      "id": "service_type",
      "label": "Service Type",
      "type": "select",
      "required": true,
      "options": ["Annual Service", "6-Month PPM", "Quarterly PPM", "Reactive / Callout", "Post-Repair Check"],
      "sortOrder": 4,
      "group": "System Details"
    },
    {
      "id": "section_mechanical",
      "label": "Mechanical Inspection",
      "type": "section-header",
      "required": false,
      "sortOrder": 10
    },
    {
      "id": "gate_alignment",
      "label": "Gate Alignment & Level",
      "type": "select",
      "required": true,
      "options": ["Satisfactory", "Minor adjustment made", "Requires attention — see notes"],
      "sortOrder": 11,
      "group": "Mechanical"
    },
    {
      "id": "hinges_condition",
      "label": "Hinges / Pivot Points Condition",
      "type": "select",
      "required": true,
      "options": ["Good — Lubricated", "Worn — Lubricated, monitor", "Defective — Replacement required", "N/A (sliding gate)"],
      "sortOrder": 12,
      "group": "Mechanical"
    },
    {
      "id": "rollers_track",
      "label": "Rollers / Track Condition (sliding gates)",
      "type": "select",
      "required": true,
      "options": ["Good — Clean and lubricated", "Debris cleared, lubricated", "Worn — Replacement advised", "N/A (swing gate)"],
      "sortOrder": 13,
      "group": "Mechanical"
    },
    {
      "id": "gate_stops",
      "label": "Gate Stops / End Limits",
      "type": "select",
      "required": true,
      "options": ["Secure and correctly positioned", "Adjusted", "Damaged — Replaced", "Damaged — Replacement required"],
      "sortOrder": 14,
      "group": "Mechanical"
    },
    {
      "id": "fixings_bolts",
      "label": "Fixings, Bolts & Brackets",
      "type": "select",
      "required": true,
      "options": ["All secure", "Tightened where needed", "Missing / damaged — replaced", "Missing / damaged — replacement required"],
      "sortOrder": 15,
      "group": "Mechanical"
    },
    {
      "id": "motor_fixings",
      "label": "Motor / Operator Fixings & Base",
      "type": "select",
      "required": true,
      "options": ["Secure — No movement", "Tightened", "Concrete base deterioration noted", "Requires repair"],
      "sortOrder": 16,
      "group": "Mechanical"
    },
    {
      "id": "structural_condition",
      "label": "Gate Structure (rust, corrosion, damage)",
      "type": "select",
      "required": true,
      "options": ["Good — No issues", "Minor surface rust / cosmetic damage", "Structural concern — see notes", "Posts / foundations — concern noted"],
      "sortOrder": 17,
      "group": "Mechanical"
    },
    {
      "id": "lubrication_completed",
      "label": "All Moving Parts Lubricated",
      "type": "boolean",
      "required": true,
      "sortOrder": 18,
      "group": "Mechanical"
    },
    {
      "id": "section_electrical",
      "label": "Electrical Checks",
      "type": "section-header",
      "required": false,
      "sortOrder": 20
    },
    {
      "id": "motor_operation",
      "label": "Motor / Operator Function",
      "type": "select",
      "required": true,
      "options": ["Running smoothly — no excess noise", "Noisy — adjustment made", "Laboured — investigation required", "Not operational — see notes"],
      "sortOrder": 21,
      "group": "Electrical"
    },
    {
      "id": "limit_switches",
      "label": "Limit Switches / Encoder",
      "type": "select",
      "required": true,
      "options": ["Correct — Gate stops at set positions", "Adjusted", "Defective — Replacement required"],
      "sortOrder": 22,
      "group": "Electrical"
    },
    {
      "id": "wiring_connections",
      "label": "Wiring & Cable Connections",
      "type": "select",
      "required": true,
      "options": ["All secure — no damage visible", "Connections tightened", "Cable damage noted — see notes", "Pest / water damage found"],
      "sortOrder": 23,
      "group": "Electrical"
    },
    {
      "id": "control_panel_condition",
      "label": "Control Panel Condition",
      "type": "select",
      "required": true,
      "options": ["Good — Dry, clean, no damage", "Moisture ingress noted", "Pest ingress noted", "Damage — see notes"],
      "sortOrder": 24,
      "group": "Electrical"
    },
    {
      "id": "battery_backup",
      "label": "Battery Backup (if fitted)",
      "type": "select",
      "required": true,
      "options": ["Tested OK — Holding charge", "Weak — Replacement advised", "Dead — Replaced", "Dead — Replacement required", "N/A — Not fitted"],
      "sortOrder": 25,
      "group": "Electrical"
    },
    {
      "id": "section_safety",
      "label": "Safety Device Checks",
      "type": "section-header",
      "required": false,
      "sortOrder": 30
    },
    {
      "id": "safety_edges_condition",
      "label": "Safety Edges — Physical Condition",
      "type": "select",
      "required": true,
      "options": ["Good — Secure, no damage", "Rubber splitting / punctured — replacement required", "Loose — re-secured", "N/A — Not fitted"],
      "sortOrder": 31,
      "group": "Safety Devices"
    },
    {
      "id": "safety_edges_function",
      "label": "Safety Edges — Functional Test",
      "type": "select",
      "required": true,
      "options": ["Pass — Gate stops/reverses on contact", "Fail — No response on one or more edges", "N/A — Not fitted"],
      "sortOrder": 32,
      "group": "Safety Devices"
    },
    {
      "id": "photocells_condition",
      "label": "Photocells — Cleaned & Aligned",
      "type": "select",
      "required": true,
      "options": ["Good — Cleaned and tested OK", "Dirty — Cleaned, now OK", "Misaligned — Realigned", "Defective — Replacement required", "N/A — Not fitted"],
      "sortOrder": 33,
      "group": "Safety Devices"
    },
    {
      "id": "photocells_function",
      "label": "Photocells — Functional Test (beam break stops gate)",
      "type": "select",
      "required": true,
      "options": ["Pass", "Fail", "N/A — Not fitted"],
      "sortOrder": 34,
      "group": "Safety Devices"
    },
    {
      "id": "manual_release_test",
      "label": "Manual Release Mechanism",
      "type": "select",
      "required": true,
      "options": ["Tested OK — Releases smoothly", "Stiff — Lubricated", "Jammed — Repaired", "Jammed — Repair required"],
      "sortOrder": 35,
      "group": "Safety Devices"
    },
    {
      "id": "emergency_stop_test",
      "label": "Emergency Stop (if fitted)",
      "type": "select",
      "required": true,
      "options": ["Tested OK", "Fail", "N/A — Not fitted"],
      "sortOrder": 36,
      "group": "Safety Devices"
    },
    {
      "id": "warning_signs",
      "label": "Warning Signs / Labels Present",
      "type": "select",
      "required": true,
      "options": ["All present and legible", "Missing — Replaced", "Missing — Replacement required", "Faded — Replacement advised"],
      "sortOrder": 37,
      "group": "Safety Devices"
    },
    {
      "id": "section_access",
      "label": "Access Control",
      "type": "section-header",
      "required": false,
      "sortOrder": 40
    },
    {
      "id": "intercom_tested",
      "label": "Intercom / Entry Phone",
      "type": "select",
      "required": true,
      "options": ["Tested OK", "Audio issue — see notes", "Video issue — see notes", "Not functional — see notes", "N/A — Not fitted"],
      "sortOrder": 41,
      "group": "Access Control"
    },
    {
      "id": "keypad_tested",
      "label": "Keypad / Key Switch / Push Button",
      "type": "select",
      "required": true,
      "options": ["Tested OK", "Intermittent — see notes", "Not functional — see notes", "N/A — Not fitted"],
      "sortOrder": 42,
      "group": "Access Control"
    },
    {
      "id": "remote_controls",
      "label": "Remote Controls",
      "type": "select",
      "required": true,
      "options": ["Tested OK", "Weak signal — batteries replaced", "Not functional — see notes", "N/A — Not used"],
      "sortOrder": 43,
      "group": "Access Control"
    },
    {
      "id": "loop_detector",
      "label": "Loop Detector / Exit Sensor",
      "type": "select",
      "required": true,
      "options": ["Tested OK", "Sensitivity adjusted", "Not detecting — see notes", "N/A — Not fitted"],
      "sortOrder": 44,
      "group": "Access Control"
    },
    {
      "id": "section_overall",
      "label": "Overall Assessment & Recommendations",
      "type": "section-header",
      "required": false,
      "sortOrder": 60
    },
    {
      "id": "overall_condition",
      "label": "Overall System Condition",
      "type": "select",
      "required": true,
      "options": ["Good — No issues", "Satisfactory — Minor items noted", "Attention Required — See recommendations", "Unsafe — Gate isolated / condemned"],
      "sortOrder": 61,
      "group": "Overall"
    },
    {
      "id": "compliant_current_standards",
      "label": "Compliant with Current Standards (BS EN 12453, DHF TS 011)?",
      "type": "select",
      "required": true,
      "options": ["Yes — Fully compliant", "Partially — Upgrades recommended", "No — Safety upgrade required", "No — Gate condemned"],
      "sortOrder": 62,
      "group": "Overall"
    },
    {
      "id": "recommendations",
      "label": "Recommendations / Work Required",
      "type": "textarea",
      "required": false,
      "placeholder": "Detail any recommended repairs, upgrades, or safety improvements",
      "sortOrder": 63,
      "group": "Overall"
    },
    {
      "id": "parts_required",
      "label": "Parts Required (if any)",
      "type": "textarea",
      "required": false,
      "placeholder": "List any parts needed for recommended work",
      "sortOrder": 64,
      "group": "Overall"
    },
    {
      "id": "service_photos",
      "label": "Service Photos",
      "type": "photo",
      "required": false,
      "sortOrder": 65,
      "group": "Evidence"
    },
    {
      "id": "section_signoff",
      "label": "Engineer Sign-Off",
      "type": "section-header",
      "required": false,
      "sortOrder": 90
    },
    {
      "id": "service_date",
      "label": "Date of Service",
      "type": "date",
      "required": true,
      "sortOrder": 91,
      "group": "Sign-Off"
    },
    {
      "id": "next_service_due",
      "label": "Next Service Due",
      "type": "date",
      "required": true,
      "sortOrder": 92,
      "group": "Sign-Off"
    },
    {
      "id": "engineer_sig",
      "label": "Engineer Signature",
      "type": "signature",
      "required": true,
      "sortOrder": 93,
      "group": "Sign-Off"
    },
    {
      "id": "customer_sig",
      "label": "Customer / Site Representative Signature",
      "type": "signature",
      "required": false,
      "sortOrder": 94,
      "group": "Sign-Off"
    }
  ]
}
```

---

**Template 3: Installation Commissioning Record**

Required by the Machinery Directive when a new automated gate is installed or an existing system is significantly modified. Forms part of the technical file.

```json
{
  "name": "Installation & Commissioning Record",
  "description": "Commissioning document for new or modified automated gate installations. Required under the Supply of Machinery (Safety) Regulations 2008 as part of the technical file. Records that the system has been tested, is safe for use, and meets BS EN 12453 requirements.",
  "category": "Commissioning",
  "pdfConfig": {
    "title": "Automated Gate Commissioning Record",
    "showLogo": true,
    "showSignature": true,
    "headerText": "Supply of Machinery (Safety) Regulations 2008 — Commissioning Document",
    "footerText": "This document forms part of the technical file and must be retained for a minimum of 10 years by the responsible person.",
    "layout": "single-column"
  },
  "fieldSchema": [
    {
      "id": "section_install",
      "label": "Installation Details",
      "type": "section-header",
      "required": false,
      "sortOrder": 0
    },
    {
      "id": "install_type",
      "label": "Type of Work",
      "type": "select",
      "required": true,
      "options": ["New Installation", "Major Modification / Upgrade", "Safety Upgrade", "Replacement Operator / Motor", "Replacement Control Panel"],
      "sortOrder": 1,
      "group": "Installation"
    },
    {
      "id": "gate_type",
      "label": "Gate / Door Type",
      "type": "select",
      "required": true,
      "options": ["Sliding Gate", "Swing Gate (Single)", "Swing Gate (Double)", "Cantilever Gate", "Bi-Folding Gate", "Roller Shutter", "Sectional Door", "Barrier", "Bollard", "Other"],
      "sortOrder": 2,
      "group": "Installation"
    },
    {
      "id": "gate_material",
      "label": "Gate Material",
      "type": "select",
      "required": true,
      "options": ["Steel", "Aluminium", "Timber", "Composite", "Wrought Iron", "PVC / Vinyl", "Other"],
      "sortOrder": 3,
      "group": "Installation"
    },
    {
      "id": "gate_dimensions",
      "label": "Gate Dimensions (Width x Height)",
      "type": "text",
      "required": true,
      "placeholder": "e.g. 4000mm x 1800mm",
      "sortOrder": 4,
      "group": "Installation"
    },
    {
      "id": "gate_weight",
      "label": "Estimated Gate Weight",
      "type": "number",
      "required": false,
      "unit": "kg",
      "sortOrder": 5,
      "group": "Installation"
    },
    {
      "id": "operator_make_model",
      "label": "Operator Make & Model",
      "type": "text",
      "required": true,
      "sortOrder": 6,
      "group": "Installation"
    },
    {
      "id": "operator_serial",
      "label": "Operator Serial Number",
      "type": "text",
      "required": true,
      "sortOrder": 7,
      "group": "Installation"
    },
    {
      "id": "control_panel_details",
      "label": "Control Panel Make, Model & Software Version",
      "type": "text",
      "required": true,
      "sortOrder": 8,
      "group": "Installation"
    },
    {
      "id": "installation_class",
      "label": "Installation Classification",
      "type": "select",
      "required": true,
      "options": ["Type 1 — Domestic / Low Risk", "Type 2 — Shared Residential", "Type 3 — Commercial / Industrial", "Type 4 — High Security"],
      "sortOrder": 9,
      "group": "Installation"
    },
    {
      "id": "section_safety_installed",
      "label": "Safety Measures Installed",
      "type": "section-header",
      "required": false,
      "sortOrder": 20
    },
    {
      "id": "safety_edges_type",
      "label": "Safety Edges — Type & Locations",
      "type": "text",
      "required": true,
      "placeholder": "e.g. Resistive 8k2 on closing edge, optical on top edge",
      "sortOrder": 21,
      "group": "Safety Measures"
    },
    {
      "id": "photocell_details",
      "label": "Photocells — Type & Positions",
      "type": "text",
      "required": true,
      "placeholder": "e.g. Internal pair at 500mm, external pair at 500mm",
      "sortOrder": 22,
      "group": "Safety Measures"
    },
    {
      "id": "other_safety_devices",
      "label": "Other Safety Devices",
      "type": "textarea",
      "required": false,
      "placeholder": "e.g. Light curtain, laser scanner, wicket gate switch, flashing light, audible warning",
      "sortOrder": 23,
      "group": "Safety Measures"
    },
    {
      "id": "emergency_stop_fitted",
      "label": "Emergency Stop Fitted",
      "type": "select",
      "required": true,
      "options": ["Yes — Location noted", "No — Not required (Type 1)", "No — Required but not fitted"],
      "sortOrder": 24,
      "group": "Safety Measures"
    },
    {
      "id": "manual_release_type",
      "label": "Manual Release Type",
      "type": "select",
      "required": true,
      "options": ["Key release (external)", "Handle release (internal)", "Key + handle", "Lever / clutch on motor"],
      "sortOrder": 25,
      "group": "Safety Measures"
    },
    {
      "id": "warning_signs_fitted",
      "label": "Warning Signs Fitted",
      "type": "boolean",
      "required": true,
      "sortOrder": 26,
      "group": "Safety Measures"
    },
    {
      "id": "section_risk",
      "label": "Risk Assessment",
      "type": "section-header",
      "required": false,
      "sortOrder": 30
    },
    {
      "id": "risk_assessment_completed",
      "label": "Site-Specific Risk Assessment Completed",
      "type": "boolean",
      "required": true,
      "sortOrder": 31,
      "group": "Risk Assessment"
    },
    {
      "id": "hazards_identified",
      "label": "Key Hazards Identified & Mitigated",
      "type": "textarea",
      "required": true,
      "placeholder": "e.g. Crushing at closing edge — mitigated by safety edge + photocells. Shearing at hinge post — mitigated by finger trap guard.",
      "sortOrder": 32,
      "group": "Risk Assessment"
    },
    {
      "id": "pedestrian_access",
      "label": "Shared Pedestrian Access?",
      "type": "select",
      "required": true,
      "options": ["No — Vehicle only", "Yes — Separate pedestrian gate provided", "Yes — Shared gate with additional safeguards", "Yes — Shared gate, safeguards insufficient (see notes)"],
      "sortOrder": 33,
      "group": "Risk Assessment"
    },
    {
      "id": "section_testing",
      "label": "Commissioning Tests",
      "type": "section-header",
      "required": false,
      "sortOrder": 40
    },
    {
      "id": "force_test_completed",
      "label": "Force Test Completed (BS EN 12445)",
      "type": "boolean",
      "required": true,
      "sortOrder": 41,
      "group": "Commissioning Tests"
    },
    {
      "id": "force_test_result",
      "label": "Force Test Result",
      "type": "select",
      "required": true,
      "options": ["Pass — All within limits", "Fail — Adjustments made, re-tested pass", "Fail — Requires further work"],
      "sortOrder": 42,
      "group": "Commissioning Tests"
    },
    {
      "id": "all_safety_devices_tested",
      "label": "All Safety Devices Tested & Functional",
      "type": "boolean",
      "required": true,
      "sortOrder": 43,
      "group": "Commissioning Tests"
    },
    {
      "id": "gate_operation_cycles",
      "label": "Gate Cycled Through Full Operation (open/close/stop/reverse)",
      "type": "boolean",
      "required": true,
      "sortOrder": 44,
      "group": "Commissioning Tests"
    },
    {
      "id": "electrical_test",
      "label": "Electrical Installation Tested (earth continuity, insulation resistance)",
      "type": "select",
      "required": true,
      "options": ["Tested — Satisfactory", "Tested — Issues found and remedied", "Not tested — see notes"],
      "sortOrder": 45,
      "group": "Commissioning Tests"
    },
    {
      "id": "section_documentation",
      "label": "Documentation Provided to Client",
      "type": "section-header",
      "required": false,
      "sortOrder": 50
    },
    {
      "id": "doc_declaration_conformity",
      "label": "Declaration of Conformity Provided",
      "type": "boolean",
      "required": true,
      "sortOrder": 51,
      "group": "Documentation"
    },
    {
      "id": "doc_user_instructions",
      "label": "User Instructions Provided",
      "type": "boolean",
      "required": true,
      "sortOrder": 52,
      "group": "Documentation"
    },
    {
      "id": "doc_maintenance_schedule",
      "label": "Maintenance Schedule Provided",
      "type": "boolean",
      "required": true,
      "sortOrder": 53,
      "group": "Documentation"
    },
    {
      "id": "doc_risk_assessment",
      "label": "Risk Assessment Copy Provided",
      "type": "boolean",
      "required": true,
      "sortOrder": 54,
      "group": "Documentation"
    },
    {
      "id": "doc_force_test_report",
      "label": "Force Test Report Provided",
      "type": "boolean",
      "required": true,
      "sortOrder": 55,
      "group": "Documentation"
    },
    {
      "id": "installation_photos",
      "label": "Installation Photos",
      "type": "photo",
      "required": false,
      "sortOrder": 56,
      "group": "Evidence"
    },
    {
      "id": "section_signoff",
      "label": "Sign-Off",
      "type": "section-header",
      "required": false,
      "sortOrder": 90
    },
    {
      "id": "commission_date",
      "label": "Date of Commissioning",
      "type": "date",
      "required": true,
      "sortOrder": 91,
      "group": "Sign-Off"
    },
    {
      "id": "next_service_due",
      "label": "First Service Due",
      "type": "date",
      "required": true,
      "sortOrder": 92,
      "group": "Sign-Off"
    },
    {
      "id": "engineer_sig",
      "label": "Engineer / Installer Signature",
      "type": "signature",
      "required": true,
      "sortOrder": 93,
      "group": "Sign-Off"
    },
    {
      "id": "customer_sig",
      "label": "Owner / Responsible Person Signature",
      "type": "signature",
      "required": true,
      "sortOrder": 94,
      "group": "Sign-Off"
    },
    {
      "id": "customer_demo_confirmed",
      "label": "Customer Confirms: Demonstration of operation, manual release, and safety features received",
      "type": "boolean",
      "required": true,
      "sortOrder": 95,
      "group": "Sign-Off"
    }
  ]
}
```

---

**Template 4: Gate Safety Defect / Condemnation Notice**

Issued when an engineer finds an unsafe gate that must be taken out of service.

```json
{
  "name": "Gate Safety Defect Notice",
  "description": "Issued when an automated gate is found to be unsafe during servicing or inspection. Records the defect, risk classification, action taken (isolation/condemnation), and notification to the responsible person. Per HSE, GateSafe, and DHF guidance.",
  "category": "Safety Notice",
  "pdfConfig": {
    "title": "Gate Safety Defect / Condemnation Notice",
    "showLogo": true,
    "showSignature": true,
    "headerText": "IMPORTANT SAFETY NOTICE",
    "footerText": "Liability rests with the last person to service/inspect the gate system. This notice should be retained as part of the gate's technical file.",
    "layout": "single-column"
  },
  "fieldSchema": [
    {
      "id": "severity",
      "label": "Defect Severity",
      "type": "select",
      "required": true,
      "options": ["Critical — Immediate risk of injury, gate condemned", "Major — Significant safety concern, gate isolated", "Minor — Reduced safety, remedial work required within 28 days"],
      "sortOrder": 1,
      "group": "Defect"
    },
    {
      "id": "gate_type",
      "label": "Gate / Door Type",
      "type": "text",
      "required": true,
      "sortOrder": 2,
      "group": "Defect"
    },
    {
      "id": "defect_description",
      "label": "Description of Defect / Unsafe Condition",
      "type": "textarea",
      "required": true,
      "placeholder": "Describe the defect and the risk it presents",
      "sortOrder": 3,
      "group": "Defect"
    },
    {
      "id": "hazard_type",
      "label": "Hazard Type",
      "type": "select",
      "required": true,
      "options": ["Crushing", "Shearing", "Impact", "Drawing-in / Trapping", "Entanglement", "Electrical", "Structural failure risk", "Control system failure", "Multiple hazards"],
      "sortOrder": 4,
      "group": "Defect"
    },
    {
      "id": "action_taken",
      "label": "Action Taken",
      "type": "select",
      "required": true,
      "options": [
        "Gate power isolated and locked off",
        "Gate set to manual operation only",
        "Gate secured in open position",
        "Gate secured in closed position",
        "Safety device disabled — gate isolated",
        "Defect remedied on site"
      ],
      "sortOrder": 5,
      "group": "Action"
    },
    {
      "id": "action_notes",
      "label": "Additional Notes on Action Taken",
      "type": "textarea",
      "required": false,
      "sortOrder": 6,
      "group": "Action"
    },
    {
      "id": "responsible_person_informed",
      "label": "Responsible Person Informed",
      "type": "boolean",
      "required": true,
      "sortOrder": 7,
      "group": "Notification"
    },
    {
      "id": "responsible_person_name",
      "label": "Name of Responsible Person Informed",
      "type": "text",
      "required": true,
      "sortOrder": 8,
      "group": "Notification"
    },
    {
      "id": "notification_method",
      "label": "How Were They Notified",
      "type": "select",
      "required": true,
      "options": ["In person on site", "By phone", "By email", "Written notice left on site"],
      "sortOrder": 9,
      "group": "Notification"
    },
    {
      "id": "gate_not_to_be_used",
      "label": "Gate Owner Advised: Gate Must Not Be Used Until Repaired",
      "type": "boolean",
      "required": true,
      "sortOrder": 10,
      "group": "Notification"
    },
    {
      "id": "defect_photo",
      "label": "Photo of Defect / Unsafe Condition",
      "type": "photo",
      "required": false,
      "sortOrder": 11,
      "group": "Evidence"
    },
    {
      "id": "condemnation_label",
      "label": "Condemnation Label / Warning Sign Attached",
      "type": "boolean",
      "required": true,
      "sortOrder": 12,
      "group": "Evidence"
    },
    {
      "id": "notice_date",
      "label": "Date",
      "type": "date",
      "required": true,
      "sortOrder": 90,
      "group": "Sign-Off"
    },
    {
      "id": "engineer_sig",
      "label": "Engineer Signature",
      "type": "signature",
      "required": true,
      "sortOrder": 91,
      "group": "Sign-Off"
    },
    {
      "id": "customer_sig",
      "label": "Responsible Person Signature (acknowledging notice)",
      "type": "signature",
      "required": false,
      "sortOrder": 92,
      "group": "Sign-Off"
    }
  ]
}
```

---

### Default Parts Library for Gate & Door Automation

```json
[
  { "name": "Annual Gate Service", "type": "labour", "unitPrice": 15000, "unit": "each", "category": "Service" },
  { "name": "6-Month PPM Service", "type": "labour", "unitPrice": 12000, "unit": "each", "category": "Service" },
  { "name": "Annual Force Test", "type": "labour", "unitPrice": 17500, "unit": "each", "category": "Testing" },
  { "name": "Callout / Diagnostic Fee", "type": "labour", "unitPrice": 8500, "unit": "each", "category": "Labour" },
  { "name": "Labour — Per Hour", "type": "labour", "unitPrice": 5500, "unit": "hour", "category": "Labour" },
  { "name": "Safety Edge — Resistive (per metre)", "type": "part", "unitPrice": 4500, "unit": "metre", "category": "Safety" },
  { "name": "Safety Edge — Optical (per metre)", "type": "part", "unitPrice": 7500, "unit": "metre", "category": "Safety" },
  { "name": "Photocell Pair", "type": "part", "unitPrice": 6500, "unit": "each", "category": "Safety" },
  { "name": "Flashing Warning Light", "type": "part", "unitPrice": 3500, "unit": "each", "category": "Safety" },
  { "name": "Remote Control Handset", "type": "part", "unitPrice": 3000, "unit": "each", "category": "Access Control" },
  { "name": "Digital Keypad", "type": "part", "unitPrice": 8500, "unit": "each", "category": "Access Control" },
  { "name": "Battery Backup Unit", "type": "part", "unitPrice": 12000, "unit": "each", "category": "Electrical" },
  { "name": "Control Board Replacement", "type": "part", "unitPrice": 25000, "unit": "each", "category": "Electrical" },
  { "name": "Sliding Gate Motor (domestic)", "type": "part", "unitPrice": 35000, "unit": "each", "category": "Motors" },
  { "name": "Swing Gate Arm Operator (domestic)", "type": "part", "unitPrice": 28000, "unit": "each", "category": "Motors" },
  { "name": "Guide Roller Set", "type": "part", "unitPrice": 4500, "unit": "each", "category": "Mechanical" },
  { "name": "Gate Wheel / Carriage (sliding)", "type": "part", "unitPrice": 8000, "unit": "each", "category": "Mechanical" },
  { "name": "Warning Sign — Automated Gate", "type": "part", "unitPrice": 1500, "unit": "each", "category": "Safety" }
]
```

---

## Claude Code Prompt

```
Read the gate automation stock templates document. Add gate/door automation 
as a second trade option in the onboarding wizard.

1. Create src/lib/seed/gate-automation.ts containing:
   - 4 template definitions (Force Test Report, Service/PPM Record, 
     Installation Commissioning Record, Safety Defect Notice)
   - 18 default parts/labour items
   - Use the exact field schemas from the document

2. Update the onboarding wizard Step 1 to enable "Gate & Door Automation" 
   as a selectable trade (alongside Plumbing & Gas). 
   When selected, seed the gate automation templates and parts library.

3. Keep all other trades as "Coming Soon" for now.

The templates reference real UK standards (BS EN 12453, DHF TS 011, 
Machinery Directive). Field schemas include force test readings at 
specific heights (500mm, 300mm, 50mm), safety device testing 
(edges, photocells, test piece B), risk assessment recording, and 
full commissioning documentation.
```
