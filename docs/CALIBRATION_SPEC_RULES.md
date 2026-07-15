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
| `If_Asset_Brand_Other_explain` | text | the real brand/manufacturer when `Asset_Brand` is a generic "Other" (e.g. "1 Other") — read it as the brand for the web search and spec |
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
ACCURACY: ±<value> — OF READING (rate) | OF SPAN | OF FULL SCALE | OF RANGE | absolute units
ZERO/LRL: <value or how established>
SPAN/URL: <value, or "NOT SET BY THIS MODEL CODE" + where to find it>
MINIMUM SPAN: <value or n/a>
RESOLUTION: <value>
GENERAL
<3–6 lines: type, sensor tech, output, supply, ratings, discontinued/successor status>
CAL NOTES: <1–3 lines of practical field guidance — the part techs actually read>
[AI-gen: <source>, <Month Year>]
```

Rules:
- **Search the web first.** Before writing, look up the exact `Asset_Brand` + `Asset_Model_Number` (e.g. query `"<brand> <model> datasheet accuracy specification"`), read the published figures from the manufacturer datasheet or a trustworthy source, and base every number on what you actually found rather than on memory. When `Asset_Brand` is a generic "Other" value but `If_Asset_Brand_Other_explain` names the actual brand/manufacturer, use that explain text as the brand for the search and the spec. Cite the source in the `[AI-gen]` line (manufacturer or domain). Only fall back to `NOT VERIFIED` when a search does not surface a trustworthy figure. CapStone's auto-generation enables web-search grounding on both the Gemini (`google_search`) and Claude (`web_search`) draft calls — keep `search:true` on those calls in `fetchModelAiSpecsDraft()`.
- **ACCURACY line first, always** — this is the single most important line (see §3).
- Section titles and field labels use **plain-text ALL CAPS** (`ACCURACY:`, `ZERO/LRL:`, `GENERAL`, `CAL NOTES:`, etc.). The `Model_AI_Specs` Zoho field is plain text and cannot render HTML, so do **not** wrap labels in `<b>` tags or any other markup — the tags would show up as literal characters. No HTML, no markdown bullets. CapStone's `stripAiSpecsBold()` in `src/app.js` also strips any stray `<b>`/`</b>` tags from generated and existing/archived specs as a safety net.
- The accuracy line **must** state its basis explicitly.
- If a spec cannot be verified: write `NOT VERIFIED` / `CONFIRM from <source>` — **never invent a number.**
- Under 2000 characters.
- Same model string on multiple records → same body text (service-specific detail may differ).
- The `CAL NOTES:` line must tell a tech something a datasheet wouldn't: what fails, what to check first, what the spec hides. Write it for someone standing at the instrument with a calibrator (see §7 for tone examples).
- If the brand/model given isn't a real, identifiable instrument (placeholder text, non-manufacturer brand, no usable model/serial), don't write a spec at all — this is a junk/placeholder record, not a calibration question (see §5).

### Updates (existing asset save)

When CapStone updates an existing Equipment record and regenerates specs:

```
<new spec — same format as above, current/active at top>

OLD SPEC
<previous active spec from Zoho before this save>

OLD SPEC
<older archived spec, if any — preserve prior archive chain>
```

Rules:
- Generate a **new** spec on update the same way as create.
- The **previous active** portion (everything above the first `OLD SPEC` header in Zoho) moves under a new `OLD SPEC` header after two blank lines.
- Keep any prior `OLD SPEC` archive chain below that.
- Total field still under 2000 characters (truncate from the bottom if needed).

### Provider strategy (CapStone auto-generation)

**Gemini is the single source of truth. Claude is a fallback only — there is no merge step.** The old two-draft-plus-merge design was dropped: the merge added little (Gemini was already authoritative) but was fragile — a merge that returned empty ("thinking"-token exhaustion) or a stray `SKIP` could discard two perfectly good drafts and wrongly report "AI could not identify this instrument."

How `generateModelAiSpecsIfNeeded()` picks a spec:

- `modelAiSpecsProviders()` orders providers **Gemini first**, then Claude (only the ones whose key exists).
- CapStone asks Gemini for the spec. If Gemini returns a usable spec, that is the field — Claude is never called (one API call, faster and cheaper).
- Claude is queried **only** when Gemini is absent (no Gemini key), returns `SKIP`, errors, or returns empty. Its draft is then used verbatim.
- The status note reflects this: a fallback result reads `Model_AI_Specs from Claude (Gemini fallback) — <why Gemini didn't answer>`. A Claude-only user is nudged to add a Gemini key for the primary lookup.
- The `NEVER invent a numeric spec` rule still overrides everything: if the chosen model has no confident figure, it writes `NOT VERIFIED`.

**Model tier & token budget (why the field can look thinner than a direct Gemini search):** the Gemini web app answers a brand+model question with a Pro-tier model, deep "thinking", and multi-step browsing, and returns a full multi-paragraph write-up. CapStone must fit a 2000-char calibration summary, so the output is intentionally terser — but the *research* should be just as good. To keep it so, the Gemini draft call in `src/app.js` sets `preferQuality:true` (resolves a Pro model such as `gemini-2.5-pro` via `GEMINI_QUALITY_MODEL_PREFERENCE`, falling back to the Flash list only when the key lacks Pro access or quota) and uses a generous `maxTok` (~2048). The generous token budget matters because Gemini 2.5 "thinking" tokens count against `maxOutputTokens`; a tight budget gets eaten by reasoning and yields a truncated/empty spec. Keep `search:true` on the draft calls so the model reads live datasheets rather than working from memory.

Keep this in sync with `generateModelAiSpecsIfNeeded()`/`fetchModelAiSpecsDraft()`, `modelAiSpecsProviders()`, and `GEMINI_QUALITY_MODEL_PREFERENCE`/`callGeminiAPI(...preferQuality)` in `src/app.js`.

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
ACCURACY: pass/fail against the test-piece standard, not a % figure.
ZERO/SPAN: n/a — a metal detector is verified with CERTIFIED TEST SPHERES, not a zero/span cal.
SENSITIVITY: stated as the smallest detectable sphere diameter for each metal type —
  FERROUS (e.g. 1.5 mm), NON-FERROUS (e.g. 2.0 mm), STAINLESS STEEL (e.g. 2.5 mm).
  Stainless is always the hardest to detect (least magnetic/conductive contrast).
STANDARD: certified test spheres traceable to the wands/cards supplied with the head.
GENERAL
<brand/model> metal detector, <aperture WxH>, <product>. Balanced-coil through-aperture head with
auto-reject. Food-safety critical control point (HACCP/BRC) — verification is a documented QA record.
CAL NOTES: run all THREE test pieces (ferrous, non-ferrous, stainless) through the aperture at
production belt speed, at the WORST-CASE position (usually the geometric centre of the aperture, the
least-sensitive point), embedded in product to include the product effect. Verify the REJECT mechanism
actually removes the pack and that the fail-safe (air-fail, belt-stop, bin-full) trips. Product-effect
"phasing" drifts with product temperature/moisture — re-phase on product changeover.
[AI-gen: <brand> metal detector / HACCP, <Month Year>]
```

---

## 5. Junk / placeholder model numbers

Don't attempt a spec when the model string carries no manufacturer identity — placeholders like `-`, `_`, `.`, `?`, `N/A`, `NA`, `TBD`, `Illegible`, bare short digit strings (`8`, `1`, `01`, `123`), or brand = a generic "Other" value with no usable model. CapStone's `isUsableModelForAiSpecs()` in `src/app.js` implements this filter automatically for the live app; anyone doing this by hand (Claude/Cursor) should apply the same judgment. A short model is still blocked when `Asset_Brand` is a generic "Other" *only if* `If_Asset_Brand_Other_explain` is also empty — a named manufacturer in the explain field is enough identity to attempt a spec.

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

Write the `CAL NOTES:` line last, for someone standing at the instrument with a calibrator in their hand:

- "A poisoned catalytic bead reads LOW while still passing a zero check. Span is the only test that finds it."
- "Wear always reads LOW, and a single-point test hides it. Test at three AWWA points."
- "Simulating an RTD tests the TRANSMITTER, not the element. Verify the element separately."
- "This is an ABSOLUTE transmitter. It cannot be zeroed by venting to atmosphere."
- "A bad zero looks exactly like a bad calibration and is the usual cause of low-flow error."
