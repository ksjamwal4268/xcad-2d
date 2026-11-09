/**
 * XCAD 2D - Preloaded Engineering & Architectural Templates
 * Provides instant 1-click floor plans, civil site surveys, and mechanical drawings
 */

class XcadTemplates {
  static loadFloorPlan(engine, commands, ui) {
    engine.entities = [];
    engine.selectedEntities.clear();

    // 1. Structural Columns (COLUMN_12X12)
    const columnLocs = [
      [-360, -260], [0, -260], [360, -260],
      [-360, 40],   [0, 40],   [360, 40],
      [-360, 280],  [0, 280],  [360, 280]
    ];
    for (const [cx, cy] of columnLocs) {
      engine.entities.push(new CadBlockInstance("COLUMN_12X12", cx, cy, 1.4, 0, {}, "blocks"));
    }

    // 2. Exterior Main Walls (thickness 20mm scaled)
    // Outer perimeter: (-360, -260) to (360, 280)
    engine.entities.push(new CadLine(-360, -260, 360, -260, "0"));
    engine.entities.push(new CadLine(360, -260, 360, 280, "0"));
    engine.entities.push(new CadLine(360, 280, -360, 280, "0"));
    engine.entities.push(new CadLine(-360, 280, -360, -260, "0"));

    // Exterior Wall Offset (Wall thickness lines)
    engine.entities.push(new CadLine(-345, -245, 345, -245, "0"));
    engine.entities.push(new CadLine(345, -245, 345, 265, "0"));
    engine.entities.push(new CadLine(345, 265, -345, 265, "0"));
    engine.entities.push(new CadLine(-345, 265, -345, -245, "0"));

    // 3. Interior Partition Walls
    // Central dividing corridor/wall
    engine.entities.push(new CadLine(0, -260, 0, 280, "0"));
    engine.entities.push(new CadLine(15, -260, 15, 280, "0"));

    // Horizontal wall between Master Bed & Bed 2 (Right side)
    engine.entities.push(new CadLine(15, 40, 345, 40, "0"));
    engine.entities.push(new CadLine(15, 55, 345, 55, "0"));

    // Horizontal wall between Kitchen & Living (Left side)
    engine.entities.push(new CadLine(-345, 60, 0, 60, "0"));
    engine.entities.push(new CadLine(-345, 75, 0, 75, "0"));

    // Bathroom partition inside Kitchen/Living
    engine.entities.push(new CadLine(-140, 60, -140, 265, "0"));
    engine.entities.push(new CadLine(-155, 60, -155, 265, "0"));

    // 4. Doors & Windows
    // Main Entrance Door (Double / 36")
    engine.entities.push(new CadBlockInstance("DOOR_36", -180, -260, 1.2, 0, { TAG: "MAIN DOOR", SIZE: "36\"x84\"" }, "blocks"));
    // Master Bed Door
    engine.entities.push(new CadBlockInstance("DOOR_36", 15, 75, 1.0, Math.PI / 2, { TAG: "D1", SIZE: "32\"x80\"" }, "blocks"));
    // Bed 2 Door
    engine.entities.push(new CadBlockInstance("DOOR_36", 15, -60, 1.0, Math.PI / 2, { TAG: "D2", SIZE: "32\"x80\"" }, "blocks"));
    // Kitchen Door
    engine.entities.push(new CadBlockInstance("DOOR_36", -40, 60, 1.0, 0, { TAG: "D3", SIZE: "30\"x80\"" }, "blocks"));
    // Toilet Door
    engine.entities.push(new CadBlockInstance("DOOR_36", -140, 120, 0.9, Math.PI / 2, { TAG: "D4", SIZE: "28\"x80\"" }, "blocks"));

    // Windows
    engine.entities.push(new CadBlockInstance("WINDOW_48", 180, 280, 1.2, 0, { TAG: "W1", TYPE: "Sliding 48\"" }, "blocks"));
    engine.entities.push(new CadBlockInstance("WINDOW_48", 180, -260, 1.2, 0, { TAG: "W2", TYPE: "Sliding 48\"" }, "blocks"));
    engine.entities.push(new CadBlockInstance("WINDOW_48", -240, 280, 1.0, 0, { TAG: "W3", TYPE: "Louvered 36\"" }, "blocks"));
    engine.entities.push(new CadBlockInstance("WINDOW_48", -360, -100, 1.2, Math.PI / 2, { TAG: "W4", TYPE: "Picture 48\"" }, "blocks"));

    // 5. Furniture & Fixtures
    engine.entities.push(new CadBlockInstance("DESK_60X30", -220, -140, 1.1, 0, { ITEM: "Dining/Study Desk" }, "blocks"));
    engine.entities.push(new CadBlockInstance("TOILET", -240, 160, 1.1, 0, { FIXTURE: "Water Closet" }, "blocks"));

    // 6. Flooring Hatch in Bathroom & Balcony
    const bathPts = [
      { x: -340, y: 80 },
      { x: -160, y: 80 },
      { x: -160, y: 260 },
      { x: -340, y: 260 }
    ];
    engine.entities.push(new CadHatch(bathPts, "ANSI37", 0.8, 45, "hatch"));

    // 7. Room Text Labels
    engine.entities.push(new CadText(-260, -90, "LIVING & DINING", 22, "text"));
    engine.entities.push(new CadText(-260, -120, "16'0\" x 14'6\"", 14, "text"));

    engine.entities.push(new CadText(110, 170, "MASTER BEDROOM", 20, "text"));
    engine.entities.push(new CadText(110, 145, "14'0\" x 11'6\"", 14, "text"));

    engine.entities.push(new CadText(110, -110, "BEDROOM 02", 20, "text"));
    engine.entities.push(new CadText(110, -135, "14'0\" x 11'0\"", 14, "text"));

    engine.entities.push(new CadText(-100, 170, "KITCHEN", 18, "text"));
    engine.entities.push(new CadText(-100, 150, "9'0\" x 8'6\"", 13, "text"));

    engine.entities.push(new CadText(-300, 210, "TOILET", 16, "text"));
    engine.entities.push(new CadText(-300, 190, "6'6\" x 5'0\"", 12, "text"));

    // 8. Overall Architectural Dimensions
    engine.entities.push(new CadDimension(-360, 320, 360, 320, 40, "dims"));
    engine.entities.push(new CadDimension(400, -260, 400, 280, 40, "dims"));
    engine.entities.push(new CadDimension(-360, -300, 0, -300, 40, "dims"));
    engine.entities.push(new CadDimension(0, -300, 360, -300, 40, "dims"));

    commands.zoomExtents();
    engine.recordActivity("Template Loaded", "2BHK Architectural Floor Plan");
    ui.setPrompt("Sample loaded: 2BHK Architectural Floor Plan with Smart Blocks & Dimensions.");
  }

  static loadCivilSite(engine, commands, ui) {
    engine.entities = [];
    engine.selectedEntities.clear();

    // 1. Property Boundary Parcel (Closed Polyline)
    const propertyBoundary = [
      { x: -450, y: -260 },
      { x: 380, y: -290 },
      { x: 480, y: 220 },
      { x: 120, y: 340 },
      { x: -360, y: 280 }
    ];
    engine.entities.push(new CadPolyline(propertyBoundary, true, "0"));

    // 2. Setback Limit Line (Dashed)
    const setback = [
      { x: -390, y: -210 },
      { x: 330, y: -230 },
      { x: 420, y: 170 },
      { x: 100, y: 270 },
      { x: -300, y: 220 }
    ];
    engine.entities.push(new CadPolyline(setback, true, "hidden"));

    // 3. Proposed Building Footprint
    const bldg = [
      { x: -180, y: -100 },
      { x: 180, y: -100 },
      { x: 180, y: 120 },
      { x: -180, y: 120 }
    ];
    engine.entities.push(new CadPolyline(bldg, true, "0"));
    engine.entities.push(new CadHatch(bldg, "SOLID", 1.0, 0, "hatch"));

    // 4. Access Road (Frontage)
    engine.entities.push(new CadLine(-550, -380, 550, -410, "0"));
    engine.entities.push(new CadLine(-550, -460, 550, -490, "0"));
    engine.entities.push(new CadCenterline(-550, -420, 550, -450, "center"));
    engine.entities.push(new CadText(-60, -445, "12.0M WIDE MAIN ACCESS ROAD", 16, "text"));

    // 5. Survey Benchmark Markers
    const benchmarks = [
      { x: -450, y: -260, tag: "BM-01 (100.000m)" },
      { x: 380, y: -290, tag: "BM-02 (100.450m)" },
      { x: 480, y: 220, tag: "BM-03 (101.120m)" },
      { x: 120, y: 340, tag: "BM-04 (101.850m)" },
      { x: -360, y: 280, tag: "BM-05 (100.900m)" }
    ];
    for (const bm of benchmarks) {
      engine.entities.push(new CadCircle(bm.x, bm.y, 8, "dims"));
      engine.entities.push(new CadCenterMark(bm.x, bm.y, 8, "center"));
      engine.entities.push(new CadText(bm.x + 12, bm.y + 6, bm.tag, 12, "dims"));
    }

    // 6. North Arrow Symbol
    const nx = 420, ny = 340;
    engine.entities.push(new CadCircle(nx, ny, 28, "dims"));
    engine.entities.push(new CadLine(nx, ny - 28, nx, ny + 38, "dims"));
    engine.entities.push(new CadLine(nx - 8, ny + 20, nx, ny + 38, "dims"));
    engine.entities.push(new CadLine(nx + 8, ny + 20, nx, ny + 38, "dims"));
    engine.entities.push(new CadText(nx - 5, ny + 44, "N", 20, "dims"));

    // 7. Site Annotations & BOQ
    engine.entities.push(new CadText(-80, 10, "PROPOSED RESIDENTIAL G+2", 18, "text"));
    engine.entities.push(new CadText(-60, -20, "PLINTH AREA: 180 SQ.M", 14, "text"));
    engine.entities.push(new CadText(-300, 160, "SETBACK: 3.0M", 13, "dims"));
    engine.entities.push(new CadText(220, -180, "TOTAL PLOT AREA = 485.60 SQ.M", 16, "text"));

    // Dimensions
    engine.entities.push(new CadDimension(-450, -260, 380, -290, 30, "dims"));
    engine.entities.push(new CadDimension(380, -290, 480, 220, 30, "dims"));
    engine.entities.push(new CadDimension(480, 220, 120, 340, 30, "dims"));
    engine.entities.push(new CadDimension(120, 340, -360, 280, 30, "dims"));
    engine.entities.push(new CadDimension(-360, 280, -450, -260, 30, "dims"));

    commands.zoomExtents();
    engine.recordActivity("Template Loaded", "Civil Engineering Site Plan");
    ui.setPrompt("Sample loaded: Civil Engineering Site Boundary & Survey Station Layout.");
  }

  static loadMechanicalPart(engine, commands, ui) {
    engine.entities = [];
    engine.selectedEntities.clear();

    // 1. Mechanical Bearing Flange
    const cx = 0, cy = 0;

    // Outer Flange Contour
    engine.entities.push(new CadCircle(cx, cy, 140, "0"));

    // Inner Shaft Bore
    engine.entities.push(new CadCircle(cx, cy, 45, "0"));

    // Pitch Circle Diameter (PCD) - Dashed Centerline circle
    engine.entities.push(new CadCircle(cx, cy, 95, "center"));

    // 4 Bolt Holes at 90° intervals
    const boltAngles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
    for (const ang of boltAngles) {
      const bx = cx + 95 * Math.cos(ang);
      const by = cy + 95 * Math.sin(ang);
      engine.entities.push(new CadCircle(bx, by, 12, "0"));
      engine.entities.push(new CadCenterMark(bx, by, 12, "center"));
    }

    // Keyway slot on shaft bore
    engine.entities.push(new CadRectangle(-6, 45, 6, 55, "0"));

    // Associative Centerlines extending through part
    engine.entities.push(new CadCenterline(-170, 0, 170, 0, "center"));
    engine.entities.push(new CadCenterline(0, -170, 0, 170, "center"));

    // Multi-Leader & Dimensions
    engine.entities.push(new CadMultiLeader(95, 0, 160, 60, "4x Ø24 BOLT HOLES ON Ø190 PCD", "dims"));
    engine.entities.push(new CadMultiLeader(0, 45, -80, 110, "Ø90 H7 SHAFT BORE WITH 12x6 KEYWAY", "dims"));
    engine.entities.push(new CadDimension(-140, 0, 140, 0, 50, "dims"));
    engine.entities.push(new CadText(-120, -190, "BEARING FLANGE (PCD Ø190) - MATL: CAST IRON", 16, "text"));

    commands.zoomExtents();
    engine.recordActivity("Template Loaded", "Mechanical Flange Component");
    ui.setPrompt("Sample loaded: Mechanical Bearing Flange with PCD Bolt Holes & Keyway.");
  }
}

// Make globally available
window.XcadTemplates = XcadTemplates;
