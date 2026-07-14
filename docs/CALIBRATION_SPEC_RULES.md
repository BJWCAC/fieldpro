# Calibration Spec Rules — Model_AI_Specs

Living reference for how the `Model_AI_Specs` field on Zoho CRM `Equipments` records gets written, by anyone or anything doing the writing: Claude in chat, Cursor, or CapStone's own automatic generation on asset save (`MODEL_AI_SPECS_SYSTEM_PROMPT` and `MODEL_AI_SPECS_MERGE_SYSTEM_PROMPT` in `src/app.js`).

**Keep these in sync.** If you improve the rules here, update `MODEL_AI_SPECS_SYSTEM_PROMPT` and `MODEL_AI_SPECS_MERGE_SYSTEM_PROMPT` in `src/app.js` to match, and vice versa. This file is the source of truth; the in-app prompts are condensed versions tuned to fit API calls.

This file does **not** contain project-specific history (which records were already fixed, open nameplate-dependent items, correction tallies). That kind of one-time punch-list content belongs in a dated working file, not here — this file only holds rules that apply to *any* asset, past or future.

---

## 1. Zoho field reference (module: `Equipments`)

| Field | Type | Role |
|---|---|---|
| `Asset_Model_Number` | text | primary input |
| `Asset_Brand` | picklist | input (there is NO `Manufacturer` field) |
| `Asset_Type` | picklist | input/correctable |
| `Name` | text | AUTO-GENERATED from 5 fields (asset#, function, building/room, brand, type) — changing `Asset_Type`/`Asset_Brand` cascades into it automatically |
| `Model_Number` ("Sensor Model Number") | text | usually blank; see §6, the sensor-model gap |
| `Pipe_Size` | text | independent tiebreaker (e.g. a Class-150 flange size can prove a full-bore meter even when the type field says "insertion") |
| `Serial_Number` | text | sometimes the real identity when model is junk |
| `Engineering_Units` | text | disambiguates service (e.g. "H2O FT", "GPM US") |
| `Account.Account_Name` | lookup | groups records by customer |
| `Model_AI_Specs` | textarea, **2000-char hard limit** | OUTPUT |

**Zoho mechanics to respect:**
- `Asset_Type` picklist accepts both `display_value` and `actual_value`, and they **differ** for several entries (Coriolis, Magnetic Flow Meter, the two Clamp-On types). Always write the exact **display** string, consistently — writing the actual value instead breaks the auto-generated `Name` and any grouping.
- Never edit picklists via the `updateField` API — it rewrites the whole list and truncates at 25 characters. Brand/type additions require the user adding them in the Zoho UI.
- COQL quirks: no bare `count()` without `group by`; more than 2 OR'd conditions need nested parens `((a or b) or (c or d))`; pagination is `limit <offset>, <count>`.

---

## 2. Output format (non-negotiable)

```
<b>ACCURACY:</b> ±<value> — OF READING (rate) | OF SPAN | OF FULL SCALE | OF RANGE | absolute units
<b>ZERO/LRL:</b> <value or how established>
<b>SPAN/URL:</b> <value, or "NOT SET BY THIS MODEL CODE" + where to find it>
<b>MINIMUM SPAN:</b> <value or n/a>
<b>RESOLUTION:</b> <value>
<b>GENERAL</b>
<3–6 lines: type, sensor tech, output, supply, ratings, discontinued/successor status>
<b>CAL NOTES:</b> <1–3 lines of practical field guidance — the part techs actually read>
[AI-gen: <source>, <Month Year>]
```

Rules:
- **ACCURACY line first, always** — this is the single most important line (see §3).
- Section titles and field labels use **bold ALL CAPS** via minimal HTML: `<b>ACCURACY:</b>`, `<b>ZERO/LRL:</b>`, `<b>GENERAL</b>`, `<b>CAL NOTES:</b>`, etc. No other HTML, no markdown bullets.
- The accuracy line **must** state its basis explicitly.
- If a spec cannot be verified: write `NOT VERIFIED` / `CONFIRM from <source>` — **never invent a number.**
- Under 2000 characters.
- Same model string on multiple records → same body text (service-specific detail may differ).
- The `<b>CAL NOTES:</b>` line must tell a tech something a datasheet wouldn't: what fails, what to check first, what the spec hides. Write it for someone standing at the instrument with a calibrator (see §7 for tone examples).
- If the brand/model given isn't a real, identifiable instrument (placeholder text, non-manufacturer brand, no usable model/serial), don't write a spec at all — this is a junk/placeholder record, not a calibration question (see §5).

---

## 3. The six accuracy bases (map to instrument type)

The single most useful thing this field can tell a tech: zero, span, resolution, and whether accuracy is % of span or % of reading.

| Basis | Instruments |
|---|---|
| **% of READING (rate)** | All magnetic flowmeters (Rosemount, Siemens, E+H, Foxboro IMT, Yokogawa ADMAG, Krohne, ABB, Badger, Toshiba, Marsh McBirney, GF Signet), vortex, propeller/turbine/AWWA, gas-detector span points, Coriolis, thermal-mass gas, clamp-on ultrasonic |
| **% of SPAN** | DP/gauge/absolute pressure transmitters (Rosemount 1151/2088/3051/3051S/2051, Foxboro IDP/IGP/863/843, Yokogawa EJA, Siemens SITRANS P, E+H Cerabar, ABB 264DS) |
| **% of FULL SCALE** | Fixed-point gas monitors (MSA Ultima/Altimax, ATI D12, Honeywell Sensepoint XCD) |
| **% of RANGE (distance)** | Ultrasonic level/open-channel (HydroRanger, MultiRanger, Pulsar, FMU, Prosonic). Radar (FMR/FMP/VEGAPULS) = fixed **±2 mm absolute** |
| **Absolute units** | Hach LDO (±0.1 mg/L), pH (±0.02 pH), CL17 (±5% reading OR ±0.04 mg/L floor), conductivity |
| **NO single %** | RTD/temp transmitters (°C input + %span D/A, summed); balances/checkweighers/multihead (linearity+repeatability+readability, NIST mass); BTU meters (combined flow + 2 RTDs); displays/controllers/samplers/pumps/alarms (no independent spec) |

**Floor terms dominate at low signal** — always call them out: mag ±1/±2 mm/s floors on RAS/WAS/sludge; small DN; Yokogawa EJA narrow-span formula; Rosemount 1151 temp term. **Square-root DP flow:** a fixed ±% of DP span becomes a much larger % error in indicated flow at low flow.

---

## 4. Metal detectors — not zero/span

Metal detectors are verified with **certified test pieces**, not calibrated with zero/span:

```
<b>ACCURACY:</b> pass/fail against the test-piece standard, not a % figure.
<b>ZERO/SPAN:</b> n/a — a metal detector is verified with CERTIFIED TEST SPHERES, not a zero/span cal.
<b>SENSITIVITY:</b> stated as the smallest detectable sphere diameter for each metal type —
  FERROUS (e.g. 1.5 mm), NON-FERROUS (e.g. 2.0 mm), STAINLESS STEEL (e.g. 2.5 mm).
  Stainless is always the hardest to detect (least magnetic/conductive contrast).
<b>STANDARD:</b> certified test spheres traceable to the wands/cards supplied with the head.
<b>GENERAL</b>
<brand/model> metal detector, <aperture WxH>, <product>. Balanced-coil through-aperture head with
auto-reject. Food-safety critical control point (HACCP/BRC) — verification is a documented QA record.
<b>CAL NOTES:</b> run all THREE test pieces (ferrous, non-ferrous, stainless) through the aperture at
production belt speed, at the WORST-CASE position (usually the geometric centre of the aperture, the
least-sensitive point), embedded in product to include the product effect. Verify the REJECT mechanism
actually removes the pack and that the fail-safe (air-fail, belt-stop, bin-full) trips. Product-effect
"phasing" drifts with product temperature/moisture — re-phase on product changeover.
[AI-gen: <brand> metal detector / HACCP, <Month Year>]
```

---

## 5. Junk / placeholder model numbers

Don't attempt a spec when the model string carries no manufacturer identity — placeholders like `-`, `_`, `.`, `?`, `N/A`, `NA`, `TBD`, `Illegible`, bare short digit strings (`8`, `1`, `01`, `123`), or brand = a generic "Other" value with no usable model. CapStone's `isUsableModelForAiSpecs()` in `src/app.js` implements this filter automatically for the live app; anyone doing this by hand (Claude/Cursor) should apply the same judgment.

**Exception:** when brand + type ARE present, technology-level guidance is still useful even with a junk model — e.g. brand "Milltronics" + type "Flume/Weir" = ultrasonic open-channel guidance with "MODEL NOT RECORDED" noted. Only truly identity-less records (no brand, no model, no serial) should be skipped entirely.

---

## 6. The sensor-model gap

Many records hold a TRANSMITTER/CONTROLLER in `Asset_Model_Number` while `Model_Number` (Sensor Model Number) is blank — and the calibration data actually lives on the SENSOR, not the transmitter. Affects Rosemount 8712/8732, Siemens MAG 5000/6000 (SENSORPROM), Krohne IFC (GK value), Micro Motion 1700/5700 (FCF), Foxboro IMT25 (Meter Factor), ABB MagMaster, Badger M2000, Hach sc. Where this applies, say so in the spec and note the sensor data lives on the sensor — don't invent a sensor model.

---

## 7. Family traps (the part techs actually need)

- **Siemens mags:** DN/serial/cal factor in SENSORPROM on the SENSOR terminal box; transmitter swap is plug-and-play, NO recal. Never hand-enter a cal factor.
- **E+H:** DN/cal factor in S-DAT/HistoROM. DN letter codes 1H/1F/2H/2F/3F map to DN100/150/200/250/350 — confirm on the nameplate before relying on it.
- **Krohne:** GK value hand-transferred on converter swap.
- **Micro Motion:** FCF stamped on sensor; NO span trim; field job = verify FCF + ZERO at no-flow/full/blocked-downstream. Bad zero mimics bad cal. Gas Coriolis zero pressurized. Portable skids re-zero after each move.
- **Foxboro IMT25:** enter "IMT25 Cal Fact" from FLOWTUBE label; generic Cal Factor × Table2.
- **Clamp-on ultrasonic:** accuracy dominated by ENTERED PIPE DATA (OD, wall, liner, sound velocity); wrong wall invisible to loop cal. Portables re-enter every site.
- **Ultrasonic LEVEL/open-channel:** no zero/span; measures DISTANCE; Empty=distance to invert; flow error dominated by flume/weir equation + measuring point + blanking + false-echo map + temp comp.
- **Radar (FMR/FMP/VEGAPULS):** ±2 mm ABSOLUTE; guided-wave probe length must match config; immune to temp/foam/vapor.
- **Absolute vs gauge pressure:** an absolute-pressure unit (e.g. 2088A) CANNOT be vent-zeroed (shifts ~14.7 psi).
- **Gas:** bump ≠ cal; expired cal gas is the #1 span-failure cause; catalytic LEL beads poisoned by silicone/H2S/halogen read LOW while still zeroing OK; IR LEL can't detect hydrogen + defeated by condensation; PID needs own zero + isobutylene (lamp clean if won't span); O2 cells die on the calendar, zero with N2; adsorptive gases (NH3/Cl2/SO2/H2S) need short PTFE.
- **Hach:** sc100/sc200 are CONTROLLERS (sensor holds cal, same part# legit on pH+DO). LDO absolute ±0.1 mg/L (=±10% at 1 mg/L); consumable=cap 1–2 yr. CL17 ±5% reading OR ±0.04 floor; "drift" = reagent/pump/flow/dirty cell. 5081 DO = amperometric Clark cell (needs flow, 30-min polarization).
- **pH:** no zero (isopotential pH7=0 mV); "span" = slope 59.16 mV/pH; slope <90% = dying electrode no cal fixes.
- **Conductivity:** zero = dry air-cal; "span" = cell constant K; wrong K scales everything.
- **Mechanical water meters:** no electrical span; AWWA % of REGISTRATION; test MIN/INTERMEDIATE/MAX (worn passes at max, fails at min); wear reads LOW; bearing wear dominant on propellers; compound = test both elements + crossover; turbines sensitive to swirl.
- **RTD temp:** TWO error terms (±0.15°C input + ±0.02% span D/A); simulating an RTD tests the TRANSMITTER, not the element — verify the element separately (ice bath/dry block).
- **Thermal-mass gas (FCI):** calibrated for a SPECIFIC gas composition; digester gas varies → undetectable error; insertion + moisture/tar reads LOW.
- **BTU meters:** combined error of flow + 2 RTDs; small delta-T means a 0.1°C RTD mismatch = several %; verify RTDs as a MATCHED PAIR.
- **Balances/checkweighers/multihead:** no % accuracy; NIST cal mass; checkweigher verify DYNAMICALLY at belt speed; multihead calibrate EVERY head (one bad cell biases every combination invisibly).
- **Shop standards (Fluke/Mensor/AMETEK):** their cal governs every job; track cal-due/cert; maintain 4:1 test uncertainty ratio; stem conduction is the largest temp-source error.
- **Displays / pumps / alarms / drawdown:** nothing to calibrate — verify vs source+SCADA / it's a method / name the source instrument.

---

## 8. Cal notes: tone (examples)

Write the `<b>CAL NOTES:</b>` line last, for someone standing at the instrument with a calibrator in their hand:

- "A poisoned catalytic bead reads LOW while still passing a zero check. Span is the only test that finds it."
- "Wear always reads LOW, and a single-point test hides it. Test at three AWWA points."
- "Simulating an RTD tests the TRANSMITTER, not the element. Verify the element separately."
- "This is an ABSOLUTE transmitter. It cannot be zeroed by venting to atmosphere."
- "A bad zero looks exactly like a bad calibration and is the usual cause of low-flow error."
