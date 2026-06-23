# Zoho Asset layout reference images

Reference screenshots for CapStone `categoryLayouts` in `src/config/zohoEquipmentFields.json`.

| File | Contents |
|------|----------|
| `all-fields.jpg` / `all-fields.xlsx` | Full Zoho **Asset Main** layout — all category sections on one scroll (source: user upload 2026-06-18) |
| `flow-category.jpg` / `flow-meter.xlsx` | Zoho layout with **Asset Category = Flow Meter** selected |
| `flow-category.jpg` | Same as flow-meter.xlsx embedded image |

## Section map (from `all-fields.jpg`)

| Zoho section | CapStone category | Status |
|--------------|-------------------|--------|
| Sensor, Display, Set Up Input/Output, Duration, Subform | Shared pattern | Shipped (per category) |
| OCM — Open Channel Flume, Weir Details | Flow Open Channel | Shipped |
| **Rosemount Details** (DA1/DA2, DA2 License, Totalizer, LOI Display) | **Flow Meter** | Shipped (magnetic flow meter) |
| Flow Meter Details (Cal Factor, Pipe Size, Damping) | Flow Meter | Shipped |
| Gas Sensor Info | Gas Detector | Shipped |
| **LS Details** (LS Shape, LS Diameter, Number of Pumps) | **Lift Station** | Shipped (v306) |
| Scales (Scale Class) | Scales & Balances | Planned |

The `.xlsx` files are Excel workbooks with a single embedded JPEG (not tabular data) — open in Excel or use the matching `.jpg`.
