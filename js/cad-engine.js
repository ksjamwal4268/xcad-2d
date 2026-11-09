/**
 * XCAD 2D - Geometry & 2D Drafting Engine
 * High-Performance Vector Canvas with Parametric Features & GIS Basemaps
 */

class CadEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    // World Transformation & Camera Viewport
    this.panX = window.innerWidth / 2;
    this.panY = window.innerHeight / 2;
    this.scale = 1.0; // Zoom factor
    this.minScale = 0.005;
    this.maxScale = 500.0;

    // Entities & Layers
    this.entities = [];
    this.undoStack = [];
    this.redoStack = [];
    this.layers = [
      { id: "0", name: "0", color: "#ffffff", weight: 1, visible: true, locked: false },
      { id: "dims", name: "Dimensions", color: "#00e5ff", weight: 1, visible: true, locked: false },
      { id: "hidden", name: "Hidden", color: "#ffab00", weight: 1, visible: true, locked: false },
      { id: "center", name: "Centerlines", color: "#ff1744", weight: 1, visible: true, locked: false },
      { id: "hatch", name: "Hatches", color: "#64748b", weight: 1, visible: true, locked: false },
      { id: "text", name: "Text & Notes", color: "#00e676", weight: 1, visible: true, locked: false },
      { id: "blocks", name: "Smart Blocks", color: "#e040fb", weight: 1, visible: true, locked: false },
      { id: "trace", name: "Trace Markups", color: "#ffea00", weight: 1, visible: true, locked: false },
    ];
    this.activeLayerId = "0";

    // Drafting Aids Settings (AutoCAD Status Bar Toggles)
    this.gridEnabled = true;
    this.gridSnap = false;
    this.gridSize = 20; // 20 units
    this.orthoEnabled = false;       // F8
    this.polarEnabled = true;        // F10
    this.polarIncrement = 15;        // Degrees
    this.osnapEnabled = true;        // F3
    this.dynInputEnabled = true;     // F12
    this.quickMeasureEnabled = false; // QUICKMEASURE mode
    this.cleanScreen = false;        // CleanScreen CTRL+0

    // Collaborative & Review Modes
    this.traceModeEnabled = false;   // TRACE mode
    this.compareModeEnabled = false; // DWG COMPARE mode
    this.activityLog = [];           // Activity Insights

    // Mouse / Cursor Tracking
    this.mouseScreen = { x: 0, y: 0 };
    this.mouseWorld = { x: 0, y: 0 };
    this.rawWorld = { x: 0, y: 0 };
    this.mouseInside = true;
    this.activeSnap = null;
    this.polarRay = null;

    // Selection
    this.selectedEntities = new Set();
    this.selectionBox = null; // { x1, y1, x2, y2, type: 'window' | 'crossing' }

    // Crosshair & Pickbox
    this.crosshairSize = 10000;
    this.pickboxSize = 8;

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
    this.render();
  }

  // --- Coordinate Transformations ---
  worldToScreen(wx, wy) {
    return {
      x: this.panX + wx * this.scale,
      y: this.panY - wy * this.scale // CAD Y points UP, screen Y points DOWN
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.panX) / this.scale,
      y: (this.panY - sy) / this.scale
    };
  }

  getViewportCenter() {
    if (!this.canvas) return { x: 200, y: 250 };
    return this.screenToWorld(this.canvas.width / 2, this.canvas.height / 2);
  }

  // --- Snapping & Alignment ---
  snapToGrid(wx, wy) {
    const g = this.gridSize;
    return {
      x: Math.round(wx / g) * g,
      y: Math.round(wy / g) * g
    };
  }

  applyOrtho(pBase, currentPos) {
    const dx = Math.abs(currentPos.x - pBase.x);
    const dy = Math.abs(currentPos.y - pBase.y);
    return dx >= dy ? { x: currentPos.x, y: pBase.y } : { x: pBase.x, y: currentPos.y };
  }

  applyPolarTracking(pBase, currentPos) {
    const dx = currentPos.x - pBase.x;
    const dy = currentPos.y - pBase.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return currentPos;

    let angDeg = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const inc = this.polarIncrement;
    const nearestAng = Math.round(angDeg / inc) * inc;
    const diff = Math.abs(angDeg - nearestAng);

    // Snap to polar increment ray if within 2.5 degrees
    if (diff < 2.5 || diff > 357.5) {
      const rad = nearestAng * Math.PI / 180;
      this.polarRay = { origin: pBase, angle: nearestAng };
      return {
        x: pBase.x + dist * Math.cos(rad),
        y: pBase.y + dist * Math.sin(rad)
      };
    }

    this.polarRay = null;
    return currentPos;
  }

  findOsnap(wx, wy, tolerancePx = 14) {
    if (!this.osnapEnabled) return null;
    const tolWorld = tolerancePx / this.scale;
    let closest = null;
    let minDist = tolWorld;

    for (const ent of this.entities) {
      const snapPoints = ent.getSnapPoints();
      for (const sp of snapPoints) {
        const d = Math.hypot(sp.x - wx, sp.y - wy);
        if (d < minDist) {
          minDist = d;
          closest = sp;
        }
      }
    }
    return closest;
  }

  updateCursor(screenX, screenY, basePoint = null) {
    this.mouseScreen = { x: screenX, y: screenY };
    this.rawWorld = this.screenToWorld(screenX, screenY);

    let effectiveWorld = { ...this.rawWorld };

    // 1. Grid Snap (F9)
    if (this.gridSnap) {
      effectiveWorld = this.snapToGrid(effectiveWorld.x, effectiveWorld.y);
    }

    // 2. Object Snap (OSNAP / F3)
    const osnap = this.findOsnap(effectiveWorld.x, effectiveWorld.y);
    if (osnap) {
      effectiveWorld = { x: osnap.x, y: osnap.y };
      this.activeSnap = osnap;
    } else {
      this.activeSnap = null;
    }

    // 3. Ortho Mode (F8) vs Polar Tracking (F10)
    if (this.orthoEnabled && basePoint && !osnap) {
      effectiveWorld = this.applyOrtho(basePoint, effectiveWorld);
      this.polarRay = null;
    } else if (this.polarEnabled && basePoint && !osnap) {
      effectiveWorld = this.applyPolarTracking(basePoint, effectiveWorld);
    } else {
      this.polarRay = null;
    }

    this.mouseWorld = effectiveWorld;
    return this.mouseWorld;
  }

  // --- Entity Management & Activity Logging ---
  addEntity(entity, recordUndo = true) {
    entity.layer = entity.layer || this.activeLayerId;
    this.entities.push(entity);
    this.logActivity("CREATE", `${entity.type} added on layer "${entity.layer}"`);

    if (recordUndo) {
      this.undoStack.push({ action: "add", entity });
      this.redoStack = [];
    }

    // Notify Smart Blocks Count table if present
    if (window.xcadSmartBlocks) {
      window.xcadSmartBlocks.updateCountTableIfPresent();
    }
    this.render();
  }

  removeEntity(entity, recordUndo = true) {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
      this.selectedEntities.delete(entity);
      this.logActivity("DELETE", `${entity.type} deleted`);

      if (recordUndo) {
        this.undoStack.push({ action: "remove", entity });
        this.redoStack = [];
      }

      if (window.xcadSmartBlocks) {
        window.xcadSmartBlocks.updateCountTableIfPresent();
      }
      this.render();
    }
  }

  logActivity(action, details) {
    this.activityLog.unshift({
      timestamp: new Date().toLocaleTimeString(),
      action: action,
      details: details
    });
    if (this.activityLog.length > 100) this.activityLog.pop();
  }

  recordActivity(action, details) {
    this.logActivity(action, details);
  }

  undo() {
    if (!this.undoStack.length) return "Nothing to undo.";
    const step = this.undoStack.pop();
    if (step.action === "add") {
      const idx = this.entities.indexOf(step.entity);
      if (idx !== -1) this.entities.splice(idx, 1);
      this.redoStack.push(step);
    } else if (step.action === "remove") {
      this.entities.push(step.entity);
      this.redoStack.push(step);
    }
    this.render();
    return "Undone.";
  }

  redo() {
    if (!this.redoStack.length) return "Nothing to redo.";
    const step = this.redoStack.pop();
    if (step.action === "add") {
      this.entities.push(step.entity);
      this.undoStack.push(step);
    } else if (step.action === "remove") {
      const idx = this.entities.indexOf(step.entity);
      if (idx !== -1) this.entities.splice(idx, 1);
      this.undoStack.push(step);
    }
    this.render();
    return "Redone.";
  }

  getLayerColor(layerId) {
    const lay = this.layers.find(l => l.id === layerId);
    return lay ? lay.color : "#ffffff";
  }

  // --- Rendering Pipeline ---
  render(tempEntity = null, isCommandActive = false) {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    // 1. Dark CAD Canvas Viewport
    ctx.fillStyle = this.traceModeEnabled ? "#2a2818" : "#171a20";
    ctx.fillRect(0, 0, w, h);

    // 2. Render GIS Basemap (if enabled)
    if (window.xcadGisMap && window.xcadGisMap.enabled) {
      window.xcadGisMap.render(ctx);
    }

    // 3. Draw Infinite CAD Grid
    if (this.gridEnabled) {
      this.drawGrid(w, h);
    }

    // 4. Draw XCAD 2D WCS/UCS Coordinate Icon
    this.drawUcsIcon(w, h);

    // 5. Draw Polar Tracking Ray
    if (this.polarRay) {
      this.drawPolarRay(w, h);
    }

    // 6. Draw Primary CAD Entities
    for (const ent of this.entities) {
      const layer = this.layers.find(l => l.id === ent.layer);
      if (layer && !layer.visible) continue;

      const isSelected = this.selectedEntities.has(ent);
      if (typeof ent.draw === "function") {
        ent.draw(this, isSelected);
      } else {
        this.drawGenericEntity(ent, isSelected);
      }
    }

    // 7. Draw In-Progress Rubberband Temporary Entity
    if (tempEntity) {
      tempEntity.draw(this, false, true);
    }

    // 8. Quick Measure Neon HUD Overlay
    if (this.quickMeasureEnabled) {
      this.renderQuickMeasure(ctx);
    }

    // 9. Window / Crossing Selection Box
    if (this.selectionBox) {
      this.drawSelectionBox();
    }

    // 10. Snap Markers (Endpoint, Midpoint, Center, Centroid)
    if (this.activeSnap) {
      this.drawOsnapMarker(this.activeSnap);
    }

    // 11. Trace Review Mode Overlay Banner
    if (this.traceModeEnabled) {
      this.drawTraceBanner(w);
    }

    // 12. Full-Screen Crosshairs & Pickbox
    this.drawCrosshairs(w, h, isCommandActive);
  }

  drawGrid(w, h) {
    const ctx = this.ctx;
    const minorUnit = this.gridSize;
    const majorUnit = minorUnit * 5;

    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(w, h);

    const minX = Math.floor(topLeft.x / minorUnit) * minorUnit;
    const maxX = Math.ceil(bottomRight.x / minorUnit) * minorUnit;
    const minY = Math.floor(bottomRight.y / minorUnit) * minorUnit;
    const maxY = Math.ceil(topLeft.y / minorUnit) * minorUnit;

    ctx.lineWidth = 1;

    // Minor Grid Lines
    ctx.strokeStyle = "rgba(40, 48, 62, 0.7)";
    ctx.beginPath();
    for (let x = minX; x <= maxX; x += minorUnit) {
      if (x % majorUnit === 0) continue;
      const s = this.worldToScreen(x, 0);
      ctx.moveTo(s.x, 0);
      ctx.lineTo(s.x, h);
    }
    for (let y = minY; y <= maxY; y += minorUnit) {
      if (y % majorUnit === 0) continue;
      const s = this.worldToScreen(0, y);
      ctx.moveTo(0, s.y);
      ctx.lineTo(w, s.y);
    }
    ctx.stroke();

    // Major Grid Lines
    ctx.strokeStyle = "rgba(55, 68, 88, 0.9)";
    ctx.beginPath();
    for (let x = minX; x <= maxX; x += majorUnit) {
      const s = this.worldToScreen(x, 0);
      ctx.moveTo(s.x, 0);
      ctx.lineTo(s.x, h);
    }
    for (let y = minY; y <= maxY; y += majorUnit) {
      const s = this.worldToScreen(0, y);
      ctx.moveTo(0, s.y);
      ctx.lineTo(w, s.y);
    }
    ctx.stroke();
  }

  drawUcsIcon(w, h) {
    const ctx = this.ctx;
    const origin = this.worldToScreen(0, 0);

    let ucsX = origin.x;
    let ucsY = origin.y;
    let atOrigin = true;

    if (origin.x < 35 || origin.x > w - 35 || origin.y < 35 || origin.y > h - 35) {
      ucsX = 40;
      ucsY = h - 65;
      atOrigin = false;
    }

    const armLen = 50;
    ctx.lineWidth = 2.2;

    // X Axis (Red Arrow)
    ctx.strokeStyle = "#ef4444";
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(ucsX, ucsY);
    ctx.lineTo(ucsX + armLen, ucsY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ucsX + armLen + 7, ucsY);
    ctx.lineTo(ucsX + armLen - 4, ucsY - 4);
    ctx.lineTo(ucsX + armLen - 4, ucsY + 4);
    ctx.closePath();
    ctx.fill();

    // Y Axis (Green Arrow)
    ctx.strokeStyle = "#22c55e";
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.moveTo(ucsX, ucsY);
    ctx.lineTo(ucsX, ucsY - armLen);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ucsX, ucsY - armLen - 7);
    ctx.lineTo(ucsX - 4, ucsY - armLen + 4);
    ctx.lineTo(ucsX + 4, ucsY - armLen + 4);
    ctx.closePath();
    ctx.fill();

    // WCS Center Box
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(ucsX - 4, ucsY - 4, 8, 8);
    if (atOrigin) {
      ctx.font = "9px sans-serif";
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText("+", ucsX - 2.5, ucsY + 3);
    }

    // Axis Labels
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "#ef4444";
    ctx.fillText("X", ucsX + armLen + 10, ucsY + 4);
    ctx.fillStyle = "#22c55e";
    ctx.fillText("Y", ucsX - 4, ucsY - armLen - 10);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "9px monospace";
    ctx.fillText("WCS", ucsX + 6, ucsY + 14);
  }

  drawPolarRay(w, h) {
    const ctx = this.ctx;
    const origScr = this.worldToScreen(this.polarRay.origin.x, this.polarRay.origin.y);
    const rad = this.polarRay.angle * Math.PI / 180;

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    ctx.moveTo(origScr.x - 3000 * Math.cos(rad), origScr.y + 3000 * Math.sin(rad));
    ctx.lineTo(origScr.x + 3000 * Math.cos(rad), origScr.y - 3000 * Math.sin(rad));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // --- Quick Measure Engine (QUICKMEASURE) ---
  renderQuickMeasure(ctx) {
    const mouse = this.mouseWorld;
    let nearestH = null, nearestV = null;
    let minHDist = Infinity, minVDist = Infinity;

    for (const ent of this.entities) {
      if (ent.type === "LINE") {
        const isHoriz = Math.abs(ent.y2 - ent.y1) < 0.01;
        const isVert = Math.abs(ent.x2 - ent.x1) < 0.01;

        if (isHoriz) {
          const d = Math.abs(ent.y1 - mouse.y);
          if (d < minHDist && mouse.x >= Math.min(ent.x1, ent.x2) && mouse.x <= Math.max(ent.x1, ent.x2)) {
            minHDist = d;
            nearestH = ent;
          }
        }
        if (isVert) {
          const d = Math.abs(ent.x1 - mouse.x);
          if (d < minVDist && mouse.y >= Math.min(ent.y1, ent.y2) && mouse.y <= Math.max(ent.y1, ent.y2)) {
            minVDist = d;
            nearestV = ent;
          }
        }
      }
    }

    ctx.save();
    ctx.strokeStyle = "#facc15"; // Neon Yellow AutoCAD Quick Measure
    ctx.fillStyle = "#facc15";
    ctx.lineWidth = 1.6;
    ctx.font = "bold 11px monospace";

    if (nearestH) {
      const p1 = this.worldToScreen(mouse.x, mouse.y);
      const p2 = this.worldToScreen(mouse.x, nearestH.y1);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.fillText(`${minHDist.toFixed(2)}`, p1.x + 6, (p1.y + p2.y) / 2);
    }
    if (nearestV) {
      const p1 = this.worldToScreen(mouse.x, mouse.y);
      const p2 = this.worldToScreen(nearestV.x1, mouse.y);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.fillText(`${minVDist.toFixed(2)}`, (p1.x + p2.x) / 2, p1.y - 6);
    }
    ctx.restore();
  }

  drawOsnapMarker(snap) {
    const ctx = this.ctx;
    const s = this.worldToScreen(snap.x, snap.y);
    const size = 6.5;

    ctx.strokeStyle = "#39ff14"; // Neon green
    ctx.lineWidth = 1.8;

    if (snap.type === "endpoint") {
      ctx.strokeRect(s.x - size, s.y - size, size * 2, size * 2);
    } else if (snap.type === "midpoint") {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - size);
      ctx.lineTo(s.x - size, s.y + size);
      ctx.lineTo(s.x + size, s.y + size);
      ctx.closePath();
      ctx.stroke();
    } else if (snap.type === "center") {
      ctx.beginPath();
      ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (snap.type === "centroid") {
      // Hourglass for Geometric Center
      ctx.beginPath();
      ctx.moveTo(s.x - size, s.y - size);
      ctx.lineTo(s.x + size, s.y + size);
      ctx.lineTo(s.x - size, s.y + size);
      ctx.lineTo(s.x + size, s.y - size);
      ctx.closePath();
      ctx.stroke();
    }
  }

  drawTraceBanner(w) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(234, 179, 8, 0.18)";
    ctx.fillRect(0, 0, w, 28);
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("TRACE MODE ACTIVE — Collaborative non-destructive markups layer", 16, 18);
  }

  drawCrosshairs(w, h, isCommandActive) {
    if (!this.mouseInside) return;
    const ctx = this.ctx;
    const { x, y } = this.mouseScreen;
    const halfBox = this.pickboxSize / 2;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    if (isCommandActive) {
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    } else {
      ctx.moveTo(0, y); ctx.lineTo(x - halfBox, y);
      ctx.moveTo(x + halfBox, y); ctx.lineTo(w, y);
      ctx.moveTo(x, 0); ctx.lineTo(x, y - halfBox);
      ctx.moveTo(x, y + halfBox); ctx.lineTo(x, h);
    }
    ctx.stroke();

    if (!isCommandActive) {
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(x - halfBox, y - halfBox, this.pickboxSize, this.pickboxSize);
    }
  }

  drawSelectionBox() {
    const ctx = this.ctx;
    const { x1, y1, x2, y2, type } = this.selectionBox;
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    if (type === "window") {
      ctx.fillStyle = "rgba(14, 99, 156, 0.22)";
      ctx.strokeStyle = "#38bdf8";
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = "rgba(34, 197, 94, 0.22)";
      ctx.strokeStyle = "#22c55e";
      ctx.setLineDash([4, 4]);
    }

    ctx.fillRect(left, top, width, height);
    ctx.strokeRect(left, top, width, height);
    ctx.setLineDash([]);
  }

  drawGenericEntity(ent, isSelected) {
    if (!ent) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = isSelected ? 2.5 : (ent.lineWidth || 1.5);
    ctx.strokeStyle = isSelected ? "#38bdf8" : (ent.color || this.getLayerColor(ent.layer || "0"));
    ctx.fillStyle = isSelected ? "#38bdf8" : (ent.color || "#ffffff");
    if (ent.lineType === "DASHED") ctx.setLineDash([4, 4]); else ctx.setLineDash([]);

    if (ent.type === "LINE") {
      const p1 = this.worldToScreen(ent.x1, ent.y1);
      const p2 = this.worldToScreen(ent.x2, ent.y2);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    } else if (ent.type === "CIRCLE") {
      const p = this.worldToScreen(ent.cx, ent.cy);
      ctx.beginPath();
      ctx.arc(p.x, p.y, ent.r * this.scale, 0, Math.PI * 2);
      ctx.stroke();
    } else if (ent.type === "ELLIPSE") {
      const p = this.worldToScreen(ent.cx, ent.cy);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, (ent.rx || 30) * this.scale, (ent.ry || 15) * this.scale, ent.rotation || 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (ent.type === "POINT") {
      const p = this.worldToScreen(ent.x, ent.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x - 7, p.y); ctx.lineTo(p.x + 7, p.y);
      ctx.moveTo(p.x, p.y - 7); ctx.lineTo(p.x, p.y + 7);
      ctx.stroke();
    } else if ((ent.type === "POLYLINE" || ent.type === "SPLINE") && ent.points) {
      if (ent.points.length > 0) {
        ctx.beginPath();
        const p0 = this.worldToScreen(ent.points[0].x, ent.points[0].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < ent.points.length; i++) {
          const pi = this.worldToScreen(ent.points[i].x, ent.points[i].y);
          ctx.lineTo(pi.x, pi.y);
        }
        if (ent.closed) ctx.closePath();
        ctx.stroke();
      }
    } else if (ent.type === "TEXT") {
      const p = this.worldToScreen(ent.x, ent.y);
      ctx.font = `${ent.bold ? "bold " : ""}${Math.max(8, (ent.height || 12) * this.scale)}px 'Consolas', monospace`;
      ctx.fillText(ent.text, p.x, p.y);
    }
    ctx.restore();
  }
}

// =================================================================
// CAD Geometric Entities & Collision Helpers
// =================================================================

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function rotatePoint(x, y, cx, cy, rad) {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos
  };
}

function scalePoint(x, y, cx, cy, factor) {
  return {
    x: cx + (x - cx) * factor,
    y: cy + (y - cy) * factor
  };
}

function mirrorPoint(x, y, p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const L2 = dx * dx + dy * dy;
  if (L2 < 1e-9) return { x, y };
  const L = Math.sqrt(L2);
  const nx = -dy / L;
  const ny = dx / L;
  const d = (x - p1.x) * nx + (y - p1.y) * ny;
  return {
    x: x - 2 * d * nx,
    y: y - 2 * d * ny
  };
}

class CadLine {
  constructor(x1, y1, x2, y2, layer = "0") {
    this.type = "LINE";
    this.x1 = x1; this.y1 = y1;
    this.x2 = x2; this.y2 = y2;
    this.layer = layer;
  }

  draw(engine, isSelected, isTemp = false) {
    const ctx = engine.ctx;
    const p1 = engine.worldToScreen(this.x1, this.y1);
    const p2 = engine.worldToScreen(this.x2, this.y2);

    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.strokeStyle = isSelected ? "#38bdf8" : (isTemp ? "#94a3b8" : engine.getLayerColor(this.layer));
    if (isTemp) ctx.setLineDash([4, 4]); else ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  move(dx, dy) { this.x1 += dx; this.y1 += dy; this.x2 += dx; this.y2 += dy; }
  rotate(cx, cy, rad) {
    const p1 = rotatePoint(this.x1, this.y1, cx, cy, rad);
    const p2 = rotatePoint(this.x2, this.y2, cx, cy, rad);
    this.x1 = p1.x; this.y1 = p1.y;
    this.x2 = p2.x; this.y2 = p2.y;
  }
  scale(cx, cy, factor) {
    const p1 = scalePoint(this.x1, this.y1, cx, cy, factor);
    const p2 = scalePoint(this.x2, this.y2, cx, cy, factor);
    this.x1 = p1.x; this.y1 = p1.y;
    this.x2 = p2.x; this.y2 = p2.y;
  }
  mirror(p1, p2) {
    const mp1 = mirrorPoint(this.x1, this.y1, p1, p2);
    const mp2 = mirrorPoint(this.x2, this.y2, p1, p2);
    this.x1 = mp1.x; this.y1 = mp1.y;
    this.x2 = mp2.x; this.y2 = mp2.y;
  }
  clone() { return new CadLine(this.x1, this.y1, this.x2, this.y2, this.layer); }

  getSnapPoints() {
    return [
      { x: this.x1, y: this.y1, type: "endpoint" },
      { x: this.x2, y: this.y2, type: "endpoint" },
      { x: (this.x1 + this.x2) / 2, y: (this.y1 + this.y2) / 2, type: "midpoint" },
    ];
  }

  isPointNear(pt, tol = 10) {
    return distToSegment(pt.x, pt.y, this.x1, this.y1, this.x2, this.y2) <= tol;
  }

  isInsideBox(minX, minY, maxX, maxY) {
    return this.x1 >= minX && this.x1 <= maxX && this.x2 >= minX && this.x2 <= maxX &&
           this.y1 >= minY && this.y1 <= maxY && this.y2 >= minY && this.y2 <= maxY;
  }

  touchesBox(minX, minY, maxX, maxY) {
    return this.isInsideBox(minX, minY, maxX, maxY) ||
           (Math.min(this.x1, this.x2) <= maxX && Math.max(this.x1, this.x2) >= minX &&
            Math.min(this.y1, this.y2) <= maxY && Math.max(this.y1, this.y2) >= minY);
  }
}

class CadCircle {
  constructor(cx, cy, r, layer = "0") {
    this.type = "CIRCLE";
    this.cx = cx; this.cy = cy;
    this.r = Math.max(0.01, r);
    this.layer = layer;
  }

  draw(engine, isSelected, isTemp = false) {
    const ctx = engine.ctx;
    const center = engine.worldToScreen(this.cx, this.cy);
    const screenRadius = this.r * engine.scale;

    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.strokeStyle = isSelected ? "#38bdf8" : (isTemp ? "#94a3b8" : engine.getLayerColor(this.layer));
    if (isTemp) ctx.setLineDash([4, 4]); else ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(center.x, center.y, screenRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  move(dx, dy) { this.cx += dx; this.cy += dy; }
  rotate(cx, cy, rad) {
    const p = rotatePoint(this.cx, this.cy, cx, cy, rad);
    this.cx = p.x; this.cy = p.y;
  }
  scale(cx, cy, factor) {
    const p = scalePoint(this.cx, this.cy, cx, cy, factor);
    this.cx = p.x; this.cy = p.y;
    this.r = Math.max(0.01, this.r * Math.abs(factor));
  }
  mirror(p1, p2) {
    const p = mirrorPoint(this.cx, this.cy, p1, p2);
    this.cx = p.x; this.cy = p.y;
  }
  clone() { return new CadCircle(this.cx, this.cy, this.r, this.layer); }

  getSnapPoints() {
    return [
      { x: this.cx, y: this.cy, type: "center" },
      { x: this.cx + this.r, y: this.cy, type: "endpoint" },
      { x: this.cx - this.r, y: this.cy, type: "endpoint" },
      { x: this.cx, y: this.cy + this.r, type: "endpoint" },
      { x: this.cx, y: this.cy - this.r, type: "endpoint" },
    ];
  }

  isPointNear(pt, tol = 10) {
    const d = Math.hypot(pt.x - this.cx, pt.y - this.cy);
    return Math.abs(d - this.r) <= tol || d <= this.r;
  }

  isInsideBox(minX, minY, maxX, maxY) {
    return (this.cx - this.r) >= minX && (this.cx + this.r) <= maxX &&
           (this.cy - this.r) >= minY && (this.cy + this.r) <= maxY;
  }

  touchesBox(minX, minY, maxX, maxY) {
    return (this.cx + this.r >= minX && this.cx - this.r <= maxX &&
            this.cy + this.r >= minY && this.cy - this.r <= maxY);
  }
}

class CadArc {
  constructor(cx, cy, r, startAngle, endAngle, layer = "0") {
    this.type = "ARC";
    this.cx = cx; this.cy = cy; this.r = r;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.layer = layer;
  }

  draw(engine, isSelected, isTemp = false) {
    const ctx = engine.ctx;
    const center = engine.worldToScreen(this.cx, this.cy);
    const screenRadius = this.r * engine.scale;

    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.strokeStyle = isSelected ? "#38bdf8" : (isTemp ? "#94a3b8" : engine.getLayerColor(this.layer));
    if (isTemp) ctx.setLineDash([4, 4]); else ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(center.x, center.y, screenRadius, -this.endAngle, -this.startAngle);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  move(dx, dy) { this.cx += dx; this.cy += dy; }
  rotate(cx, cy, rad) {
    const p = rotatePoint(this.cx, this.cy, cx, cy, rad);
    this.cx = p.x; this.cy = p.y;
    this.startAngle += rad;
    this.endAngle += rad;
  }
  scale(cx, cy, factor) {
    const p = scalePoint(this.cx, this.cy, cx, cy, factor);
    this.cx = p.x; this.cy = p.y;
    this.r = Math.max(0.01, this.r * Math.abs(factor));
  }
  mirror(p1, p2) {
    const p = mirrorPoint(this.cx, this.cy, p1, p2);
    this.cx = p.x; this.cy = p.y;
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const newStart = 2 * ang - this.endAngle;
    const newEnd = 2 * ang - this.startAngle;
    this.startAngle = newStart;
    this.endAngle = newEnd;
  }
  clone() { return new CadArc(this.cx, this.cy, this.r, this.startAngle, this.endAngle, this.layer); }

  getSnapPoints() {
    const sx = this.cx + this.r * Math.cos(this.startAngle);
    const sy = this.cy + this.r * Math.sin(this.startAngle);
    const ex = this.cx + this.r * Math.cos(this.endAngle);
    const ey = this.cy + this.r * Math.sin(this.endAngle);
    return [
      { x: this.cx, y: this.cy, type: "center" },
      { x: sx, y: sy, type: "endpoint" },
      { x: ex, y: ey, type: "endpoint" },
    ];
  }

  isPointNear(pt, tol = 10) {
    const d = Math.hypot(pt.x - this.cx, pt.y - this.cy);
    if (Math.abs(d - this.r) > tol) return false;
    let a = Math.atan2(pt.y - this.cy, pt.x - this.cx);
    if (a < 0) a += 2 * Math.PI;
    let s = this.startAngle % (2 * Math.PI);
    let e = this.endAngle % (2 * Math.PI);
    if (s < 0) s += 2 * Math.PI;
    if (e < 0) e += 2 * Math.PI;
    if (s <= e) return a >= s && a <= e;
    return a >= s || a <= e;
  }

  isInsideBox(minX, minY, maxX, maxY) {
    return (this.cx - this.r) >= minX && (this.cx + this.r) <= maxX &&
           (this.cy - this.r) >= minY && (this.cy + this.r) <= maxY;
  }

  touchesBox(minX, minY, maxX, maxY) {
    return (this.cx + this.r >= minX && this.cx - this.r <= maxX &&
            this.cy + this.r >= minY && this.cy - this.r <= maxY);
  }
}

class CadRectangle {
  constructor(x1, y1, x2, y2, layer = "0") {
    this.type = "RECTANGLE";
    this.x1 = x1; this.y1 = y1;
    this.x2 = x2; this.y2 = y2;
    this.layer = layer;
  }

  draw(engine, isSelected, isTemp = false) {
    const ctx = engine.ctx;
    const p1 = engine.worldToScreen(this.x1, this.y1);
    const p2 = engine.worldToScreen(this.x2, this.y2);

    const left = Math.min(p1.x, p2.x);
    const top = Math.min(p1.y, p2.y);
    const width = Math.abs(p2.x - p1.x);
    const height = Math.abs(p2.y - p1.y);

    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.strokeStyle = isSelected ? "#38bdf8" : (isTemp ? "#94a3b8" : engine.getLayerColor(this.layer));
    if (isTemp) ctx.setLineDash([4, 4]); else ctx.setLineDash([]);

    ctx.strokeRect(left, top, width, height);
    ctx.setLineDash([]);
  }

  move(dx, dy) { this.x1 += dx; this.y1 += dy; this.x2 += dx; this.y2 += dy; }
  rotate(cx, cy, rad) {
    const p1 = rotatePoint(this.x1, this.y1, cx, cy, rad);
    const p2 = rotatePoint(this.x2, this.y2, cx, cy, rad);
    this.x1 = p1.x; this.y1 = p1.y;
    this.x2 = p2.x; this.y2 = p2.y;
  }
  scale(cx, cy, factor) {
    const p1 = scalePoint(this.x1, this.y1, cx, cy, factor);
    const p2 = scalePoint(this.x2, this.y2, cx, cy, factor);
    this.x1 = p1.x; this.y1 = p1.y;
    this.x2 = p2.x; this.y2 = p2.y;
  }
  mirror(p1, p2) {
    const mp1 = mirrorPoint(this.x1, this.y1, p1, p2);
    const mp2 = mirrorPoint(this.x2, this.y2, p1, p2);
    this.x1 = mp1.x; this.y1 = mp1.y;
    this.x2 = mp2.x; this.y2 = mp2.y;
  }
  clone() { return new CadRectangle(this.x1, this.y1, this.x2, this.y2, this.layer); }

  getSnapPoints() {
    const minX = Math.min(this.x1, this.x2);
    const maxX = Math.max(this.x1, this.x2);
    const minY = Math.min(this.y1, this.y2);
    const maxY = Math.max(this.y1, this.y2);
    return [
      { x: minX, y: minY, type: "endpoint" },
      { x: maxX, y: minY, type: "endpoint" },
      { x: maxX, y: maxY, type: "endpoint" },
      { x: minX, y: maxY, type: "endpoint" },
      { x: (minX + maxX) / 2, y: (minY + maxY) / 2, type: "centroid" }
    ];
  }

  isPointNear(pt, tol = 10) {
    const minX = Math.min(this.x1, this.x2);
    const maxX = Math.max(this.x1, this.x2);
    const minY = Math.min(this.y1, this.y2);
    const maxY = Math.max(this.y1, this.y2);
    return pt.x >= minX - tol && pt.x <= maxX + tol && pt.y >= minY - tol && pt.y <= maxY + tol;
  }

  isInsideBox(minX, minY, maxX, maxY) {
    return Math.min(this.x1, this.x2) >= minX && Math.max(this.x1, this.x2) <= maxX &&
           Math.min(this.y1, this.y2) >= minY && Math.max(this.y1, this.y2) <= maxY;
  }

  touchesBox(minX, minY, maxX, maxY) {
    return Math.max(this.x1, this.x2) >= minX && Math.min(this.x1, this.x2) <= maxX &&
           Math.max(this.y1, this.y2) >= minY && Math.min(this.y1, this.y2) <= maxY;
  }
}

// -----------------------------------------------------------------
// 2D Connected Polyline (POLYLINE / PLINE / PL)
// -----------------------------------------------------------------
class CadPolyline {
  constructor(points = [], closed = false, layer = "0") {
    this.type = "POLYLINE";
    this.points = points.map(p => ({ x: p.x, y: p.y }));
    this.closed = !!closed;
    this.layer = layer;
  }

  draw(engine, isSelected, isTemp = false) {
    if (!this.points || this.points.length < 2) return;
    const ctx = engine.ctx;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.strokeStyle = isSelected ? "#38bdf8" : (isTemp ? "#94a3b8" : engine.getLayerColor(this.layer));
    if (isTemp) ctx.setLineDash([4, 4]); else ctx.setLineDash([]);

    ctx.beginPath();
    const p0 = engine.worldToScreen(this.points[0].x, this.points[0].y);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < this.points.length; i++) {
      const pt = engine.worldToScreen(this.points[i].x, this.points[i].y);
      ctx.lineTo(pt.x, pt.y);
    }
    if (this.closed) {
      ctx.closePath();
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  move(dx, dy) {
    for (const p of this.points) {
      p.x += dx;
      p.y += dy;
    }
  }

  rotate(cx, cy, rad) {
    this.points = this.points.map(p => rotatePoint(p.x, p.y, cx, cy, rad));
  }

  scale(cx, cy, factor) {
    this.points = this.points.map(p => scalePoint(p.x, p.y, cx, cy, factor));
  }

  mirror(p1, p2) {
    this.points = this.points.map(p => mirrorPoint(p.x, p.y, p1, p2));
  }

  clone() {
    return new CadPolyline(this.points.map(p => ({ x: p.x, y: p.y })), this.closed, this.layer);
  }

  getSnapPoints() {
    const snaps = [];
    for (let i = 0; i < this.points.length; i++) {
      snaps.push({ x: this.points[i].x, y: this.points[i].y, type: "endpoint" });
      if (i < this.points.length - 1) {
        snaps.push({
          x: (this.points[i].x + this.points[i + 1].x) / 2,
          y: (this.points[i].y + this.points[i + 1].y) / 2,
          type: "midpoint"
        });
      }
    }
    if (this.closed && this.points.length > 2) {
      snaps.push({
        x: (this.points[this.points.length - 1].x + this.points[0].x) / 2,
        y: (this.points[this.points.length - 1].y + this.points[0].y) / 2,
        type: "midpoint"
      });
      let cx = 0, cy = 0;
      for (const p of this.points) { cx += p.x; cy += p.y; }
      snaps.push({ x: cx / this.points.length, y: cy / this.points.length, type: "centroid" });
    }
    return snaps;
  }

  isPointNear(pt, tol = 10) {
    for (let i = 0; i < this.points.length - 1; i++) {
      if (distToSegment(pt.x, pt.y, this.points[i].x, this.points[i].y, this.points[i+1].x, this.points[i+1].y) <= tol) return true;
    }
    if (this.closed && this.points.length > 2) {
      if (distToSegment(pt.x, pt.y, this.points[this.points.length - 1].x, this.points[this.points.length - 1].y, this.points[0].x, this.points[0].y) <= tol) return true;
    }
    return false;
  }

  isInsideBox(minX, minY, maxX, maxY) {
    return this.points.length > 0 && this.points.every(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
  }

  touchesBox(minX, minY, maxX, maxY) {
    if (this.isInsideBox(minX, minY, maxX, maxY)) return true;
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      if (Math.min(p1.x, p2.x) <= maxX && Math.max(p1.x, p2.x) >= minX &&
          Math.min(p1.y, p2.y) <= maxY && Math.max(p1.y, p2.y) >= minY) {
        return true;
      }
    }
    if (this.closed && this.points.length > 2) {
      const p1 = this.points[this.points.length - 1];
      const p2 = this.points[0];
      if (Math.min(p1.x, p2.x) <= maxX && Math.max(p1.x, p2.x) >= minX &&
          Math.min(p1.y, p2.y) <= maxY && Math.max(p1.y, p2.y) >= minY) {
        return true;
      }
    }
    return false;
  }
}

// -----------------------------------------------------------------
// Path-Based & Boundary-Free Hatching (HATCH)
// -----------------------------------------------------------------
class CadHatch {
  constructor(polygonPoints, pattern = "ANSI31", scale = 1.0, angle = 45, layer = "hatch") {
    this.type = "HATCH";
    this.points = polygonPoints; // [{x, y}, ...]
    this.pattern = pattern;       // SOLID, ANSI31, ANSI37, AR-CONC, BRICK, DOTS
    this.scale = scale;
    this.angle = angle;
    this.layer = layer;
  }

  draw(engine, isSelected) {
    if (!this.points || this.points.length < 3) return;
    const ctx = engine.ctx;

    ctx.save();
    ctx.beginPath();
    const first = engine.worldToScreen(this.points[0].x, this.points[0].y);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < this.points.length; i++) {
      const p = engine.worldToScreen(this.points[i].x, this.points[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.clip(); // Clip to boundary

    const col = isSelected ? "#38bdf8" : engine.getLayerColor(this.layer);

    if (this.pattern === "SOLID") {
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.35;
      ctx.fill();
    } else {
      // Draw procedural hatch stripes / pattern
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;

      const spacing = 12 * this.scale * engine.scale;
      const w = engine.canvas.clientWidth;
      const h = engine.canvas.clientHeight;

      ctx.beginPath();
      for (let d = -w - h; d <= w + h; d += spacing) {
        ctx.moveTo(d, 0);
        ctx.lineTo(d + h, h);
      }
      ctx.stroke();

      if (this.pattern === "ANSI37" || this.pattern === "BRICK") {
        ctx.beginPath();
        for (let d = -w - h; d <= w + h; d += spacing) {
          ctx.moveTo(d, h);
          ctx.lineTo(d + h, 0);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  move(dx, dy) {
    this.points.forEach(p => { p.x += dx; p.y += dy; });
  }

  rotate(cx, cy, rad) {
    this.points = this.points.map(p => rotatePoint(p.x, p.y, cx, cy, rad));
    this.angle = (this.angle + (rad * 180 / Math.PI)) % 360;
  }

  scale(cx, cy, factor) {
    this.points = this.points.map(p => scalePoint(p.x, p.y, cx, cy, factor));
    this.scale = Math.max(0.01, this.scale * Math.abs(factor));
  }

  mirror(p1, p2) {
    this.points = this.points.map(p => mirrorPoint(p.x, p.y, p1, p2));
  }

  clone() {
    return new CadHatch(this.points.map(p => ({ ...p })), this.pattern, this.scale, this.angle, this.layer);
  }

  getSnapPoints() {
    return this.points.map(p => ({ x: p.x, y: p.y, type: "endpoint" }));
  }

  isPointNear(pt, tol = 10) {
    if (!this.points || this.points.length < 3) return false;
    let inside = false;
    for (let i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
      const xi = this.points[i].x, yi = this.points[i].y;
      const xj = this.points[j].x, yj = this.points[j].y;
      if (distToSegment(pt.x, pt.y, xi, yi, xj, yj) <= tol) return true;
      const intersect = ((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  isInsideBox(minX, minY, maxX, maxY) {
    return this.points.every(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
  }

  touchesBox(minX, minY, maxX, maxY) {
    return this.points.some(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
  }
}

// -----------------------------------------------------------------
// Associative Centerlines & Center Marks
// -----------------------------------------------------------------
class CadCenterMark {
  constructor(cx, cy, r, layer = "center") {
    this.type = "CENTERMARK";
    this.cx = cx; this.cy = cy; this.r = r;
    this.layer = layer;
  }

  draw(engine, isSelected) {
    const ctx = engine.ctx;
    const c = engine.worldToScreen(this.cx, this.cy);
    const arm = (this.r + 10) * engine.scale;
    const gap = 4 * engine.scale;

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = isSelected ? "#38bdf8" : engine.getLayerColor(this.layer);

    // Crosshair with center gap
    ctx.beginPath();
    ctx.moveTo(c.x - arm, c.y); ctx.lineTo(c.x - gap, c.y);
    ctx.moveTo(c.x + gap, c.y); ctx.lineTo(c.x + arm, c.y);
    ctx.moveTo(c.x, c.y - arm); ctx.lineTo(c.x, c.y - gap);
    ctx.moveTo(c.x, c.y + gap); ctx.lineTo(c.x, c.y + arm);
    ctx.stroke();

    // Central cross
    ctx.strokeRect(c.x - 2, c.y - 2, 4, 4);
  }

  move(dx, dy) { this.cx += dx; this.cy += dy; }
  rotate(cx, cy, rad) {
    const p = rotatePoint(this.cx, this.cy, cx, cy, rad);
    this.cx = p.x; this.cy = p.y;
  }
  scale(cx, cy, factor) {
    const p = scalePoint(this.cx, this.cy, cx, cy, factor);
    this.cx = p.x; this.cy = p.y;
    this.r *= Math.abs(factor);
  }
  mirror(p1, p2) {
    const p = mirrorPoint(this.cx, this.cy, p1, p2);
    this.cx = p.x; this.cy = p.y;
  }
  clone() { return new CadCenterMark(this.cx, this.cy, this.r, this.layer); }
  getSnapPoints() { return [{ x: this.cx, y: this.cy, type: "center" }]; }
  isPointNear(pt, tol = 10) { return Math.hypot(pt.x - this.cx, pt.y - this.cy) <= (this.r + 10 + tol); }
  isInsideBox(minX, minY, maxX, maxY) { return this.cx >= minX && this.cx <= maxX && this.cy >= minY && this.cy <= maxY; }
  touchesBox(minX, minY, maxX, maxY) { return this.isInsideBox(minX, minY, maxX, maxY); }
}

class CadCenterline {
  constructor(x1, y1, x2, y2, layer = "center") {
    this.type = "CENTERLINE";
    this.x1 = x1; this.y1 = y1;
    this.x2 = x2; this.y2 = y2;
    this.layer = layer;
  }

  draw(engine, isSelected) {
    const ctx = engine.ctx;
    const p1 = engine.worldToScreen(this.x1, this.y1);
    const p2 = engine.worldToScreen(this.x2, this.y2);

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = isSelected ? "#38bdf8" : engine.getLayerColor(this.layer);
    ctx.setLineDash([16, 4, 4, 4]); // AutoCAD CENTER linetype pattern

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  move(dx, dy) { this.x1 += dx; this.y1 += dy; this.x2 += dx; this.y2 += dy; }
  rotate(cx, cy, rad) {
    const p1 = rotatePoint(this.x1, this.y1, cx, cy, rad);
    const p2 = rotatePoint(this.x2, this.y2, cx, cy, rad);
    this.x1 = p1.x; this.y1 = p1.y;
    this.x2 = p2.x; this.y2 = p2.y;
  }
  scale(cx, cy, factor) {
    const p1 = scalePoint(this.x1, this.y1, cx, cy, factor);
    const p2 = scalePoint(this.x2, this.y2, cx, cy, factor);
    this.x1 = p1.x; this.y1 = p1.y;
    this.x2 = p2.x; this.y2 = p2.y;
  }
  mirror(p1, p2) {
    const mp1 = mirrorPoint(this.x1, this.y1, p1, p2);
    const mp2 = mirrorPoint(this.x2, this.y2, p1, p2);
    this.x1 = mp1.x; this.y1 = mp1.y;
    this.x2 = mp2.x; this.y2 = mp2.y;
  }
  clone() { return new CadCenterline(this.x1, this.y1, this.x2, this.y2, this.layer); }
  getSnapPoints() {
    return [
      { x: this.x1, y: this.y1, type: "endpoint" },
      { x: this.x2, y: this.y2, type: "endpoint" },
      { x: (this.x1 + this.x2) / 2, y: (this.y1 + this.y2) / 2, type: "midpoint" }
    ];
  }
  isPointNear(pt, tol = 10) { return distToSegment(pt.x, pt.y, this.x1, this.y1, this.x2, this.y2) <= tol; }
  isInsideBox(minX, minY, maxX, maxY) {
    return this.x1 >= minX && this.x1 <= maxX && this.x2 >= minX && this.x2 <= maxX &&
           this.y1 >= minY && this.y1 <= maxY && this.y2 >= minY && this.y2 <= maxY;
  }
  touchesBox(minX, minY, maxX, maxY) { return this.isInsideBox(minX, minY, maxX, maxY); }
}

// -----------------------------------------------------------------
// Associative Multi-Leaders (MLEADER)
// -----------------------------------------------------------------
class CadMultiLeader {
  constructor(arrowX, arrowY, elbowX, elbowY, text = "Note", layer = "text") {
    this.type = "MLEADER";
    this.arrowX = arrowX; this.arrowY = arrowY;
    this.elbowX = elbowX; this.elbowY = elbowY;
    this.text = text;
    this.layer = layer;
  }

  draw(engine, isSelected) {
    const ctx = engine.ctx;
    const pArrow = engine.worldToScreen(this.arrowX, this.arrowY);
    const pElbow = engine.worldToScreen(this.elbowX, this.elbowY);
    const landingLen = 20;
    const dir = pElbow.x >= pArrow.x ? 1 : -1;
    const pLanding = { x: pElbow.x + dir * landingLen, y: pElbow.y };

    ctx.lineWidth = 1.4;
    ctx.strokeStyle = isSelected ? "#38bdf8" : engine.getLayerColor(this.layer);
    ctx.fillStyle = ctx.strokeStyle;

    // Leader line
    ctx.beginPath();
    ctx.moveTo(pArrow.x, pArrow.y);
    ctx.lineTo(pElbow.x, pElbow.y);
    ctx.lineTo(pLanding.x, pLanding.y);
    ctx.stroke();

    // Arrowhead
    const ang = Math.atan2(pElbow.y - pArrow.y, pElbow.x - pArrow.x);
    const headLen = 8;
    ctx.beginPath();
    ctx.moveTo(pArrow.x, pArrow.y);
    ctx.lineTo(pArrow.x + headLen * Math.cos(ang + Math.PI / 6), pArrow.y + headLen * Math.sin(ang + Math.PI / 6));
    ctx.lineTo(pArrow.x + headLen * Math.cos(ang - Math.PI / 6), pArrow.y + headLen * Math.sin(ang - Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    // Text Label
    ctx.font = "12px 'Segoe UI', monospace";
    ctx.textAlign = dir === 1 ? "left" : "right";
    ctx.textBaseline = "middle";
    ctx.fillText(this.text, pLanding.x + dir * 4, pLanding.y - 2);
  }

  move(dx, dy) {
    this.arrowX += dx; this.arrowY += dy;
    this.elbowX += dx; this.elbowY += dy;
  }
  rotate(cx, cy, rad) {
    const p1 = rotatePoint(this.arrowX, this.arrowY, cx, cy, rad);
    const p2 = rotatePoint(this.elbowX, this.elbowY, cx, cy, rad);
    this.arrowX = p1.x; this.arrowY = p1.y;
    this.elbowX = p2.x; this.elbowY = p2.y;
  }
  scale(cx, cy, factor) {
    const p1 = scalePoint(this.arrowX, this.arrowY, cx, cy, factor);
    const p2 = scalePoint(this.elbowX, this.elbowY, cx, cy, factor);
    this.arrowX = p1.x; this.arrowY = p1.y;
    this.elbowX = p2.x; this.elbowY = p2.y;
  }
  mirror(p1, p2) {
    const mp1 = mirrorPoint(this.arrowX, this.arrowY, p1, p2);
    const mp2 = mirrorPoint(this.elbowX, this.elbowY, p1, p2);
    this.arrowX = mp1.x; this.arrowY = mp1.y;
    this.elbowX = mp2.x; this.elbowY = mp2.y;
  }
  clone() { return new CadMultiLeader(this.arrowX, this.arrowY, this.elbowX, this.elbowY, this.text, this.layer); }
  getSnapPoints() {
    return [
      { x: this.arrowX, y: this.arrowY, type: "endpoint" },
      { x: this.elbowX, y: this.elbowY, type: "endpoint" }
    ];
  }
  isPointNear(pt, tol = 10) {
    if (distToSegment(pt.x, pt.y, this.arrowX, this.arrowY, this.elbowX, this.elbowY) <= tol) return true;
    return Math.hypot(pt.x - this.elbowX, pt.y - this.elbowY) <= (25 + tol);
  }
  isInsideBox(minX, minY, maxX, maxY) {
    return this.arrowX >= minX && this.arrowX <= maxX && this.elbowX >= minX && this.elbowX <= maxX &&
           this.arrowY >= minY && this.arrowY <= maxY && this.elbowY >= minY && this.elbowY <= maxY;
  }
  touchesBox(minX, minY, maxX, maxY) { return this.isInsideBox(minX, minY, maxX, maxY); }
}

// -----------------------------------------------------------------
// Smart Block Instance
// -----------------------------------------------------------------
class CadBlockInstance {
  constructor(blockName, x, y, scale = 1.0, rotation = 0, attributes = {}, layer = "blocks") {
    this.type = "BLOCK";
    this.blockName = blockName;
    this.x = x; this.y = y;
    this.scale = scale;
    this.rotation = rotation; // In radians
    this.attributes = attributes;
    this.layer = layer;
  }

  draw(engine, isSelected) {
    const def = window.xcadSmartBlocks ? window.xcadSmartBlocks.getBlock(this.blockName) : null;
    const ctx = engine.ctx;
    const pos = engine.worldToScreen(this.x, this.y);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(-this.rotation); // Canvas screen coordinate inversion

    const drawColor = isSelected ? "#38bdf8" : engine.getLayerColor(this.layer);
    ctx.strokeStyle = drawColor;
    ctx.fillStyle = drawColor;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;

    if (def && def.primitives) {
      for (const p of def.primitives) {
        const s = this.scale * engine.scale;
        if (p.type === "LINE") {
          ctx.beginPath();
          ctx.moveTo(p.x1 * s, -p.y1 * s);
          ctx.lineTo(p.x2 * s, -p.y2 * s);
          ctx.stroke();
        } else if (p.type === "CIRCLE") {
          ctx.beginPath();
          ctx.arc(p.cx * s, -p.cy * s, p.r * s, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.type === "ARC") {
          ctx.beginPath();
          ctx.arc(p.cx * s, -p.cy * s, p.r * s, -p.endAngle, -p.startAngle);
          ctx.stroke();
        } else if (p.type === "RECTANGLE") {
          const rx = Math.min(p.x1, p.x2) * s;
          const ry = -Math.max(p.y1, p.y2) * s;
          const rw = Math.abs(p.x2 - p.x1) * s;
          const rh = Math.abs(p.y2 - p.y1) * s;
          ctx.strokeRect(rx, ry, rw, rh);
        }
      }
    } else {
      // Fallback symbol
      const s = 10 * this.scale * engine.scale;
      ctx.strokeRect(-s, -s, s * 2, s * 2);
      ctx.fillText(this.blockName, -s, s + 12);
    }

    // Render Attribute Tags
    if (this.attributes && Object.keys(this.attributes).length > 0) {
      ctx.font = "10px monospace";
      let lineY = 16;
      for (const [k, v] of Object.entries(this.attributes)) {
        ctx.fillText(`${k}:${v}`, 8, lineY);
        lineY += 12;
      }
    }

    ctx.restore();
  }

  move(dx, dy) { this.x += dx; this.y += dy; }
  rotate(cx, cy, rad) {
    const p = rotatePoint(this.x, this.y, cx, cy, rad);
    this.x = p.x; this.y = p.y;
    this.rotation = (this.rotation + rad) % (Math.PI * 2);
  }
  scale(cx, cy, factor) {
    const p = scalePoint(this.x, this.y, cx, cy, factor);
    this.x = p.x; this.y = p.y;
    this.scale = Math.max(0.01, this.scale * Math.abs(factor));
  }
  mirror(p1, p2) {
    const p = mirrorPoint(this.x, this.y, p1, p2);
    this.x = p.x; this.y = p.y;
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    this.rotation = (2 * ang - this.rotation) % (Math.PI * 2);
  }
  clone() {
    return new CadBlockInstance(this.blockName, this.x, this.y, this.scale, this.rotation, { ...this.attributes }, this.layer);
  }
  getSnapPoints() {
    return [{ x: this.x, y: this.y, type: "endpoint" }];
  }
  isPointNear(pt, tol = 10) {
    return Math.hypot(pt.x - this.x, pt.y - this.y) <= (30 * this.scale + tol);
  }
  isInsideBox(minX, minY, maxX, maxY) {
    return this.x >= minX && this.x <= maxX && this.y >= minY && this.y <= maxY;
  }
  touchesBox(minX, minY, maxX, maxY) {
    return this.x >= minX - 15 && this.x <= maxX + 15 && this.y >= minY - 15 && this.y <= maxY + 15;
  }
}

// -----------------------------------------------------------------
// Associative Dynamic Array Instance
// -----------------------------------------------------------------
class CadArrayInstance {
  constructor(arrayType, sourceEntities, params, layer = "0") {
    this.type = "ARRAY";
    this.arrayType = arrayType; // 'RECTANGULAR', 'POLAR', 'PATH'
    this.sourceEntities = sourceEntities.map(e => e.clone());
    this.params = params;
    this.layer = layer;
  }

  draw(engine, isSelected) {
    const { rows, cols, rowSpacing, colSpacing, count, totalAngle, center } = this.params;

    if (this.arrayType === "RECTANGULAR") {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dx = c * colSpacing;
          const dy = r * rowSpacing;
          for (const ent of this.sourceEntities) {
            const clone = ent.clone();
            clone.move(dx, dy);
            clone.draw(engine, isSelected);
          }
        }
      }
    } else if (this.arrayType === "POLAR" && center) {
      const step = (totalAngle * Math.PI / 180) / Math.max(1, count);
      for (let i = 0; i < count; i++) {
        const ang = i * step;
        for (const ent of this.sourceEntities) {
          const clone = ent.clone();
          // Rotate around center
          const cos = Math.cos(ang), sin = Math.sin(ang);
          const pts = clone.getSnapPoints();
          if (pts.length) {
            const rx = (pts[0].x - center.x) * cos - (pts[0].y - center.y) * sin + center.x;
            const ry = (pts[0].x - center.x) * sin + (pts[0].y - center.y) * cos + center.y;
            clone.move(rx - pts[0].x, ry - pts[0].y);
          }
          clone.draw(engine, isSelected);
        }
      }
    }
  }

  move(dx, dy) {
    this.sourceEntities.forEach(e => e.move(dx, dy));
    if (this.params.center) {
      this.params.center.x += dx;
      this.params.center.y += dy;
    }
  }
  clone() {
    return new CadArrayInstance(this.arrayType, this.sourceEntities, { ...this.params }, this.layer);
  }
  getSnapPoints() {
    return this.sourceEntities.flatMap(e => e.getSnapPoints());
  }
  isInsideBox(minX, minY, maxX, maxY) {
    return this.sourceEntities.every(e => e.isInsideBox(minX, minY, maxX, maxY));
  }
  touchesBox(minX, minY, maxX, maxY) {
    return this.sourceEntities.some(e => e.touchesBox(minX, minY, maxX, maxY));
  }
}

// -----------------------------------------------------------------
// Dynamic Table & Schedule
// -----------------------------------------------------------------
class CadTable {
  constructor(x, y, rows, title = "Schedule", layer = "text") {
    this.type = "TABLE";
    this.x = x; this.y = y;
    this.rows = rows; // Array of string arrays
    this.title = title;
    this.isCountTable = false;
    this.layer = layer;
  }

  draw(engine, isSelected) {
    const ctx = engine.ctx;
    const p = engine.worldToScreen(this.x, this.y);
    const colWidth = 110;
    const rowHeight = 22;
    const numCols = this.rows.length ? this.rows[0].length : 1;
    const tableWidth = numCols * colWidth;
    const tableHeight = (this.rows.length + 1) * rowHeight;

    ctx.save();
    // Background fill
    ctx.fillStyle = "rgba(23, 28, 38, 0.95)";
    ctx.fillRect(p.x, p.y, tableWidth, tableHeight);

    // Title header
    ctx.fillStyle = "#0078d4";
    ctx.fillRect(p.x, p.y, tableWidth, rowHeight);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(this.title, p.x + 8, p.y + 15);

    // Grid lines & text
    ctx.strokeStyle = isSelected ? "#38bdf8" : "#3b4556";
    ctx.lineWidth = 1;

    for (let r = 0; r < this.rows.length; r++) {
      const cy = p.y + (r + 1) * rowHeight;
      ctx.strokeRect(p.x, cy, tableWidth, rowHeight);

      if (r === 0) {
        ctx.fillStyle = "rgba(40, 50, 70, 0.7)";
        ctx.fillRect(p.x, cy, tableWidth, rowHeight);
      }

      for (let c = 0; c < this.rows[r].length; c++) {
        const cx = p.x + c * colWidth;
        ctx.strokeRect(cx, cy, colWidth, rowHeight);

        ctx.fillStyle = r === 0 ? "#38bdf8" : "#e2e8f0";
        ctx.font = r === 0 ? "bold 10.5px sans-serif" : "10px monospace";
        ctx.fillText(this.rows[r][c], cx + 6, cy + 15);
      }
    }
    ctx.restore();
  }

  move(dx, dy) { this.x += dx; this.y += dy; }
  rotate(cx, cy, rad) {
    const p = rotatePoint(this.x, this.y, cx, cy, rad);
    this.x = p.x; this.y = p.y;
    this.rotation = (this.rotation + rad) % (Math.PI * 2);
  }
  scale(cx, cy, factor) {
    const p = scalePoint(this.x, this.y, cx, cy, factor);
    this.x = p.x; this.y = p.y;
    this.scale = Math.max(0.01, this.scale * Math.abs(factor));
  }
  mirror(p1, p2) {
    const p = mirrorPoint(this.x, this.y, p1, p2);
    this.x = p.x; this.y = p.y;
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    this.rotation = (2 * ang - this.rotation) % (Math.PI * 2);
  }
  clone() { return new CadTable(this.x, this.y, this.rows.map(r => [...r]), this.title, this.layer); }
  getSnapPoints() { return [{ x: this.x, y: this.y, type: "endpoint" }]; }
  isPointNear(pt, tol = 10) {
    const colWidth = 110;
    const rowHeight = 22;
    const numCols = this.rows.length ? this.rows[0].length : 1;
    const w = numCols * colWidth;
    const h = (this.rows.length + 1) * rowHeight;
    return pt.x >= this.x - tol && pt.x <= this.x + w + tol && pt.y <= this.y + tol && pt.y >= this.y - h - tol;
  }
  isInsideBox(minX, minY, maxX, maxY) { return this.x >= minX && this.x <= maxX && this.y >= minY && this.y <= maxY; }
  touchesBox(minX, minY, maxX, maxY) { return this.isInsideBox(minX, minY, maxX, maxY); }
}

// -----------------------------------------------------------------
// Static Raster Image Underlay (GIS Map Capture & Markup Assist)
// -----------------------------------------------------------------
class CadImageUnderlay {
  constructor(x, y, width, height, imageSrc, name = "Raster_Underlay", layer = "0") {
    this.type = "IMAGE";
    this.x = x; this.y = y;
    this.width = width; this.height = height;
    this.name = name;
    this.layer = layer;

    this.img = new Image();
    this.img.src = imageSrc;
  }

  draw(engine, isSelected) {
    if (!this.img.complete || this.img.naturalWidth === 0) return;
    const ctx = engine.ctx;
    const p1 = engine.worldToScreen(this.x, this.y);
    const sw = this.width * engine.scale;
    const sh = this.height * engine.scale;

    ctx.drawImage(this.img, p1.x, p1.y, sw, sh);

    if (isSelected) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.strokeRect(p1.x, p1.y, sw, sh);
    }
  }

  move(dx, dy) { this.x += dx; this.y += dy; }
  rotate(cx, cy, rad) {
    const p = rotatePoint(this.x, this.y, cx, cy, rad);
    this.x = p.x; this.y = p.y;
    this.rotation = (this.rotation + rad) % (Math.PI * 2);
  }
  scale(cx, cy, factor) {
    const p = scalePoint(this.x, this.y, cx, cy, factor);
    this.x = p.x; this.y = p.y;
    this.scale = Math.max(0.01, this.scale * Math.abs(factor));
  }
  mirror(p1, p2) {
    const p = mirrorPoint(this.x, this.y, p1, p2);
    this.x = p.x; this.y = p.y;
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    this.rotation = (2 * ang - this.rotation) % (Math.PI * 2);
  }
  clone() { return new CadImageUnderlay(this.x, this.y, this.width, this.height, this.img.src, this.name, this.layer); }
  getSnapPoints() {
    return [
      { x: this.x, y: this.y, type: "endpoint" },
      { x: this.x + this.width, y: this.y + this.height, type: "endpoint" }
    ];
  }
  isInsideBox(minX, minY, maxX, maxY) { return this.x >= minX && this.x <= maxX && this.y >= minY && this.y <= maxY; }
  touchesBox(minX, minY, maxX, maxY) { return this.isInsideBox(minX, minY, maxX, maxY); }
}

// -----------------------------------------------------------------
// Dimension and Text
// -----------------------------------------------------------------
class CadDimension {
  constructor(x1, y1, x2, y2, offset = 20, layer = "dims") {
    this.type = "DIMENSION";
    this.x1 = x1; this.y1 = y1;
    this.x2 = x2; this.y2 = y2;
    this.offset = offset;
    this.layer = layer;
  }

  draw(engine, isSelected) {
    const ctx = engine.ctx;
    const p1 = engine.worldToScreen(this.x1, this.y1);
    const p2 = engine.worldToScreen(this.x2, this.y2);
    const dist = Math.hypot(this.x2 - this.x1, this.y2 - this.y1).toFixed(2);

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = isSelected ? "#38bdf8" : engine.getLayerColor(this.layer);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = "11px monospace";

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    this.drawArrow(ctx, p1.x, p1.y, angle);
    this.drawArrow(ctx, p2.x, p2.y, angle + Math.PI);

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const label = this.customText || `${dist} mm`;
    ctx.fillText(label, midX, midY - 4);
  }

  drawArrow(ctx, x, y, angle) {
    const headLen = 8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + headLen * Math.cos(angle - Math.PI / 6), y + headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x + headLen * Math.cos(angle + Math.PI / 6), y + headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  move(dx, dy) { this.x1 += dx; this.y1 += dy; this.x2 += dx; this.y2 += dy; }
  rotate(cx, cy, rad) {
    const p1 = rotatePoint(this.x1, this.y1, cx, cy, rad);
    const p2 = rotatePoint(this.x2, this.y2, cx, cy, rad);
    this.x1 = p1.x; this.y1 = p1.y;
    this.x2 = p2.x; this.y2 = p2.y;
  }
  scale(cx, cy, factor) {
    const p1 = scalePoint(this.x1, this.y1, cx, cy, factor);
    const p2 = scalePoint(this.x2, this.y2, cx, cy, factor);
    this.x1 = p1.x; this.y1 = p1.y;
    this.x2 = p2.x; this.y2 = p2.y;
  }
  mirror(p1, p2) {
    const mp1 = mirrorPoint(this.x1, this.y1, p1, p2);
    const mp2 = mirrorPoint(this.x2, this.y2, p1, p2);
    this.x1 = mp1.x; this.y1 = mp1.y;
    this.x2 = mp2.x; this.y2 = mp2.y;
  }
  clone() {
    const c = new CadDimension(this.x1, this.y1, this.x2, this.y2, this.offset, this.layer);
    c.customText = this.customText;
    return c;
  }
  getSnapPoints() {
    return [
      { x: this.x1, y: this.y1, type: "endpoint" },
      { x: this.x2, y: this.y2, type: "endpoint" }
    ];
  }
  isPointNear(pt, tol = 10) {
    return distToSegment(pt.x, pt.y, this.x1, this.y1, this.x2, this.y2) <= tol;
  }
  isInsideBox(minX, minY, maxX, maxY) {
    return this.x1 >= minX && this.x1 <= maxX && this.x2 >= minX && this.x2 <= maxX &&
           this.y1 >= minY && this.y1 <= maxY && this.y2 >= minY && this.y2 <= maxY;
  }
  touchesBox(minX, minY, maxX, maxY) {
    return Math.max(this.x1, this.x2) >= minX && Math.min(this.x1, this.x2) <= maxX &&
           Math.max(this.y1, this.y2) >= minY && Math.min(this.y1, this.y2) <= maxY;
  }
}

class CadText {
  constructor(x, y, text = "TEXT", size = 16, layer = "text") {
    this.type = "TEXT";
    this.x = x; this.y = y;
    this.text = text;
    this.size = size;
    this.layer = layer;
  }

  draw(engine, isSelected) {
    const ctx = engine.ctx;
    const p = engine.worldToScreen(this.x, this.y);
    const fontSize = Math.max(8, this.size * engine.scale);

    ctx.fillStyle = isSelected ? "#38bdf8" : engine.getLayerColor(this.layer);
    ctx.font = `${fontSize}px 'Segoe UI', monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(this.text, p.x, p.y);

    if (isSelected) {
      const metrics = ctx.measureText(this.text);
      ctx.strokeStyle = "#38bdf8";
      ctx.strokeRect(p.x - 2, p.y - fontSize - 2, metrics.width + 4, fontSize + 4);
    }
  }

  move(dx, dy) { this.x += dx; this.y += dy; }
  rotate(cx, cy, rad) {
    const p = rotatePoint(this.x, this.y, cx, cy, rad);
    this.x = p.x; this.y = p.y;
    this.rotation = (this.rotation + rad) % (Math.PI * 2);
  }
  scale(cx, cy, factor) {
    const p = scalePoint(this.x, this.y, cx, cy, factor);
    this.x = p.x; this.y = p.y;
    this.scale = Math.max(0.01, this.scale * Math.abs(factor));
  }
  mirror(p1, p2) {
    const p = mirrorPoint(this.x, this.y, p1, p2);
    this.x = p.x; this.y = p.y;
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    this.rotation = (2 * ang - this.rotation) % (Math.PI * 2);
  }
  clone() { return new CadText(this.x, this.y, this.text, this.size, this.layer); }
  getSnapPoints() { return [{ x: this.x, y: this.y, type: "endpoint" }]; }
  isPointNear(pt, tol = 10) {
    return Math.hypot(pt.x - this.x, pt.y - this.y) <= (this.size * 2 + tol);
  }
  isInsideBox(minX, minY, maxX, maxY) { return this.x >= minX && this.x <= maxX && this.y >= minY && this.y <= maxY; }
  touchesBox(minX, minY, maxX, maxY) { return this.x >= minX - 10 && this.x <= maxX + 10 && this.y >= minY - 10 && this.y <= maxY + 10; }
}

if (typeof window !== "undefined") {
  window.CadEngine = CadEngine;
  window.CadLine = CadLine;
  window.CadPolyline = CadPolyline;
  window.CadCircle = CadCircle;
  window.CadArc = CadArc;
  window.CadText = CadText;
}
