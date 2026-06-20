import io
from datetime import datetime
from typing import List, Dict, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

TABLE_STYLE = TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d4ed8")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
])

def generate_portfolio_report(
    portfolio: Dict[str, Any],
    risk_metrics: Dict[str, Any],
    simulations: List[Dict[str, Any]],
    suggestions: List[Dict[str, Any]]
) -> bytes:
    """
    Builds a PDF summarizing portfolio composition, risk metrics, Monte Carlo
    simulation results, and AI-powered suggestions.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.6 * inch, bottomMargin=0.6 * inch)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleStyle", parent=styles["Title"], fontSize=20, spaceAfter=4)
    heading_style = ParagraphStyle(
        "HeadingStyle", parent=styles["Heading2"], spaceBefore=16, spaceAfter=8,
        textColor=colors.HexColor("#1d4ed8")
    )
    body_style = styles["BodyText"]

    elements = []
    elements.append(Paragraph("Portfolio Stress Test Report", title_style))
    elements.append(Paragraph(
        f"{portfolio['name']} &mdash; Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", body_style
    ))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("Portfolio Composition", heading_style))
    comp_data = [["Symbol", "Qty", "Purchase Price", "Current Price", "Value", "P/L %"]]
    for h in portfolio["holdings_detail"]:
        comp_data.append([
            h["symbol"], f"{h['quantity']:g}", f"${h['purchase_price']:.2f}",
            f"${h['current_price']:.2f}", f"${h['current_value']:.2f}", f"{h['pnl_percentage']:.1f}%"
        ])
    comp_table = Table(comp_data, hAlign="LEFT", repeatRows=1)
    comp_table.setStyle(TABLE_STYLE)
    elements.append(comp_table)
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(
        f"Total Cost: ${portfolio['total_cost']:.2f} | Current Value: ${portfolio['current_value']:.2f} | "
        f"P/L: {portfolio['profit_loss_percentage']:.2f}%", body_style
    ))

    elements.append(Paragraph("Risk Metrics", heading_style))
    if risk_metrics and "error" not in risk_metrics:
        risk_data = [
            ["Metric", "Value"],
            ["Annualized Volatility", f"{risk_metrics['portfolio_volatility']:.2f}%"],
            ["Portfolio Beta", f"{risk_metrics['portfolio_beta']:.2f}"],
            ["Sharpe Ratio", f"{risk_metrics['sharpe_ratio']:.2f}"],
            ["Value at Risk (95%)", f"{risk_metrics['value_at_risk_95']:.2f}%"],
            ["Conditional VaR (95%)", f"{risk_metrics['conditional_value_at_risk_95']:.2f}%"],
        ]
        risk_table = Table(risk_data, hAlign="LEFT")
        risk_table.setStyle(TABLE_STYLE)
        elements.append(risk_table)
    else:
        elements.append(Paragraph("Risk metrics unavailable.", body_style))

    elements.append(Paragraph("Monte Carlo Simulation Results (10-Year Horizon)", heading_style))
    if simulations:
        sim_data = [["Scenario", "Worst Case", "Median", "Best Case", "ROI 5y", "ROI 10y"]]
        for s in simulations:
            sim_data.append([
                s["scenario_name"], f"{s['worst_case_return']:.1f}%", f"{s['avg_case_return']:.1f}%",
                f"{s['best_case_return']:.1f}%", f"{s['roi_5y']:.1f}%", f"{s['roi_10y']:.1f}%"
            ])
        sim_table = Table(sim_data, hAlign="LEFT", repeatRows=1)
        sim_table.setStyle(TABLE_STYLE)
        elements.append(sim_table)
    else:
        elements.append(Paragraph("No simulation results available.", body_style))

    elements.append(Paragraph("AI-Powered Suggestions", heading_style))
    if suggestions:
        for sug in suggestions:
            elements.append(Paragraph(f"<b>[{sug['severity']}] {sug['title']}</b>", body_style))
            elements.append(Paragraph(sug["description"], body_style))
            elements.append(Paragraph(f"<i>Action: {sug['action']}</i>", body_style))
            elements.append(Spacer(1, 8))
    else:
        elements.append(Paragraph("No suggestions available.", body_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
