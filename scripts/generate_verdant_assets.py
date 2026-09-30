import os
import sys
import csv
import json
import math
import struct
import wave
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT_DIR / "verdant_assets"
DROP_DIR = ROOT_DIR / "drop"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
DROP_DIR.mkdir(parents=True, exist_ok=True)

print(f"Generating assets into {OUTPUT_DIR} and syncing to {DROP_DIR}...")

# -------------------------------------------------------------
# 1. verdant_financial_runway_q4.csv & .xlsx
# -------------------------------------------------------------
csv_headers = [
    "Month", "Calendar_Period", "Gross_Revenue_INR", "COGS_Direct_INR",
    "Packaging_Materials_INR", "Inventory_Cold_Holding_INR", "Reefer_Logistics_INR",
    "Performance_Marketing_INR", "Payroll_And_GnA_INR", "Total_Cash_Outflow_INR",
    "Distributor_Receivables_INR", "Net_Monthly_Cash_Burn_INR",
    "Ending_Cash_Balance_INR", "Calculated_Runway_Months"
]

csv_rows = [
    ["Oct 2026", "M1", 4200000, 1722000, 880000, 340000, 560000, 1250000, 2098000, 6850000, 1420000, -2650000, 31350000, 11.83],
    ["Nov 2026", "M2", 4450000, 1824500, 910000, 355000, 585000, 1320000, 2105500, 7100000, 1580000, -2650000, 28700000, 10.83],
    ["Dec 2026", "M3", 4800000, 1968000, 970000, 370000, 620000, 1450000, 2142000, 7520000, 1850000, -2720000, 25980000, 9.55],
    ["Jan 2027", "M4", 4600000, 1886000, 930000, 360000, 600000, 1350000, 2124000, 7250000, 1650000, -2650000, 23330000, 8.80],
    ["Feb 2027", "M5", 4750000, 1947500, 950000, 365000, 615000, 1390000, 2132500, 7400000, 1720000, -2650000, 20680000, 7.80],
    ["Mar 2027", "M6", 5100000, 2091000, 1020000, 390000, 655000, 1500000, 2194000, 7850000, 1980000, -2750000, 17930000, 6.52],
    ["Apr 2027", "M7", 5300000, 2173000, 1060000, 405000, 680000, 1550000, 2232000, 8100000, 2100000, -2800000, 15130000, 5.40],
    ["May 2027", "M8", 5550000, 2275500, 1110000, 420000, 710000, 1620000, 2264500, 8400000, 2250000, -2850000, 12280000, 4.31],
    ["Jun 2027", "M9", 5800000, 2378000, 1160000, 440000, 740000, 1700000, 2332000, 8750000, 2400000, -2950000, 9330000, 3.16],
    ["Jul 2027", "M10", 6100000, 2501000, 1220000, 460000, 780000, 1780000, 2409000, 9150000, 2600000, -3050000, 6280000, 2.06],
    ["Aug 2027", "M11", 6400000, 2624000, 1280000, 480000, 820000, 1850000, 2496000, 9550000, 2850000, -3150000, 3130000, 0.99],
    ["Sep 2027", "M12", 6700000, 2747000, 1340000, 500000, 860000, 1950000, 2553000, 9950000, 3100000, -3250000, -120000, -0.04]
]

# Write CSV
csv_path = OUTPUT_DIR / "verdant_financial_runway_q4.csv"
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(csv_headers)
    writer.writerows(csv_rows)

with open(DROP_DIR / "verdant_financial_runway_q4.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(csv_headers)
    writer.writerows(csv_rows)

print("Created verdant_financial_runway_q4.csv")

# Write XLSX using openpyxl
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Financial_Runway_Model"

header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
header_fill = PatternFill(start_color="1E4D2B", end_color="1E4D2B", fill_type="solid") # Forest Green
thin_border = Border(
    left=Side(style='thin', color='DDDDDD'),
    right=Side(style='thin', color='DDDDDD'),
    top=Side(style='thin', color='DDDDDD'),
    bottom=Side(style='thin', color='DDDDDD')
)

ws.append(csv_headers)
for col_num, cell in enumerate(ws[1], 1):
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

for row in csv_rows:
    ws.append(row)

for row in ws.iter_rows(min_row=2, max_row=len(csv_rows)+1, min_col=1, max_col=len(csv_headers)):
    for cell in row:
        cell.border = thin_border
        if isinstance(cell.value, (int, float)):
            cell.number_format = '#,##0.00' if isinstance(cell.value, float) else '#,##0'

for col in ws.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = openpyxl.utils.get_column_letter(col[0].column)
    ws.column_dimensions[col_letter].width = max(max_len + 3, 14)

xlsx_path = OUTPUT_DIR / "verdant_financial_runway_q4.xlsx"
wb.save(xlsx_path)
wb.save(DROP_DIR / "verdant_financial_runway_q4.xlsx")
print("Created verdant_financial_runway_q4.xlsx")

# -------------------------------------------------------------
# 2. Retail_Distribution_Agreement_OrganicSuperstores.docx
# -------------------------------------------------------------
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = docx.Document()

# Set standard margins
sections = doc.sections
for s in sections:
    s.top_margin = Inches(0.8)
    s.bottom_margin = Inches(0.8)
    s.left_margin = Inches(0.8)
    s.right_margin = Inches(0.8)

# Title
title_p = doc.add_paragraph()
title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title_p.add_run("MASTER RETAIL VENDOR & CONSIGNMENT DISTRIBUTION AGREEMENT\n")
run.bold = True
run.font.size = Pt(16)
run.font.color.rgb = RGBColor(0x1E, 0x4D, 0x2B)

meta_p = doc.add_paragraph()
meta_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
m_run = meta_p.add_run("AGREEMENT REF: NSM-RET-2026-0941  |  EFFECTIVE DATE: May 15, 2026  |  JURISDICTION: Mumbai, India")
m_run.font.size = Pt(9.5)
m_run.font.italic = True

doc.add_paragraph()

# Parties
h1 = doc.add_heading("PARTIES TO THE AGREEMENT", level=2)
p_parties = doc.add_paragraph(
    "1. NATURE'S MART SUPERMARKETS PRIVATE LIMITED, having its registered office at Level 7, "
    "Westgate Commercial Towers, Senapati Bapat Marg, Lower Parel, Mumbai 400013 (hereinafter 'Retailer');\n\n"
    "AND\n\n"
    "2. VERDANT BOTANICALS PRIVATE LIMITED, having its principal manufacturing office at Unit 4B, "
    "Godrej Genesis Industrial Park, Kanjurmarg East, Mumbai 400042 (hereinafter 'Vendor')."
)

# Recitals
doc.add_heading("RECITALS", level=2)
doc.add_paragraph(
    "WHEREAS, Vendor manufactures cold-crafted botanical and adaptogenic bottled beverages packaged in 250ml nitrogen-dosed glass containers;\n"
    "WHEREAS, Retailer operates an omnichannel chain of 60 premium supermarket outlets located across Mumbai and Bengaluru; and\n"
    "WHEREAS, Vendor desires to distribute its functional beverage lines across Retailer's store network under agreed terms."
)

# Section 1
doc.add_heading("SECTION 1: SCOPE OF DISTRIBUTION & STORE ROLLOUT", level=2)
doc.add_paragraph(
    "1.1 Store Allocation: Retailer grants Vendor shelf placement across sixty (60) tier-1 supermarket retail stores situated in Mumbai (32 outlets) and Bengaluru (28 outlets) commencing no later than May 15, 2026.\n"
    "1.2 Approved SKUs: (a) Sparkling Ashwagandha-Tulsi Cold Brew (250ml glass, MRP ₹160.00); (b) Turmeric-Yuzu Nitro Hydrator (250ml glass, MRP ₹160.00); (c) Blue Lotus Calm Elixir (200ml glass, MRP ₹160.00).\n"
    "1.3 Initial Pipeline Stock: Vendor shall deliver an initial consignment lot of not less than five thousand (5,000) aggregate units across allocated central distribution hubs in Bhiwandi and Whitefield by May 10, 2026."
)

# Section 2
doc.add_heading("SECTION 2: PRICING, MARGIN DISCOUNT & REBATES", level=2)
doc.add_paragraph(
    "2.1 Retail Base Pricing: Maximum Retail Price (MRP) per container is pegged at ₹160.00 inclusive of GST.\n"
    "2.2 Distributor Wholesale Margin: Retailer shall receive a mandatory base distributor trade discount of forty-four percent (44.0%) off the printed MRP, establishing Vendor's net realization at ₹89.60 per unit delivered.\n"
    "2.3 Listing & Slotting Fees: A one-time non-refundable brand onboarding fee of ₹3,00,000 (Rupees Three Lakhs) shall be deducted pro-rata from the first three monthly vendor settlement disbursements."
)

# Section 3
doc.add_heading("SECTION 3: DELIVERY & COLD-CHAIN SPECIFICATIONS", level=2)
doc.add_paragraph(
    "3.1 Cold-Chain SLA: All beverages must be transported via temperature-controlled refrigerated logistics vehicles maintained continuously between +2°C and +6°C.\n"
    "3.2 Shelf-Life Buffer: Products delivered to central fulfillment centers must possess at least seventy-five percent (75%) of unexpired shelf-life (minimum 135 days remaining of total 180-day certified stability)."
)

# Section 4 - TRAP CLAUSE 1
doc.add_heading("SECTION 4: INVOICING & PAYMENT SETTLEMENT TERMS (CRITICAL)", level=2)
p_trap1 = doc.add_paragraph()
r_trap1_lead = p_trap1.add_run("4.1 Invoicing: Invoices shall be generated electronically upon central warehouse docket receipt verification.\n")
r_trap1 = p_trap1.add_run(
    "4.2 Payment Terms: All undisputed invoices shall be settled by the Retailer strictly on a Net Ninety (90) Days credit basis from the date of physical receipt and reconciliation at the central warehouse. In the event of audit disputes regarding promotional chargebacks or slotting reconciliations, payment for the disputed portion shall be withheld indefinitely pending quarterly commercial reconciliation meetings."
)
r_trap1.bold = True
r_trap1.font.color.rgb = RGBColor(0x99, 0x00, 0x00)

# Section 5 & 6
doc.add_heading("SECTION 5: IN-STORE SAMPLING & PROMOTIONAL SPEND", level=2)
doc.add_paragraph(
    "5.1 Promoter Staffing: Vendor shall provide two (2) certified brand promoters per high-velocity store (top 20 designated stores) for the opening launch weekend (May 16–17, 2026) at its exclusive cost.\n"
    "5.2 Sampling Stock: Up to 500 units per designated store shall be furnished free-of-charge by Vendor."
)

doc.add_heading("SECTION 6: RETURN TO VENDOR (RTV) & BREAKAGE", level=2)
doc.add_paragraph(
    "6.1 Breakage Allocation: Glass bottle breakage exceeding 0.5% identified during transit or in-store stocking shall be debited to Vendor at full retail value (₹160.00 per unit).\n"
    "6.2 Unsold Inventory: Retailer reserves the right to initiate Return to Vendor (RTV) for inventory lingering past ninety (90) days from receiving date."
)

# Section 8 - TRAP CLAUSE 2
doc.add_heading("SECTION 8: PENALTIES, STOCKOUTS & LIQUIDATED DAMAGES (CRITICAL)", level=2)
p_trap2 = doc.add_paragraph()
r_trap2 = p_trap2.add_run(
    "8.1 Uncapped Stockout Liquidated Damages: Vendor acknowledges that shelf space across the 60 premium retail stores represents substantial commercial real estate. In the event that Vendor fails to fulfill any scheduled restocking purchase order within forty-eight (48) hours of receipt, Retailer shall automatically levy liquidated damages of ₹1,500 per out-of-stock SKU per retail store for each elapsed calendar day of stockout. Such damages shall be uncapped, without any upper percentage or monetary ceiling relative to invoice value, and shall be deducted directly from any outstanding receivables accrued by Vendor."
)
r_trap2.bold = True
r_trap2.font.color.rgb = RGBColor(0x99, 0x00, 0x00)

doc.add_heading("SECTION 9: GOVERNING LAW & SIGNATURE BLOCKS", level=2)
doc.add_paragraph(
    "9.1 This Agreement is governed by the laws of India. Courts in Mumbai hold exclusive jurisdiction.\n\n"
    "For Nature's Mart Supermarkets Pvt. Ltd.:\n"
    "Signed: Rajesh Singhania, Sr. Director - Procurement (Date: April 28, 2026)\n\n"
    "For Verdant Botanicals Pvt. Ltd.:\n"
    "Signed: ___________________________, Meera Nambiar (Date: _______________)"
)

docx_path = OUTPUT_DIR / "Retail_Distribution_Agreement_OrganicSuperstores.docx"
doc.save(docx_path)
doc.save(DROP_DIR / "Retail_Distribution_Agreement_OrganicSuperstores.docx")
print("Created Retail_Distribution_Agreement_OrganicSuperstores.docx")

# -------------------------------------------------------------
# 3. FSSAI_Compliance_and_Batch_Stability_Report.pdf
# (Generate a clean, valid PDF containing exact uncompressed text)
# -------------------------------------------------------------
pdf_text_content = """FOOD SAFETY AND STANDARDS AUTHORITY OF INDIA (FSSAI)
CERTIFICATE OF ANALYSIS & ACCELERATED REAL-TIME BATCH STABILITY REPORT
NABL Accredited Analytical Testing Laboratory ISO/IEC 17025:2017 Certified

1. ADMINISTRATIVE & REGULATORY METADATA
- Manufacturing Licensee: Verdant Botanicals Private Limited
- Central FSSAI Registration Number: 11524999000342 (State: Maharashtra)
- Facility Location: Unit 4B, Godrej Genesis Industrial Park, Kanjurmarg East, Mumbai 400042
- Audit Period: Q3/Q4 Financial Year 2025-2026
- Test Sample Formulation: Cold-Crafted Botanical Sparkling Beverage (SKU: VB-ASH-250)
- Batch Under Test: Batch No. #VB-2026-B089 | Lot Quantity: 10,000 Units (250ml Glass)
- Date of Manufacture: 15th January 2026
- Testing Protocol: FSSAI Manual of Methods of Analysis of Foods / AOAC 21st Edition

2. ACCELERATED & REAL-TIME STABILITY AUDIT (180 DAYS)
Testing Conditions: Real-time (+4C +/- 1C, 65% RH) and Accelerated (+25C +/- 2C, 60% RH)
- Total Aerobic Microbial Count: < 10 CFU/ml (Baseline) | 30 CFU/ml (Day 180) | Standard: Max 50 CFU/ml [PASSED]
- Coliform Organisms: Absent in 100ml [PASSED (Sterile)]
- Yeast & Mould Colony Count: < 5 CFU/ml (Baseline) | 8 CFU/ml (Day 180) | Standard: Max 10 CFU/ml [PASSED]
- Escherichia coli: Absent in 25ml [PASSED]
- Salmonella & Listeria: Absent in 25ml [PASSED]
- pH Invariant Stability: 4.18 pH (Baseline) | 4.12 pH (Day 180) | Standard: 3.80 - 4.40 pH [PASSED]
- Withanolide Bioactive Potency: 12.4 mg/250ml (Baseline) | 11.8 mg/250ml (Day 180) [PASSED (Retention 95.1%)]
- Dissolved Oxygen (Headspace): 0.22 mg/L (Baseline) | 0.34 mg/L (Day 180) | Standard: Max 0.50 mg/L [PASSED]

3. WAREHOUSE COLD-CHAIN & TEMPERATURE EXCURSION AUDIT
Audit conducted at Central Cold Storage Hub (Bhiwandi Warehouse Unit C-12).
- Continuous BLE telemetry across 90 consecutive calendar days.
- Target Specification Range: +2.0C to +6.0C.
- Mean Kinetic Temperature (MKT): +3.84C.
- Excursions > +8.0C: ZERO (0) events recorded.
- Sanitary Pest & Air Particulate Inspection: HEPA scrubbers active; PM2.5 < 15 ug/m3; zero pest intrusions.

4. HEAVY METALS & TOXIN SCREENING
- Lead (as Pb): < 0.05 ppm (Limit: 0.2 ppm) - Compliant
- Cadmium (as Cd): < 0.01 ppm (Limit: 0.1 ppm) - Compliant
- Arsenic (as As): < 0.02 ppm (Limit: 0.1 ppm) - Compliant
- 142 Pesticide residues screened via GC-MS/MS: All below detection threshold (< 0.001 mg/kg).

5. REGULATORY CONCLUSION & OPINION
Batch #VB-2026-B089 satisfies all statutory parameters under FSSAI regulations. Shelf-life certified stable for 180 calendar days when held under +2C to +6C cold-chain conditions.
Lead Quality Auditor: Dr. Sunita Deshmukh, Ph.D., Apex Laboratories (NABL Cert: TC-8491)
Countersigned: Dev Sen, Head of Regulatory Compliance, Verdant Botanicals Inc.
"""

def generate_simple_pdf(text: str, output_path: Path):
    lines = text.split("\n")
    # Build PDF content stream
    content_stream = "BT\n/F1 10 Tf\n50 780 Td\n14 TL\n"
    for line in lines:
        escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        content_stream += f"({escaped}) '\n"
    content_stream += "ET\n"
    
    stream_bytes = content_stream.encode("latin-1", errors="replace")
    stream_len = len(stream_bytes)
    
    pdf_bytes = bytearray()
    pdf_bytes.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    
    offsets = []
    
    # Obj 1: Catalog
    offsets.append(len(pdf_bytes))
    pdf_bytes.extend(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    
    # Obj 2: Pages
    offsets.append(len(pdf_bytes))
    pdf_bytes.extend(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
    
    # Obj 3: Page
    offsets.append(len(pdf_bytes))
    pdf_bytes.extend(b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n")
    
    # Obj 4: Contents
    offsets.append(len(pdf_bytes))
    pdf_bytes.extend(f"4 0 obj\n<< /Length {stream_len} >>\nstream\n".encode("latin-1"))
    pdf_bytes.extend(stream_bytes)
    pdf_bytes.extend(b"\nendstream\nendobj\n")
    
    # Obj 5: Font
    offsets.append(len(pdf_bytes))
    pdf_bytes.extend(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")
    
    # XRef
    xref_offset = len(pdf_bytes)
    pdf_bytes.extend(f"xref\n0 6\n0000000000 65535 f \n".encode("latin-1"))
    for off in offsets:
        pdf_bytes.extend(f"{off:010d} 00000 n \n".encode("latin-1"))
    
    pdf_bytes.extend(f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode("latin-1"))
    
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)

pdf_path = OUTPUT_DIR / "FSSAI_Compliance_and_Batch_Stability_Report.pdf"
generate_simple_pdf(pdf_text_content, pdf_path)
generate_simple_pdf(pdf_text_content, DROP_DIR / "FSSAI_Compliance_and_Batch_Stability_Report.pdf")
print("Created FSSAI_Compliance_and_Batch_Stability_Report.pdf")

# -------------------------------------------------------------
# 4. Verdant_Company_Operations_Handbook.md
# -------------------------------------------------------------
handbook_content = """# VERDANT BOTANICALS, INC. — INTERNAL OPERATIONS HANDBOOK
**Document Version:** 3.2 | **Effective:** October 2026  
**Governance Authority:** Executive Leadership Team (Roy, Mehta, Nambiar, Sen)

---

## 1. CORE OPERATIONAL INVARIANTS & EXPENDITURE AUTHORITY

### 1.1 Dual-Authorization Financial Thresholds (`POL-003`)
- **Tier 1 (Sub-₹15,000):** Operating managers (Kabir, Meera, Dev) hold independent signing authority for routine recurring consumable expenses.
- **Tier 2 (₹15,001 to ₹50,000):** Department heads may authorize vendor work orders, packaging stock purchases, or freight invoices within pre-approved monthly OPEX budgets.
- **Tier 3 (Exceeding ₹50,000):** **Mandatory Dual-Authorization.** Any single commitment, Purchase Order (PO), packaging cylinder run, or marketing activation contract exceeding **₹50,000 INR** strictly requires written countersignature from the Founder/CEO (Ananya Roy) AND the Head of Finance (Dev Sen).
- *Violations:* Any disbursement committed without dual signature is classified as an unauthorized liability and triggers an immediate internal audit freeze.

---

## 2. COMMERCIAL TERMS, PRICING & MARGIN GOVERNANCE

### 2.1 Gross Margin Floor Policy (`POL-002`)
- Verdant Botanicals operates on premium, organic, cold-pressed raw ingredients with high cold-chain handling overhead.
- Under no commercial circumstances shall any contract, retail listing agreement, or distributor partnership yield a **realized Gross Margin below thirty-five percent (35.0%)**.
- Formula: 
  $$\\text{Gross Margin} = \\frac{\\text{Net Invoice Realization per Unit} - \\text{Direct COGS}}{\\text{Net Invoice Realization per Unit}} \\ge 35\\%$$
- At our current baseline direct COGS of **₹62.00 per 250ml unit**, the minimum acceptable net distributor realization is **₹95.38 per unit**. Consequently, maximum allowable distributor/retailer discount off ₹160 MRP is capped at **40.38%**. Any proposed discount exceeding 40% (such as 44%) violates `POL-002` and cannot be executed without Board-level capital restructuring.

### 2.2 Payment Terms Ceiling (`POL-001`)
- **Standard Modern Trade Terms:** Net 30 Days from central warehouse docket delivery.
- **Absolute Maximum Credit Ceiling:** Under no circumstances shall credit terms exceed **thirty (30) calendar days** (`POL-001`).
- Extended terms (e.g., Net 60 or Net 90) place catastrophic pressure on working capital by financing distributor retail shelves using startup equity cash.
- Counter-Clause Requirement: If a key account demands > 30 days, the commercial lead must mandate a minimum 40% upfront deposit or require distributor financing via invoice discounting at the buyer's cost.

---

## 3. LOGISTICS, COLD CHAIN & DAMAGE SETTLEMENT RULES

### 3.1 Breakage & In-Transit Loss Protocol
- Glass packaging incurs baseline freight breakage. 
- Maximum contractual breakage tolerance: **1.0%** of invoice volume.
- Claims procedure: Distributors must submit high-resolution unboxing photographs and warehouse receiving dockets with seal numbers within **forty-eight (48) hours** of physical truck discharge.
- Unsubstantiated or delayed claims are automatically rejected.

### 3.2 Liquidated Damages & Stockout Liability Limit (`POL-004`)
- Stockout penalties from modern trade accounts must always be capped.
- **Mandatory Liability Ceiling:** Any vendor distribution agreement must explicitly cap total cumulative stockout penalties, marketing chargebacks, and liquidated damages at **no more than ten percent (10.0%) of the specific affected invoice value**.
- *Uncapped or per-day liquidated damages clauses (e.g., ₹1,500/day/store) are strictly prohibited.*

---

## 4. PRODUCT RETURN & INVENTORY ROTATION POLICY
- **Return to Vendor (RTV):** RTV is permitted solely for microbiological defects or verifiable off-taste batch anomalies confirmed by our NABL retained samples.
- **Shelf Expiry Liquidation:** Stock lingering inside distributor warehouses with less than 45 days remaining of the 180-day shelf life must be flagged for promotional flash markdown (50% shared discount cost) rather than returned to factory.
"""

with open(OUTPUT_DIR / "Verdant_Company_Operations_Handbook.md", "w", encoding="utf-8") as f:
    f.write(handbook_content)
with open(DROP_DIR / "Verdant_Company_Operations_Handbook.md", "w", encoding="utf-8") as f:
    f.write(handbook_content)
print("Created Verdant_Company_Operations_Handbook.md")

# -------------------------------------------------------------
# 5. retail_buyer_negotiation_call.vtt & .wav
# -------------------------------------------------------------
vtt_content = """WEBVTT - Verdant Botanicals Key Account Negotiation Call

00:00.000 --> 00:06.500
Meera Nambiar: Hi Rajesh! Thanks so much for hopping on the call on such short notice. I hope the sample crate of our cold-crafted Ashwagandha brew reached your Lower Parel office in good condition?

00:06.800 --> 00:15.200
Rajesh Singhania: Afternoon Meera. Yes, the tasting committee went through all three SKUs yesterday. Look, the flavor profiles are fantastic, and the nitro carbonation holds up remarkably well in glass.

00:15.500 --> 00:23.000
Meera Nambiar: That's wonderful to hear! We spent six months perfecting the cold extraction so the botanicals remain bioactive without that medicinal bitter aftertaste.

00:23.300 --> 00:33.400
Rajesh Singhania: Exactly. Which is why our Category Council wants to move fast. We are willing to greenlight Verdant Botanicals across all sixty prime Nature's Mart supermarkets in Mumbai and Bangalore by May 15th.

00:33.800 --> 00:41.200
Meera Nambiar: Sixty stores right out of the gate? That is huge for us, Rajesh! That completely accelerates our southern retail roadmap.

00:41.500 --> 00:54.800
Rajesh Singhania: It is a massive shelf footprint, Meera. But because we're taking on significant cold shelf refrigeration risks for a young D2C beverage, our listing committee has laid down non-negotiable commercial parameters.

00:55.100 --> 01:05.400
Meera Nambiar: Understood. Walk me through the specifics so I can sync with Kabir and our finance team on inventory scheduling.

01:05.800 --> 01:21.000
Rajesh Singhania: First, we need a forty-four percent distributor trade margin off your printed MRP of one hundred and sixty rupees. Second, our standard procurement settlement for new modern trade entrants is Net 60 payment terms from central warehouse receipt.

01:21.400 --> 01:33.800
Meera Nambiar: Forty-four percent margin and Net 60? Rajesh, our standard commercial framework caps trade margins at thirty-five percent with strict Net 30 terms. Our working capital can't easily absorb a two-month receivables float.

01:34.200 --> 01:48.500
Rajesh Singhania: Meera, sixty stores is premium real estate. Raw Pressery and Epigamia are fighting for those same chilled shelf slots. If you want this footprint by May 15th, forty-four percent and Net 60 is the entry ticket. Take it or we give the facings to another brand.

01:48.900 --> 02:02.100
Meera Nambiar: Look, we want this partnership. Let me commit to this right now: we will guarantee delivery of your initial five thousand units across your Mumbai and Bangalore distribution centers by May 10th, five days before launch.

02:02.500 --> 02:08.200
Rajesh Singhania: What about in-store consumer engagement during that launch weekend?

02:08.500 --> 02:15.000
Meera Nambiar: We will provide certified in-store sampling promoters across your top twenty velocity outlets for the entire launch weekend at our cost. Send over the formal agreement draft!
"""

with open(OUTPUT_DIR / "retail_buyer_negotiation_call.vtt", "w", encoding="utf-8") as f:
    f.write(vtt_content)
with open(DROP_DIR / "retail_buyer_negotiation_call.vtt", "w", encoding="utf-8") as f:
    f.write(vtt_content)
print("Created retail_buyer_negotiation_call.vtt")

# Generate a 16kHz mono WAV file (135 seconds of gentle ambient speech carrier tones)
def generate_audio_wav(output_path: Path, duration_sec: int = 135):
    sample_rate = 16000
    num_samples = sample_rate * duration_sec
    with wave.open(str(output_path), "wb") as wav_file:
        wav_file.setnchannels(1) # mono
        wav_file.setsampwidth(2) # 16-bit
        wav_file.setframerate(sample_rate)
        # Create subtle modulated speech-like carrier tone
        frames = bytearray()
        for i in range(num_samples):
            t = i / sample_rate
            # 220Hz modulated by 2Hz speech rhythm with low volume
            val = int(1200 * math.sin(2 * math.pi * 220 * t) * (0.5 + 0.5 * math.sin(2 * math.pi * 2.5 * t)))
            frames.extend(struct.pack("<h", val))
        wav_file.writeframes(frames)

wav_path = OUTPUT_DIR / "retail_buyer_negotiation_call.wav"
generate_audio_wav(wav_path, duration_sec=10) # 10s compact valid audio header for instant upload & testing
generate_audio_wav(DROP_DIR / "retail_buyer_negotiation_call.wav", duration_sec=10)
print("Created retail_buyer_negotiation_call.wav")

# -------------------------------------------------------------
# 6. Supporting Operational Files
# -------------------------------------------------------------
# Arjun Sharma Flight Plan
flightplan_content = """# 14-DAY FLIGHT-PLAN: SUPPLY CHAIN & INVENTORY ONBOARDING
**Target Candidate:** Arjun Sharma (`EMP-VRD-005`) | **Supervisor:** Kabir Mehta

#### PHASE 1: WAREHOUSE & INVENTORY INTEGRATION (DAYS 1–4)
- [ ] Complete physical tour and cold-chain inspection of Bhiwandi Central Cold Storage Hub (Unit C-12).
- [ ] Reconcile ERP recorded inventory against physical count for Batch #VB-2026-B089 across all three functional SKUs.
- [ ] Set up continuous BLE temperature logger dashboard; verify alerts trigger when cold ambient drops below +2°C or exceeds +6°C.
- [ ] Map FIFO (First-In, First-Out) shelf rotation protocols for all raw botanical extracts and nitrogen caps.

#### PHASE 2: PACKAGING SUPPLIER AUDIT & PURCHASE GOVERNANCE (DAYS 5–9)
- [ ] Review glass bottle supplier lead times and minimum order quantities (MOQ) with Firozabad Glass Works (Lead time: 21 days; MOQ: 25,000 units).
- [ ] Complete audit of historical purchase orders to verify strict compliance with Founder Dual-Authorization threshold (`POL-003` for orders > ₹50,000).
- [ ] Audit carton corrugated packaging burst strength specifications (3-ply, 150 GSM) for transit survival.

#### PHASE 3: REEFER FREIGHT & COMMERCIAL DISTRIBUTION READINESS (DAYS 10–14)
- [ ] Review master agreements and SLA penalty matrices for cold-chain reefer carriers (ColdEx & Snowman Logistics).
- [ ] Master the 48-hour photographic damage inspection SOP for distributor transit loss claims.
- [ ] Shadow Kabir on Nature's Mart 60-store logistics rollout schedule (5,000 units initial delivery requirement by May 10th).
"""
with open(OUTPUT_DIR / "onboarding_flightplan_arjun.md", "w", encoding="utf-8") as f:
    f.write(flightplan_content)

# Think Tank chat dialogue
thinktank_content = """[10:14 AM] Meera Nambiar (Head of Retail & Key Accounts):
Team, huge news! Rajesh from Nature's Mart just gave us verbal confirmation: they want Verdant in 60 prime stores across Mumbai and Bangalore by May 15th! 🚀 This immediately triples our retail presence and locks out competing kombucha and cold brew brands. But there's a catch: they're insisting on a 44% distributor margin discount and Net 90 payment terms in their master vendor contract.

[10:17 AM] Kabir Mehta (Head of Operations & Supply Chain):
Whoa, hold on Meera. 60 stores means an immediate initial pipeline fill of 5,000 units by May 10th, plus at least 15,000 units a month in steady-state inventory. Our Bhiwandi cold room has 8,200 bottles in stock right now, and Firozabad glass has a 21-day lead time on bottles. If we ramp production for 60 stores, my packaging spend alone will jump by ₹8.5 Lakhs this month.

[10:21 AM] Dev Sen (Head of Finance & Compliance):
Wait, did you say Net 90?! Meera, Net 90 on 60 stores means three whole months of inventory deliveries floating on their books before we see a single rupee. At 15,000 bottles a month at ₹89.60 realization, that's over ₹40 Lakhs in uncollected receivables, plus ₹8L in safety buffer stock. That's a ₹48 Lakh working capital lockup! Our current monthly net burn is already ₹26.5 Lakhs. That would blow a huge hole in our runway.

[10:24 AM] Meera Nambiar:
I know it's aggressive on cash, Dev, but if we don't take this now, Nature's Mart will hand those refrigerated end-caps to Raw Pressery. We can't buy this kind of prime consumer visibility in Bandra, Indiranagar, and Lower Parel with digital ads.

[10:29 AM] Ananya Roy (Founder & CEO):
Proposal: Let's accept Nature's Mart terms with 44% discount and Net 90 to secure the 60-store footprint. We can use our current cash buffer of ₹3.40 Cr to finance the receivables float and establish market dominance before our Series A bridge.
"""
with open(OUTPUT_DIR / "thinktank_growth_dialogue.txt", "w", encoding="utf-8") as f:
    f.write(thinktank_content)

# Policies JSON
policies_data = [
  {
    "policy_id": "POL-001",
    "policy_name": "Payment Terms Credit Ceiling",
    "category": "Treasury & Working Capital",
    "enforcement_level": "BLOCKING_INVARIANT",
    "threshold_rule": "payment_terms_days <= 30",
    "description": "Distributor and retail key account payment credit terms must never exceed Net 30 calendar days.",
    "remediation": "Reject Net 60/90 terms or mandate minimum 40% upfront deposit upon dispatch."
  },
  {
    "policy_id": "POL-002",
    "policy_name": "Gross Margin Floor Invariant",
    "category": "Unit Economics",
    "enforcement_level": "BLOCKING_INVARIANT",
    "threshold_rule": "gross_margin_percentage >= 35.0",
    "description": "No wholesale, modern trade, or distributor agreement shall yield a gross profit margin below 35%.",
    "remediation": "Cap distributor trade discount at maximum 40.0% off printed retail MRP."
  },
  {
    "policy_id": "POL-003",
    "policy_name": "Dual-Authorization Spend Threshold",
    "category": "Corporate Governance & Procurement",
    "enforcement_level": "APPROVAL_GATE",
    "threshold_rule": "order_amount_inr <= 50000 OR (has_signature(Roy) AND has_signature(Sen))",
    "description": "Any single PO, packaging order, or marketing commitment exceeding ₹50,000 requires co-signature by Founder & Head of Finance.",
    "remediation": "Route digital PO docket to Ananya Roy and Dev Sen for dual approval."
  },
  {
    "policy_id": "POL-004",
    "policy_name": "Liquidated Damages & Stockout Liability Cap",
    "category": "Legal & Risk Management",
    "enforcement_level": "BLOCKING_INVARIANT",
    "threshold_rule": "max_liquidated_damages_pct <= 10.0 AND is_capped == True",
    "description": "Contracts must never include uncapped stockout fines; total damages must be capped at 10% of affected invoice value.",
    "remediation": "Strike uncapped per-day fines; insert standard 10% invoice liability ceiling."
  }
]
with open(OUTPUT_DIR / "operational_guardrails_catalog.json", "w", encoding="utf-8") as f:
    json.dump(policies_data, f, indent=2)

# Action Hub Items JSON
action_hub_data = [
  {
    "action_id": "ACT-VRD-001",
    "title": "Stage Initial 5,000-Unit Batch for Nature's Mart 60-Store Rollout",
    "assignee": "Kabir Mehta",
    "department": "Operations & Logistics",
    "priority": "HIGH",
    "due_date": "2026-05-10",
    "status": "PENDING",
    "source_document": "retail_buyer_negotiation_call.vtt",
    "source_offset": "T01:34.200 --> T02:02.100",
    "verbatim_receipt": "Meera Nambiar: 'We will guarantee delivery of your initial five thousand units across your Mumbai and Bangalore distribution centers by May 10th, five days before launch.'",
    "operational_prerequisites": [
      "Confirm Bhiwandi Central Cold Storage Hub has 5,000 units allocated across VB-ASH-250, VB-TUR-250, and VB-LOT-200",
      "Book 2 refrigerated reefer trucks (ColdEx) with +2°C to +6°C datalogging",
      "Verify batch FSSAI Certificate of Analysis is enclosed with shipping manifest"
    ]
  },
  {
    "action_id": "ACT-VRD-002",
    "title": "Redline Section 4.2 (Net 90) and Section 8.1 (Uncapped Penalties) with Nature's Mart",
    "assignee": "Meera Nambiar",
    "department": "Retail & Key Accounts",
    "priority": "CRITICAL",
    "due_date": "2026-05-02",
    "status": "BLOCKED_BY_GUARDRAIL",
    "source_document": "Retail_Distribution_Agreement_OrganicSuperstores.docx",
    "source_offset": "Section 4.2 (Lines 52-57) & Section 8.1 (Lines 76-83)",
    "verbatim_receipt": "Section 4.2: 'Net Ninety (90) Days credit basis' | Section 8.1: 'Such damages shall be uncapped, without any upper percentage or monetary ceiling'",
    "operational_prerequisites": [
      "Transmit TARS counter-clause: Net 30 or Net 60 with 40% rolling advance deposit",
      "Cap Section 8.1 stockout liquidated damages at 10% maximum invoice value per POL-004",
      "Submit revised contract to Ananya Roy and Dev Sen for dual sign-off under POL-003 prior to execution"
    ]
  }
]
with open(OUTPUT_DIR / "action_hub_items.json", "w", encoding="utf-8") as f:
    json.dump(action_hub_data, f, indent=2)

print("\nAll Verdant Botanicals assets generated successfully!")
