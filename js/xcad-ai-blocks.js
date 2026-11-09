/**
 * XCAD 2D - Smart Blocks & Autodesk AI Ecosystem Module
 * Implements:
 * 1. Smart Blocks: Search & Convert (BCONVERT / BLOCKCONVERT)
 * 2. Smart Blocks: Predictive Placement & Orientation
 * 3. Smart Blocks: Replacement (BLOCKREPLACE)
 * 4. Intelligent Object Counting (COUNT & COUNTPALETTE)
 * 5. Associative Count Tables
 */

class XcadSmartBlocks {
  constructor(engine, ui) {
    this.engine = engine;
    this.ui = ui;

    // Library of block definitions
    this.blockLibrary = new Map();
    this.initDefaultLibrary();

    // Active AI Search & Convert state
    this.candidateGroups = [];
    this.selectedCandidateIdx = 0;
    this.predictiveGhost = null;

    // Counting palette state
    this.countFilterArea = null; // null = entire model space
    this.countPaletteOpen = false;
  }

  // --- Preloaded Architectural & Mechanical Block Library ---
  initDefaultLibrary() {
    // 1. Single Door 36"
    this.defineBlock("DOOR_36", [
      { type: "LINE", x1: 0, y1: 0, x2: 0, y2: 36 },
      { type: "ARC", cx: 0, cy: 0, r: 36, startAngle: 0, endAngle: Math.PI / 2 },
      { type: "LINE", x1: 0, y1: 0, x2: 36, y2: 0 }
    ], {
      description: "Standard 36-inch Interior Flush Door with Swing",
      category: "Architectural",
      attributes: { TAG: "D-01", WIDTH: "36\"", FIRE_RATING: "20min" }
    });

    // 2. Double Window 48"
    this.defineBlock("WINDOW_48", [
      { type: "RECTANGLE", x1: -24, y1: -4, x2: 24, y2: 4 },
      { type: "LINE", x1: -24, y1: 0, x2: 24, y2: 0 },
      { type: "LINE", x1: 0, y1: -4, x2: 0, y2: 4 }
    ], {
      description: "48-inch Double Casement Exterior Window",
      category: "Architectural",
      attributes: { TAG: "W-01", GLAZING: "Double Low-E", U_VAL: "0.28" }
    });

    // 3. Office Desk 60x30
    this.defineBlock("DESK_60X30", [
      { type: "RECTANGLE", x1: -30, y1: -15, x2: 30, y2: 15 },
      { type: "RECTANGLE", x1: -28, y1: 5, x2: -12, y2: 13 },
      { type: "ARC", cx: 0, cy: -15, r: 10, startAngle: Math.PI, endAngle: 0 }
    ], {
      description: "60\" x 30\" Ergonomic Executive Workstation Desk",
      category: "Furniture",
      attributes: { TAG: "DK-01", DEPT: "General", ASSET: "AST-8820" }
    });

    // 4. Structural Column 12x12
    this.defineBlock("COL_12X12", [
      { type: "RECTANGLE", x1: -6, y1: -6, x2: 6, y2: 6 },
      { type: "LINE", x1: -6, y1: -6, x2: 6, y2: 6 },
      { type: "LINE", x1: -6, y1: 6, x2: 6, y2: -6 }
    ], {
      description: "12\" Reinforced Concrete Square Column",
      category: "Structural",
      attributes: { TAG: "C-1", MATERIAL: "C35/45", REBAR: "4#8" }
    });

    // 5. Toilet Fixture
    this.defineBlock("TOILET_STD", [
      { type: "RECTANGLE", x1: -10, y1: -6, x2: 10, y2: 6 },
      { type: "CIRCLE", cx: 0, cy: 16, r: 10 },
      { type: "LINE", x1: -8, y1: 6, x2: -8, y2: 14 },
      { type: "LINE", x1: 8, y1: 6, x2: 8, y2: 14 }
    ], {
      description: "Standard Commercial Water Closet Bowl & Tank",
      category: "Plumbing",
      attributes: { TAG: "P-01", FLOW: "1.28 GPF", ADA: "YES" }
    });
  }

  defineBlock(name, primitives, meta = {}) {
    this.blockLibrary.set(name.toUpperCase(), {
      name: name.toUpperCase(),
      primitives: primitives,
      description: meta.description || "User Defined Block",
      category: meta.category || "General",
      attributes: meta.attributes || {},
      created: Date.now()
    });
  }

  getBlock(name) {
    if (!name) return null;
    const n = name.toUpperCase();
    if (n === "COLUMN_12X12") return this.blockLibrary.get("COL_12X12");
    if (n === "TOILET") return this.blockLibrary.get("TOILET_STD");
    return this.blockLibrary.get(n);
  }

  // --- Smart Blocks: Search & Convert (BCONVERT) ---
  searchAndConvert(selectedEntities, blockName = null) {
    if (!selectedEntities || selectedEntities.length === 0) {
      this.ui.setPrompt("BCONVERT: No geometry selected. Select raw linework to convert.");
      return null;
    }

    // 1. Calculate geometric fingerprint of source pattern
    const sourceFingerprint = this.calcFingerprint(selectedEntities);
    const bName = (blockName || `BLK_${Date.now().toString().slice(-4)}`).toUpperCase();

    // Compute bounding center of source selection to set as base point (0,0)
    const bounds = this.calcBoundingBox(selectedEntities);
    const basePt = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };

    // Convert source primitives relative to base point
    const blockPrimitives = [];
    const sourceTexts = [];

    for (const ent of selectedEntities) {
      if (ent.type === "LINE") {
        blockPrimitives.push({
          type: "LINE",
          x1: ent.x1 - basePt.x, y1: ent.y1 - basePt.y,
          x2: ent.x2 - basePt.x, y2: ent.y2 - basePt.y
        });
      } else if (ent.type === "CIRCLE") {
        blockPrimitives.push({
          type: "CIRCLE",
          cx: ent.cx - basePt.x, cy: ent.cy - basePt.y,
          r: ent.r
        });
      } else if (ent.type === "ARC") {
        blockPrimitives.push({
          type: "ARC",
          cx: ent.cx - basePt.x, cy: ent.cy - basePt.y,
          r: ent.r,
          startAngle: ent.startAngle,
          endAngle: ent.endAngle
        });
      } else if (ent.type === "RECTANGLE") {
        blockPrimitives.push({
          type: "RECTANGLE",
          x1: ent.x1 - basePt.x, y1: ent.y1 - basePt.y,
          x2: ent.x2 - basePt.x, y2: ent.y2 - basePt.y
        });
      } else if (ent.type === "TEXT") {
        sourceTexts.push(ent.text);
      }
    }

    // Isolate text labels into editable Block Attributes
    const extractedAttributes = {};
    if (sourceTexts.length > 0) {
      sourceTexts.forEach((txt, idx) => {
        extractedAttributes[`TAG_${idx + 1}`] = txt;
      });
    } else {
      extractedAttributes["TAG"] = "1";
    }

    // Register new Block Definition
    this.defineBlock(bName, blockPrimitives, {
      description: `Smart Converted Block with ${blockPrimitives.length} primitives`,
      attributes: extractedAttributes
    });

    // 2. Scan entire model space for geometrically similar candidate clusters
    const allRemaining = this.engine.entities.filter(e => !selectedEntities.includes(e));
    const clusters = this.findSimilarClusters(allRemaining, sourceFingerprint);

    // 3. Convert original selection into Block Instance
    for (const e of selectedEntities) {
      this.engine.removeEntity(e);
    }
    const newInst = new CadBlockInstance(bName, basePt.x, basePt.y, 1.0, 0, extractedAttributes);
    this.engine.entities.push(newInst);

    // 4. Return candidate group findings for user gallery preview
    this.candidateGroups = clusters.map(c => ({
      entities: c.entities,
      center: c.center,
      similarity: c.similarity,
      rotation: c.rotation
    }));

    this.engine.render();
    this.ui.logCommand(`Smart Blocks: Defined "${bName}". Found ${this.candidateGroups.length} identical/similar instances in model space.`);
    return {
      blockName: bName,
      createdInstance: newInst,
      candidatesFound: this.candidateGroups.length
    };
  }

  // Convert all found candidate groups across drawing
  convertAllCandidates(blockName) {
    if (!this.candidateGroups || this.candidateGroups.length === 0) return 0;
    let convertedCount = 0;

    for (const group of this.candidateGroups) {
      // Remove raw linework
      for (const ent of group.entities) {
        this.engine.removeEntity(ent);
      }
      // Create Block Instance
      const inst = new CadBlockInstance(blockName, group.center.x, group.center.y, 1.0, group.rotation || 0);
      this.engine.entities.push(inst);
      convertedCount++;
    }

    this.candidateGroups = [];
    this.engine.render();
    this.ui.logCommand(`BCONVERT: Replaced ${convertedCount} raw linework clusters with Smart Block "${blockName}".`);
    this.updateCountPalette();
    return convertedCount;
  }

  // Geometric Fingerprint Calculation
  calcFingerprint(entities) {
    let lines = 0, circles = 0, arcs = 0, rects = 0, totalLength = 0;
    const bb = this.calcBoundingBox(entities);
    const width = Math.abs(bb.maxX - bb.minX);
    const height = Math.abs(bb.maxY - bb.minY);

    for (const ent of entities) {
      if (ent.type === "LINE") {
        lines++;
        totalLength += Math.hypot(ent.x2 - ent.x1, ent.y2 - ent.y1);
      } else if (ent.type === "CIRCLE") {
        circles++;
        totalLength += 2 * Math.PI * ent.r;
      } else if (ent.type === "ARC") {
        arcs++;
        const sweep = ((ent.endAngle - ent.startAngle) + 2 * Math.PI) % (2 * Math.PI);
        totalLength += sweep * ent.r;
      } else if (ent.type === "RECTANGLE") {
        rects++;
        totalLength += 2 * (Math.abs(ent.x2 - ent.x1) + Math.abs(ent.y2 - ent.y1));
      }
    }

    return {
      count: entities.length,
      lines, circles, arcs, rects,
      width, height,
      ratio: height > 0 ? (width / height) : 1,
      totalLength
    };
  }

  calcBoundingBox(entities) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const ent of entities) {
      for (const pt of ent.getSnapPoints()) {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }
    }
    if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    return { minX, minY, maxX, maxY };
  }

  // AI Cluster Similarity Search
  findSimilarClusters(allEntities, targetFp) {
    const clusters = [];
    const radius = Math.max(targetFp.width, targetFp.height) * 1.25;
    if (radius <= 0) return clusters;

    const visited = new Set();
    const spatialGroups = [];

    // Spatial partitioning clustering
    for (let i = 0; i < allEntities.length; i++) {
      if (visited.has(i)) continue;
      const seed = allEntities[i];
      const pts = seed.getSnapPoints();
      if (!pts || pts.length === 0) continue;
      const sCenter = pts[0];

      const currentGroup = [seed];
      visited.add(i);

      for (let j = i + 1; j < allEntities.length; j++) {
        if (visited.has(j)) continue;
        const cand = allEntities[j];
        const cPts = cand.getSnapPoints();
        if (!cPts || cPts.length === 0) continue;

        const dist = Math.hypot(cPts[0].x - sCenter.x, cPts[0].y - sCenter.y);
        if (dist <= radius) {
          currentGroup.push(cand);
          visited.add(j);
        }
      }

      if (currentGroup.length >= Math.max(1, targetFp.count - 1)) {
        spatialGroups.push(currentGroup);
      }
    }

    // Evaluate geometric similarity of each cluster
    for (const group of spatialGroups) {
      const gFp = this.calcFingerprint(group);
      const countDiff = Math.abs(gFp.count - targetFp.count);
      const ratioDiff = Math.abs(gFp.ratio - targetFp.ratio);
      const lenRatio = targetFp.totalLength > 0 ? (gFp.totalLength / targetFp.totalLength) : 1;

      if (countDiff <= 1 && ratioDiff < 0.25 && lenRatio > 0.75 && lenRatio < 1.35) {
        const bb = this.calcBoundingBox(group);
        clusters.push({
          entities: group,
          center: { x: (bb.minX + bb.maxX) / 2, y: (bb.minY + bb.maxY) / 2 },
          similarity: Math.min(1.0, 1.0 - (ratioDiff * 0.5) - (Math.abs(1 - lenRatio) * 0.5)),
          rotation: 0
        });
      }
    }

    return clusters;
  }

  // --- Smart Blocks: Predictive Placement ---
  predictPlacement(blockName, mouseWorld) {
    const existing = this.engine.entities.filter(
      e => e.type === "BLOCK" && e.blockName.toUpperCase() === blockName.toUpperCase()
    );

    if (existing.length < 2) {
      return { x: mouseWorld.x, y: mouseWorld.y, rotation: 0, scale: 1.0, confidence: 0.3 };
    }

    // Calculate common spacing step and prevailing rotation
    let rotSum = 0;
    let avgDeltaX = 0, avgDeltaY = 0;
    for (let i = 1; i < existing.length; i++) {
      rotSum += existing[i].rotation;
      avgDeltaX += (existing[i].x - existing[i - 1].x);
      avgDeltaY += (existing[i].y - existing[i - 1].y);
    }
    const avgRot = rotSum / (existing.length - 1);
    const stepX = avgDeltaX / (existing.length - 1);
    const stepY = avgDeltaY / (existing.length - 1);

    // Predict snap to next equidistant grid or wall step
    const last = existing[existing.length - 1];
    let predX = mouseWorld.x;
    let predY = mouseWorld.y;

    const projectedX = last.x + stepX;
    const projectedY = last.y + stepY;
    const distToPredicted = Math.hypot(mouseWorld.x - projectedX, mouseWorld.y - projectedY);

    if (distToPredicted < Math.hypot(stepX, stepY) * 0.5) {
      predX = projectedX;
      predY = projectedY;
    }

    return {
      x: predX,
      y: predY,
      rotation: avgRot,
      scale: existing[0].scale || 1.0,
      confidence: 0.85
    };
  }

  // --- Smart Blocks: Replacement (BLOCKREPLACE) ---
  replaceBlock(targetBlockName, replacementBlockName) {
    const target = targetBlockName.toUpperCase();
    const repDef = this.getBlock(replacementBlockName);
    if (!repDef) {
      this.ui.setPrompt(`BLOCKREPLACE: Replacement block "${replacementBlockName}" not found in library.`);
      return 0;
    }

    let replaced = 0;
    for (const ent of this.engine.entities) {
      if (ent.type === "BLOCK" && ent.blockName.toUpperCase() === target) {
        ent.blockName = repDef.name;
        // Merge existing attributes with replacement block defaults
        ent.attributes = { ...repDef.attributes, ...(ent.attributes || {}) };
        replaced++;
      }
    }

    this.engine.render();
    this.ui.logCommand(`BLOCKREPLACE: Replaced ${replaced} instances of "${target}" with "${repDef.name}".`);
    this.updateCountPalette();
    return replaced;
  }

  // --- Intelligent Object Counting (COUNT & COUNTPALETTE) ---
  getCounts() {
    const summary = new Map();
    const instances = this.engine.entities.filter(e => e.type === "BLOCK");

    for (const inst of instances) {
      // Area filter check
      if (this.countFilterArea) {
        const inArea = this.isPointInPoly({ x: inst.x, y: inst.y }, this.countFilterArea);
        if (!inArea) continue;
      }

      const name = inst.blockName.toUpperCase();
      if (!summary.has(name)) {
        summary.set(name, {
          name,
          count: 0,
          overlappingCount: 0,
          instances: []
        });
      }

      const data = summary.get(name);
      data.count++;
      data.instances.push(inst);
    }

    // Detect overlapping / duplicate instances
    for (const [, data] of summary) {
      for (let i = 0; i < data.instances.length; i++) {
        for (let j = i + 1; j < data.instances.length; j++) {
          const a = data.instances[i];
          const b = data.instances[j];
          if (Math.hypot(a.x - b.x, a.y - b.y) < 1.0) {
            data.overlappingCount++;
          }
        }
      }
    }

    return summary;
  }

  isPointInPoly(pt, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Insert In-Canvas Dynamic Associative Count Table
  insertCountTable(x = 100, y = 100) {
    const counts = this.getCounts();
    const rows = [["Block Name", "Category", "Count", "Status"]];

    for (const [name, info] of counts) {
      const def = this.getBlock(name);
      const cat = def ? def.category : "General";
      const status = info.overlappingCount > 0 ? `⚠️ ${info.overlappingCount} Duplicates` : "✓ Clean";
      rows.push([name, cat, info.count.toString(), status]);
    }

    // Remove existing count table if present
    this.engine.entities = this.engine.entities.filter(e => !(e.type === "TABLE" && e.isCountTable));

    const table = new CadTable(x, y, rows, "XCAD 2D Intelligent Block Schedule");
    table.isCountTable = true;
    this.engine.entities.push(table);
    this.engine.render();
    this.ui.logCommand(`COUNTPALETTE: Inserted associative Count Table with ${rows.length - 1} entries.`);
    return table;
  }

  // Update Count Table Associatively on Geometry Edits
  updateCountTableIfPresent() {
    const table = this.engine.entities.find(e => e.type === "TABLE" && e.isCountTable);
    if (!table) return;

    const counts = this.getCounts();
    const rows = [["Block Name", "Category", "Count", "Status"]];
    for (const [name, info] of counts) {
      const def = this.getBlock(name);
      const cat = def ? def.category : "General";
      const status = info.overlappingCount > 0 ? `⚠️ ${info.overlappingCount} Duplicates` : "✓ Clean";
      rows.push([name, cat, info.count.toString(), status]);
    }
    table.rows = rows;
  }

  updateCountPalette() {
    this.updateCountTableIfPresent();
    const palette = document.getElementById("xcad-count-palette");
    if (!palette || palette.style.display === "none") return;

    const tbody = document.getElementById("count-palette-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const counts = this.getCounts();
    let totalObjects = 0;

    counts.forEach(item => {
      totalObjects += item.count;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: 600; color: #38bdf8;">${item.name}</td>
        <td>${item.count}</td>
        <td>${item.overlappingCount > 0 ? `<span class="badge-warn">⚠️ ${item.overlappingCount} Overlaps</span>` : `<span class="badge-ok">✓ OK</span>`}</td>
        <td>
          <button class="btn-micro" onclick="window.xcadSmartBlocks.highlightInstances('${item.name}')">Isolate</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    const totalDisplay = document.getElementById("count-total-display");
    if (totalDisplay) {
      totalDisplay.innerText = `Total Counted Blocks: ${totalObjects} (${counts.size} Types)`;
    }
  }

  highlightInstances(blockName) {
    this.engine.selectedEntities.clear();
    for (const ent of this.engine.entities) {
      if (ent.type === "BLOCK" && ent.blockName.toUpperCase() === blockName.toUpperCase()) {
        this.engine.selectedEntities.add(ent);
      }
    }
    this.engine.render();
    this.ui.setPrompt(`Isolated ${this.engine.selectedEntities.size} instances of "${blockName}".`);
  }
}
