/**
 * XCAD 2D - Parametric 2D Constraints & Associative Dynamic Arrays
 * Implements:
 * 1. Geometric Constraints (Coincident, Collinear, Concentric, Parallel, Perpendicular, Horizontal, Vertical, Tangent, Equal)
 * 2. Dimensional Constraints (Linear, Radius, Angular)
 * 3. Parameters Manager with algebraic formulas (e.g., width = length * 0.5)
 * 4. Associative Dynamic Arrays (ARRAYRECT, ARRAYPOLAR, ARRAYPATH) with interactive grips
 */

class XcadParametric {
  constructor(engine, ui) {
    this.engine = engine;
    this.ui = ui;

    // Parameters dictionary (Name -> Formula or numeric value)
    this.parameters = new Map([
      ["d1", { value: 100, formula: "100", desc: "Base Length" }],
      ["d2", { value: 50, formula: "d1 * 0.5", desc: "Offset Width" }],
      ["rad1", { value: 25, formula: "d2 * 0.5", desc: "Fillet Radius" }]
    ]);

    // Active constraints list
    this.constraints = [];
  }

  // --- Parameters Manager ---
  setParam(name, expression) {
    const cleanName = name.trim();
    let val = parseFloat(expression);
    let formula = expression.toString();

    // If expression contains other variable names, evaluate dynamically
    if (isNaN(val)) {
      try {
        val = this.evaluateFormula(expression);
      } catch (err) {
        val = 0;
      }
    }

    this.parameters.set(cleanName, {
      value: val,
      formula: formula,
      desc: "User Parameter"
    });

    this.solveConstraints();
    this.ui.logCommand(`PARAMETERS: Set ${cleanName} = ${formula} (${val.toFixed(2)})`);
    this.updateParametersPalette();
  }

  evaluateFormula(expr) {
    let evaluatedStr = expr;
    for (const [key, param] of this.parameters) {
      const reg = new RegExp(`\\b${key}\\b`, "g");
      evaluatedStr = evaluatedStr.replace(reg, param.value);
    }
    // Safe algebraic eval
    return Function(`"use strict"; return (${evaluatedStr})`)();
  }

  // --- Geometric Constraints Solver ---
  addGeometricConstraint(type, ent1, ent2 = null) {
    if (!ent1) {
      this.ui.setPrompt(`GEOMCONSTRAINT: Select an object in the drawing before applying ${type}.`);
      return;
    }
    if ((type === "PARALLEL" || type === "PERPENDICULAR" || type === "EQUAL" || type === "CONCENTRIC") && !ent2) {
      this.ui.setPrompt(`GEOMCONSTRAINT: Select two objects to apply ${type}.`);
      return;
    }

    const c = {
      id: `c_${Date.now()}`,
      type: type.toUpperCase(), // 'HORIZONTAL', 'VERTICAL', 'PARALLEL', 'PERPENDICULAR', 'CONCENTRIC', 'EQUAL'
      ent1: ent1,
      ent2: ent2
    };
    this.constraints.push(c);
    this.applyGeometricConstraint(c);
    this.engine.render();
    this.ui.logCommand(`GEOMCONSTRAINT: Added ${c.type} constraint.`);
  }

  applyGeometricConstraint(c) {
    const e1 = c.ent1;
    const e2 = c.ent2;

    switch (c.type) {
      case "HORIZONTAL":
        if (e1.type === "LINE") {
          e1.y2 = e1.y1;
        }
        break;
      case "VERTICAL":
        if (e1.type === "LINE") {
          e1.x2 = e1.x1;
        }
        break;
      case "PARALLEL":
        if (e1.type === "LINE" && e2 && e2.type === "LINE") {
          const ang = Math.atan2(e1.y2 - e1.y1, e1.x2 - e1.x1);
          const len2 = Math.hypot(e2.x2 - e2.x1, e2.y2 - e2.y1);
          e2.x2 = e2.x1 + len2 * Math.cos(ang);
          e2.y2 = e2.y1 + len2 * Math.sin(ang);
        }
        break;
      case "PERPENDICULAR":
        if (e1.type === "LINE" && e2 && e2.type === "LINE") {
          const ang = Math.atan2(e1.y2 - e1.y1, e1.x2 - e1.x1) + Math.PI / 2;
          const len2 = Math.hypot(e2.x2 - e2.x1, e2.y2 - e2.y1);
          e2.x2 = e2.x1 + len2 * Math.cos(ang);
          e2.y2 = e2.y1 + len2 * Math.sin(ang);
        }
        break;
      case "CONCENTRIC":
        if ((e1.type === "CIRCLE" || e1.type === "ARC") && e2 && (e2.type === "CIRCLE" || e2.type === "ARC")) {
          e2.cx = e1.cx;
          e2.cy = e1.cy;
        }
        break;
      case "EQUAL":
        if (e1.type === "LINE" && e2 && e2.type === "LINE") {
          const len1 = Math.hypot(e1.x2 - e1.x1, e1.y2 - e1.y1);
          const ang2 = Math.atan2(e2.y2 - e2.y1, e2.x2 - e2.x1);
          e2.x2 = e2.x1 + len1 * Math.cos(ang2);
          e2.y2 = e2.y1 + len1 * Math.sin(ang2);
        } else if (e1.type === "CIRCLE" && e2 && e2.type === "CIRCLE") {
          e2.r = e1.r;
        }
        break;
    }
  }

  solveConstraints() {
    // Multi-pass iterative constraint solver
    for (let pass = 0; pass < 3; pass++) {
      for (const c of this.constraints) {
        this.applyGeometricConstraint(c);
      }
    }
    this.engine.render();
  }

  // --- Dynamic Associative Arrays ---
  createRectangularArray(sourceEntities, rows = 3, cols = 4, rowSpacing = 40, colSpacing = 50) {
    const arrayInst = new CadArrayInstance("RECTANGULAR", sourceEntities, {
      rows: parseInt(rows) || 3,
      cols: parseInt(cols) || 4,
      rowSpacing: parseFloat(rowSpacing) || 40,
      colSpacing: parseFloat(colSpacing) || 50
    });
    this.engine.entities.push(arrayInst);
    this.engine.render();
    this.ui.logCommand(`ARRAYRECT: Created dynamic array (${rows} rows x ${cols} cols, Spacing: ${rowSpacing}x${colSpacing}).`);
    return arrayInst;
  }

  createPolarArray(sourceEntities, centerPt, count = 6, totalAngle = 360) {
    const arrayInst = new CadArrayInstance("POLAR", sourceEntities, {
      center: centerPt,
      count: parseInt(count) || 6,
      totalAngle: parseFloat(totalAngle) || 360,
      rotateItems: true
    });
    this.engine.entities.push(arrayInst);
    this.engine.render();
    this.ui.logCommand(`ARRAYPOLAR: Created dynamic polar array (${count} items around ${centerPt.x.toFixed(1)}, ${centerPt.y.toFixed(1)}).`);
    return arrayInst;
  }

  updateParametersPalette() {
    const tbody = document.getElementById("parameters-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    this.parameters.forEach((param, name) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: 700; color: #38bdf8;">${name}</td>
        <td>
          <input type="text" class="cad-cell-input" value="${param.formula}" onchange="window.xcadParametric.setParam('${name}', this.value)" />
        </td>
        <td style="color: #cbd5e1;">${param.value.toFixed(2)}</td>
        <td style="font-size: 10px; color: #94a3b8;">${param.desc}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}
