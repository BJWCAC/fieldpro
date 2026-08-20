# Parts Lookup Rules — parts needed for a recorded deficiency

Living reference for how a **parts needed / recommended** list is written for a deficiency recorded on a visit, by anyone or anything doing the writing: Claude in chat, Cursor, or CapStone's own Parts Lookup on the Capture tab (`PARTS_LOOKUP_SYSTEM_PROMPT` in `src/app.js`).

**Keep these in sync.** If you improve the rules here, update `PARTS_LOOKUP_SYSTEM_PROMPT` in `src/app.js` to match, and vice versa. This file is the source of truth; the in-app prompt is a condensed version tuned to fit API calls. `docs/CALIBRATION_SPEC_RULES.md` is the same arrangement for `Model_AI_Specs` and answers a different question: that field says *how to calibrate this instrument*, this one says *what to order to fix what the technician found*.

This file does **not** hold project history or a punch list of parts already ordered. It only holds rules that apply to any deficiency, past or future.

---

## 1. What the lookup answers

A technician records a deficiency on site — a binding pen drive, a slow pH electrode, a gas cell that will not span, a leaking manifold. Someone then has to work out what to order before the return visit, which today means reading a manufacturer parts list on a laptop after the fact. The lookup does that reading, from the field, against the equipment the visit already identified.

The answer is a short list of parts, each one tied to a deficiency the technician actually recorded. It is not a catalog page and not a spare-parts program.

**Inputs available** (all optional, all from work already done on the visit):

| Input | Where it comes from |
|---|---|
| Deficiencies, findings, recommendations, follow-up | Capture sections 5–8 |
| Equipment serviced | Capture section 2 |
| Brand, type, model, serial, series, category | Assets saved this visit (`A.asset.savedItems`), or the asset form still open |
| What the technician wrote on each photo | `A.photos[].desc` |
| Voice notes | Capture voice notes |
| Account, deal name, deal stage | The selected deal |

**A lookup with no deficiency text is not a lookup.** Without a recorded problem there is nothing for a part to be *for*, and the answer degrades into a generic spares list. Return nothing rather than guess.

---

## 2. Output format (non-negotiable)

A JSON array, one object per part, no prose around it, no markdown fence:

```json
[
  {
    "part_number": "51404671-501",
    "manufacturer": "Honeywell",
    "description": "Pen arm assembly, red, DR4500A circular chart recorder",
    "qty": "1",
    "for": "Pen drive binding at mid-span",
    "kind": "wear",
    "confidence": "verified",
    "basis": "Honeywell DR4500 parts list, process.honeywell.com",
    "notes": "Sold as a pen kit with the fiber tip; order the tip separately if only the arm is bent."
  }
]
```

Rules:

- **`part_number`** — the manufacturer's own number, exactly as published. Empty string when a genuine search does not surface one; never a guess, never a placeholder, never invented digits. An empty `part_number` is a usable answer as long as `description` and `basis` say what to ask the manufacturer for.
- **`description`** — what the part is, in the words a purchasing clerk needs. Include the instrument family so a line item can be checked against the asset record.
- **`qty`** — what one repair needs, as a number plus a unit when the unit matters (`1`, `2`, `12 rolls`, `1 kit`). Say `stock 2` in `notes` when the shop would normally keep a spare on the truck; do not inflate `qty` to cover that.
- **`for`** — the recorded deficiency this part addresses, quoted or closely paraphrased from what the technician wrote. **Every part must have one.** A part with no deficiency behind it does not belong in the list.
- **`kind`** — one of:
  - `consumable` — used up on a schedule (chart paper, reagents, buffers, calibration gas, sensor caps).
  - `wear` — wears out in service and is meant to be replaced (pen arms, electrodes, diaphragms, o-rings, filters).
  - `repair` — replaced because it failed (sensor module, terminal block, drive motor, cell).
  - `replace-unit` — the part is not separately available or not field-replaceable, and the correct answer is a new instrument or assembly (a magmeter liner, a sealed sensor).
  - `test-standard` — what verifies the repair rather than performing it (test spheres, StablCal standards, calibration gas, mass sets).
- **`confidence`** — `verified` (found on the manufacturer's own parts list, manual, or authorized distributor page and cited in `basis`), `likely` (found on a reputable source, or the part is unambiguous for the family but the exact number depends on an option code), `unverified` (named from field knowledge only — say so plainly and give the search path in `basis`).
- **`basis`** — the source, short: manufacturer document or domain, plus the page/table when it helps. CapStone prints it after `Source: `, so write a source phrase rather than a sentence. For `unverified`, name where the number has to come from instead: `"Honeywell — ask for the DR4500A pen kit for a 3-pen unit"`.
- **`notes`** — optional, one or two sentences, and only when it changes what gets ordered: an option code the number depends on, a kit that supersedes individual parts, a shelf life, a supersession, a calibration consequence (§4).
- **Return `[]`** when there is no recorded deficiency, when the equipment cannot be identified well enough to name a part, or when the deficiency needs no part (a re-range, a setting, a loose terminal).
- **At most 12 parts.** A longer list is a catalog dump; rank by what the recorded deficiencies actually need.

### Search first, deeply

Run several targeted searches rather than answering from memory: `"<brand> <model> spare parts list"`, `"<brand> <model> replacement parts"`, `"<brand> <model> service manual"`, `"<brand> <model> accessories"`, and the specific part by name (`"<brand> <model> pen arm assembly part number"`). Prefer the manufacturer's own document; cross-check a number on a second source before calling it `verified`. Decode the full model/order code where the part depends on it — a Promag electrode depends on the liner and the wetted material, a gas sensor depends on the gas and the range.

### Never price it

**No prices, no costs, no quotes, no "list price", no currency of any kind** — not in `notes`, not in `basis`, not anywhere. The shop prices its own work, published prices are stale, and a price is one of the things a customer copy has to withhold. Write the part; let the office quote it.

### Never write a placeholder

Write the part number you found, or an empty string. Never `[redacted]`, `withheld`, `not shown`, `N/A`, `TBD`, or `***`, and never mention redaction, withholding, or customer copies — a customer copy removes what it removes when it is rendered (§5).

---

## 3. What a deficiency usually needs, by family

Field-practical starting points, not a substitute for the search. The point of each line is the part a technician forgets to order.

**Circular / strip chart recorders** (Honeywell DR4500A, Partlow MRC 7000, Yokogawa µR) — pen arm assembly and fiber-tip pens (separate part numbers, and the tip is the consumable); chart paper by chart number, which encodes the range and the time base, so the chart is wrong if the range changed; drive motor and gear train when the pen binds across the whole span rather than at one point; chart hub, clip, door gasket. A binding pen at mid-span is usually the arm, not the motor.

**pH / ORP** (Hach sc, GF Signet, Rosemount) — electrode or sensor cartridge (pH has no zero: a slope under about 90% is a dying electrode, not a calibration problem); reference junction; buffer solutions in the pH 4/7/10 set, which are dated; o-rings; sensor cable and junction box; flow cell. The controller (`sc100`, `sc200`) is not the sensor — replacing it does not fix a slow electrode.

**Dissolved oxygen** (Hach LDO) — the sensor cap *is* the calibration and it has a shelf life and an expiry printed on it; cable; the sensor body only if physically damaged.

**Chlorine / colorimetric analyzers** (Hach CL17, CL17sv) — reagent sets (buffer + DPD indicator), dated; pump/colorimeter tubing kit, which is the usual cause of erratic readings; sample line strainer; stir bar.

**Turbidimeters** (Hach 1720E, TU5300) — sample vials, desiccant cartridge, lamp/source assembly, StablCal or formazin standards (`test-standard`, dated).

**Fixed-point gas detection** (Honeywell, MSA, RKI, Dräger) — the sensor cell or element, and it has a calendar life whether or not it is in service; a poisoned catalytic bead reads low while still passing a zero check, so a unit that zeroes and will not span is a cell; splash guard and dust filter; sensor gasket; calibration gas plus a demand-flow regulator (`test-standard`, and expired gas is the most common span failure). Note the gas and range in `description` — the cell part number depends on both.

**Magnetic flow meters** (Rosemount 8700/8750, E+H Promag, Siemens MAG, Krohne) — electrodes (material must match the process); coil assembly; sensor cable, which is a matched dual-lead cable and not generic wire; flange gaskets. The **liner is not a field part** — a damaged liner is `replace-unit`. Calibration data lives on the sensor, not the transmitter (Siemens SENSORPROM, E+H S-DAT, Micro Motion FCF, Krohne GK value), so say which half carries it before either half is ordered (§4).

**Ultrasonic level / open channel** (Pulsar, Siemens, E+H) — transducer, mounting bracket, cable, enclosure desiccant. Accuracy is a percent of range, so a transducer swap needs the range re-entered.

**DP / gauge / absolute pressure transmitters** (Rosemount 3051, Honeywell ST3000) — sensor module (the calibrated part); process o-rings and PTFE gaskets, which are the fix for a weeping flange and are cheap enough to stock; three- or five-valve manifold; diaphragm seals; terminal block; local display. An absolute unit cannot be vent-zeroed, so a "won't zero" note on one is not a seal problem.

**RTD / temperature** — RTD element, thermowell, terminal block. Simulating the RTD tests the transmitter and not the element, so a drift the tech blamed on the transmitter often needs the element.

**Metering pumps** (Grundfos DME, LMI) — the wet-end kit: diaphragm, check valves, seals, and tubing together. Ordering the diaphragm alone is the usual mistake.

**Mechanical water meters** — register, gasket set, and the AWWA test points that decide whether a rebuild kit is enough; wear always reads low.

**Balances / scales / checkweighers** — load cell, calibration mass set (`test-standard`, with its own traceability), leveling feet, draft shield, display cable.

**Metal detectors** — certified test spheres in ferrous / non-ferrous / stainless (`test-standard` — the verification *is* the spheres, not a zero and span), belt, reject flap seals.

**Anything with an enclosure** — gaskets, cord grips and cable glands, conduit seals, fuses, surge protectors, terminal blocks. These are what actually keeps water out of a panel and they are almost never in the technician's note.

---

## 4. Traps to call out in `notes`

- **The calibration lives in the part.** Siemens SENSORPROM, E+H S-DAT, Micro Motion FCF, Foxboro Meter Factor, Badger, Hach sc: replacing the wrong half loses the factory calibration, and replacing the transmitter alone needs no recalibration at all. Say which.
- **Kits beat pieces.** When the manufacturer sells a kit that contains the part, name the kit and say what else is in it — a second visit for an o-ring inside a kit already on the shelf is the failure this avoids.
- **Dated stock.** Reagents, buffers, calibration gas, LDO caps, electrochemical cells, and turbidity standards expire on a shelf. Say so in `notes`; it changes the order quantity.
- **Option-dependent numbers.** Electrode material, liner, gas and range, chart range, pen count, output board: when the part number depends on one of these and the visit did not record it, set `confidence` to `likely`, say which detail decides it, and name what to read off the nameplate.
- **Superseded and obsolete.** Give the current number and the one printed on the instrument. When the instrument itself is obsolete and parts are gone, that is `replace-unit`, and say what replaced it.
- **Not field-replaceable.** Liners, sealed sensors, potted assemblies. `replace-unit`, with the assembly named.

---

## 5. Customer copies

Parts land in the report through Capture section **10. Parts Needed / Recommended**, so the customer copy content rule in `docs/CAPSTONE_DEVELOPMENT_RULES.md` applies to them without exception:

- A **customer copy carries no part numbers**. The section renders as the part names, quantities, and the deficiency each one is for — `- Pen arm assembly, Honeywell, qty 1 — for: pen drive binding at mid-span` — which is what a customer needs to approve the work. The number itself, its label, and the punctuation holding it are removed together at render time.
- **Every part number must be written with its label** (`Part number: 51404671-501`) exactly as the report and photo prompts require, because a labeled number is what the filter can lift out and leave a readable sentence behind.
- A customer copy whose parts section was nothing but numbers **loses the section heading too**, which is correct: there was nothing in it for the customer.
- **Internal Copy keeps everything**, and so does the Zoho deal note. The list is captured once and filtered per copy — never filtered at capture.
- Any change to the wording the lookup writes into section 10 runs `node tests/customer-copy-redaction.js`, which covers a parts list in both directions: the numbers go, the quantities and deficiency wording stay.

---

## 6. Provider strategy (CapStone Parts Lookup)

Same arrangement as `Model_AI_Specs`: **Gemini primary, Claude fallback, no merge.** `partsLookupProviders()` orders them, `fetchPartsLookupDraft()` runs one and takes the first usable answer. Both calls set `search:true` — an ungrounded parts answer is a guess, and a guessed part number is worse than no answer, so **keep web-search grounding on both calls**. Gemini gets a generous `maxTok` because thinking tokens count against the budget and a multi-source parts search spends a lot of them.

The lookup is a Pending AI item (`parts_lookup`) like every other AI call in CapStone: a weak-signal failure queues and retries rather than losing the recorded deficiency. It never writes to Zoho on its own — the technician reviews the list, unchecks what the shop already stocks, and adds the rest to section 10, which is what reaches the report, the deal note, and the PDF.
