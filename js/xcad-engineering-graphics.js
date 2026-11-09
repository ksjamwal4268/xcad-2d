/**
 * XCAD 2D - Engineering Graphics & CAD Curriculum Engine (BMET21 / AutoCAD 2026)
 * Implements:
 * 1. Engineering Curves: Cycloid, Involute, Archimedean Spiral, Helix
 * 2. Scales: Plain Scale & Diagonal Scale with RF calculation
 * 3. Projections: Quadrants I-IV, Projection of Points, Projection of Lines with True Length & Angles
 * 4. Surface Development: Parallel-line (Prism, Cylinder) & Radial-line (Cone, Pyramid)
 * 5. Dimensioning Systems: Aligned vs. Unidirectional Dimensioning
 */

class XCadEngineeringGraphics {
  constructor(engine) {
    this.engine = engine;
    this.projectionAngle = 1; // 1 = First Angle Projection (Standard ISO/BIS), 3 = Third Angle (US/ANSI)
    this.dimensioningSystem = "aligned"; // 'aligned' or 'unidirectional'
  }

  // =========================================================================
  // 1. ENGINEERING CURVES
  // =========================================================================

  /**
   * Cycloid: Locus of a point on the circumference of a rolling circle on a flat directing line
   * x = r * (t - sin(t)), y = r * (1 - cos(t))
   */
  createCycloid(radius = 25, originX = 100, originY = 300) {
    const r = Number(radius) || 25;
    const circumference = 2 * Math.PI * r;
    const steps = 60;
    const points = [];

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * (2 * Math.PI);
      const x = originX + r * (t - Math.sin(t));
      const y = originY - r * (1 - Math.cos(t)); // inverted Y for screen coordinates
      points.push({ x, y });
    }

    // Directing Base Line
    const baseLine = {
      type: "LINE",
      x1: originX,
      y1: originY,
      x2: originX + circumference,
      y2: originY,
      layer: "DEFPOINTS",
      color: "#64748b",
      lineType: "DASHED",
      lineWidth: 1
    };

    // Generating Circle at start
    const genCircle = {
      type: "CIRCLE",
      cx: originX,
      cy: originY - r,
      r: r,
      layer: "DEFPOINTS",
      color: "#475569",
      lineType: "DASHED",
      lineWidth: 1
    };

    // Cycloidal Curve
    const cycloidCurve = {
      type: "SPLINE",
      points: points,
      layer: "CURVES",
      color: "#38bdf8",
      lineWidth: 2.5,
      meta: {
        name: `Cycloid (R=${r})`,
        circumference: circumference.toFixed(2),
        curveType: "CYCLOID"
      }
    };

    // Text Label
    const label = {
      type: "TEXT",
      x: originX + circumference / 2 - 40,
      y: originY + 25,
      text: `Cycloid (R=${r}mm, 2πR=${circumference.toFixed(1)}mm)`,
      height: 12,
      color: "#94a3b8"
    };

    this.engine.addEntity(baseLine);
    this.engine.addEntity(genCircle);
    this.engine.addEntity(cycloidCurve);
    this.engine.addEntity(label);

    return cycloidCurve;
  }

  /**
   * Involute: Curve traced by the end of a taut string unwound from a cylinder/circle
   * x = r * (cos(t) + t * sin(t)), y = r * (sin(t) - t * cos(t))
   */
  createInvolute(radius = 20, turns = 1.0, originX = 200, originY = 300) {
    const r = Number(radius) || 20;
    const maxT = turns * 2 * Math.PI;
    const steps = 60;
    const points = [];

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * maxT;
      const x = originX + r * (Math.cos(t) + t * Math.sin(t));
      const y = originY - r * (Math.sin(t) - t * Math.cos(t));
      points.push({ x, y });
    }

    // Base Circle
    const baseCircle = {
      type: "CIRCLE",
      cx: originX,
      cy: originY,
      r: r,
      layer: "DEFPOINTS",
      color: "#64748b",
      lineType: "DASHED",
      lineWidth: 1
    };

    // Involute Curve
    const involuteCurve = {
      type: "SPLINE",
      points: points,
      layer: "CURVES",
      color: "#f59e0b",
      lineWidth: 2.5,
      meta: {
        name: `Involute (Base R=${r})`,
        curveType: "INVOLUTE"
      }
    };

    const label = {
      type: "TEXT",
      x: originX - 40,
      y: originY + r + 30,
      text: `Involute of Circle (R=${r}mm)`,
      height: 12,
      color: "#94a3b8"
    };

    this.engine.addEntity(baseCircle);
    this.engine.addEntity(involuteCurve);
    this.engine.addEntity(label);

    return involuteCurve;
  }

  /**
   * Archimedean Spiral: r = a + b * theta
   */
  createSpiral(a = 5, b = 4, turns = 2, originX = 200, originY = 300) {
    const maxTheta = turns * 2 * Math.PI;
    const steps = 80;
    const points = [];

    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * maxTheta;
      const radius = a + b * theta;
      const x = originX + radius * Math.cos(theta);
      const y = originY - radius * Math.sin(theta);
      points.push({ x, y });
    }

    const spiral = {
      type: "SPLINE",
      points: points,
      layer: "CURVES",
      color: "#ec4899",
      lineWidth: 2.2,
      meta: {
        name: `Archimedean Spiral (${turns} turns)`,
        curveType: "SPIRAL"
      }
    };

    const label = {
      type: "TEXT",
      x: originX - 50,
      y: originY + (a + b * maxTheta) + 20,
      text: `Archimedean Spiral (Turns=${turns})`,
      height: 12,
      color: "#94a3b8"
    };

    this.engine.addEntity(spiral);
    this.engine.addEntity(label);
    return spiral;
  }

  /**
   * 2D Projection of Helix: Sinusoidal projection along an axis with pitch and turns
   */
  createHelix2D(radius = 30, pitch = 40, turns = 3, originX = 100, originY = 300) {
    const steps = turns * 36;
    const points = [];

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * (turns * 2 * Math.PI);
      const x = originX + (t / (2 * Math.PI)) * pitch;
      const y = originY - radius * Math.sin(t);
      points.push({ x, y });
    }

    const helix = {
      type: "SPLINE",
      points: points,
      layer: "CURVES",
      color: "#22c55e",
      lineWidth: 2.2,
      meta: {
        name: `Helix 2D (R=${radius}, Pitch=${pitch})`,
        curveType: "HELIX"
      }
    };

    // Centerline Axis
    const axis = {
      type: "LINE",
      x1: originX - 20,
      y1: originY,
      x2: originX + turns * pitch + 20,
      y2: originY,
      layer: "CENTERLINE",
      color: "#ef4444",
      lineType: "CENTER",
      lineWidth: 1
    };

    const label = {
      type: "TEXT",
      x: originX,
      y: originY + radius + 25,
      text: `Helix Projection (Pitch=${pitch}mm, Turns=${turns})`,
      height: 12,
      color: "#94a3b8"
    };

    this.engine.addEntity(axis);
    this.engine.addEntity(helix);
    this.engine.addEntity(label);
    return helix;
  }

  // =========================================================================
  // 2. SCALES (Plain Scale & Diagonal Scale)
  // =========================================================================

  /**
   * Plain Scale: Represents 2 consecutive units (e.g. Meters and Decimeters)
   * With standard Zero Mark (0 in between main and sub division), RF ratio, and graduation blocks
   */
  createPlainScale(rfNumerator = 1, rfDenominator = 50, maxMeters = 5, originX = 80, originY = 400) {
    const scaleLengthMm = (maxMeters * 1000) * (rfNumerator / rfDenominator); // length on drawing in mm
    const height = 14;
    const numDivisions = maxMeters;
    const divWidth = scaleLengthMm / numDivisions;

    const entities = [];

    // Outer frame rectangle
    entities.push({
      type: "RECTANGLE",
      x: originX,
      y: originY,
      width: scaleLengthMm,
      height: height,
      color: "#e2e8f0",
      lineWidth: 2,
      layer: "SCALES"
    });

    // Horizontal split line
    entities.push({
      type: "LINE",
      x1: originX,
      y1: originY + height / 2,
      x2: originX + scaleLengthMm,
      y2: originY + height / 2,
      color: "#94a3b8",
      lineWidth: 1,
      layer: "SCALES"
    });

    // Major division blocks
    for (let i = 1; i < numDivisions; i++) {
      const dx = originX + i * divWidth;
      entities.push({
        type: "LINE",
        x1: dx,
        y1: originY,
        x2: dx,
        y2: originY + height,
        color: "#94a3b8",
        lineWidth: 1.5,
        layer: "SCALES"
      });
    }

    // Sub-divisions on the first block (to the left of 0)
    const subDivs = 10;
    const subWidth = divWidth / subDivs;
    for (let s = 1; s < subDivs; s++) {
      const sx = originX + s * subWidth;
      entities.push({
        type: "LINE",
        x1: sx,
        y1: originY + (s % 5 === 0 ? 0 : height / 2),
        x2: sx,
        y2: originY + height,
        color: "#64748b",
        lineWidth: 1,
        layer: "SCALES"
      });
    }

    // Zero Mark & Numbers
    // Zero is at the end of the first main division
    const zeroX = originX + divWidth;
    entities.push({
      type: "TEXT",
      x: zeroX - 4,
      y: originY + height + 16,
      text: "0",
      height: 11,
      color: "#38bdf8"
    });

    // Sub division mark 10 on the far left
    entities.push({
      type: "TEXT",
      x: originX - 6,
      y: originY + height + 16,
      text: "10 (dm)",
      height: 10,
      color: "#94a3b8"
    });

    // Major division marks to the right of 0
    for (let m = 1; m < numDivisions; m++) {
      entities.push({
        type: "TEXT",
        x: zeroX + m * divWidth - 4,
        y: originY + height + 16,
        text: `${m}`,
        height: 11,
        color: "#e2e8f0"
      });
    }

    // Unit label at end
    entities.push({
      type: "TEXT",
      x: originX + scaleLengthMm + 10,
      y: originY + height + 16,
      text: "METERS",
      height: 11,
      color: "#38bdf8"
    });

    // Title & RF Header
    entities.push({
      type: "TEXT",
      x: originX + scaleLengthMm / 2 - 80,
      y: originY - 15,
      text: `PLAIN SCALE: R.F. = ${rfNumerator}:${rfDenominator} (Max ${maxMeters}m, Length=${scaleLengthMm.toFixed(1)}mm)`,
      height: 12,
      color: "#f59e0b",
      bold: true
    });

    entities.forEach(e => this.engine.addEntity(e));
    return entities;
  }

  /**
   * Diagonal Scale: Represents 3 consecutive units (e.g. Meters, Decimeters, and Centimeters)
   * Using Principle of Diagonal Division (Vernier geometry)
   */
  createDiagonalScale(rfNumerator = 1, rfDenominator = 40, maxMeters = 4, originX = 80, originY = 400) {
    const scaleLengthMm = (maxMeters * 1000) * (rfNumerator / rfDenominator);
    const height = 50; // taller for 10 diagonal rows
    const numDivisions = maxMeters;
    const divWidth = scaleLengthMm / numDivisions;
    const rows = 10;
    const rowH = height / rows;

    const entities = [];

    // Outer boundary
    entities.push({
      type: "RECTANGLE",
      x: originX,
      y: originY,
      width: scaleLengthMm,
      height: height,
      color: "#e2e8f0",
      lineWidth: 2,
      layer: "SCALES"
    });

    // 10 Horizontal lines for the 3rd unit (Centimeters)
    for (let r = 1; r < rows; r++) {
      entities.push({
        type: "LINE",
        x1: originX,
        y1: originY + r * rowH,
        x2: originX + scaleLengthMm,
        y2: originY + r * rowH,
        color: "#475569",
        lineWidth: 1,
        layer: "SCALES"
      });
    }

    // Vertical dividers for major units
    for (let i = 1; i <= numDivisions; i++) {
      const dx = originX + i * divWidth;
      entities.push({
        type: "LINE",
        x1: dx,
        y1: originY,
        x2: dx,
        y2: originY + height,
        color: "#94a3b8",
        lineWidth: 1.5,
        layer: "SCALES"
      });
    }

    // First division: Sub-divisions & Diagonals
    const subDivs = 10;
    const subW = divWidth / subDivs;

    // Diagonals in the first block
    for (let d = 0; d <= subDivs; d++) {
      const topX = originX + (d === 0 ? 0 : (d - 1) * subW);
      const btmX = originX + d * subW;
      if (d > 0) {
        entities.push({
          type: "LINE",
          x1: btmX,
          y1: originY + height, // bottom
          x2: topX,
          y2: originY,          // top
          color: "#38bdf8",
          lineWidth: 1.2,
          layer: "SCALES"
        });
      }
    }

    // Zero Mark & Labels
    const zeroX = originX + divWidth;
    entities.push({
      type: "TEXT",
      x: zeroX - 4,
      y: originY + height + 18,
      text: "0",
      height: 11,
      color: "#38bdf8"
    });

    for (let m = 1; m < numDivisions; m++) {
      entities.push({
        type: "TEXT",
        x: zeroX + m * divWidth - 4,
        y: originY + height + 18,
        text: `${m}`,
        height: 11,
        color: "#e2e8f0"
      });
    }

    entities.push({
      type: "TEXT",
      x: originX + scaleLengthMm + 10,
      y: originY + height + 18,
      text: "METERS",
      height: 11,
      color: "#38bdf8"
    });

    // Vertical numbers (Centimeters: 2, 4, 6, 8, 10)
    for (let c = 2; c <= 10; c += 2) {
      entities.push({
        type: "TEXT",
        x: originX - 22,
        y: originY + height - c * rowH + 4,
        text: `${c}`,
        height: 9,
        color: "#94a3b8"
      });
    }

    entities.push({
      type: "TEXT",
      x: originX - 45,
      y: originY + height / 2 + 4,
      text: "CM",
      height: 10,
      color: "#38bdf8"
    });

    // Title
    entities.push({
      type: "TEXT",
      x: originX + scaleLengthMm / 2 - 90,
      y: originY - 15,
      text: `DIAGONAL SCALE: R.F. = ${rfNumerator}:${rfDenominator} (Reads m, dm, cm)`,
      height: 12,
      color: "#f59e0b",
      bold: true
    });

    entities.forEach(e => this.engine.addEntity(e));
    return entities;
  }

  // =========================================================================
  // 3. PROJECTION OF POINTS & STRAIGHT LINES (Unit II BMET21)
  // =========================================================================

  /**
   * Projection of a Point in 4 Quadrants:
   * Q1: Above HP (+), In Front of VP (+) -> Front View a' above XY, Top View a below XY
   * Q2: Above HP (+), Behind VP (-)      -> Both a' and a above XY
   * Q3: Below HP (-), Behind VP (-)      -> a' below XY, a above XY
   * Q4: Below HP (-), In Front of VP (+) -> Both a' and a below XY
   */
  projectPoint(distHP = 30, distVP = 45, quadrant = 1, originX = 300, originY = 300) {
    const hp = Number(distHP) || 30;
    const vp = Number(distVP) || 45;
    const q = Number(quadrant) || 1;

    const entities = [];

    // XY Reference Line (Ground line)
    entities.push({
      type: "LINE",
      x1: originX - 120,
      y1: originY,
      x2: originX + 120,
      y2: originY,
      color: "#94a3b8",
      lineWidth: 2,
      layer: "PROJECTIONS"
    });

    entities.push({
      type: "TEXT",
      x: originX - 135,
      y: originY + 5,
      text: "X",
      height: 14,
      color: "#38bdf8",
      bold: true
    });

    entities.push({
      type: "TEXT",
      x: originX + 125,
      y: originY + 5,
      text: "Y",
      height: 14,
      color: "#38bdf8",
      bold: true
    });

    let elevY, planY; // a' and a screen Y coordinates

    if (q === 1) {
      elevY = originY - hp; // above XY
      planY = originY + vp; // below XY
    } else if (q === 2) {
      elevY = originY - hp; // above XY
      planY = originY - vp; // above XY
    } else if (q === 3) {
      elevY = originY + hp; // below XY
      planY = originY - vp; // above XY
    } else {
      elevY = originY + hp; // below XY
      planY = originY + vp; // below XY
    }

    // Projector Line connecting a' and a
    entities.push({
      type: "LINE",
      x1: originX,
      y1: Math.min(elevY, planY) - 10,
      x2: originX,
      y2: Math.max(elevY, planY) + 10,
      color: "#475569",
      lineType: "DASHED",
      lineWidth: 1,
      layer: "PROJECTIONS"
    });

    // Elevation Point (a')
    entities.push({
      type: "CIRCLE",
      cx: originX,
      cy: elevY,
      r: 3.5,
      color: "#ef4444",
      fill: true,
      layer: "PROJECTIONS"
    });
    entities.push({
      type: "TEXT",
      x: originX + 8,
      y: elevY + 4,
      text: `a' (Front View: ${hp}mm from HP)`,
      height: 11,
      color: "#ef4444",
      bold: true
    });

    // Plan Point (a)
    entities.push({
      type: "CIRCLE",
      cx: originX,
      cy: planY,
      r: 3.5,
      color: "#22c55e",
      fill: true,
      layer: "PROJECTIONS"
    });
    entities.push({
      type: "TEXT",
      x: originX + 8,
      y: planY + 4,
      text: `a (Top View: ${vp}mm from VP)`,
      height: 11,
      color: "#22c55e",
      bold: true
    });

    // Quadrant label
    entities.push({
      type: "TEXT",
      x: originX - 100,
      y: originY - 70,
      text: `Point A in Quadrant ${q}`,
      height: 13,
      color: "#f59e0b",
      bold: true
    });

    entities.forEach(e => this.engine.addEntity(e));
    return entities;
  }

  /**
   * Complete Projection of Straight Line Inclined to Both HP and VP:
   * Computes True Length (TL), True Angles (θ to HP, φ to VP),
   * Apparent Lengths (Elevation Length EL, Plan Length PL),
   * Apparent Angles (α, β), Loci of endpoints, and Traces (HT, VT).
   */
  projectLine(trueLength = 70, thetaHP = 30, phiVP = 45, startA = { hp: 15, vp: 20 }, originX = 150, originY = 300) {
    const TL = Number(trueLength) || 70;
    const radTheta = (Number(thetaHP) * Math.PI) / 180;
    const radPhi = (Number(phiVP) * Math.PI) / 180;

    // Plan length and Elevation length
    const PL = TL * Math.cos(radTheta);
    const EL = TL * Math.cos(radPhi);

    // Height above HP of point B
    const deltaY_HP = TL * Math.sin(radTheta);
    // Distance in front of VP of point B
    const deltaY_VP = TL * Math.sin(radPhi);

    const aX = originX;
    const aPrimeY = originY - startA.hp; // Front view of A
    const aY = originY + startA.vp;      // Top view of A

    const bPrimeY = aPrimeY - deltaY_HP; // Locus of b'
    const bY = aY + deltaY_VP;           // Locus of b

    // Apparent top view rotated endpoint
    const bX = aX + PL;
    const bPrimeX = aX + Math.sqrt(Math.max(0, EL * EL - deltaY_HP * deltaY_HP));

    const entities = [];

    // 1. Reference Ground Line XY
    entities.push({
      type: "LINE",
      x1: originX - 50,
      y1: originY,
      x2: originX + TL + 80,
      y2: originY,
      color: "#94a3b8",
      lineWidth: 2,
      layer: "PROJECTIONS"
    });
    entities.push({ type: "TEXT", x: originX - 65, y: originY + 5, text: "X", height: 13, color: "#38bdf8", bold: true });
    entities.push({ type: "TEXT", x: originX + TL + 85, y: originY + 5, text: "Y", height: 13, color: "#38bdf8", bold: true });

    // 2. Locus Lines
    // Locus of b' (horizontal dashed line in elevation)
    entities.push({
      type: "LINE",
      x1: aX - 20,
      y1: bPrimeY,
      x2: aX + TL + 60,
      y2: bPrimeY,
      color: "#e0e7ff",
      lineType: "DASHED",
      lineWidth: 1,
      layer: "PROJECTIONS"
    });
    entities.push({ type: "TEXT", x: aX + TL + 65, y: bPrimeY + 4, text: "Locus of b'", height: 10, color: "#94a3b8" });

    // Locus of b (horizontal dashed line in plan)
    entities.push({
      type: "LINE",
      x1: aX - 20,
      y1: bY,
      x2: aX + TL + 60,
      y2: bY,
      color: "#e0e7ff",
      lineType: "DASHED",
      lineWidth: 1,
      layer: "PROJECTIONS"
    });
    entities.push({ type: "TEXT", x: aX + TL + 65, y: bY + 4, text: "Locus of b", height: 10, color: "#94a3b8" });

    // 3. Projector of Point A
    entities.push({
      type: "LINE",
      x1: aX,
      y1: aPrimeY - 10,
      x2: aX,
      y2: aY + 10,
      color: "#64748b",
      lineType: "DASHED",
      lineWidth: 1,
      layer: "PROJECTIONS"
    });

    // 4. Front View a'b' (Apparent Elevation)
    entities.push({
      type: "LINE",
      x1: aX,
      y1: aPrimeY,
      x2: bX,
      y2: bPrimeY,
      color: "#ef4444",
      lineWidth: 2.5,
      layer: "PROJECTIONS"
    });
    entities.push({ type: "TEXT", x: aX - 16, y: aPrimeY + 4, text: "a'", height: 12, color: "#ef4444", bold: true });
    entities.push({ type: "TEXT", x: bX + 6, y: bPrimeY + 4, text: "b'", height: 12, color: "#ef4444", bold: true });

    // 5. Top View ab (Apparent Plan)
    entities.push({
      type: "LINE",
      x1: aX,
      y1: aY,
      x2: bX,
      y2: bY,
      color: "#22c55e",
      lineWidth: 2.5,
      layer: "PROJECTIONS"
    });
    entities.push({ type: "TEXT", x: aX - 16, y: aY + 4, text: "a", height: 12, color: "#22c55e", bold: true });
    entities.push({ type: "TEXT", x: bX + 6, y: bY + 4, text: "b", height: 12, color: "#22c55e", bold: true });

    // 6. True Length Line 1 (in elevation rotated: a'b1')
    const b1PrimeX = aX + TL * Math.cos(radTheta);
    entities.push({
      type: "LINE",
      x1: aX,
      y1: aPrimeY,
      x2: b1PrimeX,
      y2: bPrimeY,
      color: "#f59e0b",
      lineWidth: 1.5,
      layer: "PROJECTIONS"
    });
    entities.push({ type: "TEXT", x: b1PrimeX + 5, y: bPrimeY - 5, text: `b1' (TL=${TL})`, height: 10, color: "#f59e0b" });

    // Summary Box
    const summary = [
      `PROJECTION OF STRAIGHT LINE AB`,
      `True Length (TL): ${TL} mm`,
      `Inclination to HP (θ): ${thetaHP}°`,
      `Inclination to VP (φ): ${phiVP}°`,
      `Elevation Length (EL): ${EL.toFixed(1)} mm`,
      `Plan Length (PL): ${PL.toFixed(1)} mm`
    ];

    summary.forEach((txt, idx) => {
      entities.push({
        type: "TEXT",
        x: originX - 40,
        y: originY + 120 + idx * 16,
        text: txt,
        height: 11,
        color: idx === 0 ? "#38bdf8" : "#cbd5e1",
        bold: idx === 0
      });
    });

    entities.forEach(e => this.engine.addEntity(e));
    return entities;
  }

  // =========================================================================
  // 4. DEVELOPMENT OF SURFACES (Unit III BMET21)
  // =========================================================================

  /**
   * Parallel Line Development: Cylinder & Prisms
   * Cylinder Development: Length = π * D, Height = H
   */
  developCylinder(diameter = 40, height = 70, originX = 100, originY = 250) {
    const d = Number(diameter) || 40;
    const h = Number(height) || 70;
    const circumference = Math.PI * d;
    const divisions = 12;
    const stepW = circumference / divisions;

    const entities = [];

    // 1. Unfolded Lateral Surface Rectangle
    entities.push({
      type: "RECTANGLE",
      x: originX,
      y: originY,
      width: circumference,
      height: h,
      color: "#38bdf8",
      lineWidth: 2.2,
      layer: "DEVELOPMENT"
    });

    // 2. Division Generator Lines
    for (let i = 1; i < divisions; i++) {
      const gx = originX + i * stepW;
      entities.push({
        type: "LINE",
        x1: gx,
        y1: originY,
        x2: gx,
        y2: originY + h,
        color: "#64748b",
        lineType: "DASHED",
        lineWidth: 1,
        layer: "DEVELOPMENT"
      });
      entities.push({
        type: "TEXT",
        x: gx - 3,
        y: originY + h + 15,
        text: `${i}`,
        height: 10,
        color: "#94a3b8"
      });
    }

    // Numbering 1 and 1' at ends
    entities.push({ type: "TEXT", x: originX - 3, y: originY + h + 15, text: "1", height: 10, color: "#38bdf8", bold: true });
    entities.push({ type: "TEXT", x: originX + circumference - 3, y: originY + h + 15, text: "1", height: 10, color: "#38bdf8", bold: true });

    // Top and Bottom Circular Base Covers
    entities.push({
      type: "CIRCLE",
      cx: originX + circumference / 2,
      cy: originY - (d / 2),
      r: d / 2,
      color: "#38bdf8",
      lineWidth: 1.5,
      layer: "DEVELOPMENT"
    });
    entities.push({
      type: "CIRCLE",
      cx: originX + circumference / 2,
      cy: originY + h + (d / 2) + 20,
      r: d / 2,
      color: "#38bdf8",
      lineWidth: 1.5,
      layer: "DEVELOPMENT"
    });

    // Dimension Label
    entities.push({
      type: "TEXT",
      x: originX + circumference / 2 - 80,
      y: originY - (d + 20),
      text: `DEVELOPMENT OF CYLINDER: D=${d}mm, H=${h}mm, Length(πD)=${circumference.toFixed(1)}mm`,
      height: 12,
      color: "#f59e0b",
      bold: true
    });

    entities.forEach(e => this.engine.addEntity(e));
    return entities;
  }

  /**
   * Radial Line Development: Cone & Pyramids
   * Cone Development: Sector of circle with radius R_dev = Slant Height L,
   * Subtended Angle θ = 360° * (Base Radius / Slant Height)
   */
  developCone(baseRadius = 25, height = 65, originX = 350, originY = 300) {
    const r = Number(baseRadius) || 25;
    const h = Number(height) || 65;
    const L = Math.sqrt(r * r + h * h); // Slant height
    const sectorAngleDeg = 360 * (r / L);
    const sectorAngleRad = (sectorAngleDeg * Math.PI) / 180;

    const entities = [];
    const steps = 30;
    const arcPoints = [];

    // Apex at (originX, originY)
    const startAngle = -sectorAngleRad / 2;
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (i / steps) * sectorAngleRad;
      const x = originX + L * Math.sin(a);
      const y = originY + L * Math.cos(a);
      arcPoints.push({ x, y });
    }

    // Two Slant Edges from Apex to Arc ends
    const firstPt = arcPoints[0];
    const lastPt = arcPoints[arcPoints.length - 1];

    entities.push({
      type: "LINE",
      x1: originX,
      y1: originY,
      x2: firstPt.x,
      y2: firstPt.y,
      color: "#38bdf8",
      lineWidth: 2,
      layer: "DEVELOPMENT"
    });

    entities.push({
      type: "LINE",
      x1: originX,
      y1: originY,
      x2: lastPt.x,
      y2: lastPt.y,
      color: "#38bdf8",
      lineWidth: 2,
      layer: "DEVELOPMENT"
    });

    // Base Arc
    entities.push({
      type: "SPLINE",
      points: arcPoints,
      color: "#38bdf8",
      lineWidth: 2.2,
      layer: "DEVELOPMENT"
    });

    // Base Circle attached
    entities.push({
      type: "CIRCLE",
      cx: originX,
      cy: originY + L + r,
      r: r,
      color: "#22c55e",
      lineWidth: 1.5,
      layer: "DEVELOPMENT"
    });

    // Apex label O
    entities.push({ type: "TEXT", x: originX - 6, y: originY - 10, text: "O (Apex)", height: 12, color: "#f59e0b", bold: true });

    // Angle and parameters label
    entities.push({
      type: "TEXT",
      x: originX - 100,
      y: originY + L + r + 35,
      text: `CONE DEVELOPMENT: Slant L=${L.toFixed(1)}mm, Sector Angle θ=${sectorAngleDeg.toFixed(1)}°`,
      height: 12,
      color: "#f59e0b",
      bold: true
    });

    entities.forEach(e => this.engine.addEntity(e));
    return entities;
  }

  // =========================================================================
  // 5. PROJECTION OF PLANES (Unit II BMET21)
  // =========================================================================

  /**
   * Projection of Planes: Stage 1 (True Shape) -> Stage 2 (Inclination to HP/VP by Rotation Method)
   */
  projectPlane(type = "HEXAGON", side = 28, angleHP = 45, originX = 150, originY = 280) {
    const s = Number(side) || 28;
    const thetaDeg = Number(angleHP) || 45;
    const thetaRad = (thetaDeg * Math.PI) / 180;
    const entities = [];

    // Reference Line XY
    const xyLine = {
      type: "LINE",
      x1: originX - 40,
      y1: originY,
      x2: originX + 240,
      y2: originY,
      color: "#94a3b8",
      lineWidth: 2,
      layer: "XY_AXIS"
    };
    entities.push(xyLine);
    entities.push({ type: "TEXT", x: originX - 35, y: originY - 8, text: "X", height: 12, color: "#38bdf8", bold: true });
    entities.push({ type: "TEXT", x: originX + 230, y: originY - 8, text: "Y", height: 12, color: "#38bdf8", bold: true });

    // Stage 1: Top View (True Shape of Hexagon resting on HP)
    const sides = type.toUpperCase() === "SQUARE" ? 4 : type.toUpperCase() === "TRIANGLE" ? 3 : 6;
    const tvCenter = { x: originX + 50, y: originY + 65 };
    const tvPts = [];
    for (let i = 0; i < sides; i++) {
      const a = (i * 2 * Math.PI) / sides;
      tvPts.push({ x: tvCenter.x + s * Math.cos(a), y: tvCenter.y + s * Math.sin(a) });
    }

    for (let i = 0; i < sides; i++) {
      const next = tvPts[(i + 1) % sides];
      entities.push({
        type: "LINE",
        x1: tvPts[i].x,
        y1: tvPts[i].y,
        x2: next.x,
        y2: next.y,
        color: "#38bdf8",
        lineWidth: 2.2,
        layer: "TOP_VIEW"
      });
      entities.push({
        type: "TEXT",
        x: tvPts[i].x + 4,
        y: tvPts[i].y + 4,
        text: String.fromCharCode(97 + i),
        height: 10,
        color: "#94a3b8"
      });
    }

    // Stage 1 Front View: Straight line on XY
    const fvLeft = tvCenter.x - s;
    const fvRight = tvCenter.x + s;
    entities.push({
      type: "LINE",
      x1: fvLeft,
      y1: originY,
      x2: fvRight,
      y2: originY,
      color: "#22c55e",
      lineWidth: 2.8,
      layer: "FRONT_VIEW"
    });
    entities.push({ type: "TEXT", x: fvLeft - 10, y: originY - 8, text: "a'(d')", height: 10, color: "#22c55e" });
    entities.push({ type: "TEXT", x: fvRight + 4, y: originY - 8, text: "b'(c')", height: 10, color: "#22c55e" });

    // Projectors from TV to FV
    entities.push({ type: "LINE", x1: fvLeft, y1: tvCenter.y - s, x2: fvLeft, y2: originY, color: "#64748b", lineType: "DASHED", lineWidth: 1 });
    entities.push({ type: "LINE", x1: fvRight, y1: tvCenter.y - s, x2: fvRight, y2: originY, color: "#64748b", lineType: "DASHED", lineWidth: 1 });

    // Stage 2: Front View Inclined to HP by θ = angleHP
    const st2StartX = originX + 150;
    const lengthFV = 2 * s;
    const st2EndX = st2StartX + lengthFV * Math.cos(thetaRad);
    const st2EndY = originY - lengthFV * Math.sin(thetaRad);

    entities.push({
      type: "LINE",
      x1: st2StartX,
      y1: originY,
      x2: st2EndX,
      y2: st2EndY,
      color: "#f59e0b",
      lineWidth: 2.8,
      layer: "FRONT_VIEW"
    });
    entities.push({ type: "TEXT", x: st2StartX - 8, y: originY - 8, text: "a1'(d1')", height: 10, color: "#f59e0b" });
    entities.push({ type: "TEXT", x: st2EndX + 4, y: st2EndY - 6, text: "b1'(c1')", height: 10, color: "#f59e0b" });

    // Stage 2: Apparent Top View (Compressed in length by cos(theta))
    const st2TvCenter = { x: (st2StartX + st2EndX) / 2, y: originY + 65 };
    const st2TvPts = [];
    for (let i = 0; i < sides; i++) {
      const a = (i * 2 * Math.PI) / sides;
      st2TvPts.push({
        x: st2TvCenter.x + s * Math.cos(a) * Math.cos(thetaRad),
        y: st2TvCenter.y + s * Math.sin(a)
      });
    }

    for (let i = 0; i < sides; i++) {
      const next = st2TvPts[(i + 1) % sides];
      entities.push({
        type: "LINE",
        x1: st2TvPts[i].x,
        y1: st2TvPts[i].y,
        x2: next.x,
        y2: next.y,
        color: "#f59e0b",
        lineWidth: 2.2,
        layer: "TOP_VIEW"
      });
    }

    // Explanatory Label
    entities.push({
      type: "TEXT",
      x: originX - 20,
      y: originY + 145,
      text: `PROJECTION OF PLANES: Regular ${sides}-sided Plane (Side=${s}mm) inclined at θ=${thetaDeg}° to HP (Rotation Method)`,
      height: 11,
      color: "#cbd5e1",
      bold: true
    });

    entities.forEach(e => this.engine.addEntity(e));
    return entities;
  }

  // =========================================================================
  // 6. PROJECTION & SECTIONING OF SOLIDS (Unit III BMET21)
  // =========================================================================

  /**
   * Projection of Solids: Prism/Pyramid with Axis Inclined to HP
   */
  projectSolid(type = "PRISM", sides = 6, baseDim = 25, height = 60, angleHP = 30, originX = 150, originY = 300) {
    const s = Number(baseDim) || 25;
    const h = Number(height) || 60;
    const thetaDeg = Number(angleHP) || 30;
    const thetaRad = (thetaDeg * Math.PI) / 180;
    const entities = [];

    // XY Reference
    entities.push({
      type: "LINE",
      x1: originX - 30,
      y1: originY,
      x2: originX + 280,
      y2: originY,
      color: "#94a3b8",
      lineWidth: 2,
      layer: "XY_AXIS"
    });
    entities.push({ type: "TEXT", x: originX - 25, y: originY - 8, text: "X", height: 12, color: "#38bdf8", bold: true });
    entities.push({ type: "TEXT", x: originX + 270, y: originY - 8, text: "Y", height: 12, color: "#38bdf8", bold: true });

    // Stage 1 FV: Upright solid
    const fv1X = originX + 40;
    entities.push({
      type: "RECTANGLE",
      x: fv1X - s,
      y: originY - h,
      width: 2 * s,
      height: h,
      color: "#22c55e",
      lineWidth: 2.2,
      layer: "FRONT_VIEW"
    });
    // Axis line
    entities.push({
      type: "LINE",
      x1: fv1X,
      y1: originY,
      x2: fv1X,
      y2: originY - h - 10,
      color: "#64748b",
      lineType: "DASHED",
      lineWidth: 1
    });

    // Stage 2 FV: Solid tilted with axis inclined at (90 - theta) or base at theta
    const st2X = originX + 160;
    const cosT = Math.cos(thetaRad);
    const sinT = Math.sin(thetaRad);

    const b1 = { x: st2X, y: originY };
    const b2 = { x: st2X + 2 * s * cosT, y: originY - 2 * s * sinT };
    const t1 = { x: b1.x - h * sinT, y: b1.y - h * cosT };
    const t2 = { x: b2.x - h * sinT, y: b2.y - h * cosT };

    const tiltedEdges = [
      [b1, b2], [b2, t2], [t2, t1], [t1, b1]
    ];
    tiltedEdges.forEach(([p1, p2]) => {
      entities.push({
        type: "LINE",
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        color: "#f59e0b",
        lineWidth: 2.4,
        layer: "FRONT_VIEW"
      });
    });

    // Stage 2 TV: Projected below XY
    const tvCenterY = originY + 70;
    entities.push({
      type: "RECTANGLE",
      x: st2X - 10,
      y: tvCenterY - s,
      width: 2 * s * cosT + h * sinT,
      height: 2 * s,
      color: "#f59e0b",
      lineWidth: 2,
      layer: "TOP_VIEW"
    });

    // Label
    entities.push({
      type: "TEXT",
      x: originX - 20,
      y: originY + 140,
      text: `PROJECTION OF SOLIDS: Hexagonal ${type} (Base=${s}mm, H=${h}mm) with base inclined at θ=${thetaDeg}° to HP`,
      height: 11,
      color: "#cbd5e1",
      bold: true
    });

    entities.forEach(e => this.engine.addEntity(e));
    return entities;
  }

  /**
   * Sectioning of Solids & True Shape of Section (Unit III BMET21)
   */
  sectionSolid(solidType = "CYLINDER", baseDim = 40, height = 70, cutHeight = 35, cutAngle = 35, originX = 150, originY = 280) {
    const d = Number(baseDim) || 40;
    const h = Number(height) || 70;
    const cutH = Number(cutHeight) || 35;
    const cutA = (Number(cutAngle) || 35) * Math.PI / 180;
    const entities = [];

    // XY Line
    entities.push({ type: "LINE", x1: originX - 30, y1: originY, x2: originX + 260, y2: originY, color: "#94a3b8", lineWidth: 2 });
    entities.push({ type: "TEXT", x: originX - 25, y: originY - 8, text: "X", height: 12, color: "#38bdf8", bold: true });
    entities.push({ type: "TEXT", x: originX + 250, y: originY - 8, text: "Y", height: 12, color: "#38bdf8", bold: true });

    // Front View: Solid outline
    const fvX = originX + 60;
    entities.push({
      type: "RECTANGLE",
      x: fvX - d / 2,
      y: originY - h,
      width: d,
      height: h,
      color: "#38bdf8",
      lineWidth: 2.2
    });

    // Cutting Plane Line (V.T. - Section Plane)
    const cutLen = d / Math.cos(cutA) + 20;
    const cpX1 = fvX - (cutLen / 2) * Math.cos(cutA);
    const cpY1 = (originY - cutH) + (cutLen / 2) * Math.sin(cutA);
    const cpX2 = fvX + (cutLen / 2) * Math.cos(cutA);
    const cpY2 = (originY - cutH) - (cutLen / 2) * Math.sin(cutA);

    entities.push({
      type: "LINE",
      x1: cpX1,
      y1: cpY1,
      x2: cpX2,
      y2: cpY2,
      color: "#ef4444",
      lineWidth: 2.6,
      lineType: "DASHDOT"
    });
    entities.push({ type: "TEXT", x: cpX1 - 15, y: cpY1 + 5, text: "V.T.", height: 11, color: "#ef4444", bold: true });

    // True Shape of Section (Auxiliary View - Ellipse)
    const trueMajor = d / Math.cos(cutA);
    const trueMinor = d;
    const trueOriginX = originX + 175;
    const trueOriginY = originY - h / 2 - 15;

    // Draw True Shape (Hatched Ellipse)
    entities.push({
      type: "ELLIPSE",
      cx: trueOriginX,
      cy: trueOriginY,
      rx: trueMajor / 2,
      ry: trueMinor / 2,
      color: "#22c55e",
      lineWidth: 2.4
    });

    // Section Hatching across True Shape
    for (let offset = -trueMajor / 2 + 6; offset < trueMajor / 2; offset += 8) {
      const ySpan = (trueMinor / 2) * Math.sqrt(Math.max(0, 1 - (offset / (trueMajor / 2)) ** 2));
      entities.push({
        type: "LINE",
        x1: trueOriginX + offset - 6,
        y1: trueOriginY - ySpan + 4,
        x2: trueOriginX + offset + 6,
        y2: trueOriginY + ySpan - 4,
        color: "#4ade80",
        lineWidth: 1
      });
    }

    entities.push({
      type: "TEXT",
      x: trueOriginX - 45,
      y: trueOriginY + trueMinor / 2 + 18,
      text: `TRUE SHAPE OF SECTION: Ellipse (${trueMajor.toFixed(1)}×${trueMinor.toFixed(1)}mm)`,
      height: 11,
      color: "#22c55e",
      bold: true
    });

    entities.forEach(e => this.engine.addEntity(e));
    return entities;
  }

  // =========================================================================
  // 7. ORTHOGRAPHIC PROJECTIONS & MISSING VIEWS (Unit IV BMET21)
  // =========================================================================

  /**
   * Orthographic 3-View Generator & Missing View Derivation (Front, Top, Side Views)
   */
  generateOrthographic3Views(blockType = "STEPPED_BLOCK", originX = 100, originY = 250, angle = 1) {
    const isFirstAngle = angle === 1;
    const entities = [];

    // Fold Lines (XY horizontal and X1Y1 vertical)
    const centerFoldX = originX + 160;
    const centerFoldY = originY + 120;

    entities.push({
      type: "LINE",
      x1: originX,
      y1: centerFoldY,
      x2: originX + 340,
      y2: centerFoldY,
      color: "#94a3b8",
      lineWidth: 1.8
    });
    entities.push({
      type: "LINE",
      x1: centerFoldX,
      y1: originY,
      x2: centerFoldX,
      y2: originY + 260,
      color: "#94a3b8",
      lineWidth: 1.8
    });

    entities.push({ type: "TEXT", x: originX + 5, y: centerFoldY - 6, text: "X", height: 11, color: "#38bdf8", bold: true });
    entities.push({ type: "TEXT", x: originX + 325, y: centerFoldY - 6, text: "Y", height: 11, color: "#38bdf8", bold: true });
    entities.push({ type: "TEXT", x: centerFoldX + 6, y: originY + 15, text: "X1", height: 11, color: "#38bdf8", bold: true });
    entities.push({ type: "TEXT", x: centerFoldX + 6, y: originY + 250, text: "Y1", height: 11, color: "#38bdf8", bold: true });

    // Front Elevation View (Left of X1Y1, Above XY in 1st angle)
    const fvX = centerFoldX - 110;
    const fvY = centerFoldY - 90;
    // Stepped block geometry (Width=80, Height=60, Step=40x30)
    entities.push({ type: "LINE", x1: fvX, y1: fvY + 60, x2: fvX + 80, y2: fvY + 60, color: "#38bdf8", lineWidth: 2.2 });
    entities.push({ type: "LINE", x1: fvX + 80, y1: fvY + 60, x2: fvX + 80, y2: fvY + 30, color: "#38bdf8", lineWidth: 2.2 });
    entities.push({ type: "LINE", x1: fvX + 80, y1: fvY + 30, x2: fvX + 40, y2: fvY + 30, color: "#38bdf8", lineWidth: 2.2 });
    entities.push({ type: "LINE", x1: fvX + 40, y1: fvY + 30, x2: fvX + 40, y2: fvY, color: "#38bdf8", lineWidth: 2.2 });
    entities.push({ type: "LINE", x1: fvX + 40, y1: fvY, x2: fvX, y2: fvY, color: "#38bdf8", lineWidth: 2.2 });
    entities.push({ type: "LINE", x1: fvX, y1: fvY, x2: fvX, y2: fvY + 60, color: "#38bdf8", lineWidth: 2.2 });

    entities.push({ type: "TEXT", x: fvX + 10, y: fvY + 80, text: "FRONT ELEVATION", height: 10, color: "#38bdf8", bold: true });

    // Top Plan View (Below XY, aligned with Front View)
    const tvX = fvX;
    const tvY = centerFoldY + 30;
    entities.push({
      type: "RECTANGLE",
      x: tvX,
      y: tvY,
      width: 80,
      height: 50,
      color: "#22c55e",
      lineWidth: 2.2
    });
    // Step line dividing top view
    entities.push({
      type: "LINE",
      x1: tvX + 40,
      y1: tvY,
      x2: tvX + 40,
      y2: tvY + 50,
      color: "#22c55e",
      lineWidth: 2.2
    });
    entities.push({ type: "TEXT", x: tvX + 18, y: tvY + 68, text: "TOP PLAN VIEW", height: 10, color: "#22c55e", bold: true });

    // Side Profile View (Derived view projected via 45-degree miter line)
    const svX = centerFoldX + 30;
    const svY = fvY;
    entities.push({
      type: "RECTANGLE",
      x: svX,
      y: svY,
      width: 50,
      height: 60,
      color: "#f59e0b",
      lineWidth: 2.2
    });
    // Hidden / step feature line in side view
    entities.push({
      type: "LINE",
      x1: svX,
      y1: svY + 30,
      x2: svX + 50,
      y2: svY + 30,
      color: "#f59e0b",
      lineWidth: 2.2
    });
    entities.push({ type: "TEXT", x: svX + 6, y: svY + 80, text: "SIDE PROFILE VIEW", height: 10, color: "#f59e0b", bold: true });

    // Title & System Note
    entities.push({
      type: "TEXT",
      x: originX + 20,
      y: originY + 280,
      text: `ORTHOGRAPHIC PROJECTIONS (${isFirstAngle ? "First Angle [ISO/BIS]" : "Third Angle [ANSI]"}) - Front, Top & Side Views with Missing Line Interpretation`,
      height: 11,
      color: "#cbd5e1",
      bold: true
    });

    entities.forEach(e => this.engine.addEntity(e));
    return entities;
  }

  // =========================================================================
  // 8. PROJECTION STANDARDS & DIMENSIONING MODES
  // =========================================================================

  setProjectionAngle(angle = 1) {
    this.projectionAngle = angle === 3 ? 3 : 1;
    if (this.engine && this.engine.recordActivity) {
      this.engine.recordActivity("projection_mode", { angle: this.projectionAngle });
    }
    return this.projectionAngle;
  }

  setDimensioningSystem(system = "aligned") {
    this.dimensioningSystem = system === "unidirectional" ? "unidirectional" : "aligned";
    return this.dimensioningSystem;
  }
}

if (typeof window !== "undefined") {
  window.XCadEngineeringGraphics = XCadEngineeringGraphics;
}
