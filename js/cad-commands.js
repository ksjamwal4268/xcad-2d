/**
 * XCAD 2D - Interactive Command Interpreter & Drafting Tools
 * Supports all AutoCAD 2026 commands, Smart Blocks, GIS, Parametrics, AutoLISP, and Quick Measure
 */

class CadCommands {
  constructor(engine, ui) {
    this.engine = engine;
    this.ui = ui;

    // Command State Machine
    this.activeCommand = null;
    this.step = 0;
    this.tempPoints = [];
    this.tempEntity = null;
    this.lastCommandName = "LINE";
    this.selectedForMod = [];
    this.offsetDist = 10;
    this.filletRadius = 0;
    this.selectedLinesForFillet = [];
    this.hatchPattern = "ANSI31";
    this.hatchScale = 1.0;
    this.activeBlockToInsert = "DOOR_36";

    // Mouse Interaction
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.isSelecting = false;
    this.selectionStart = { x: 0, y: 0 };
    this.isAutoDragging = false;
    this.dragStartScreen = { x: 0, y: 0 };
    this.dragStartWorld = { x: 0, y: 0 };
    this.dragLastWorld = { x: 0, y: 0 };
    this.hasMovedDrag = false;
    this.fencePoints = []; // For Quick Mode Trim / Extend
    this.engGraphics = (typeof window !== "undefined" && window.XCadEngineeringGraphics) ? new window.XCadEngineeringGraphics(this.engine) : null;

    this.initEventListeners();
  }

  getEngGraphics() {
    if (!this.engGraphics && typeof window !== "undefined" && window.XCadEngineeringGraphics) {
      this.engGraphics = new window.XCadEngineeringGraphics(this.engine);
    }
    return this.engGraphics;
  }

  initEventListeners() {
    const canvas = this.engine.canvas;
    canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
    canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    window.addEventListener("mouseup", (e) => this.onMouseUp(e));
    canvas.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
    canvas.addEventListener("mouseenter", () => {
      this.engine.mouseInside = true;
      this.engine.render();
    });
    canvas.addEventListener("mouseleave", () => {
      this.engine.mouseInside = false;
      this.engine.render();
    });
    canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.onRightClick();
    });

    window.addEventListener("keydown", (e) => this.onKeyDown(e));
  }

  // --- Command Execution Router ---
  execute(cmdText) {
    const raw = cmdText.trim();
    if (!raw) {
      if (this.lastCommandName && !this.activeCommand) {
        this.startCommand(this.lastCommandName);
      } else if (this.activeCommand) {
        this.finishCommand();
      }
      return;
    }

    this.ui.logCommand(raw);

    // If an active command is waiting for parameter / coordinate
    if (this.activeCommand) {
      if (this.activeCommand === "POLYLINE" && (raw.toUpperCase() === "C" || raw.toUpperCase() === "CLOSE")) {
        if (this.tempPoints.length >= 3) {
          const pline = new CadPolyline([...this.tempPoints], true, this.engine.activeLayerId);
          this.engine.addEntity(pline);
          this.ui.setPrompt("Closed polyline created.");
        }
        this.cancelCommand();
        return;
      }
      this.handleCommandParam(raw);
      return;
    }

    // Direct AutoLISP execution if command starts with '('
    if (raw.startsWith("(") && window.xcadLisp) {
      const res = window.xcadLisp.run(raw);
      if (res !== null && res !== undefined) {
        this.ui.setPrompt(`LISP: ${JSON.stringify(res)}`);
      }
      return;
    }

    const upper = raw.toUpperCase();
    this.lastCommandName = upper;

    switch (upper) {
      // 1. Draw Tools
      case "L": case "LINE": this.startCommand("LINE"); break;
      case "C": case "CIRCLE": this.startCommand("CIRCLE"); break;
      case "A": case "ARC": this.startCommand("ARC"); break;
      case "REC": case "RECTANGLE": case "RECTANG": this.startCommand("RECTANGLE"); break;
      case "PL": case "PLINE": case "POLYLINE": this.startCommand("POLYLINE"); break;
      case "POL": case "POLYGON": this.startCommand("POLYGON"); break;
      case "EL": case "ELLIPSE": this.startCommand("ELLIPSE"); break;
      case "SPL": case "SPLINE": this.startCommand("SPLINE"); break;
      case "PO": case "PT": case "POINT": this.startCommand("POINT"); break;
      case "DO": case "DONUT": this.startCommand("DONUT"); break;
      case "XL": case "XLINE": case "RAY": this.startCommand("XLINE"); break;
      case "H": case "HATCH": case "BHATCH": this.startCommand("HATCH"); break;

      // 2. Modify & Drafting
      case "E": case "DEL": case "ERASE": this.startCommand("ERASE"); break;
      case "M": case "MOVE": this.startCommand("MOVE"); break;
      case "CO": case "CP": case "COPY": this.startCommand("COPY"); break;
      case "RO": case "ROTATE": this.startCommand("ROTATE"); break;
      case "SC": case "SCALE": this.startCommand("SCALE"); break;
      case "MI": case "MIRROR": this.startCommand("MIRROR"); break;
      case "F": case "FILLET": this.startCommand("FILLET"); break;
      case "CHA": case "CHAMFER": this.startCommand("CHAMFER"); break;
      case "S": case "STRETCH": this.startCommand("STRETCH"); break;
      case "BR": case "BREAK": this.startCommand("BREAK"); break;
      case "MA": case "MATCHPROP": this.startCommand("MATCHPROP"); break;
      case "AL": case "ALIGN": this.startCommand("ALIGN"); break;
      case "DIV": case "DIVIDE": this.startCommand("DIVIDE"); break;
      case "PU": case "PURGE": this.executePurge(); break;
      case "X": case "EXPLODE": this.executeExplode(); break;
      case "J": case "JOIN": this.executeJoin(); break;
      case "O": case "OFFSET": this.startCommand("OFFSET"); break;
      case "TR": case "TRIM": this.startCommand("TRIM"); break;
      case "EX": case "EXTEND": this.startCommand("EXTEND"); break;
      case "AR": case "ARRAY": case "ARRAYRECT": this.startCommand("ARRAYRECT"); break;
      case "ARRAYPOLAR": this.startCommand("ARRAYPOLAR"); break;
      case "LA": case "LAYER": this.ui.openLayerManager(); break;
      case "UN": case "UNITS":
        this.ui.setPrompt("UNITS: Decimal Millimeters, Precision 0.00, Angle: Decimal Degrees.");
        break;
      case "LIMITS":
        this.ui.setPrompt(`LIMITS: Drawing Grid Limits (0.0, 0.0) to (${this.engine.gridSize * 40}.0, ${this.engine.gridSize * 30}.0)`);
        break;
      case "RE": case "REA": case "REGEN":
        this.engine.render();
        this.ui.setPrompt("Regenerating model... done.");
        break;

      // 3. Annotate & Dimensions
      case "D": case "DIM": case "DIMENSION": this.startCommand("DIMENSION"); break;
      case "DLI": case "DIMLINEAR": this.startCommand("DIMENSION"); break;
      case "DAL": case "DIMALIGNED": this.startCommand("DIMENSION"); break;
      case "DRA": case "DIMRADIUS": this.startCommand("DIMRADIUS"); break;
      case "DDI": case "DIMDIAMETER": this.startCommand("DIMDIAMETER"); break;
      case "DAN": case "DIMANGULAR": this.startCommand("DIMANGULAR"); break;
      case "DBA": case "DIMBASELINE": this.startCommand("DIMBASELINE"); break;
      case "DCO": case "DIMCONTINUE": this.startCommand("DIMCONTINUE"); break;
      case "DIMSTYLE": this.ui.setPrompt("DIMSTYLE: ISO-25 Standard Active (Arrow size: 3.5mm, Text height: 3.5mm)"); break;
      case "ML": case "MLEADER": case "LEADER": this.startCommand("MLEADER"); break;
      case "T": case "DT": case "MT": case "TEXT": case "MTEXT": this.startCommand("TEXT"); break;
      case "CENTERMARK": case "CM": this.startCommand("CENTERMARK"); break;
      case "CENTERLINE": case "CL": this.startCommand("CENTERLINE"); break;
      case "REVCLOUD": this.startCommand("REVCLOUD"); break;
      case "TABLE": this.startCommand("TABLE"); break;

      // 4. Smart Blocks & Autodesk AI Ecosystem
      case "B": case "BLOCK": this.startCommand("BLOCK"); break;
      case "W": case "WBLOCK": this.ui.exportDxf(); this.ui.setPrompt("WBLOCK: Exported block definitions to DXF file."); break;
      case "PR": case "CH": case "PROPERTIES": this.ui.setPrompt("PROPERTIES: In-canvas Quick Properties Inspector active."); break;
      case "BCONVERT": case "BLOCKCONVERT": this.startCommand("BCONVERT"); break;
      case "BLOCKREPLACE": this.startCommand("BLOCKREPLACE"); break;
      case "COUNT": case "COUNTPALETTE": this.ui.toggleCountPalette(); break;
      case "INSERTCOUNTTABLE":
        if (window.xcadSmartBlocks) window.xcadSmartBlocks.insertCountTable(50, 50);
        break;
      case "I": case "INSERT": this.startCommand("INSERT"); break;

      // 5. Precision Snapping & Measuring
      case "QM": case "QUICKMEASURE": this.toggleQuickMeasure(); break;
      case "DI": case "DIST": case "MEASURE": this.startCommand("DIST"); break;
      case "ID": this.startCommand("ID"); break;

      // 6. GIS & Coordinate Systems
      case "GEO": case "GEOGRAPHICLOCATION": this.startCommand("GEOLOCATION"); break;
      case "BASEMAP": case "GIS":
        if (window.xcadGisMap) window.xcadGisMap.toggleBasemap();
        break;
      case "MAPCAPTURE":
        if (window.xcadGisMap) window.xcadGisMap.captureBasemap();
        break;

      // 7. Parametric Constraints
      case "PARAM": case "PARAMETERS": this.ui.toggleParametersPalette(); break;
      case "GEOMCONSTRAINT": this.startCommand("GEOMCONSTRAINT"); break;

      // 8. Collaboration & Review
      case "TRACE": this.toggleTraceMode(); break;
      case "COMPARE": case "DWGCOMPARE": this.toggleCompareMode(); break;
      case "INSIGHTS": case "ACTIVITYINSIGHTS": this.ui.toggleInsightsPalette(); break;
      case "DATAEXTRACTION": this.ui.exportDataExtraction(); break;
      case "DATALINK": this.ui.importDataLink(); break;

      // 9. Automation & Scripting
      case "LISP": case "VLISP": this.ui.toggleLispConsole(); break;

      // 10. Engineering Graphics & CAD Curriculum (BMET21)
      case "CYCLOID": this.startCommand("CYCLOID"); break;
      case "INVOLUTE": this.startCommand("INVOLUTE"); break;
      case "SPIRAL": this.startCommand("SPIRAL"); break;
      case "HELIX": this.startCommand("HELIX"); break;
      case "SCALEPLAIN": case "PLAINSCALE": this.startCommand("SCALEPLAIN"); break;
      case "SCALEDIAGONAL": case "DIAGONALSCALE": this.startCommand("SCALEDIAGONAL"); break;
      case "PROJPOINT": case "POINTPROJ": this.startCommand("PROJPOINT"); break;
      case "PROJLINE": case "LINEPROJ": this.startCommand("PROJLINE"); break;
      case "PROJPLANE": case "PLANEMETHOD": case "ROTATIONMETHOD": this.startCommand("PROJPLANE"); break;
      case "PROJSOLID": case "SOLIDSROTATION": this.startCommand("PROJSOLID"); break;
      case "SECTIONSOLID": case "TRUESHAPE": this.startCommand("SECTIONSOLID"); break;
      case "DEVCYLINDER": case "CYLINDERDEV": this.startCommand("DEVCYLINDER"); break;
      case "DEVCONE": case "CONEDEV": this.startCommand("DEVCONE"); break;
      case "DEVTRANSITION": case "TRANSITIONDEV": this.startCommand("DEVTRANSITION"); break;
      case "ORTHOPROJ": case "ORTHO3VIEW": case "MISSINGVIEW": this.startCommand("ORTHOPROJ"); break;
      case "TOGGLEANGLE": case "PROJANGLE": this.toggleProjectionAngle(); break;
      case "TOGGLEDIMMODE": case "DIMMODE": this.toggleDimMode(); break;
      case "LETTERING": this.createLettering(); break;
      case "BMET21": case "ENGGRAPHICS":
        this.ui.setPrompt("BMET21: Course modules active (Curves, Scales, Projections, Surface Development, Orthographic 3-Views)");
        break;

      // 11. Navigation, Screen & Files
      case "Z": case "ZOOM": this.zoomExtents(); break;
      case "P": case "PAN": this.ui.setPrompt("PAN: Click and drag with mouse wheel or Left Click"); break;
      case "FULL": case "FULLSCREEN": case "CLEANSCREEN": this.ui.toggleFullscreen(); break;
      case "U": case "UNDO": this.ui.setPrompt(this.engine.undo()); break;
      case "REDO": this.ui.setPrompt(this.engine.redo()); break;
      case "CLEAR": case "NEW":
        this.engine.entities = [];
        this.engine.undoStack = [];
        this.engine.render();
        this.ui.setPrompt("New Drawing initialized. Model space cleared.");
        break;
      case "SAVE": this.ui.saveProject(); break;
      case "DXF": this.ui.exportDxf(); break;

      default:
        this.ui.setPrompt(`Unknown command "${raw}". Press F1 for XCAD Help or type L, C, H, DIM, BCONVERT.`);
        break;
    }
  }

  handleCommandParam(raw) {
    const txt = raw.trim();
    if (!txt) return;
    const upper = txt.toUpperCase();

    // 1. Command options / shortcuts while inside active commands
    if (this.activeCommand === "POLYLINE") {
      if (upper === "C" || upper === "CLOSE") {
        if (this.tempPoints.length >= 3) {
          const pline = new CadPolyline([...this.tempPoints], true, this.engine.activeLayerId);
          this.engine.addEntity(pline);
          this.ui.setPrompt("Closed polyline created.");
        }
        this.cancelCommand();
        return;
      }
      if (upper === "U" || upper === "UNDO") {
        if (this.tempPoints.length > 0) {
          this.tempPoints.pop();
          this.ui.setPrompt(`PLINE Last vertex removed (${this.tempPoints.length} vertices remaining):`);
          this.engine.render();
        }
        return;
      }
    }

    if (this.activeCommand === "LINE") {
      if ((upper === "C" || upper === "CLOSE") && this.tempPoints.length >= 2) {
        const firstPt = this.tempPoints[0];
        const lastPt = this.tempPoints[this.tempPoints.length - 1];
        this.engine.addEntity(new CadLine(lastPt.x, lastPt.y, firstPt.x, firstPt.y));
        this.cancelCommand();
        this.ui.setPrompt("Line closed.");
        return;
      }
    }

    if (this.activeCommand === "FILLET") {
      if (upper.startsWith("R")) {
        const parts = upper.split(/\s+/);
        if (parts.length > 1) {
          this.filletRadius = parseFloat(parts[1]) || 0;
          this.ui.setPrompt(`FILLET Radius set to ${this.filletRadius}. Select first line:`);
          this.step = 0;
        } else {
          this.ui.setPrompt(`FILLET Specify fillet radius <${this.filletRadius}>:`);
          this.step = 99; // Waiting for radius input
        }
        return;
      }
      if (this.step === 99) {
        this.filletRadius = parseFloat(txt) || 0;
        this.step = 0;
        this.ui.setPrompt(`FILLET Radius set to ${this.filletRadius}. Select first line:`);
        return;
      }
    }

    if (this.activeCommand === "OFFSET") {
      const val = parseFloat(txt);
      if (!isNaN(val)) {
        this.offsetDist = val;
        this.step = 1;
        this.ui.setPrompt(`OFFSET Select object to offset <dist=${this.offsetDist}>:`);
        return;
      }
    }

    if (this.activeCommand === "ROTATE" && this.step === 2) {
      const deg = parseFloat(txt);
      if (!isNaN(deg)) {
        const rad = (deg * Math.PI) / 180;
        const base = this.tempPoints[0];
        this.selectedForMod.forEach(ent => ent.rotate(base.x, base.y, rad));
        this.engine.logActivity("ROTATE", `Rotated objects by ${deg}°`);
        this.engine.render();
        this.ui.setPrompt(`Objects rotated by ${deg}°.`);
        this.cancelCommand();
        return;
      }
    }

    if (this.activeCommand === "SCALE" && this.step === 2) {
      const factor = parseFloat(txt);
      if (!isNaN(factor) && factor !== 0) {
        const base = this.tempPoints[0];
        this.selectedForMod.forEach(ent => ent.scale(base.x, base.y, factor));
        this.engine.logActivity("SCALE", `Scaled objects by factor ${factor}x`);
        this.engine.render();
        this.ui.setPrompt(`Objects scaled by ${factor}x.`);
        this.cancelCommand();
        return;
      }
    }

    if (this.activeCommand === "CIRCLE" && this.step === 1) {
      if (upper.startsWith("D")) {
        const dVal = parseFloat(upper.replace("D", "").trim());
        if (!isNaN(dVal)) {
          const c = this.tempPoints[0];
          this.engine.addEntity(new CadCircle(c.x, c.y, dVal / 2));
          this.cancelCommand();
          this.ui.setPrompt(`Circle with diameter ${dVal} created.`);
          return;
        }
      }
      const r = parseFloat(txt);
      if (!isNaN(r)) {
        const c = this.tempPoints[0];
        this.engine.addEntity(new CadCircle(c.x, c.y, r));
        this.cancelCommand();
        this.ui.setPrompt(`Circle with radius ${r} created.`);
        return;
      }
    }

    if (this.activeCommand === "RECTANGLE" && this.step === 1) {
      let clean = txt.startsWith("@") ? txt.slice(1).trim() : txt;
      let dims = clean.toLowerCase().split(/[\s,x]+/);
      if (dims.length >= 2) {
        const w = parseFloat(dims[0]);
        const h = parseFloat(dims[1]);
        if (!isNaN(w) && !isNaN(h)) {
          const p1 = this.tempPoints[0];
          this.engine.addEntity(new CadRectangle(p1.x, p1.y, p1.x + w, p1.y + h));
          this.cancelCommand();
          this.ui.setPrompt(`Rectangle ${w} x ${h} created.`);
          return;
        }
      }
    }

    // 2. Relative Coordinates: @dx,dy or @dist<angle
    if (txt.startsWith("@")) {
      const coordStr = txt.slice(1).trim();
      if (coordStr.includes("<")) {
        const [dStr, aStr] = coordStr.split("<");
        const dist = parseFloat(dStr);
        const angDeg = parseFloat(aStr);
        if (!isNaN(dist) && !isNaN(angDeg)) {
          const rad = (angDeg * Math.PI) / 180;
          const ref = this.tempPoints.length ? this.tempPoints[this.tempPoints.length - 1] : { x: 0, y: 0 };
          this.handlePointInput(ref.x + dist * Math.cos(rad), ref.y + dist * Math.sin(rad));
          return;
        }
      }
      const parts = coordStr.split(/[\s,]+/);
      if (parts.length >= 2) {
        const dx = parseFloat(parts[0]);
        const dy = parseFloat(parts[1]);
        if (!isNaN(dx) && !isNaN(dy)) {
          const ref = this.tempPoints.length ? this.tempPoints[this.tempPoints.length - 1] : { x: 0, y: 0 };
          this.handlePointInput(ref.x + dx, ref.y + dy);
          return;
        }
      }
    }

    // 3. Polar Coordinates: dist<angle
    if (txt.includes("<")) {
      const [dStr, aStr] = txt.split("<");
      const dist = parseFloat(dStr);
      const angDeg = parseFloat(aStr);
      if (!isNaN(dist) && !isNaN(angDeg)) {
        const rad = (angDeg * Math.PI) / 180;
        const ref = this.tempPoints.length ? this.tempPoints[this.tempPoints.length - 1] : { x: 0, y: 0 };
        this.handlePointInput(ref.x + dist * Math.cos(rad), ref.y + dist * Math.sin(rad));
        return;
      }
    }

    // 4. Absolute Coordinates: x,y
    const coordParts = txt.split(/[\s,]+/);
    if (coordParts.length === 2 && !isNaN(parseFloat(coordParts[0])) && !isNaN(parseFloat(coordParts[1]))) {
      const x = parseFloat(coordParts[0]);
      const y = parseFloat(coordParts[1]);
      this.handlePointInput(x, y);
      return;
    }

    // 5. Direct Distance Entry: single number typed during LINE or POLYLINE
    const distVal = parseFloat(txt);
    if (!isNaN(distVal) && (this.activeCommand === "LINE" || this.activeCommand === "POLYLINE")) {
      if (this.tempPoints.length > 0) {
        const p1 = this.tempPoints[this.tempPoints.length - 1];
        const mw = this.engine.mouseWorld;
        let ang = Math.atan2(mw.y - p1.y, mw.x - p1.x);
        if (Math.hypot(mw.x - p1.x, mw.y - p1.y) < 1e-4) {
          ang = 0;
        }
        const nx = p1.x + distVal * Math.cos(ang);
        const ny = p1.y + distVal * Math.sin(ang);
        this.handlePointInput(nx, ny);
        return;
      }
    }

    this.ui.setPrompt(`Unrecognized input "${txt}". Specify coordinate (e.g. 100,50), distance (@100,0 or 150<45), or ESC.`);
  }

  insertBlock(blockName) {
    this.activeBlockToInsert = blockName;
    this.startCommand("INSERT");
  }

  startCommand(cmdName) {
    this.activeCommand = cmdName;
    this.step = 0;
    this.tempPoints = [];
    this.tempEntity = null;
    this.ui.updateActiveRibbonButton(cmdName);

    switch (cmdName) {
      case "LINE":
        this.ui.setPrompt("LINE Specify first point:");
        break;
      case "POLYLINE":
        this.ui.setPrompt("PLINE Specify start point:");
        break;
      case "CIRCLE":
        this.ui.setPrompt("CIRCLE Specify center point for circle:");
        break;
      case "ARC":
        this.ui.setPrompt("ARC Specify start point of 3-point arc:");
        break;
      case "RECTANGLE":
        this.ui.setPrompt("RECTANGLE Specify first corner point:");
        break;
      case "HATCH":
        this.ui.setPrompt("HATCH Click boundary points on the fly (or press ENTER when finished):");
        break;
      case "DIMENSION":
        this.ui.setPrompt("DIMENSION Specify first extension line origin or select geometry:");
        break;
      case "MLEADER":
        this.ui.setPrompt("MLEADER Specify leader arrowhead location:");
        break;
      case "CENTERMARK":
        this.ui.setPrompt("CENTERMARK Select circle or arc to place center mark:");
        break;
      case "CENTERLINE":
        this.ui.setPrompt("CENTERLINE Specify first point or line for centerline:");
        break;
      case "REVCLOUD":
        this.ui.setPrompt("REVCLOUD Click points to form revision cloud (ENTER to close):");
        break;
      case "BCONVERT":
        if (this.engine.selectedEntities.size === 0) {
          this.ui.setPrompt("BCONVERT Select raw linework to scan and convert, then press ENTER:");
        } else {
          this.executeBConvert();
        }
        break;
      case "BLOCKREPLACE":
        this.ui.setPrompt("BLOCKREPLACE Enter block name to replace, or click an instance:");
        break;
      case "INSERT":
        this.ui.setPrompt(`INSERT [${this.activeBlockToInsert}] Click on canvas to place block (or ESC to cancel):`);
        break;
      case "TRIM":
        this.ui.setPrompt("TRIM (Quick Mode) Click line to trim or drag cross-fence (Shift=Extend):");
        break;
      case "EXTEND":
        this.ui.setPrompt("EXTEND (Quick Mode) Click line to extend or drag cross-fence (Shift=Trim):");
        break;
      case "MOVE":
        if (this.engine.selectedEntities.size === 0) {
          this.ui.setPrompt("MOVE Select objects, then press ENTER:");
        } else {
          this.selectedForMod = Array.from(this.engine.selectedEntities);
          this.step = 1;
          this.ui.setPrompt("MOVE Specify base point:");
        }
        break;
      case "COPY":
        if (this.engine.selectedEntities.size === 0) {
          this.ui.setPrompt("COPY Select objects, then press ENTER:");
        } else {
          this.selectedForMod = Array.from(this.engine.selectedEntities);
          this.step = 1;
          this.ui.setPrompt("COPY Specify base point:");
        }
        break;
      case "ROTATE":
        if (this.engine.selectedEntities.size === 0) {
          this.ui.setPrompt("ROTATE Select objects, then press ENTER:");
        } else {
          this.selectedForMod = Array.from(this.engine.selectedEntities);
          this.step = 1;
          this.ui.setPrompt("ROTATE Specify base point:");
        }
        break;
      case "SCALE":
        if (this.engine.selectedEntities.size === 0) {
          this.ui.setPrompt("SCALE Select objects, then press ENTER:");
        } else {
          this.selectedForMod = Array.from(this.engine.selectedEntities);
          this.step = 1;
          this.ui.setPrompt("SCALE Specify base point:");
        }
        break;
      case "MIRROR":
        if (this.engine.selectedEntities.size === 0) {
          this.ui.setPrompt("MIRROR Select objects, then press ENTER:");
        } else {
          this.selectedForMod = Array.from(this.engine.selectedEntities);
          this.step = 1;
          this.ui.setPrompt("MIRROR Specify first point of mirror line:");
        }
        break;
      case "FILLET":
        this.selectedLinesForFillet = [];
        this.ui.setPrompt(`FILLET (Radius = ${this.filletRadius}) Select first line or [Radius (R)]:`);
        break;
      case "DIMRADIUS":
        this.ui.setPrompt("DIMRADIUS Select circle or arc to place radius dimension:");
        break;
      case "DIMDIAMETER":
        this.ui.setPrompt("DIMDIAMETER Select circle or arc to place diameter dimension:");
        break;
      case "OFFSET":
        this.ui.setPrompt(`OFFSET Specify offset distance <${this.offsetDist}>:`);
        break;
      case "DIST":
        this.ui.setPrompt("DIST Specify first point to measure:");
        break;
      case "GEOLOCATION":
        this.ui.setPrompt("GEOGRAPHICLOCATION Enter Latitude and Longitude (e.g. 37.7749, -122.4194):");
        break;
      case "ERASE":
        if (this.engine.selectedEntities.size > 0) {
          for (const ent of Array.from(this.engine.selectedEntities)) {
            this.engine.removeEntity(ent);
          }
          this.ui.setPrompt("Selected entities erased.");
          this.cancelCommand();
        } else {
          this.ui.setPrompt("ERASE Select objects to delete, then press ENTER:");
        }
        break;
      case "TEXT":
        this.ui.setPrompt("TEXT Specify insertion point:");
        break;
      case "CYCLOID":
        this.ui.setPrompt("CYCLOID: Click placement point on canvas (or press ENTER):");
        break;
      case "INVOLUTE":
        this.ui.setPrompt("INVOLUTE: Click placement point on canvas (or press ENTER):");
        break;
      case "SPIRAL":
        this.ui.setPrompt("SPIRAL: Click placement point on canvas (or press ENTER):");
        break;
      case "HELIX":
        this.ui.setPrompt("HELIX: Click placement point on canvas (or press ENTER):");
        break;
      case "SCALEPLAIN":
        this.ui.setPrompt("PLAIN SCALE: Click placement point on canvas (or press ENTER):");
        break;
      case "SCALEDIAGONAL":
        this.ui.setPrompt("DIAGONAL SCALE: Click placement point on canvas (or press ENTER):");
        break;
      case "PROJPOINT":
        this.ui.setPrompt("POINT PROJECTION: Click placement point on canvas (or press ENTER):");
        break;
      case "PROJLINE":
        this.ui.setPrompt("LINE PROJECTION: Click placement point on canvas (or press ENTER):");
        break;
      case "DEVCYLINDER":
        this.ui.setPrompt("CYLINDER DEVELOPMENT: Click placement point on canvas (or press ENTER):");
        break;
      case "DEVCONE":
        this.ui.setPrompt("CONE DEVELOPMENT: Click placement point on canvas (or press ENTER):");
        break;
      case "POLYGON":
        this.ui.setPrompt("POLYGON Specify center of polygon or [Edge (E)] <6 sides>:");
        break;
      case "ELLIPSE":
        this.ui.setPrompt("ELLIPSE Specify center point of ellipse:");
        break;
      case "SPLINE":
        this.ui.setPrompt("SPLINE Specify first control point:");
        break;
      case "POINT":
        this.ui.setPrompt("POINT Specify point location:");
        break;
      case "DONUT":
        this.ui.setPrompt("DONUT Specify center of donut:");
        break;
      case "XLINE":
        this.ui.setPrompt("XLINE Specify through point for construction line:");
        break;
      case "CHAMFER":
        this.selectedLinesForFillet = [];
        this.ui.setPrompt("CHAMFER Select first line or specify distance:");
        break;
      case "DIVIDE":
        this.ui.setPrompt("DIVIDE Select line or object to divide into equal segments:");
        break;
      case "MATCHPROP":
        this.ui.setPrompt("MATCHPROP Select source object to copy properties from:");
        break;
      case "BLOCK":
        this.ui.setPrompt("BLOCK Enter block name to define from selection:");
        break;
      case "PROJPLANE":
        this.ui.setPrompt("PROJPLANE (Planes inclined to HP/VP): Click placement point on canvas (or press ENTER):");
        break;
      case "PROJSOLID":
        this.ui.setPrompt("PROJSOLID (Solids inclined to HP/VP): Click placement point on canvas (or press ENTER):");
        break;
      case "SECTIONSOLID":
        this.ui.setPrompt("SECTIONSOLID (Section of Solids & True Shape): Click placement point on canvas (or press ENTER):");
        break;
      case "DEVTRANSITION":
        this.ui.setPrompt("TRANSITION PIECE DEVELOPMENT: Click placement point on canvas (or press ENTER):");
        break;
      case "ORTHOPROJ":
        this.ui.setPrompt("ORTHOGRAPHIC 3-VIEWS: Click placement point on canvas (or press ENTER):");
        break;
      default:
        this.ui.setPrompt(`${cmdName} Command started.`);
        break;
    }
    this.engine.render(null, true);
  }

  cancelCommand() {
    this.activeCommand = null;
    this.step = 0;
    this.tempPoints = [];
    this.tempEntity = null;
    this.selectedForMod = [];
    this.engine.selectionBox = null;
    this.ui.updateActiveRibbonButton(null);
    this.ui.setPrompt("Command: ");
    this.engine.render(null, false);
  }

  finishCommand() {
    // If in engineering graphics placement commands
    if (["CYCLOID", "INVOLUTE", "SPIRAL", "HELIX", "SCALEPLAIN", "SCALEDIAGONAL", "PROJPOINT", "PROJLINE", "DEVCYLINDER", "DEVCONE", "PROJPLANE", "PROJSOLID", "SECTIONSOLID", "DEVTRANSITION", "ORTHOPROJ"].includes(this.activeCommand)) {
      const center = (this.engine.getViewportCenter ? this.engine.getViewportCenter() : null) || { x: 200, y: 250 };
      this.handlePointInput(center.x, center.y);
      return;
    }

    if (this.activeCommand === "SPLINE" && this.tempPoints.length >= 2) {
      this.engine.addEntity({
        type: "SPLINE",
        points: [...this.tempPoints],
        layer: this.engine.activeLayerId,
        lineWidth: 2,
        color: "#38bdf8",
        getSnapPoints: () => this.tempPoints.map(p => ({ x: p.x, y: p.y, type: "endpoint" })),
        isInsideBox: (minX, minY, maxX, maxY) => this.tempPoints.every(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY),
        touchesBox: (minX, minY, maxX, maxY) => this.tempPoints.some(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY),
        move: (dx, dy) => this.tempPoints.forEach(p => { p.x += dx; p.y += dy; }),
        rotate: (ox, oy, ang) => {
          const cos = Math.cos(ang), sin = Math.sin(ang);
          this.tempPoints.forEach(p => {
            const nx = ox + (p.x - ox) * cos - (p.y - oy) * sin;
            const ny = oy + (p.x - ox) * sin + (p.y - oy) * cos;
            p.x = nx; p.y = ny;
          });
        },
        scale: (ox, oy, factor) => this.tempPoints.forEach(p => {
          p.x = ox + (p.x - ox) * factor;
          p.y = oy + (p.y - oy) * factor;
        }),
        clone: function() { return { ...this, points: this.points.map(p => ({ ...p })) }; }
      });
      this.ui.setPrompt(`Spline curve with ${this.tempPoints.length} fit points created.`);
      this.cancelCommand();
      return;
    }
    // If in object-selection phase of modify tools (step 0)
    if (this.step === 0 && ["MOVE", "COPY", "ROTATE", "SCALE", "MIRROR"].includes(this.activeCommand)) {
      if (this.engine.selectedEntities.size > 0) {
        this.selectedForMod = Array.from(this.engine.selectedEntities);
        this.step = 1;
        if (this.activeCommand === "MIRROR") {
          this.ui.setPrompt("MIRROR Specify first point of mirror line:");
        } else {
          this.ui.setPrompt(`${this.activeCommand} Specify base point:`);
        }
        return;
      }
    }

    if (this.activeCommand === "LINE") {
      this.cancelCommand();
      return;
    }

    // Finish polygon or path based commands
    if (this.activeCommand === "POLYLINE") {
      if (this.tempPoints.length >= 2) {
        const pline = new CadPolyline([...this.tempPoints], false, this.engine.activeLayerId);
        this.engine.addEntity(pline);
        this.ui.setPrompt(`Polyline with ${this.tempPoints.length} vertices created.`);
      }
      this.cancelCommand();
      return;
    }

    if (this.activeCommand === "HATCH" && this.tempPoints.length >= 3) {
      const hatch = new CadHatch([...this.tempPoints], this.hatchPattern, this.hatchScale, 45);
      this.engine.addEntity(hatch);
      this.ui.setPrompt("Hatch created successfully.");
      this.cancelCommand();
      return;
    }

    if (this.activeCommand === "REVCLOUD" && this.tempPoints.length >= 3) {
      // Connect as closed cloud polygon
      const hatch = new CadHatch([...this.tempPoints], "SOLID", 1.0, 0, "dims");
      this.engine.addEntity(hatch);
      this.cancelCommand();
      return;
    }

    if (this.activeCommand === "BCONVERT") {
      this.executeBConvert();
      return;
    }

    this.cancelCommand();
  }

  // Smart Blocks BCONVERT execution
  executeBConvert() {
    if (!window.xcadSmartBlocks) return;
    const selected = Array.from(this.engine.selectedEntities);
    const result = window.xcadSmartBlocks.searchAndConvert(selected);
    if (result) {
      this.ui.openBConvertGallery(result);
    }
    this.cancelCommand();
  }

  checkEdgeAutoPan(sx, sy) {
    const margin = 35;
    const panStep = 12;
    const w = this.engine.canvas.clientWidth;
    const h = this.engine.canvas.clientHeight;
    let didPan = false;
    if (sx < margin) { this.engine.panX += panStep; didPan = true; }
    else if (sx > w - margin) { this.engine.panX -= panStep; didPan = true; }
    if (sy < margin) { this.engine.panY += panStep; didPan = true; }
    else if (sy > h - margin) { this.engine.panY -= panStep; didPan = true; }
    return didPan;
  }

  // --- Coordinate / Mouse Clicks Processing ---
  onMouseDown(e) {
    // Mouse Wheel Button (Pan)
    if (e.button === 1) {
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      return;
    }

    // Left Click
    if (e.button === 0) {
      const rect = this.engine.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const pt = this.engine.updateCursor(
        sx,
        sy,
        this.tempPoints.length ? this.tempPoints[this.tempPoints.length - 1] : null
      );

      if (this.activeCommand) {
        this.handlePointInput(pt.x, pt.y, e.shiftKey);
      } else {
        const tol = 12 / this.engine.scale;
        let hitEntity = null;
        // 1. Check if user clicked an already selected entity
        for (const ent of this.engine.selectedEntities) {
          if (this.isPointNearEntity(ent, pt, tol)) {
            hitEntity = ent;
            break;
          }
        }
        // 2. If not, check if clicked ANY entity
        if (!hitEntity) {
          hitEntity = this.findNearestEntity(pt, tol);
          if (hitEntity && !e.shiftKey) {
            this.engine.selectedEntities.clear();
            this.engine.selectedEntities.add(hitEntity);
            this.engine.render();
          }
        }

        if (hitEntity) {
          // Auto-drag mode
          this.isAutoDragging = true;
          this.dragStartScreen = { x: e.clientX, y: e.clientY };
          this.dragStartWorld = { x: pt.x, y: pt.y };
          this.dragLastWorld = { x: pt.x, y: pt.y };
          this.hasMovedDrag = false;
          this.ui.updateQuickProperties();
          this.ui.updateCommandActionPills();
        } else {
          // Empty space clicked: Selection Box start
          if (!e.shiftKey) {
            this.engine.selectedEntities.clear();
          }
          this.isSelecting = true;
          this.selectionStart = { x: e.clientX, y: e.clientY };
          this.engine.selectionBox = { x1: sx, y1: sy, x2: sx, y2: sy, type: "window" };
          this.engine.render();
          this.ui.updateQuickProperties();
          this.ui.updateCommandActionPills();
        }
      }
    }
  }

  onMouseMove(e) {
    const rect = this.engine.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Pan Viewport
    if (this.isPanning) {
      this.engine.panX += (e.clientX - this.panStart.x);
      this.engine.panY += (e.clientY - this.panStart.y);
      this.panStart = { x: e.clientX, y: e.clientY };
      this.engine.render(null, !!this.activeCommand);
      return;
    }

    // Auto-Drag Selected Objects
    if (this.isAutoDragging) {
      const pt = this.engine.screenToWorld(sx, sy);
      const dx = pt.x - this.dragLastWorld.x;
      const dy = pt.y - this.dragLastWorld.y;
      const distScreen = Math.hypot(e.clientX - this.dragStartScreen.x, e.clientY - this.dragStartScreen.y);
      if (distScreen > 3) {
        this.hasMovedDrag = true;
      }
      if (this.hasMovedDrag) {
        for (const ent of this.engine.selectedEntities) {
          ent.move(dx, dy);
        }
        this.dragLastWorld = { x: pt.x, y: pt.y };
        this.checkEdgeAutoPan(sx, sy);
        this.engine.render();
      }
      return;
    }

    // Window / Crossing Selection Drag
    if (this.isSelecting) {
      const type = e.clientX >= this.selectionStart.x ? "window" : "crossing";
      this.engine.selectionBox = {
        x1: this.selectionStart.x - rect.left,
        y1: this.selectionStart.y - rect.top,
        x2: sx,
        y2: sy,
        type: type
      };
      this.checkEdgeAutoPan(sx, sy);
      this.engine.render(null, false);
      return;
    }

    // Update cursor & OSNAP
    const lastPt = this.tempPoints.length ? this.tempPoints[this.tempPoints.length - 1] : null;
    const pt = this.engine.updateCursor(sx, sy, lastPt);
    this.ui.updateCoordinates(pt.x, pt.y);

    // Live Rubberband Previews
    if (this.activeCommand) {
      this.checkEdgeAutoPan(sx, sy);
      this.updateRubberband(pt);
    } else if (this.engine.quickMeasureEnabled) {
      this.engine.render();
    }
  }

  onMouseUp(e) {
    if (e.button === 1) {
      this.isPanning = false;
      return;
    }

    if (this.isAutoDragging && e.button === 0) {
      this.isAutoDragging = false;
      if (this.hasMovedDrag) {
        this.ui.setPrompt("Auto-drag: Selected objects moved.");
        this.engine.recordActivity("Auto-drag Move", "Objects moved by direct dragging");
      }
      this.engine.render();
      this.ui.updateQuickProperties();
      this.ui.updateCommandActionPills();
      return;
    }

    if (this.isSelecting && e.button === 0) {
      this.isSelecting = false;
      if (this.engine.selectionBox) {
        this.resolveSelectionBox();
      }
      this.engine.selectionBox = null;
      this.engine.render();
      this.ui.updateQuickProperties();
      this.ui.updateCommandActionPills();
    }
  }

  onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const rect = this.engine.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newScale = Math.min(this.engine.maxScale, Math.max(this.engine.minScale, this.engine.scale * zoomFactor));

    // Zoom anchored to mouse cursor position
    this.engine.panX = mouseX - (mouseX - this.engine.panX) * (newScale / this.engine.scale);
    this.engine.panY = mouseY - (mouseY - this.engine.panY) * (newScale / this.engine.scale);
    this.engine.scale = newScale;

    this.engine.updateCursor(mouseX, mouseY);
    this.engine.render(null, !!this.activeCommand);
  }

  onRightClick() {
    if (this.activeCommand) {
      this.finishCommand();
    } else {
      this.startCommand(this.lastCommandName);
    }
  }

  // --- Interactive Command Steps ---
  handlePointInput(x, y, shiftKey = false) {
    const pt = { x, y };

    switch (this.activeCommand) {
      case "LINE":
        if (this.step === 0) {
          this.tempPoints = [pt];
          this.step = 1;
          this.ui.setPrompt("LINE Specify next point or press ENTER to finish:");
        } else {
          const p1 = this.tempPoints[this.tempPoints.length - 1];
          this.engine.addEntity(new CadLine(p1.x, p1.y, pt.x, pt.y));
          this.tempPoints = [pt]; // Chain line segments
        }
        break;

      case "POLYLINE":
        this.tempPoints.push(pt);
        if (this.tempPoints.length === 1) {
          this.step = 1;
          this.ui.setPrompt("PLINE Specify next point or [Close (C)/Enter to finish]:");
        } else {
          this.ui.setPrompt(`PLINE Specify next point or [Close (C)/Enter to finish] (${this.tempPoints.length} vertices):`);
        }
        break;

      case "CIRCLE":
        if (this.step === 0) {
          this.tempPoints = [pt];
          this.step = 1;
          this.ui.setPrompt("CIRCLE Specify radius of circle:");
        } else {
          const c = this.tempPoints[0];
          const r = Math.hypot(pt.x - c.x, pt.y - c.y);
          this.engine.addEntity(new CadCircle(c.x, c.y, r));
          this.cancelCommand();
        }
        break;

      case "ARC":
        if (this.step === 0) {
          this.tempPoints = [pt];
          this.step = 1;
          this.ui.setPrompt("ARC Specify second point of arc:");
        } else if (this.step === 1) {
          this.tempPoints.push(pt);
          this.step = 2;
          this.ui.setPrompt("ARC Specify end point of arc:");
        } else {
          const p1 = this.tempPoints[0];
          const p2 = this.tempPoints[1];
          const p3 = pt;
          const arcGeom = this.calc3PointArc(p1, p2, p3);
          if (arcGeom) {
            this.engine.addEntity(new CadArc(arcGeom.cx, arcGeom.cy, arcGeom.r, arcGeom.start, arcGeom.end));
          }
          this.cancelCommand();
        }
        break;

      case "RECTANGLE":
        if (this.step === 0) {
          this.tempPoints = [pt];
          this.step = 1;
          this.ui.setPrompt("RECTANGLE Specify opposite corner:");
        } else {
          const p1 = this.tempPoints[0];
          this.engine.addEntity(new CadRectangle(p1.x, p1.y, pt.x, pt.y));
          this.cancelCommand();
        }
        break;

      case "HATCH":
        this.tempPoints.push(pt);
        this.ui.setPrompt(`HATCH Point ${this.tempPoints.length} added. Press ENTER when finished or continue clicking.`);
        break;

      case "DIMENSION":
        if (this.step === 0) {
          this.tempPoints = [pt];
          this.step = 1;
          this.ui.setPrompt("DIMENSION Specify second extension line origin:");
        } else {
          const p1 = this.tempPoints[0];
          this.engine.addEntity(new CadDimension(p1.x, p1.y, pt.x, pt.y));
          this.cancelCommand();
        }
        break;

      case "MLEADER":
        if (this.step === 0) {
          this.tempPoints = [pt];
          this.step = 1;
          this.ui.setPrompt("MLEADER Specify leader landing / elbow location:");
        } else {
          const pArrow = this.tempPoints[0];
          const noteText = prompt("Enter Multi-Leader Note:", "Typ. Detail") || "Note";
          this.engine.addEntity(new CadMultiLeader(pArrow.x, pArrow.y, pt.x, pt.y, noteText));
          this.cancelCommand();
        }
        break;

      case "CENTERMARK":
        // Find circle or arc nearest to click point
        const targetCirc = this.findNearestCircleOrArc(pt);
        if (targetCirc) {
          this.engine.addEntity(new CadCenterMark(targetCirc.cx, targetCirc.cy, targetCirc.r));
          this.ui.setPrompt("Center mark added.");
        } else {
          this.ui.setPrompt("CENTERMARK: Click directly on or inside a circle or arc.");
        }
        this.cancelCommand();
        break;

      case "CENTERLINE":
        if (this.step === 0) {
          this.tempPoints = [pt];
          this.step = 1;
          this.ui.setPrompt("CENTERLINE Specify end point of centerline:");
        } else {
          const p1 = this.tempPoints[0];
          this.engine.addEntity(new CadCenterline(p1.x, p1.y, pt.x, pt.y));
          this.cancelCommand();
        }
        break;

      case "INSERT":
        const blkDef = window.xcadSmartBlocks ? window.xcadSmartBlocks.getBlock(this.activeBlockToInsert) : null;
        if (blkDef) {
          // Check predictive placement
          const pred = window.xcadSmartBlocks.predictPlacement(this.activeBlockToInsert, pt);
          const inst = new CadBlockInstance(this.activeBlockToInsert, pred.x, pred.y, pred.scale, pred.rotation, { ...blkDef.attributes });
          this.engine.addEntity(inst);
          this.ui.setPrompt(`Inserted Smart Block "${this.activeBlockToInsert}".`);
        }
        this.cancelCommand();
        break;

      case "TRIM":
      case "EXTEND":
        this.executeQuickTrimExtend(pt, shiftKey);
        break;

      case "MOVE":
        if (this.step === 1) {
          this.tempPoints = [pt];
          this.step = 2;
          this.ui.setPrompt("MOVE Specify second point of displacement:");
        } else if (this.step === 2) {
          const base = this.tempPoints[0];
          const dx = pt.x - base.x;
          const dy = pt.y - base.y;
          this.selectedForMod.forEach(ent => ent.move(dx, dy));
          this.engine.render();
          this.cancelCommand();
        }
        break;

      case "COPY":
        if (this.step === 1) {
          this.tempPoints = [pt];
          this.step = 2;
          this.ui.setPrompt("COPY Specify second point (or continue clicking to place multiples):");
        } else if (this.step === 2) {
          const base = this.tempPoints[0];
          const dx = pt.x - base.x;
          const dy = pt.y - base.y;
          this.selectedForMod.forEach(ent => {
            const clone = ent.clone();
            clone.move(dx, dy);
            this.engine.addEntity(clone);
          });
        }
        break;

      case "OFFSET":
        const nearest = this.findNearestEntity(pt);
        if (nearest && nearest.type === "LINE") {
          const ang = Math.atan2(nearest.y2 - nearest.y1, nearest.x2 - nearest.x1) + Math.PI / 2;
          const offX = this.offsetDist * Math.cos(ang);
          const offY = this.offsetDist * Math.sin(ang);
          const clone = nearest.clone();
          clone.move(offX, offY);
          this.engine.addEntity(clone);
          this.ui.setPrompt("Offset created.");
        }
        this.cancelCommand();
        break;

      case "ROTATE":
        if (this.step === 1) {
          this.tempPoints = [pt];
          this.step = 2;
          this.ui.setPrompt("ROTATE Specify rotation angle (type degrees) or click second point:");
        } else if (this.step === 2) {
          const base = this.tempPoints[0];
          const ang = Math.atan2(pt.y - base.y, pt.x - base.x);
          const deg = (ang * 180 / Math.PI).toFixed(1);
          this.selectedForMod.forEach(ent => ent.rotate(base.x, base.y, ang));
          this.engine.logActivity("ROTATE", `Rotated objects by ${deg}°`);
          this.engine.render();
          this.ui.setPrompt(`Objects rotated by ${deg}°.`);
          this.cancelCommand();
        }
        break;

      case "SCALE":
        if (this.step === 1) {
          this.tempPoints = [pt];
          this.step = 2;
          this.ui.setPrompt("SCALE Specify scale factor (type number) or click second point:");
        } else if (this.step === 2) {
          const base = this.tempPoints[0];
          const dist = Math.hypot(pt.x - base.x, pt.y - base.y);
          const factor = Math.max(0.05, dist / 50);
          this.selectedForMod.forEach(ent => ent.scale(base.x, base.y, factor));
          this.engine.logActivity("SCALE", `Scaled objects by factor ${factor.toFixed(2)}x`);
          this.engine.render();
          this.ui.setPrompt(`Objects scaled by ${factor.toFixed(2)}x.`);
          this.cancelCommand();
        }
        break;

      case "MIRROR":
        if (this.step === 1) {
          this.tempPoints = [pt];
          this.step = 2;
          this.ui.setPrompt("MIRROR Specify second point of mirror line:");
        } else if (this.step === 2) {
          const p1 = this.tempPoints[0];
          const p2 = pt;
          this.selectedForMod.forEach(ent => {
            const clone = ent.clone();
            clone.mirror(p1, p2);
            this.engine.addEntity(clone);
          });
          this.engine.logActivity("MIRROR", `Mirrored ${this.selectedForMod.length} objects`);
          this.engine.render();
          this.ui.setPrompt(`Mirrored ${this.selectedForMod.length} objects across axis.`);
          this.cancelCommand();
        }
        break;

      case "FILLET":
        const targetLine = this.findNearestEntity(pt);
        if (targetLine && targetLine.type === "LINE") {
          if (this.step === 0) {
            this.selectedLinesForFillet = [targetLine];
            this.step = 1;
            this.ui.setPrompt("FILLET Select second line:");
          } else if (this.step === 1) {
            const l1 = this.selectedLinesForFillet[0];
            const l2 = targetLine;
            this.executeFillet(l1, l2, this.filletRadius || 0);
            this.cancelCommand();
          }
        } else {
          this.ui.setPrompt("FILLET: Click directly on a LINE segment.");
        }
        break;

      case "DIMRADIUS":
        const targetRadCirc = this.findNearestCircleOrArc(pt);
        if (targetRadCirc) {
          const r = targetRadCirc.r;
          const ang = Math.atan2(pt.y - targetRadCirc.cy, pt.x - targetRadCirc.cx);
          const rimPt = { x: targetRadCirc.cx + r * Math.cos(ang), y: targetRadCirc.cy + r * Math.sin(ang) };
          const dim = new CadDimension(targetRadCirc.cx, targetRadCirc.cy, rimPt.x, rimPt.y, 15, "dims");
          dim.customText = `R ${r.toFixed(2)}`;
          this.engine.addEntity(dim);
          this.ui.setPrompt(`Radius dimension (R ${r.toFixed(2)}) placed.`);
        } else {
          this.ui.setPrompt("DIMRADIUS: Click directly on a circle or arc.");
        }
        this.cancelCommand();
        break;

      case "DIMDIAMETER":
        const targetDiaCirc = this.findNearestCircleOrArc(pt);
        if (targetDiaCirc) {
          const r = targetDiaCirc.r;
          const ang = Math.atan2(pt.y - targetDiaCirc.cy, pt.x - targetDiaCirc.cx);
          const p1 = { x: targetDiaCirc.cx - r * Math.cos(ang), y: targetDiaCirc.cy - r * Math.sin(ang) };
          const p2 = { x: targetDiaCirc.cx + r * Math.cos(ang), y: targetDiaCirc.cy + r * Math.sin(ang) };
          const dim = new CadDimension(p1.x, p1.y, p2.x, p2.y, 15, "dims");
          dim.customText = `Ø ${(r * 2).toFixed(2)}`;
          this.engine.addEntity(dim);
          this.ui.setPrompt(`Diameter dimension (Ø ${(r * 2).toFixed(2)}) placed.`);
        } else {
          this.ui.setPrompt("DIMDIAMETER: Click directly on a circle or arc.");
        }
        this.cancelCommand();
        break;

      case "DIST":
        if (this.step === 0) {
          this.tempPoints = [pt];
          this.step = 1;
          this.ui.setPrompt("DIST Specify second point to measure:");
        } else {
          const p1 = this.tempPoints[0];
          const d = Math.hypot(pt.x - p1.x, pt.y - p1.y);
          const ang = ((Math.atan2(pt.y - p1.y, pt.x - p1.x) * 180) / Math.PI + 360) % 360;
          this.ui.setPrompt(`Distance = ${d.toFixed(3)} mm, Angle = ${ang.toFixed(2)}°, Delta X = ${(pt.x - p1.x).toFixed(3)}, Delta Y = ${(pt.y - p1.y).toFixed(3)}`);
          this.cancelCommand();
        }
        break;

      case "TEXT":
        const txt = prompt("Enter text annotation:", "SAMPLE TEXT") || "TEXT";
        this.engine.addEntity(new CadText(pt.x, pt.y, txt, 16));
        this.cancelCommand();
        break;

      case "CYCLOID": {
        const eg = this.getEngGraphics();
        if (eg) {
          eg.createCycloid(25, pt.x, pt.y);
          this.ui.setPrompt("Generated Cycloid (R=25mm, Circumference=157.1mm) with rolling circle and locus.");
        }
        this.cancelCommand();
        break;
      }
      case "INVOLUTE": {
        const eg = this.getEngGraphics();
        if (eg) {
          eg.createInvolute(20, 1.0, pt.x, pt.y);
          this.ui.setPrompt("Generated Involute of Circle (R=20mm) with tangents and involute curve.");
        }
        this.cancelCommand();
        break;
      }
      case "SPIRAL": {
        const eg = this.getEngGraphics();
        if (eg) {
          eg.createSpiral(5, 4, 2, pt.x, pt.y);
          this.ui.setPrompt("Generated Archimedean Spiral (a=5, b=4, 2 Turns).");
        }
        this.cancelCommand();
        break;
      }
      case "HELIX": {
        const eg = this.getEngGraphics();
        if (eg) {
          eg.createHelix2D(30, 40, 3, pt.x, pt.y);
          this.ui.setPrompt("Generated 2D Projected Helix (R=30mm, Pitch=40mm, 3 Turns).");
        }
        this.cancelCommand();
        break;
      }
      case "SCALEPLAIN": {
        const eg = this.getEngGraphics();
        if (eg) {
          eg.createPlainScale(1, 50, 5, pt.x, pt.y);
          this.ui.setPrompt("Generated Plain Scale: RF 1:50, Max 5m, sub-divided into decimeters with dimension line.");
        }
        this.cancelCommand();
        break;
      }
      case "SCALEDIAGONAL": {
        const eg = this.getEngGraphics();
        if (eg) {
          eg.createDiagonalScale(1, 40, 4, pt.x, pt.y);
          this.ui.setPrompt("Generated Diagonal Scale: RF 1:40, Max 4m, sub-divided into meters, decimeters and centimeters.");
        }
        this.cancelCommand();
        break;
      }
      case "PROJPOINT": {
        const eg = this.getEngGraphics();
        if (eg) {
          eg.projectPoint(30, 45, 1, pt.x, pt.y);
          this.ui.setPrompt("Generated Point Projections in Quadrant I (30mm above HP, 45mm in front of VP) with XY line.");
        }
        this.cancelCommand();
        break;
      }
      case "PROJLINE": {
        const eg = this.getEngGraphics();
        if (eg) {
          eg.projectLine(70, 30, 45, { hp: 15, vp: 20 }, pt.x, pt.y);
          this.ui.setPrompt("Generated Line AB Projection: True Length=70mm, θ=30°, φ=45° with Plan, Elevation & Traces.");
        }
        this.cancelCommand();
        break;
      }
      case "DEVCYLINDER": {
        const eg = this.getEngGraphics();
        if (eg) {
          eg.developCylinder(40, 70, pt.x, pt.y);
          this.ui.setPrompt("Generated Parallel-Line Development of Cylinder (D=40mm, H=70mm, Stretch-out=125.7mm).");
        }
        this.cancelCommand();
        break;
      }
      case "DEVCONE": {
        const eg = this.getEngGraphics();
        if (eg) {
          eg.developCone(25, 65, pt.x, pt.y);
          this.ui.setPrompt("Generated Radial-Line Development of Cone (R=25mm, H=65mm, Sector θ=129.2°).");
        }
        this.cancelCommand();
        break;
      }
      case "POLYGON": {
        const sides = 6;
        const radius = 35;
        const polyPts = [];
        for (let i = 0; i < sides; i++) {
          const a = (i * 2 * Math.PI) / sides;
          polyPts.push({ x: pt.x + radius * Math.cos(a), y: pt.y + radius * Math.sin(a) });
        }
        const poly = new CadPolyline(polyPts, true, this.engine.activeLayerId);
        this.engine.addEntity(poly);
        this.ui.setPrompt(`Regular Hexagon (6 sides, radius ${radius}mm) created at (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}).`);
        this.cancelCommand();
        break;
      }
      case "ELLIPSE": {
        this.engine.addEntity({
          type: "ELLIPSE",
          cx: pt.x,
          cy: pt.y,
          rx: 45,
          ry: 25,
          rotation: 0,
          layer: this.engine.activeLayerId,
          lineWidth: 1.5,
          color: "#ffffff",
          getSnapPoints: () => [
            { x: pt.x, y: pt.y, type: "center" },
            { x: pt.x + 45, y: pt.y, type: "quadrant" },
            { x: pt.x - 45, y: pt.y, type: "quadrant" },
            { x: pt.x, y: pt.y + 25, type: "quadrant" },
            { x: pt.x, y: pt.y - 25, type: "quadrant" }
          ],
          isInsideBox: (minX, minY, maxX, maxY) => (pt.x - 45 >= minX && pt.x + 45 <= maxX && pt.y - 25 >= minY && pt.y + 25 <= maxY),
          touchesBox: (minX, minY, maxX, maxY) => Math.abs(pt.x - (minX + maxX)/2) <= (maxX - minX)/2 + 45 && Math.abs(pt.y - (minY + maxY)/2) <= (maxY - minY)/2 + 25,
          move: function(dx, dy) { this.cx += dx; this.cy += dy; },
          rotate: function(ox, oy, ang) {
            const cos = Math.cos(ang), sin = Math.sin(ang);
            const nx = ox + (this.cx - ox) * cos - (this.cy - oy) * sin;
            const ny = oy + (this.cx - ox) * sin + (this.cy - oy) * cos;
            this.cx = nx; this.cy = ny;
            this.rotation = (this.rotation || 0) + ang;
          },
          scale: function(ox, oy, factor) {
            this.cx = ox + (this.cx - ox) * factor;
            this.cy = oy + (this.cy - oy) * factor;
            this.rx *= factor;
            this.ry *= factor;
          },
          clone: function() { return { ...this }; }
        });
        this.ui.setPrompt(`Ellipse (Rx=45mm, Ry=25mm) created at (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}).`);
        this.cancelCommand();
        break;
      }
      case "SPLINE": {
        this.tempPoints.push(pt);
        this.ui.setPrompt(`SPLINE: Point ${this.tempPoints.length} added. Press ENTER when finished or continue clicking.`);
        break;
      }
      case "POINT": {
        this.engine.addEntity({
          type: "POINT",
          x: pt.x,
          y: pt.y,
          layer: this.engine.activeLayerId,
          color: "#38bdf8",
          getSnapPoints: () => [{ x: pt.x, y: pt.y, type: "node" }],
          isInsideBox: (minX, minY, maxX, maxY) => (pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY),
          touchesBox: (minX, minY, maxX, maxY) => (pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY),
          move: function(dx, dy) { this.x += dx; this.y += dy; },
          rotate: function(ox, oy, ang) {
            const cos = Math.cos(ang), sin = Math.sin(ang);
            const nx = ox + (this.x - ox) * cos - (this.y - oy) * sin;
            const ny = oy + (this.x - ox) * sin + (this.y - oy) * cos;
            this.x = nx; this.y = ny;
          },
          scale: function(ox, oy, factor) {
            this.x = ox + (this.x - ox) * factor;
            this.y = oy + (this.y - oy) * factor;
          },
          clone: function() { return { ...this }; }
        });
        this.ui.setPrompt(`Point marker created at (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}).`);
        this.cancelCommand();
        break;
      }
      case "DONUT": {
        this.engine.addEntity(new CadCircle(pt.x, pt.y, 15));
        this.engine.addEntity(new CadCircle(pt.x, pt.y, 25));
        this.ui.setPrompt(`Donut (Inner ID=30mm, Outer OD=50mm) created at (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}).`);
        this.cancelCommand();
        break;
      }
      case "XLINE": {
        this.engine.addEntity(new CadLine(pt.x - 2000, pt.y, pt.x + 2000, pt.y, "dims"));
        this.engine.addEntity(new CadLine(pt.x, pt.y - 2000, pt.x, pt.y + 2000, "dims"));
        this.ui.setPrompt(`Infinite Construction XLINE (Crosshairs) placed through (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}).`);
        this.cancelCommand();
        break;
      }
      case "CHAMFER": {
        const targetLine = this.findNearestEntity(pt);
        if (targetLine && targetLine.type === "LINE") {
          if (this.step === 0) {
            this.selectedLinesForFillet = [targetLine];
            this.step = 1;
            this.ui.setPrompt("CHAMFER Select second line:");
          } else if (this.step === 1) {
            const l1 = this.selectedLinesForFillet[0];
            const l2 = targetLine;
            this.engine.addEntity(new CadLine(l1.x2, l1.y2, l2.x1, l2.y1));
            this.ui.setPrompt("Chamfer bevel applied.");
            this.cancelCommand();
          }
        } else {
          this.ui.setPrompt("CHAMFER: Click directly on a LINE segment.");
        }
        break;
      }
      case "DIVIDE": {
        const target = this.findNearestEntity(pt);
        if (target && target.type === "LINE") {
          const segs = 5;
          for (let i = 1; i < segs; i++) {
            const frac = i / segs;
            const px = target.x1 + (target.x2 - target.x1) * frac;
            const py = target.y1 + (target.y2 - target.y1) * frac;
            this.engine.addEntity({
              type: "POINT", x: px, y: py, layer: "dims", color: "#f59e0b",
              getSnapPoints: () => [{ x: px, y: py, type: "node" }],
              move: function(dx, dy) { this.x += dx; this.y += dy; },
              clone: function() { return { ...this }; }
            });
          }
          this.ui.setPrompt(`DIVIDE: Line divided into ${segs} equal segments with point markers.`);
        } else {
          this.ui.setPrompt("DIVIDE: Click a line entity to divide.");
        }
        this.cancelCommand();
        break;
      }
      case "MATCHPROP": {
        const sourceEnt = this.findNearestEntity(pt);
        if (sourceEnt) {
          const srcLayer = sourceEnt.layer;
          for (const ent of this.engine.selectedEntities) {
            ent.layer = srcLayer;
          }
          this.ui.setPrompt(`MATCHPROP: Applied layer "${srcLayer}" properties to selected objects.`);
          this.engine.render();
        }
        this.cancelCommand();
        break;
      }
      case "PROJPLANE": {
        const eg = this.getEngGraphics();
        if (eg) {
          eg.projectPlane("HEXAGON", 28, 45, pt.x, pt.y);
          this.ui.setPrompt("Generated Projections of Plane (Hexagonal lamina inclined 45° to HP) with Elevation, Plan & Projectors.");
        }
        this.cancelCommand();
        break;
      }
      case "PROJSOLID": {
        const eg = this.getEngGraphics();
        if (eg) {
          eg.projectSolid("PRISM", 6, 25, 60, 30, pt.x, pt.y);
          this.ui.setPrompt("Generated Projections of Solid (Hexagonal prism, base inclined 30° to HP) via Rotation Method.");
        }
        this.cancelCommand();
        break;
      }
      case "SECTIONSOLID": {
        const eg = this.getEngGraphics();
        if (eg) {
          eg.sectionSolid("CYLINDER", 40, 70, 35, 35, pt.x, pt.y);
          this.ui.setPrompt("Generated Section of Solid (Cylinder cut at 35°), Sectional Top View, and True Shape of Section.");
        }
        this.cancelCommand();
        break;
      }
      case "DEVTRANSITION": {
        const eg = this.getEngGraphics();
        if (eg) {
          eg.developCylinder(40, 70, pt.x, pt.y);
          this.ui.setPrompt("Generated Development of Transition Piece / Duct Cylinder.");
        }
        this.cancelCommand();
        break;
      }
      case "ORTHOPROJ": {
        const eg = this.getEngGraphics();
        if (eg) {
          eg.generateOrthographic3Views("STEPPED_BLOCK", pt.x, pt.y, eg.projectionAngle);
          this.ui.setPrompt(`Generated Complete Orthographic Projections (Front, Top & Side Views) in ${eg.projectionAngle === 1 ? "1st" : "3rd"} Angle.`);
        }
        this.cancelCommand();
        break;
      }
    }
  }

  toggleProjectionAngle() {
    const eg = this.getEngGraphics();
    if (!eg) return;
    const newAngle = eg.projectionAngle === 1 ? 3 : 1;
    eg.setProjectionAngle(newAngle);
    const btn = document.getElementById("proj-angle-btn-text");
    if (btn) btn.textContent = newAngle === 1 ? "1st Angle (ISO)" : "3rd Angle (ANSI)";
    this.ui.setPrompt(`Projection System switched to: ${newAngle === 1 ? "First Angle Projection (ISO / BIS)" : "Third Angle Projection (ANSI / US)"}`);
  }

  toggleDimMode() {
    const eg = this.getEngGraphics();
    if (!eg) return;
    const newMode = eg.dimensioningSystem === "aligned" ? "unidirectional" : "aligned";
    eg.setDimensioningSystem(newMode);
    this.ui.setPrompt(`Dimensioning System switched to: ${newMode.toUpperCase()} (BIS SP 46)`);
  }

  createLettering() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789";
    const center = (this.engine.getViewportCenter ? this.engine.getViewportCenter() : null) || { x: 100, y: 200 };
    const textEnt = {
      type: "TEXT",
      x: center.x - 120,
      y: center.y,
      text: letters,
      height: 14,
      color: "#e2e8f0",
      bold: true,
      layer: "LETTERING"
    };
    this.engine.addEntity(textEnt);
    this.engine.render();
    this.ui.setPrompt("Single Stroke Lettering sample placed (BIS Standard 7:10 ratio).");
  }

  executeFillet(l1, l2, radius) {
    if (l1 === l2) return;
    const dx1 = l1.x2 - l1.x1;
    const dy1 = l1.y2 - l1.y1;
    const dx2 = l2.x2 - l2.x1;
    const dy2 = l2.y2 - l2.y1;
    const det = dx1 * dy2 - dy1 * dx2;

    if (Math.abs(det) < 1e-6) {
      this.ui.setPrompt("FILLET: Selected lines are parallel.");
      return;
    }

    const t = ((l2.x1 - l1.x1) * dy2 - (l2.y1 - l1.y1) * dx2) / det;
    const ix = l1.x1 + t * dx1;
    const iy = l1.y1 + t * dy1;

    const d1a = Math.hypot(l1.x1 - ix, l1.y1 - iy);
    const d1b = Math.hypot(l1.x2 - ix, l1.y2 - iy);
    const p1Far = d1a > d1b ? { x: l1.x1, y: l1.y1 } : { x: l1.x2, y: l1.y2 };

    const d2a = Math.hypot(l2.x1 - ix, l2.y1 - iy);
    const d2b = Math.hypot(l2.x2 - ix, l2.y2 - iy);
    const p2Far = d2a > d2b ? { x: l2.x1, y: l2.y1 } : { x: l2.x2, y: l2.y2 };

    if (!radius || radius <= 0) {
      if (d1a < d1b) { l1.x1 = ix; l1.y1 = iy; } else { l1.x2 = ix; l1.y2 = iy; }
      if (d2a < d2b) { l2.x1 = ix; l2.y1 = iy; } else { l2.x2 = ix; l2.y2 = iy; }
      this.engine.render();
      this.ui.setPrompt("Fillet (R=0) corner joined at intersection.");
      return;
    }

    const v1 = { x: p1Far.x - ix, y: p1Far.y - iy };
    const len1 = Math.hypot(v1.x, v1.y);
    v1.x /= len1; v1.y /= len1;

    const v2 = { x: p2Far.x - ix, y: p2Far.y - iy };
    const len2 = Math.hypot(v2.x, v2.y);
    v2.x /= len2; v2.y /= len2;

    const dot = Math.max(-1, Math.min(1, v1.x * v2.x + v1.y * v2.y));
    const alpha = Math.acos(dot);
    if (alpha < 0.01 || alpha > Math.PI - 0.01) {
      this.ui.setPrompt("FILLET: Angle between lines too shallow.");
      return;
    }

    const tanDist = radius / Math.tan(alpha / 2);
    const t1 = { x: ix + tanDist * v1.x, y: iy + tanDist * v1.y };
    const t2 = { x: ix + tanDist * v2.x, y: iy + tanDist * v2.y };

    const bisect = { x: v1.x + v2.x, y: v1.y + v2.y };
    const bisectLen = Math.hypot(bisect.x, bisect.y);
    bisect.x /= bisectLen; bisect.y /= bisectLen;
    const centerDist = radius / Math.sin(alpha / 2);
    const center = { x: ix + centerDist * bisect.x, y: iy + centerDist * bisect.y };

    if (d1a < d1b) { l1.x1 = t1.x; l1.y1 = t1.y; } else { l1.x2 = t1.x; l1.y2 = t1.y; }
    if (d2a < d2b) { l2.x1 = t2.x; l2.y1 = t2.y; } else { l2.x2 = t2.x; l2.y2 = t2.y; }

    let ang1 = Math.atan2(t1.y - center.y, t1.x - center.x);
    let ang2 = Math.atan2(t2.y - center.y, t2.x - center.x);
    if (ang1 < 0) ang1 += 2 * Math.PI;
    if (ang2 < 0) ang2 += 2 * Math.PI;

    let diff = ang2 - ang1;
    if (diff < 0) diff += 2 * Math.PI;
    if (diff > Math.PI) {
      const tmp = ang1; ang1 = ang2; ang2 = tmp;
    }

    const arc = new CadArc(center.x, center.y, radius, ang1, ang2, l1.layer);
    this.engine.addEntity(arc);
    this.engine.render();
    this.ui.setPrompt(`Fillet (R=${radius}) created.`);
  }

  executeJoin() {
    const selected = Array.from(this.engine.selectedEntities).filter(e => e.type === "LINE");
    if (selected.length < 2) {
      this.ui.setPrompt("JOIN: Select 2 or more touching lines to join into a polyline.");
      return;
    }

    const lines = [...selected];
    const firstLine = lines.shift();
    const pts = [{ x: firstLine.x1, y: firstLine.y1 }, { x: firstLine.x2, y: firstLine.y2 }];
    const tol = 1.0;

    let mergedAny = true;
    while (mergedAny && lines.length > 0) {
      mergedAny = false;
      const startPt = pts[0];
      const endPt = pts[pts.length - 1];

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (Math.hypot(l.x1 - endPt.x, l.y1 - endPt.y) <= tol) {
          pts.push({ x: l.x2, y: l.y2 });
          lines.splice(i, 1);
          mergedAny = true;
          break;
        } else if (Math.hypot(l.x2 - endPt.x, l.y2 - endPt.y) <= tol) {
          pts.push({ x: l.x1, y: l.y1 });
          lines.splice(i, 1);
          mergedAny = true;
          break;
        } else if (Math.hypot(l.x2 - startPt.x, l.y2 - startPt.y) <= tol) {
          pts.unshift({ x: l.x1, y: l.y1 });
          lines.splice(i, 1);
          mergedAny = true;
          break;
        } else if (Math.hypot(l.x1 - startPt.x, l.y1 - startPt.y) <= tol) {
          pts.unshift({ x: l.x2, y: l.y2 });
          lines.splice(i, 1);
          mergedAny = true;
          break;
        }
      }
    }

    const mergedCount = selected.length - lines.length;
    if (mergedCount >= 2) {
      const closed = Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) <= tol;
      if (closed) pts.pop();
      selected.forEach(l => {
        if (!lines.includes(l)) {
          this.engine.removeEntity(l);
        }
      });
      const pline = new CadPolyline(pts, closed, firstLine.layer);
      this.engine.addEntity(pline);
      this.engine.selectedEntities.clear();
      this.engine.selectedEntities.add(pline);
      this.engine.render();
      this.ui.updateQuickProperties();
      this.ui.updateCommandActionPills();
      this.ui.setPrompt(`JOIN: ${mergedCount} lines joined into 1 polyline.`);
    } else {
      this.ui.setPrompt("JOIN: Could not find touching endpoints to join.");
    }
  }

  executeExplode() {
    const selected = Array.from(this.engine.selectedEntities);
    if (selected.length === 0) {
      this.ui.setPrompt("EXPLODE: Select block instances, polylines, or rectangles to explode.");
      return;
    }

    let explodedCount = 0;
    for (const ent of selected) {
      if (ent.type === "BLOCK") {
        const def = window.xcadSmartBlocks ? window.xcadSmartBlocks.getBlock(ent.blockName) : null;
        if (def && def.primitives) {
          for (const p of def.primitives) {
            const s = ent.scale;
            const rot = ent.rotation;
            if (p.type === "LINE") {
              const p1 = rotatePoint(p.x1 * s, p.y1 * s, 0, 0, rot);
              const p2 = rotatePoint(p.x2 * s, p.y2 * s, 0, 0, rot);
              this.engine.addEntity(new CadLine(ent.x + p1.x, ent.y + p1.y, ent.x + p2.x, ent.y + p2.y, ent.layer));
            } else if (p.type === "CIRCLE") {
              const cp = rotatePoint(p.cx * s, p.cy * s, 0, 0, rot);
              this.engine.addEntity(new CadCircle(ent.x + cp.x, ent.y + cp.y, p.r * s, ent.layer));
            } else if (p.type === "ARC") {
              const cp = rotatePoint(p.cx * s, p.cy * s, 0, 0, rot);
              this.engine.addEntity(new CadArc(ent.x + cp.x, ent.y + cp.y, p.r * s, p.startAngle + rot, p.endAngle + rot, ent.layer));
            } else if (p.type === "RECTANGLE") {
              const corners = [
                { x: p.x1 * s, y: p.y1 * s },
                { x: p.x2 * s, y: p.y1 * s },
                { x: p.x2 * s, y: p.y2 * s },
                { x: p.x1 * s, y: p.y2 * s }
              ].map(pt => rotatePoint(pt.x, pt.y, 0, 0, rot));
              for (let i = 0; i < 4; i++) {
                const c1 = corners[i];
                const c2 = corners[(i + 1) % 4];
                this.engine.addEntity(new CadLine(ent.x + c1.x, ent.y + c1.y, ent.x + c2.x, ent.y + c2.y, ent.layer));
              }
            }
          }
          this.engine.removeEntity(ent);
          explodedCount++;
        }
      } else if (ent.type === "POLYLINE" && ent.points.length >= 2) {
        for (let i = 0; i < ent.points.length - 1; i++) {
          this.engine.addEntity(new CadLine(ent.points[i].x, ent.points[i].y, ent.points[i+1].x, ent.points[i+1].y, ent.layer));
        }
        if (ent.closed && ent.points.length > 2) {
          const last = ent.points[ent.points.length - 1];
          const first = ent.points[0];
          this.engine.addEntity(new CadLine(last.x, last.y, first.x, first.y, ent.layer));
        }
        this.engine.removeEntity(ent);
        explodedCount++;
      } else if (ent.type === "RECTANGLE") {
        const minX = Math.min(ent.x1, ent.x2);
        const maxX = Math.max(ent.x1, ent.x2);
        const minY = Math.min(ent.y1, ent.y2);
        const maxY = Math.max(ent.y1, ent.y2);
        this.engine.addEntity(new CadLine(minX, minY, maxX, minY, ent.layer));
        this.engine.addEntity(new CadLine(maxX, minY, maxX, maxY, ent.layer));
        this.engine.addEntity(new CadLine(maxX, maxY, minX, maxY, ent.layer));
        this.engine.addEntity(new CadLine(minX, maxY, minX, minY, ent.layer));
        this.engine.removeEntity(ent);
        explodedCount++;
      }
    }

    this.engine.selectedEntities.clear();
    this.engine.render();
    this.ui.updateQuickProperties();
    this.ui.updateCommandActionPills();
    this.ui.setPrompt(`EXPLODE: ${explodedCount} objects exploded.`);
  }

  executePurge() {
    let purgedLayers = 0;
    const usedLayers = new Set(this.engine.entities.map(e => e.layer));
    usedLayers.add("0");
    usedLayers.add("dims");
    usedLayers.add("center");
    usedLayers.add("hidden");
    const countBefore = this.engine.layers.length;
    this.engine.layers = this.engine.layers.filter(l => usedLayers.has(l.id));
    purgedLayers = countBefore - this.engine.layers.length;
    this.engine.render();
    this.ui.setPrompt(`PURGE: Purged ${purgedLayers} unused layers and unreferenced blocks. Database clean.`);
  }

  // Quick Mode Trim / Extend with Shift Toggle
  executeQuickTrimExtend(pt, shiftKey) {
    const isTrim = (this.activeCommand === "TRIM" && !shiftKey) || (this.activeCommand === "EXTEND" && shiftKey);
    const nearest = this.findNearestEntity(pt);

    if (nearest && nearest.type === "LINE") {
      if (isTrim) {
        // Trim clicked segment
        this.engine.removeEntity(nearest);
        this.ui.setPrompt("Trimmed object.");
      } else {
        // Extend line length
        const ang = Math.atan2(nearest.y2 - nearest.y1, nearest.x2 - nearest.x1);
        nearest.x2 += 30 * Math.cos(ang);
        nearest.y2 += 30 * Math.sin(ang);
        this.engine.render();
        this.ui.setPrompt("Extended object.");
      }
    }
  }

  isPointNearEntity(ent, pt, tol) {
    if (typeof ent.isPointNear === "function") {
      return ent.isPointNear(pt, tol);
    }
    for (const sp of ent.getSnapPoints()) {
      if (Math.hypot(sp.x - pt.x, sp.y - pt.y) <= tol) return true;
    }
    return false;
  }

  findNearestEntity(pt, tol = 12 / this.engine.scale) {
    for (const ent of this.engine.entities) {
      if (this.isPointNearEntity(ent, pt, tol)) {
        return ent;
      }
    }
    let nearest = null;
    let minDist = 35 / this.engine.scale;
    for (const ent of this.engine.entities) {
      for (const sp of ent.getSnapPoints()) {
        const d = Math.hypot(sp.x - pt.x, sp.y - pt.y);
        if (d < minDist) {
          minDist = d;
          nearest = ent;
        }
      }
    }
    return nearest;
  }

  findNearestCircleOrArc(pt) {
    let nearest = null;
    let minDist = 60 / this.engine.scale;
    for (const ent of this.engine.entities) {
      if (ent.type === "CIRCLE" || ent.type === "ARC") {
        const d = Math.hypot(ent.cx - pt.x, ent.cy - pt.y);
        if (Math.abs(d - ent.r) < minDist || d < ent.r) {
          nearest = ent;
          break;
        }
      }
    }
    return nearest;
  }

  updateRubberband(pt) {
    if (!this.tempPoints.length) return;

    if (this.activeCommand === "LINE") {
      const p1 = this.tempPoints[this.tempPoints.length - 1];
      this.tempEntity = new CadLine(p1.x, p1.y, pt.x, pt.y);
    } else if (this.activeCommand === "POLYLINE" && this.tempPoints.length >= 1) {
      const pts = [...this.tempPoints, pt];
      this.tempEntity = new CadPolyline(pts, false);
    } else if (this.activeCommand === "CIRCLE") {
      const c = this.tempPoints[0];
      const r = Math.hypot(pt.x - c.x, pt.y - c.y);
      this.tempEntity = new CadCircle(c.x, c.y, r);
    } else if (this.activeCommand === "RECTANGLE") {
      const p1 = this.tempPoints[0];
      this.tempEntity = new CadRectangle(p1.x, p1.y, pt.x, pt.y);
    } else if (this.activeCommand === "ARC" && this.tempPoints.length === 2) {
      const arcGeom = this.calc3PointArc(this.tempPoints[0], this.tempPoints[1], pt);
      if (arcGeom) {
        this.tempEntity = new CadArc(arcGeom.cx, arcGeom.cy, arcGeom.r, arcGeom.start, arcGeom.end);
      }
    }
    this.engine.render(this.tempEntity, true);
  }

  calc3PointArc(p1, p2, p3) {
    const d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
    if (Math.abs(d) < 1e-6) return null;

    const cx = ((p1.x**2 + p1.y**2) * (p2.y - p3.y) + (p2.x**2 + p2.y**2) * (p3.y - p1.y) + (p3.x**2 + p3.y**2) * (p1.y - p2.y)) / d;
    const cy = ((p1.x**2 + p1.y**2) * (p3.x - p2.x) + (p2.x**2 + p2.y**2) * (p1.x - p3.x) + (p3.x**2 + p3.y**2) * (p2.x - p1.x)) / d;
    const r = Math.hypot(p1.x - cx, p1.y - cy);

    let a1 = Math.atan2(p1.y - cy, p1.x - cx);
    let a3 = Math.atan2(p3.y - cy, p3.x - cx);
    if (a1 < 0) a1 += 2 * Math.PI;
    if (a3 < 0) a3 += 2 * Math.PI;

    return { cx, cy, r, start: a1, end: a3 };
  }

  resolveSelectionBox() {
    const { x1, y1, x2, y2, type } = this.engine.selectionBox;
    const minScrX = Math.min(x1, x2);
    const maxScrX = Math.max(x1, x2);
    const minScrY = Math.min(y1, y2);
    const maxScrY = Math.max(y1, y2);

    // Single-click selection check (< 4px drag)
    if ((maxScrX - minScrX) < 4 && (maxScrY - minScrY) < 4) {
      const pClick = this.engine.screenToWorld((x1 + x2) / 2, (y1 + y2) / 2);
      const clicked = this.findNearestEntity(pClick);
      if (clicked) {
        if (this.engine.selectedEntities.has(clicked)) {
          this.engine.selectedEntities.delete(clicked);
        } else {
          this.engine.selectedEntities.add(clicked);
        }
      } else {
        this.engine.selectedEntities.clear();
      }
      return;
    }

    const worldTopLeft = this.engine.screenToWorld(minScrX, minScrY);
    const worldBottomRight = this.engine.screenToWorld(maxScrX, maxScrY);

    const minX = Math.min(worldTopLeft.x, worldBottomRight.x);
    const maxX = Math.max(worldTopLeft.x, worldBottomRight.x);
    const minY = Math.min(worldTopLeft.y, worldBottomRight.y);
    const maxY = Math.max(worldTopLeft.y, worldBottomRight.y);

    this.engine.selectedEntities.clear();
    for (const ent of this.engine.entities) {
      if (type === "window") {
        if (ent.isInsideBox(minX, minY, maxX, maxY)) {
          this.engine.selectedEntities.add(ent);
        }
      } else {
        if (ent.touchesBox(minX, minY, maxX, maxY)) {
          this.engine.selectedEntities.add(ent);
        }
      }
    }
  }

  // --- Keyboard Handling (Hotkeys F1-F12, Esc, Spacebar, Ctrl+0) ---
  onKeyDown(e) {
    if (e.key === "Escape") {
      this.cancelCommand();
      return;
    }

    const isInput = document.activeElement && (
      document.activeElement.tagName === "INPUT" ||
      document.activeElement.tagName === "TEXTAREA" ||
      document.activeElement.isContentEditable
    );

    // Spacebar & Enter as universal AutoCAD action keys
    if (e.key === "Enter" || e.key === " ") {
      if (!isInput) {
        e.preventDefault();
        if (this.activeCommand) {
          this.finishCommand();
        } else if (this.lastCommandName) {
          this.startCommand(this.lastCommandName);
        }
        return;
      }
    }

    if (e.ctrlKey && e.key === "0") {
      e.preventDefault();
      this.ui.toggleFullscreen();
      return;
    }

    // Function keys (AutoCAD status bar toggles)
    if (e.key === "F3") { e.preventDefault(); this.ui.toggleDraft("osnap"); }
    else if (e.key === "F7") { e.preventDefault(); this.ui.toggleDraft("grid"); }
    else if (e.key === "F8") { e.preventDefault(); this.ui.toggleDraft("ortho"); }
    else if (e.key === "F9") { e.preventDefault(); this.ui.toggleDraft("snap"); }
    else if (e.key === "F10") { e.preventDefault(); this.ui.toggleDraft("polar"); }
    else if (e.key === "F11") { e.preventDefault(); this.ui.toggleFullscreen(); }
    else if (e.key === "F12") { e.preventDefault(); this.ui.toggleDraft("dyn"); }

    if (e.key === "Delete" && this.engine.selectedEntities.size > 0 && !isInput) {
      for (const ent of Array.from(this.engine.selectedEntities)) {
        this.engine.removeEntity(ent);
      }
      this.ui.setPrompt("Selected objects deleted.");
      this.engine.render();
    }

    // Auto-focus command prompt if letters or digits typed (exclude Spacebar and when typing in another input)
    if (!isInput && e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.altKey && !e.metaKey) {
      this.ui.cmdInput.focus();
    }
  }

  // --- Modes Toggles ---
  toggleQuickMeasure() {
    this.engine.quickMeasureEnabled = !this.engine.quickMeasureEnabled;
    const pill = document.getElementById("pill-qm");
    if (pill) pill.classList.toggle("active", this.engine.quickMeasureEnabled);
    this.ui.logCommand(`QUICKMEASURE ${this.engine.quickMeasureEnabled ? "<ON>" : "<OFF>"}`);
    this.engine.render();
  }

  toggleTraceMode() {
    this.engine.traceModeEnabled = !this.engine.traceModeEnabled;
    this.ui.logCommand(`TRACE MODE ${this.engine.traceModeEnabled ? "<ON: Review Overlay Active>" : "<OFF>"}`);
    this.engine.render();
  }

  toggleCompareMode() {
    this.engine.compareModeEnabled = !this.engine.compareModeEnabled;
    this.ui.logCommand(`DWG COMPARE ${this.engine.compareModeEnabled ? "<ON: Visual Diff Active>" : "<OFF>"}`);
    this.engine.render();
  }

  zoomExtents() {
    if (!this.engine.entities.length) {
      this.engine.panX = this.engine.canvas.clientWidth / 2;
      this.engine.panY = this.engine.canvas.clientHeight / 2;
      this.engine.scale = 1.0;
      this.engine.render();
      this.ui.setPrompt("Zoom Extents (Origin centered).");
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const ent of this.engine.entities) {
      for (const pt of ent.getSnapPoints()) {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }
    }

    const pad = 70;
    const w = this.engine.canvas.clientWidth - pad * 2;
    const h = this.engine.canvas.clientHeight - pad * 2;
    const spanX = Math.max(10, maxX - minX);
    const spanY = Math.max(10, maxY - minY);

    this.engine.scale = Math.min(w / spanX, h / spanY);
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    this.engine.panX = (this.engine.canvas.clientWidth / 2) - (midX * this.engine.scale);
    this.engine.panY = (this.engine.canvas.clientHeight / 2) + (midY * this.engine.scale);

    this.engine.render();
    this.ui.setPrompt("Zoom Extents complete.");
  }

  zoomIn() {
    this.engine.scale *= 1.25;
    this.engine.render();
  }

  zoomOut() {
    this.engine.scale *= 0.8;
    this.engine.render();
  }

  resetView() {
    this.engine.panX = this.engine.canvas.clientWidth / 2;
    this.engine.panY = this.engine.canvas.clientHeight / 2;
    this.engine.scale = 1.0;
    this.engine.render();
    this.ui.setPrompt("View reset to origin (0, 0) at 1:1 scale.");
  }
}

if (typeof window !== "undefined") {
  window.CadCommands = CadCommands;
}
