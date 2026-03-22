# Siteflo — Stock Templates & Onboarding

## Prompt for Claude Code

This document contains two features to implement:
1. Stock industry templates seeded during onboarding
2. A guided onboarding wizard for new users

---

## 1. Trade Categories & Stock Templates

When a new user registers, they go through an onboarding wizard that asks them to pick their trade. Based on their selection, the system seeds their account with relevant service templates.

### Trade: Plumbing & Gas

**Template 1: Gas Safety Record (CP12 / LGSR)**

This is the legally required annual inspection record for rental properties. It must contain specific fields per HSE regulations. Engineers typically inspect 1-3 appliances per property.

```json
{
  "name": "Gas Safety Record (CP12)",
  "description": "Landlord Gas Safety Record — annual inspection required by law for all rental properties with gas appliances. Valid for 12 months.",
  "category": "Inspection",
  "pdfConfig": {
    "title": "Landlord Gas Safety Record",
    "showLogo": true,
    "showSignature": true,
    "headerText": "Gas Safety (Installation and Use) Regulations 1998",
    "footerText": "This record must be kept for at least 2 years. A copy must be provided to tenants within 28 days.",
    "layout": "single-column"
  },
  "fieldSchema": [
    {
      "id": "section_property",
      "label": "Property & Landlord Details",
      "type": "section-header",
      "required": false,
      "sortOrder": 0
    },
    {
      "id": "landlord_name",
      "label": "Landlord / Agent Name",
      "type": "text",
      "required": true,
      "placeholder": "Enter landlord or letting agent name",
      "sortOrder": 1,
      "group": "Property Details"
    },
    {
      "id": "landlord_address",
      "label": "Landlord / Agent Address",
      "type": "textarea",
      "required": true,
      "sortOrder": 2,
      "group": "Property Details"
    },
    {
      "id": "num_appliances",
      "label": "Number of Appliances Inspected",
      "type": "number",
      "required": true,
      "validation": { "min": 1, "max": 20 },
      "sortOrder": 3,
      "group": "Property Details"
    },
    {
      "id": "section_appliance_1",
      "label": "Appliance 1",
      "type": "section-header",
      "required": false,
      "sortOrder": 10
    },
    {
      "id": "app1_location",
      "label": "Location",
      "type": "text",
      "required": true,
      "placeholder": "e.g. Kitchen, Utility Room",
      "sortOrder": 11,
      "group": "Appliance 1"
    },
    {
      "id": "app1_type",
      "label": "Appliance Type",
      "type": "select",
      "required": true,
      "options": ["Boiler", "Cooker", "Gas Fire", "Gas Hob", "Water Heater", "Warm Air Unit", "Other"],
      "sortOrder": 12,
      "group": "Appliance 1"
    },
    {
      "id": "app1_make",
      "label": "Make",
      "type": "text",
      "required": true,
      "placeholder": "e.g. Worcester Bosch",
      "sortOrder": 13,
      "group": "Appliance 1"
    },
    {
      "id": "app1_model",
      "label": "Model",
      "type": "text",
      "required": true,
      "placeholder": "e.g. Greenstar 4000",
      "sortOrder": 14,
      "group": "Appliance 1"
    },
    {
      "id": "app1_flue_type",
      "label": "Flue Type",
      "type": "select",
      "required": true,
      "options": ["Open Flue", "Room Sealed", "Flueless", "N/A"],
      "sortOrder": 15,
      "group": "Appliance 1"
    },
    {
      "id": "app1_operating_pressure",
      "label": "Operating Pressure",
      "type": "number",
      "required": true,
      "unit": "mbar",
      "sortOrder": 16,
      "group": "Appliance 1"
    },
    {
      "id": "app1_gas_rate",
      "label": "Gas Rate",
      "type": "number",
      "required": false,
      "unit": "kW",
      "sortOrder": 17,
      "group": "Appliance 1"
    },
    {
      "id": "app1_safety_device_correct",
      "label": "Safety Device Operation Correct",
      "type": "boolean",
      "required": true,
      "sortOrder": 18,
      "group": "Appliance 1"
    },
    {
      "id": "app1_ventilation_satisfactory",
      "label": "Ventilation Satisfactory",
      "type": "boolean",
      "required": true,
      "sortOrder": 19,
      "group": "Appliance 1"
    },
    {
      "id": "app1_visual_condition",
      "label": "Visual Condition of Flue / Chimney",
      "type": "select",
      "required": true,
      "options": ["Satisfactory", "Not Satisfactory", "N/A"],
      "sortOrder": 20,
      "group": "Appliance 1"
    },
    {
      "id": "app1_flue_performance",
      "label": "Flue Performance Checks (Spillage / Flow)",
      "type": "select",
      "required": true,
      "options": ["Pass", "Fail", "N/A"],
      "sortOrder": 21,
      "group": "Appliance 1"
    },
    {
      "id": "app1_safe_to_use",
      "label": "Appliance Safe to Use",
      "type": "select",
      "required": true,
      "options": ["Yes", "No — At Risk (AR)", "No — Immediately Dangerous (ID)", "No — Not to Current Standards (NCS)"],
      "sortOrder": 22,
      "group": "Appliance 1"
    },
    {
      "id": "section_appliance_2",
      "label": "Appliance 2 (if applicable)",
      "type": "section-header",
      "required": false,
      "sortOrder": 30
    },
    {
      "id": "app2_location",
      "label": "Location",
      "type": "text",
      "required": false,
      "placeholder": "e.g. Living Room",
      "sortOrder": 31,
      "group": "Appliance 2"
    },
    {
      "id": "app2_type",
      "label": "Appliance Type",
      "type": "select",
      "required": false,
      "options": ["Boiler", "Cooker", "Gas Fire", "Gas Hob", "Water Heater", "Warm Air Unit", "Other"],
      "sortOrder": 32,
      "group": "Appliance 2"
    },
    {
      "id": "app2_make",
      "label": "Make",
      "type": "text",
      "required": false,
      "sortOrder": 33,
      "group": "Appliance 2"
    },
    {
      "id": "app2_model",
      "label": "Model",
      "type": "text",
      "required": false,
      "sortOrder": 34,
      "group": "Appliance 2"
    },
    {
      "id": "app2_flue_type",
      "label": "Flue Type",
      "type": "select",
      "required": false,
      "options": ["Open Flue", "Room Sealed", "Flueless", "N/A"],
      "sortOrder": 35,
      "group": "Appliance 2"
    },
    {
      "id": "app2_operating_pressure",
      "label": "Operating Pressure",
      "type": "number",
      "required": false,
      "unit": "mbar",
      "sortOrder": 36,
      "group": "Appliance 2"
    },
    {
      "id": "app2_safety_device_correct",
      "label": "Safety Device Operation Correct",
      "type": "boolean",
      "required": false,
      "sortOrder": 37,
      "group": "Appliance 2"
    },
    {
      "id": "app2_ventilation_satisfactory",
      "label": "Ventilation Satisfactory",
      "type": "boolean",
      "required": false,
      "sortOrder": 38,
      "group": "Appliance 2"
    },
    {
      "id": "app2_visual_condition",
      "label": "Visual Condition of Flue / Chimney",
      "type": "select",
      "required": false,
      "options": ["Satisfactory", "Not Satisfactory", "N/A"],
      "sortOrder": 39,
      "group": "Appliance 2"
    },
    {
      "id": "app2_flue_performance",
      "label": "Flue Performance Checks",
      "type": "select",
      "required": false,
      "options": ["Pass", "Fail", "N/A"],
      "sortOrder": 40,
      "group": "Appliance 2"
    },
    {
      "id": "app2_safe_to_use",
      "label": "Appliance Safe to Use",
      "type": "select",
      "required": false,
      "options": ["Yes", "No — At Risk (AR)", "No — Immediately Dangerous (ID)", "No — Not to Current Standards (NCS)"],
      "sortOrder": 41,
      "group": "Appliance 2"
    },
    {
      "id": "section_gas_meter",
      "label": "Gas Installation",
      "type": "section-header",
      "required": false,
      "sortOrder": 70
    },
    {
      "id": "gas_tightness_test",
      "label": "Gas Tightness Test Result",
      "type": "select",
      "required": true,
      "options": ["Pass", "Fail"],
      "sortOrder": 71,
      "group": "Gas Installation"
    },
    {
      "id": "gas_meter_working_pressure",
      "label": "Gas Meter Working Pressure",
      "type": "number",
      "required": true,
      "unit": "mbar",
      "sortOrder": 72,
      "group": "Gas Installation"
    },
    {
      "id": "section_defects",
      "label": "Defects & Actions",
      "type": "section-header",
      "required": false,
      "sortOrder": 80
    },
    {
      "id": "defects_found",
      "label": "Any Defects Identified?",
      "type": "boolean",
      "required": true,
      "defaultValue": false,
      "sortOrder": 81,
      "group": "Defects"
    },
    {
      "id": "defect_details",
      "label": "Details of Defects",
      "type": "textarea",
      "required": false,
      "placeholder": "Describe any defects found during inspection",
      "sortOrder": 82,
      "group": "Defects"
    },
    {
      "id": "remedial_action",
      "label": "Remedial Action Taken",
      "type": "textarea",
      "required": false,
      "placeholder": "Describe any corrective actions taken",
      "sortOrder": 83,
      "group": "Defects"
    },
    {
      "id": "warning_notice_issued",
      "label": "Warning / Advice Notice Issued",
      "type": "select",
      "required": true,
      "options": ["None", "At Risk (AR)", "Immediately Dangerous (ID)", "Not to Current Standards (NCS)"],
      "sortOrder": 84,
      "group": "Defects"
    },
    {
      "id": "section_sign_off",
      "label": "Engineer Sign-Off",
      "type": "section-header",
      "required": false,
      "sortOrder": 90
    },
    {
      "id": "gas_safe_number",
      "label": "Gas Safe Registration Number",
      "type": "text",
      "required": true,
      "placeholder": "e.g. 123456",
      "sortOrder": 91,
      "group": "Sign-Off"
    },
    {
      "id": "gas_safe_id_number",
      "label": "Gas Safe ID Card Number",
      "type": "text",
      "required": true,
      "sortOrder": 92,
      "group": "Sign-Off"
    },
    {
      "id": "inspection_date",
      "label": "Date of Inspection",
      "type": "date",
      "required": true,
      "sortOrder": 93,
      "group": "Sign-Off"
    },
    {
      "id": "next_inspection_date",
      "label": "Next Inspection Due By",
      "type": "date",
      "required": true,
      "sortOrder": 94,
      "group": "Sign-Off"
    },
    {
      "id": "engineer_signature",
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

**Template 2: Annual Boiler Service Record**

Based on the industry Benchmark Service Record standard. Used for both domestic homeowners and landlords.

```json
{
  "name": "Boiler Service Record",
  "description": "Annual boiler service record. Records all checks, readings, and findings from a domestic boiler service visit.",
  "category": "Service",
  "pdfConfig": {
    "title": "Boiler Service Record",
    "showLogo": true,
    "showSignature": true,
    "layout": "single-column"
  },
  "fieldSchema": [
    {
      "id": "section_boiler",
      "label": "Boiler Details",
      "type": "section-header",
      "required": false,
      "sortOrder": 0
    },
    {
      "id": "boiler_make",
      "label": "Boiler Make",
      "type": "text",
      "required": true,
      "placeholder": "e.g. Worcester Bosch, Vaillant, Baxi",
      "sortOrder": 1,
      "group": "Boiler Details"
    },
    {
      "id": "boiler_model",
      "label": "Boiler Model",
      "type": "text",
      "required": true,
      "placeholder": "e.g. Greenstar 4000 30kW",
      "sortOrder": 2,
      "group": "Boiler Details"
    },
    {
      "id": "boiler_serial",
      "label": "Serial Number",
      "type": "text",
      "required": false,
      "sortOrder": 3,
      "group": "Boiler Details"
    },
    {
      "id": "boiler_type",
      "label": "Boiler Type",
      "type": "select",
      "required": true,
      "options": ["Combi", "System", "Heat Only (Regular)", "Back Boiler"],
      "sortOrder": 4,
      "group": "Boiler Details"
    },
    {
      "id": "boiler_location",
      "label": "Boiler Location",
      "type": "text",
      "required": true,
      "placeholder": "e.g. Kitchen cupboard",
      "sortOrder": 5,
      "group": "Boiler Details"
    },
    {
      "id": "gc_number",
      "label": "GC Number",
      "type": "text",
      "required": false,
      "placeholder": "e.g. GC 47-311-72",
      "sortOrder": 6,
      "group": "Boiler Details"
    },
    {
      "id": "section_visual",
      "label": "Visual Inspection",
      "type": "section-header",
      "required": false,
      "sortOrder": 10
    },
    {
      "id": "case_seals_condition",
      "label": "Case Seals & Gaskets Condition",
      "type": "select",
      "required": true,
      "options": ["Good", "Worn — Replacement Advised", "Defective — Replaced"],
      "sortOrder": 11,
      "group": "Visual Inspection"
    },
    {
      "id": "flue_condition",
      "label": "Flue Terminal & Joints Condition",
      "type": "select",
      "required": true,
      "options": ["Satisfactory", "Defective — Remedied", "Defective — Advised"],
      "sortOrder": 12,
      "group": "Visual Inspection"
    },
    {
      "id": "condensate_drain",
      "label": "Condensate Drain Condition",
      "type": "select",
      "required": true,
      "options": ["Satisfactory", "Slow — Cleaned", "Blocked — Cleared", "N/A"],
      "sortOrder": 13,
      "group": "Visual Inspection"
    },
    {
      "id": "signs_of_leaks",
      "label": "Signs of Water Leaks",
      "type": "boolean",
      "required": true,
      "defaultValue": false,
      "sortOrder": 14,
      "group": "Visual Inspection"
    },
    {
      "id": "electrical_connections",
      "label": "Electrical Connections Secure",
      "type": "boolean",
      "required": true,
      "sortOrder": 15,
      "group": "Visual Inspection"
    },
    {
      "id": "section_readings",
      "label": "Gas Readings & Pressures",
      "type": "section-header",
      "required": false,
      "sortOrder": 20
    },
    {
      "id": "gas_inlet_pressure",
      "label": "Gas Inlet Pressure",
      "type": "number",
      "required": true,
      "unit": "mbar",
      "sortOrder": 21,
      "group": "Readings"
    },
    {
      "id": "burner_pressure",
      "label": "Burner Pressure (Max Rate)",
      "type": "number",
      "required": true,
      "unit": "mbar",
      "sortOrder": 22,
      "group": "Readings"
    },
    {
      "id": "gas_rate_reading",
      "label": "Gas Rate",
      "type": "number",
      "required": false,
      "unit": "kW",
      "sortOrder": 23,
      "group": "Readings"
    },
    {
      "id": "system_pressure",
      "label": "System Pressure (Cold)",
      "type": "number",
      "required": true,
      "unit": "bar",
      "sortOrder": 24,
      "group": "Readings"
    },
    {
      "id": "section_flue",
      "label": "Flue Gas Analysis",
      "type": "section-header",
      "required": false,
      "sortOrder": 30
    },
    {
      "id": "fga_co",
      "label": "CO Reading",
      "type": "number",
      "required": true,
      "unit": "ppm",
      "sortOrder": 31,
      "group": "Flue Gas Analysis"
    },
    {
      "id": "fga_co2",
      "label": "CO₂ Reading",
      "type": "number",
      "required": true,
      "unit": "%",
      "sortOrder": 32,
      "group": "Flue Gas Analysis"
    },
    {
      "id": "fga_ratio",
      "label": "CO/CO₂ Ratio",
      "type": "number",
      "required": true,
      "sortOrder": 33,
      "group": "Flue Gas Analysis"
    },
    {
      "id": "fga_flue_temp",
      "label": "Flue Temperature",
      "type": "number",
      "required": false,
      "unit": "°C",
      "sortOrder": 34,
      "group": "Flue Gas Analysis"
    },
    {
      "id": "fga_efficiency",
      "label": "Efficiency Reading",
      "type": "number",
      "required": false,
      "unit": "%",
      "sortOrder": 35,
      "group": "Flue Gas Analysis"
    },
    {
      "id": "section_safety",
      "label": "Safety Checks",
      "type": "section-header",
      "required": false,
      "sortOrder": 40
    },
    {
      "id": "gas_tightness",
      "label": "Gas Tightness Test",
      "type": "select",
      "required": true,
      "options": ["Pass", "Fail — Remedied", "Fail — Advised"],
      "sortOrder": 41,
      "group": "Safety Checks"
    },
    {
      "id": "safety_devices_tested",
      "label": "All Safety Devices Tested & Working",
      "type": "boolean",
      "required": true,
      "sortOrder": 42,
      "group": "Safety Checks"
    },
    {
      "id": "ventilation_adequate",
      "label": "Ventilation Adequate",
      "type": "boolean",
      "required": true,
      "sortOrder": 43,
      "group": "Safety Checks"
    },
    {
      "id": "co_alarm_present",
      "label": "CO Alarm Present & Working",
      "type": "select",
      "required": true,
      "options": ["Yes — Tested OK", "Yes — Battery Low", "No — Advised Customer", "N/A"],
      "sortOrder": 44,
      "group": "Safety Checks"
    },
    {
      "id": "inhibitor_test",
      "label": "System Inhibitor Test",
      "type": "select",
      "required": true,
      "options": ["Satisfactory", "Low — Topped Up", "None — Added", "Not Tested"],
      "sortOrder": 45,
      "group": "Safety Checks"
    },
    {
      "id": "section_work",
      "label": "Work Completed & Recommendations",
      "type": "section-header",
      "required": false,
      "sortOrder": 50
    },
    {
      "id": "burner_cleaned",
      "label": "Burner Cleaned",
      "type": "boolean",
      "required": true,
      "sortOrder": 51,
      "group": "Work Done"
    },
    {
      "id": "heat_exchanger_inspected",
      "label": "Heat Exchanger Inspected",
      "type": "boolean",
      "required": true,
      "sortOrder": 52,
      "group": "Work Done"
    },
    {
      "id": "ignition_electrodes_checked",
      "label": "Ignition / Electrodes Checked",
      "type": "boolean",
      "required": true,
      "sortOrder": 53,
      "group": "Work Done"
    },
    {
      "id": "system_filter_cleaned",
      "label": "System Filter Cleaned / Checked",
      "type": "select",
      "required": true,
      "options": ["Cleaned", "Satisfactory", "No Filter Fitted — Advised", "N/A"],
      "sortOrder": 54,
      "group": "Work Done"
    },
    {
      "id": "expansion_vessel_pressure",
      "label": "Expansion Vessel Pre-Charge Pressure",
      "type": "number",
      "required": false,
      "unit": "bar",
      "sortOrder": 55,
      "group": "Work Done"
    },
    {
      "id": "additional_work_notes",
      "label": "Additional Work / Recommendations",
      "type": "textarea",
      "required": false,
      "placeholder": "Note any recommended repairs, upgrades, or observations",
      "sortOrder": 56,
      "group": "Work Done"
    },
    {
      "id": "overall_condition",
      "label": "Overall Boiler Condition",
      "type": "select",
      "required": true,
      "options": ["Good — No Issues", "Satisfactory — Minor Wear", "Attention Required — See Notes", "Unsafe — Disconnected / Condemned"],
      "sortOrder": 57,
      "group": "Work Done"
    },
    {
      "id": "section_photos",
      "label": "Photos",
      "type": "section-header",
      "required": false,
      "sortOrder": 60
    },
    {
      "id": "fga_photo",
      "label": "Flue Gas Analyser Reading (Photo)",
      "type": "photo",
      "required": false,
      "sortOrder": 61,
      "group": "Photos"
    },
    {
      "id": "boiler_photo",
      "label": "Boiler Photo",
      "type": "photo",
      "required": false,
      "sortOrder": 62,
      "group": "Photos"
    },
    {
      "id": "section_signoff",
      "label": "Sign-Off",
      "type": "section-header",
      "required": false,
      "sortOrder": 90
    },
    {
      "id": "gas_safe_reg",
      "label": "Gas Safe Registration Number",
      "type": "text",
      "required": true,
      "sortOrder": 91,
      "group": "Sign-Off"
    },
    {
      "id": "service_date",
      "label": "Date of Service",
      "type": "date",
      "required": true,
      "sortOrder": 92,
      "group": "Sign-Off"
    },
    {
      "id": "next_service_due",
      "label": "Next Service Due",
      "type": "date",
      "required": true,
      "sortOrder": 93,
      "group": "Sign-Off"
    },
    {
      "id": "engineer_sig",
      "label": "Engineer Signature",
      "type": "signature",
      "required": true,
      "sortOrder": 94,
      "group": "Sign-Off"
    }
  ]
}
```

---

**Template 3: Gas Warning / Advice Notice**

Issued when an engineer finds an unsafe appliance and needs to formally record it.

```json
{
  "name": "Gas Warning / Advice Notice",
  "description": "Issued when an unsafe situation is found. Records the classification (ID/AR/NCS), the defect, and action taken. Required when turning off or condemning an appliance.",
  "category": "Safety Notice",
  "pdfConfig": {
    "title": "Gas Warning / Advice Notice",
    "showLogo": true,
    "showSignature": true,
    "headerText": "Gas Industry Unsafe Situations Procedure (GIUSP)",
    "layout": "single-column"
  },
  "fieldSchema": [
    {
      "id": "classification",
      "label": "Classification",
      "type": "select",
      "required": true,
      "options": ["Immediately Dangerous (ID)", "At Risk (AR)", "Not to Current Standards (NCS)"],
      "sortOrder": 1,
      "group": "Notice Details"
    },
    {
      "id": "appliance_type",
      "label": "Appliance Type",
      "type": "text",
      "required": true,
      "placeholder": "e.g. Central Heating Boiler",
      "sortOrder": 2,
      "group": "Notice Details"
    },
    {
      "id": "appliance_location",
      "label": "Appliance Location",
      "type": "text",
      "required": true,
      "sortOrder": 3,
      "group": "Notice Details"
    },
    {
      "id": "appliance_make_model",
      "label": "Appliance Make & Model",
      "type": "text",
      "required": true,
      "sortOrder": 4,
      "group": "Notice Details"
    },
    {
      "id": "defect_description",
      "label": "Description of Defect / Unsafe Situation",
      "type": "textarea",
      "required": true,
      "placeholder": "Describe the unsafe situation found",
      "sortOrder": 5,
      "group": "Defect"
    },
    {
      "id": "action_taken",
      "label": "Action Taken",
      "type": "select",
      "required": true,
      "options": [
        "Appliance disconnected and sealed",
        "Appliance turned off — customer advised not to use",
        "Appliance left in use — customer advised of risk and signed",
        "Defect remedied on site"
      ],
      "sortOrder": 6,
      "group": "Defect"
    },
    {
      "id": "action_notes",
      "label": "Additional Notes on Action Taken",
      "type": "textarea",
      "required": false,
      "sortOrder": 7,
      "group": "Defect"
    },
    {
      "id": "customer_informed",
      "label": "Responsible Person Informed",
      "type": "boolean",
      "required": true,
      "sortOrder": 8,
      "group": "Confirmation"
    },
    {
      "id": "responsible_person_name",
      "label": "Name of Person Informed",
      "type": "text",
      "required": true,
      "sortOrder": 9,
      "group": "Confirmation"
    },
    {
      "id": "defect_photo",
      "label": "Photo of Defect",
      "type": "photo",
      "required": false,
      "sortOrder": 10,
      "group": "Evidence"
    },
    {
      "id": "warning_label_attached",
      "label": "Warning Label Attached to Appliance",
      "type": "boolean",
      "required": true,
      "sortOrder": 11,
      "group": "Confirmation"
    },
    {
      "id": "gas_safe_reg",
      "label": "Gas Safe Registration Number",
      "type": "text",
      "required": true,
      "sortOrder": 20,
      "group": "Sign-Off"
    },
    {
      "id": "notice_date",
      "label": "Date",
      "type": "date",
      "required": true,
      "sortOrder": 21,
      "group": "Sign-Off"
    },
    {
      "id": "engineer_sig",
      "label": "Engineer Signature",
      "type": "signature",
      "required": true,
      "sortOrder": 22,
      "group": "Sign-Off"
    },
    {
      "id": "customer_sig",
      "label": "Customer / Responsible Person Signature",
      "type": "signature",
      "required": true,
      "sortOrder": 23,
      "group": "Sign-Off"
    }
  ]
}
```

---

**Template 4: Tightness Test & Purge Record**

```json
{
  "name": "Tightness Test & Purge Record",
  "description": "Records the results of gas tightness testing and purging of pipework, typically done during new installations or after pipework modifications.",
  "category": "Testing",
  "pdfConfig": {
    "title": "Gas Tightness Test & Purge Record",
    "showLogo": true,
    "showSignature": true,
    "layout": "single-column"
  },
  "fieldSchema": [
    {
      "id": "test_type",
      "label": "Type of Test",
      "type": "select",
      "required": true,
      "options": ["New Installation", "After Repair / Modification", "Periodic Test", "Re-Test After Failure"],
      "sortOrder": 1,
      "group": "Test Details"
    },
    {
      "id": "installation_pipework",
      "label": "Installation Pipework Material",
      "type": "select",
      "required": true,
      "options": ["Copper", "CSST", "Steel", "Mixed"],
      "sortOrder": 2,
      "group": "Test Details"
    },
    {
      "id": "meter_type",
      "label": "Meter Type",
      "type": "select",
      "required": true,
      "options": ["Credit Meter", "Prepayment Meter", "No Meter (Supply Pipe Only)"],
      "sortOrder": 3,
      "group": "Test Details"
    },
    {
      "id": "let_by_test_result",
      "label": "Strength / Let-By Test Result",
      "type": "select",
      "required": true,
      "options": ["Pass", "Fail"],
      "sortOrder": 10,
      "group": "Tightness Test"
    },
    {
      "id": "test_gauge_reading_start",
      "label": "Gauge Reading — Start",
      "type": "number",
      "required": true,
      "unit": "mbar",
      "sortOrder": 11,
      "group": "Tightness Test"
    },
    {
      "id": "test_gauge_reading_end",
      "label": "Gauge Reading — End (after 2 mins)",
      "type": "number",
      "required": true,
      "unit": "mbar",
      "sortOrder": 12,
      "group": "Tightness Test"
    },
    {
      "id": "tightness_test_result",
      "label": "Tightness Test Result",
      "type": "select",
      "required": true,
      "options": ["Pass — No Drop", "Pass — Within Tolerance", "Fail — Pressure Drop Detected"],
      "sortOrder": 13,
      "group": "Tightness Test"
    },
    {
      "id": "purge_completed",
      "label": "Purge Completed",
      "type": "boolean",
      "required": true,
      "sortOrder": 20,
      "group": "Purge"
    },
    {
      "id": "all_appliances_relit",
      "label": "All Appliances Re-lit & Tested",
      "type": "boolean",
      "required": true,
      "sortOrder": 21,
      "group": "Purge"
    },
    {
      "id": "failure_details",
      "label": "Details (if test failed)",
      "type": "textarea",
      "required": false,
      "placeholder": "If test failed: describe location of leak, action taken",
      "sortOrder": 30,
      "group": "Failure Details"
    },
    {
      "id": "gas_safe_reg",
      "label": "Gas Safe Registration Number",
      "type": "text",
      "required": true,
      "sortOrder": 90,
      "group": "Sign-Off"
    },
    {
      "id": "test_date",
      "label": "Date of Test",
      "type": "date",
      "required": true,
      "sortOrder": 91,
      "group": "Sign-Off"
    },
    {
      "id": "engineer_sig",
      "label": "Engineer Signature",
      "type": "signature",
      "required": true,
      "sortOrder": 92,
      "group": "Sign-Off"
    }
  ]
}
```

---

### Default Parts Library for Plumbing & Gas

Seed these when the user selects "Plumbing & Gas" during onboarding:

```json
[
  { "name": "Annual Boiler Service", "type": "labour", "unitPrice": 8500, "unit": "each", "category": "Service" },
  { "name": "Gas Safety Inspection (CP12)", "type": "labour", "unitPrice": 7500, "unit": "each", "category": "Inspection" },
  { "name": "Callout / Diagnostic Fee", "type": "labour", "unitPrice": 6500, "unit": "each", "category": "Labour" },
  { "name": "Labour — Per Hour", "type": "labour", "unitPrice": 6000, "unit": "hour", "category": "Labour" },
  { "name": "CO Alarm — Battery", "type": "part", "unitPrice": 1800, "unit": "each", "category": "Safety" },
  { "name": "CO Alarm — Sealed (10yr)", "type": "part", "unitPrice": 2500, "unit": "each", "category": "Safety" },
  { "name": "System Filter (Magnetic)", "type": "part", "unitPrice": 4500, "unit": "each", "category": "Parts" },
  { "name": "System Inhibitor (1L)", "type": "part", "unitPrice": 1200, "unit": "each", "category": "Parts" },
  { "name": "Expansion Vessel (8L)", "type": "part", "unitPrice": 3500, "unit": "each", "category": "Parts" },
  { "name": "Condensate Trap", "type": "part", "unitPrice": 800, "unit": "each", "category": "Parts" },
  { "name": "PRV (Pressure Relief Valve)", "type": "part", "unitPrice": 1500, "unit": "each", "category": "Parts" },
  { "name": "Ignition Electrode", "type": "part", "unitPrice": 2200, "unit": "each", "category": "Parts" },
  { "name": "Flame Sensor / Detection Lead", "type": "part", "unitPrice": 1800, "unit": "each", "category": "Parts" },
  { "name": "Diverter Valve", "type": "part", "unitPrice": 6500, "unit": "each", "category": "Parts" },
  { "name": "Room Thermostat", "type": "part", "unitPrice": 3000, "unit": "each", "category": "Controls" }
]
```

---

## 2. Onboarding Wizard Spec

### Flow

After a user registers (email + password + company name), instead of landing on an empty dashboard, they see a **3-step onboarding wizard**:

**Step 1 — Your Trade** (single select, big cards with icons)
- Plumbing & Gas
- Electrical *(coming soon — greyed out)*
- Gate & Access Engineering *(coming soon — greyed out)*
- HVAC *(coming soon — greyed out)*
- General Maintenance *(coming soon — greyed out)*
- Other / Skip for Now

Selecting a trade seeds:
- Stock service templates for that trade
- Default parts/labour library for that trade
- Suggested automation rules with trade-appropriate email wording

**Step 2 — Your Business** (quick form, all optional except company name)
- Company name *(pre-filled from registration)*
- Phone number
- Logo upload
- Address (company address for invoices/certs)

**Step 3 — Your First Customer** (optional, skippable)
- "Add your first customer and service contract to see how Siteflo works"
- Name, address, phone
- What did you install? (free text)
- When is the next service due? (date picker)
- Creates a customer + service contract in one step

**After onboarding:** Redirect to dashboard. If they added a customer in step 3, the dashboard shows their first contract with a "due soon" indicator. If they skipped, the dashboard shows an empty state with a prompt: "Add your first customer to get started."

### UI Notes
- Full-screen wizard, no sidebar
- Progress indicator (dots or step numbers)
- Big touch targets, mobile-friendly
- "Skip" option on every step except Step 1
- Takes under 2 minutes to complete
- On completion, update tenant record: `onboardingComplete: true`

### Route
`/onboarding` — shown after registration. If `tenant.onboardingComplete === false`, redirect here from dashboard.

---

## 3. Future Trade Templates (Placeholder)

These are not being built now, but the architecture supports them:

**Electrical:**
- EICR (Electrical Installation Condition Report)
- EIC (Electrical Installation Certificate)
- Minor Works Certificate
- PAT Testing Record

**Gate & Access Engineering:**
- Force Test Report (EN 12453)
- Installation Commissioning Record
- Quarterly Maintenance Report
- Safety Inspection Checklist

**HVAC:**
- F-Gas Leak Check Record
- Commissioning Sheet
- Maintenance Service Record

**General Maintenance:**
- Generic Service Report
- Inspection Checklist
- Defect Report

---

## Claude Code Prompt

```
Read the Siteflo stock templates document I'm providing. Implement two features:

FEATURE 1 — Onboarding Wizard:
- Create /onboarding route (full-screen, no sidebar)
- 3 steps: Select Trade → Business Details → First Customer (optional)
- After registration, redirect to /onboarding if tenant.onboardingComplete is false
- Add onboardingComplete boolean to tenant settings JSONB
- On Step 1 selection, seed stock templates and parts library for that trade
- On completion, set onboardingComplete = true and redirect to /dashboard
- For now, only "Plumbing & Gas" is active — others show "Coming Soon"

FEATURE 2 — Stock Template Seeding:
- Create src/lib/seed/plumbing-gas.ts containing the 4 template definitions 
  and the default parts library from the document
- When "Plumbing & Gas" is selected in onboarding Step 1, insert all 4 templates 
  and all 15 parts/labour items into the tenant's account
- Templates should be created with isActive: true
- Parts should be created with isActive: true

Use the exact field schemas from the document — they match real industry 
requirements (CP12, Benchmark service record, etc).

UI: Full-screen wizard with step indicator, large trade selection cards 
with icons, mobile-first, matches existing shadcn/ui styling.
```
