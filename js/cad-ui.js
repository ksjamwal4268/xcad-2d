/**
 * XCAD 2D - Master UI & Ribbon Orchestrator
 * Connects AI Smart Blocks, GIS Basemaps, Parametric Constraints, AutoLISP, and Review Modes
 */

class CadUI {
  constructor() {
    this.engine = null;
    this.commands = null;

    // Core DOM Elements
    this.canvas = document.getElementById("cad-canvas");
    this.cmdInput = document.getElementById("cmd-input");
    this.cmdPromptLabel = document.getElementById("cmd-prompt-label");
    this.cmdHistory = document.getElementById("cmd-history");
    this.coordDisplay = document.getElementById("coord-display");
    this.dynInput = document.getElementById("dyn-input");
    this.cmdAutocomplete = document.getElementById("cmd-autocomplete");

    // Status Bar Pills
    this.pills = {
      grid: document.getElementById("pill-grid"),
      snap: document.getElementById("pill-snap"),
      ortho: document.getElementById("pill-ortho"),
      polar: document.getElementById("pill-polar"),
      osnap: document.getElementById("pill-osnap"),
      dyn: document.getElementById("pill-dyn"),
      qm: document.getElementById("pill-qm"),
      gis: document.getElementById("pill-gis"),
      cleanScreen: document.getElementById("pill-clean-screen"),
    };

    this.layerSelect = document.getElementById("active-layer-select");

    // Command Autocomplete Dictionary
    this.commandList = [
      { cmd: "LINE", shortcut: "L", desc: "Draw straight line segments" },
      { cmd: "POLYLINE", shortcut: "PL", desc: "Draw 2D polyline" },
      { cmd: "CIRCLE", shortcut: "C", desc: "Draw circle with center & radius" },
      { cmd: "ARC", shortcut: "A", desc: "Draw 3-point arc" },
      { cmd: "RECTANGLE", shortcut: "REC", desc: "Draw rectangular polyline" },
      { cmd: "HATCH", shortcut: "H", desc: "Boundary-free & path-based pattern hatch" },
      { cmd: "BCONVERT", shortcut: "BCONVERT", desc: "AI Smart Blocks: Search & Convert raw linework" },
      { cmd: "BLOCKREPLACE", shortcut: "BLOCKREPLACE", desc: "Batch replace blocks preserving attributes" },
      { cmd: "COUNT", shortcut: "COUNT", desc: "Intelligent block count palette & validation" },
      { cmd: "INSERTCOUNTTABLE", shortcut: "COUNTTABLE", desc: "Insert associative block count table" },
      { cmd: "INSERT", shortcut: "I", desc: "Insert block with predictive placement" },
      { cmd: "TRIM", shortcut: "TR", desc: "Quick mode trim (Shift to extend)" },
      { cmd: "EXTEND", shortcut: "EX", desc: "Quick mode extend (Shift to trim)" },
      { cmd: "ARRAYRECT", shortcut: "AR", desc: "Dynamic parametric rectangular array" },
      { cmd: "ARRAYPOLAR", shortcut: "ARRAYPOLAR", desc: "Dynamic parametric polar array" },
      { cmd: "CENTERMARK", shortcut: "CM", desc: "Associative center mark on circle/arc" },
      { cmd: "CENTERLINE", shortcut: "CL", desc: "Associative centerline between geometry" },
      { cmd: "DIMENSION", shortcut: "DIM", desc: "Smart dimensioning (Linear/Aligned/Radial)" },
      { cmd: "MLEADER", shortcut: "ML", desc: "Associative multi-leader annotation" },
      { cmd: "REVCLOUD", shortcut: "REVCLOUD", desc: "Create revision cloud arcs" },
      { cmd: "TABLE", shortcut: "TABLE", desc: "Insert custom CAD schedule table" },
      { cmd: "QUICKMEASURE", shortcut: "QM", desc: "Real-time neon cursor measurement HUD" },
      { cmd: "DIST", shortcut: "DI", desc: "Measure distance and angle between points" },
      { cmd: "GEOGRAPHICLOCATION", shortcut: "GEO", desc: "Assign real-world GPS coordinates (WGS84)" },
      { cmd: "BASEMAP", shortcut: "GIS", desc: "Stream Satellite, OSM, or Street maps" },
      { cmd: "MAPCAPTURE", shortcut: "MAPCAPTURE", desc: "Capture static aerial map underlay" },
      { cmd: "PARAMETERS", shortcut: "PARAM", desc: "Parameters Manager with algebraic formulas" },
      { cmd: "GEOMCONSTRAINT", shortcut: "CONSTRAINT", desc: "Parametric geometric constraints" },
      { cmd: "TRACE", shortcut: "TRACE", desc: "Collaborative transparent review overlay" },
      { cmd: "COMPARE", shortcut: "DWGCOMPARE", desc: "Visual DWG diff engine (Added/Deleted/Unchanged)" },
      { cmd: "INSIGHTS", shortcut: "INSIGHTS", desc: "Activity Insights revision event timeline" },
      { cmd: "DATAEXTRACTION", shortcut: "DATAEXTRACTION", desc: "Export geometric schedules & BOQ to CSV" },
      { cmd: "DATALINK", shortcut: "DATALINK", desc: "Two-way Excel / CSV data link" },
      { cmd: "LISP", shortcut: "VLISP", desc: "AutoLISP IDE & script automation console" },
      { cmd: "MOVE", shortcut: "M", desc: "Move selected objects" },
      { cmd: "COPY", shortcut: "CO", desc: "Copy objects in specified direction" },
      { cmd: "ROTATE", shortcut: "RO", desc: "Rotate selected objects around base point" },
      { cmd: "SCALE", shortcut: "SC", desc: "Scale selected objects around base point" },
      { cmd: "MIRROR", shortcut: "MI", desc: "Mirror selected objects across 2-point axis" },
      { cmd: "FILLET", shortcut: "F", desc: "Fillet corners or tangent arc with radius" },
      { cmd: "EXPLODE", shortcut: "X", desc: "Explode block, polyline, or rectangle into primitives" },
      { cmd: "JOIN", shortcut: "J", desc: "Join touching line segments into a polyline" },
      { cmd: "OFFSET", shortcut: "O", desc: "Offset object parallel" },
      { cmd: "ERASE", shortcut: "E", desc: "Delete selected objects" },
      { cmd: "LAYER", shortcut: "LA", desc: "Open Layer Properties Manager" },
      { cmd: "REGEN", shortcut: "RE", desc: "Regenerate drawing and refresh display" },
      { cmd: "DIMLINEAR", shortcut: "DLI", desc: "Create linear dimension" },
      { cmd: "DIMALIGNED", shortcut: "DAL", desc: "Create aligned dimension" },
      { cmd: "DIMRADIUS", shortcut: "DRA", desc: "Create radius dimension on circle or arc" },
      { cmd: "DIMDIAMETER", shortcut: "DDI", desc: "Create diameter dimension on circle or arc" },
      { cmd: "ZOOM", shortcut: "Z", desc: "Zoom Extents" },
      { cmd: "PAN", shortcut: "P", desc: "Pan viewport" },
      { cmd: "CLEANSCREEN", shortcut: "CTRL+0", desc: "Toggle distraction-free full screen" },
      { cmd: "FULLSCREEN", shortcut: "F11", desc: "Toggle full-screen mode" },
      { cmd: "UNDO", shortcut: "U", desc: "Undo last step" },
      { cmd: "REDO", shortcut: "REDO", desc: "Redo step" },
      { cmd: "CLEAR", shortcut: "NEW", desc: "Clear drawing / New canvas" },
      { cmd: "SAVE", shortcut: "SAVE", desc: "Save project file (.cad)" },
      { cmd: "DXF", shortcut: "DXF", desc: "Export standard AutoCAD DXF" }
    ];

    this.filteredSuggestions = [];
    this.selectedSuggestionIdx = -1;

    this.init();
  }

  init() {
    this.engine = new CadEngine(this.canvas);
    this.commands = new CadCommands(this.engine, this);

    // Initialize Subsystems
    window.xcadSmartBlocks = new XcadSmartBlocks(this.engine, this);
    window.xcadGisMap = new XcadGisMap(this.engine, this);
    window.xcadParametric = new XcadParametric(this.engine, this);
    window.xcadLisp = new XcadLisp(this.engine, this);

    // Command line listeners
    this.cmdInput.addEventListener("keydown", (e) => this.handleCmdKeyDown(e));
    this.cmdInput.addEventListener("input", () => this.handleCmdInput());

    // Fullscreen listeners
    document.addEventListener("fullscreenchange", () => {
      this.updateFullscreenState(!!document.fullscreenElement);
    });

    // Layer dropdown
    this.updateLayerDropdown();
    this.layerSelect.addEventListener("change", (e) => {
      this.engine.activeLayerId = e.target.value;
    });

    // Ribbon Tab switching
    const tabs = document.querySelectorAll(".ribbon-tab");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const panelGroup = tab.getAttribute("data-tab");
        this.switchRibbonPanel(panelGroup);
      });
    });

    // Dismiss popups on click outside
    document.addEventListener("click", (e) => {
      if (!this.cmdInput.contains(e.target) && this.cmdAutocomplete && !this.cmdAutocomplete.contains(e.target)) {
        this.hideSuggestions();
      }
    });

    // F1 Help Modal Key
    window.addEventListener("keydown", (e) => {
      if (e.key === "F1") {
        e.preventDefault();
        this.openHelpModal();
      }
    });

    this.initBeginnerTips();
    this.updateCommandActionPills();
    this.logCommand("XCAD 2D v2026 initialized. AI Smart Blocks, GIS Basemaps, AutoLISP, and Quick Measure ready.");
  }

  switchRibbonPanel(panelGroup) {
    const panels = document.querySelectorAll(".ribbon-group-set");
    panels.forEach(p => {
      if (p.getAttribute("data-panel") === panelGroup) {
        p.style.display = "flex";
      } else {
        p.style.display = "none";
      }
    });
  }

  // --- Autocomplete Logic ---
  handleCmdKeyDown(e) {
    if (this.cmdAutocomplete && this.cmdAutocomplete.style.display === "flex") {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.moveSuggestionSelection(1);
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.moveSuggestionSelection(-1);
        return;
      } else if (e.key === "Tab") {
        e.preventDefault();
        if (this.selectedSuggestionIdx >= 0 && this.filteredSuggestions[this.selectedSuggestionIdx]) {
          this.cmdInput.value = this.filteredSuggestions[this.selectedSuggestionIdx].cmd;
          this.hideSuggestions();
        }
        return;
      }
    }

    const isExecuteKey = e.key === "Enter" || (e.key === " " && !this.cmdInput.value.startsWith("("));
    if (isExecuteKey) {
      e.preventDefault();
      if (this.cmdAutocomplete && this.cmdAutocomplete.style.display === "flex" && this.selectedSuggestionIdx >= 0) {
        const selected = this.filteredSuggestions[this.selectedSuggestionIdx];
        this.hideSuggestions();
        this.cmdInput.value = "";
        this.commands.execute(selected.cmd);
        return;
      }
      this.hideSuggestions();
      const val = this.cmdInput.value;
      this.cmdInput.value = "";
      this.commands.execute(val);
    } else if (e.key === "Escape") {
      this.hideSuggestions();
      this.cmdInput.value = "";
      this.commands.cancelCommand();
    }
  }

  handleCmdInput() {
    if (!this.cmdAutocomplete) return;
    const query = this.cmdInput.value.trim().toUpperCase();

    if (!query || this.commands.activeCommand || query.startsWith("(")) {
      this.hideSuggestions();
      return;
    }

    this.filteredSuggestions = this.commandList.filter(item => {
      return item.cmd.startsWith(query) || item.shortcut.toUpperCase() === query || item.shortcut.toUpperCase().startsWith(query);
    }).slice(0, 6);

    if (this.filteredSuggestions.length === 0) {
      this.hideSuggestions();
      return;
    }

    this.cmdAutocomplete.innerHTML = "";
    this.selectedSuggestionIdx = 0;

    this.filteredSuggestions.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = `cmd-suggestion-item ${index === 0 ? "active" : ""}`;
      row.innerHTML = `
        <span style="font-weight: 700; color: #38bdf8;">${item.cmd}</span>
        <span style="color: #94a3b8; font-size: 10px; margin-left: 8px;">(${item.shortcut}) - ${item.desc}</span>
      `;
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.cmdInput.value = "";
        this.hideSuggestions();
        this.commands.execute(item.cmd);
      });
      this.cmdAutocomplete.appendChild(row);
    });

    this.cmdAutocomplete.style.display = "flex";
  }

  moveSuggestionSelection(direction) {
    if (!this.filteredSuggestions.length) return;
    this.selectedSuggestionIdx = (this.selectedSuggestionIdx + direction + this.filteredSuggestions.length) % this.filteredSuggestions.length;
    const items = this.cmdAutocomplete.querySelectorAll(".cmd-suggestion-item");
    items.forEach((it, idx) => {
      it.classList.toggle("active", idx === this.selectedSuggestionIdx);
    });
  }

  hideSuggestions() {
    if (this.cmdAutocomplete) this.cmdAutocomplete.style.display = "none";
    this.selectedSuggestionIdx = -1;
  }

  // --- Palettes & Modal Windows ---
  toggleCountPalette() {
    const pal = document.getElementById("xcad-count-palette");
    if (!pal) return;
    const isVisible = pal.style.display !== "none";
    pal.style.display = isVisible ? "none" : "flex";
    if (!isVisible && window.xcadSmartBlocks) {
      window.xcadSmartBlocks.updateCountPalette();
    }
  }

  toggleParametersPalette() {
    const pal = document.getElementById("xcad-parameters-palette");
    if (!pal) return;
    const isVisible = pal.style.display !== "none";
    pal.style.display = isVisible ? "none" : "flex";
    if (!isVisible && window.xcadParametric) {
      window.xcadParametric.updateParametersPalette();
    }
  }

  toggleInsightsPalette() {
    const pal = document.getElementById("xcad-insights-palette");
    if (!pal) return;
    const isVisible = pal.style.display !== "none";
    pal.style.display = isVisible ? "none" : "flex";
    if (!isVisible) {
      const container = document.getElementById("insights-log-list");
      if (container) {
        container.innerHTML = "";
        this.engine.activityLog.forEach(log => {
          const div = document.createElement("div");
          div.className = "insight-log-item";
          div.innerHTML = `<span class="insight-time">${log.timestamp}</span> <span class="insight-action">${log.action}</span>: ${log.details}`;
          container.appendChild(div);
        });
      }
    }
  }

  toggleLispConsole() {
    const pal = document.getElementById("xcad-lisp-palette");
    if (!pal) return;
    pal.style.display = pal.style.display !== "none" ? "none" : "flex";
  }

  openBConvertGallery(result) {
    const modal = document.getElementById("bconvert-modal");
    if (!modal) return;
    document.getElementById("bconvert-blockname").innerText = result.blockName;
    document.getElementById("bconvert-count").innerText = `${result.candidatesFound} matching clusters found`;
    modal.style.display = "flex";
  }

  closeBConvertGallery() {
    document.getElementById("bconvert-modal").style.display = "none";
  }

  confirmBConvert() {
    const name = document.getElementById("bconvert-blockname").innerText;
    if (window.xcadSmartBlocks) {
      window.xcadSmartBlocks.convertAllCandidates(name);
    }
    this.closeBConvertGallery();
  }

  // --- GIS Settings ---
  openGisSettings() {
    const lat = prompt("Enter Reference Latitude (WGS84):", window.xcadGisMap ? window.xcadGisMap.refLatitude : 37.7749);
    const lon = prompt("Enter Reference Longitude (WGS84):", window.xcadGisMap ? window.xcadGisMap.refLongitude : -122.4194);
    if (lat && lon && window.xcadGisMap) {
      window.xcadGisMap.setLocation(lat, lon);
      window.xcadGisMap.toggleBasemap("SATELLITE");
    }
  }

  // --- Data Extraction & Data Link ---
  exportDataExtraction() {
    let csv = "Type,Layer,Details,Quantity\n";
    const counts = new Map();
    for (const ent of this.engine.entities) {
      const key = `${ent.type}_${ent.layer}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    counts.forEach((qty, key) => {
      const [type, layer] = key.split("_");
      csv += `"${type}","${layer}","Drawing Linework & Components",${qty}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "XCAD_Data_Extraction.csv";
    a.click();
    this.setPrompt("DATAEXTRACTION: Exported schedule data to XCAD_Data_Extraction.csv");
  }

  importDataLink() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const lines = evt.target.result.split(/\r?\n/).filter(l => l.trim().length);
        const rows = lines.map(line => line.split(",").map(c => c.replace(/^"|"$/g, "")));
        if (rows.length) {
          const tbl = new CadTable(60, 60, rows, file.name.replace(".csv", ""));
          this.engine.addEntity(tbl);
          this.setPrompt(`DATALINK: Linked and imported external spreadsheet table (${rows.length} rows).`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // --- Fullscreen & Clean Screen Mode (CTRL+0 / F11) ---
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.updateFullscreenState(true);
      }).catch(() => {
        this.toggleCleanScreen();
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          this.updateFullscreenState(false);
        }).catch(() => {});
      }
    }
  }

  toggleCleanScreen() {
    const isClean = document.body.classList.toggle("clean-screen-on");
    const pill = document.getElementById("pill-clean-screen");
    if (pill) {
      pill.classList.toggle("active", isClean);
      pill.innerHTML = isClean ? "⛶ CLEAN SCREEN &lt;ON&gt;" : "⛶ CLEAN SCREEN";
    }
    this.logCommand(isClean ? "CLEANSCREENON" : "CLEANSCREENOFF");
    this.setPrompt(isClean ? "Clean Screen Active. Press CTRL+0 or ESC to exit." : "Command: ");
    setTimeout(() => this.engine.resize(), 60);
  }

  updateFullscreenState(isFullscreen) {
    const btnHeader = document.getElementById("btn-fullscreen-header");
    const pill = document.getElementById("pill-clean-screen");

    if (isFullscreen) {
      if (btnHeader) {
        btnHeader.innerHTML = `<span>🗗</span><span>Exit Fullscreen</span>`;
        btnHeader.title = "Exit Fullscreen Mode (F11 / ESC / CTRL+0)";
      }
      if (pill) {
        pill.classList.add("active");
        pill.innerHTML = "⛶ FULLSCREEN &lt;ON&gt;";
      }
      this.logCommand("FULLSCREEN <ON>");
      this.setPrompt("XCAD 2D Full Screen Mode Active.");
    } else {
      if (btnHeader) {
        btnHeader.innerHTML = `<span>⛶</span><span>Fullscreen (CTRL+0)</span>`;
        btnHeader.title = "Toggle Fullscreen Mode (F11 / CTRL+0)";
      }
      if (pill) {
        pill.classList.remove("active");
        pill.innerHTML = "⛶ CLEAN SCREEN";
      }
      this.logCommand("FULLSCREEN <OFF>");
      this.setPrompt("Command: ");
    }
    setTimeout(() => this.engine.resize(), 80);
  }

  // --- Layout Tabs (Model / Layout1 / Layout2) ---
  switchLayout(layoutName) {
    const tabs = document.querySelectorAll(".layout-tab");
    tabs.forEach(t => {
      if (t.getAttribute("data-tab") === layoutName) t.classList.add("active");
      else t.classList.remove("active");
    });

    if (layoutName === "model") {
      this.logCommand("TILEMODE <1> (Model Space)");
      this.setPrompt("Switched to Model Space (World Coordinate System).");
    } else {
      this.logCommand(`LAYOUT <${layoutName}> (Paper Space Viewport)`);
      this.setPrompt(`Switched to Sheet Viewport "${layoutName}".`);
    }
  }

  newLayout() {
    const tabs = document.querySelectorAll(".layout-tab[data-tab]");
    const name = `Layout${tabs.length}`;
    const bar = document.getElementById("layout-tabs-bar");
    const addBtn = bar.lastElementChild;

    const tabBtn = document.createElement("button");
    tabBtn.className = "layout-tab";
    tabBtn.setAttribute("data-tab", name);
    tabBtn.innerText = name;
    tabBtn.onclick = () => this.switchLayout(name);
    bar.insertBefore(tabBtn, addBtn);
    this.switchLayout(name);
  }

  // --- UI Notification & Status ---
  setPrompt(text) {
    if (this.cmdPromptLabel) this.cmdPromptLabel.innerText = text;
    this.updateCommandActionPills();
    this.updateQuickProperties();
  }

  updateCommandActionPills() {
    const container = document.getElementById("cmd-action-pills");
    if (!container) return;
    container.innerHTML = "";

    const activeCmd = this.commands ? this.commands.activeCommand : null;
    const selectedCount = this.engine ? this.engine.selectedEntities.size : 0;

    if (activeCmd === "POLYLINE") {
      if (this.commands.tempPoints.length >= 2) {
        container.appendChild(this.createActionPill("✓ Finish (Enter)", () => this.commands.finishCommand(), "primary"));
      }
      if (this.commands.tempPoints.length >= 3) {
        container.appendChild(this.createActionPill("⟲ Close (C)", () => this.commands.execute("C"), "success"));
      }
      container.appendChild(this.createActionPill("✕ Cancel (Esc)", () => this.commands.cancelCommand(), "cancel"));
    } else if (activeCmd === "LINE") {
      if (this.commands.tempPoints.length >= 1) {
        container.appendChild(this.createActionPill("✓ Finish (Enter)", () => this.commands.finishCommand(), "primary"));
      }
      container.appendChild(this.createActionPill("✕ Cancel (Esc)", () => this.commands.cancelCommand(), "cancel"));
    } else if (activeCmd === "HATCH") {
      if (this.commands.tempPoints.length >= 3) {
        container.appendChild(this.createActionPill("✓ Apply Hatch (Enter)", () => this.commands.finishCommand(), "primary"));
      }
      container.appendChild(this.createActionPill("✕ Cancel (Esc)", () => this.commands.cancelCommand(), "cancel"));
    } else if (activeCmd === "TRIM") {
      container.appendChild(this.createActionPill("↔ Toggle Extend (Shift)", () => {}, "info"));
      container.appendChild(this.createActionPill("✓ Done (Esc)", () => this.commands.cancelCommand(), "cancel"));
    } else if (activeCmd === "ROTATE" && this.commands.step === 2) {
      container.appendChild(this.createActionPill("45°", () => this.commands.execute("45"), "action"));
      container.appendChild(this.createActionPill("90°", () => this.commands.execute("90"), "action"));
      container.appendChild(this.createActionPill("180°", () => this.commands.execute("180"), "action"));
      container.appendChild(this.createActionPill("✕ Cancel (Esc)", () => this.commands.cancelCommand(), "cancel"));
    } else if (activeCmd === "SCALE" && this.commands.step === 2) {
      container.appendChild(this.createActionPill("0.5x", () => this.commands.execute("0.5"), "action"));
      container.appendChild(this.createActionPill("2.0x", () => this.commands.execute("2"), "action"));
      container.appendChild(this.createActionPill("✕ Cancel (Esc)", () => this.commands.cancelCommand(), "cancel"));
    } else if (activeCmd === "FILLET") {
      container.appendChild(this.createActionPill("Radius (R)", () => this.commands.execute("R"), "action"));
      container.appendChild(this.createActionPill("R=0 (Corner)", () => this.commands.execute("0"), "quick"));
      container.appendChild(this.createActionPill("R=10", () => this.commands.execute("10"), "quick"));
      container.appendChild(this.createActionPill("✕ Cancel (Esc)", () => this.commands.cancelCommand(), "cancel"));
    } else if (["CYCLOID", "INVOLUTE", "SPIRAL", "HELIX", "SCALEPLAIN", "SCALEDIAGONAL", "PROJPOINT", "PROJLINE", "DEVCYLINDER", "DEVCONE"].includes(activeCmd)) {
      container.appendChild(this.createActionPill("📍 Place at Center (Enter)", () => this.commands.finishCommand(), "primary"));
      container.appendChild(this.createActionPill("✕ Cancel (Esc)", () => this.commands.cancelCommand(), "cancel"));
    } else if (activeCmd) {
      container.appendChild(this.createActionPill("✕ Cancel (Esc)", () => this.commands.cancelCommand(), "cancel"));
    } else if (selectedCount > 0) {
      container.appendChild(this.createActionPill(`Selected (${selectedCount})`, null, "badge"));
      container.appendChild(this.createActionPill("↔ Move (M)", () => this.commands.execute("M"), "action"));
      container.appendChild(this.createActionPill("⧉ Copy (CO)", () => this.commands.execute("CO"), "action"));
      container.appendChild(this.createActionPill("⟲ Rotate (RO)", () => this.commands.execute("RO"), "action"));
      container.appendChild(this.createActionPill("⤢ Scale (SC)", () => this.commands.execute("SC"), "action"));
      container.appendChild(this.createActionPill("⧎ Mirror (MI)", () => this.commands.execute("MI"), "action"));
      container.appendChild(this.createActionPill("💥 Explode (X)", () => this.commands.execute("X"), "action"));
      const linesSelected = Array.from(this.engine.selectedEntities).filter(e => e.type === "LINE").length;
      if (linesSelected >= 2) {
        container.appendChild(this.createActionPill("🔗 Join (J)", () => this.commands.execute("J"), "success"));
      }
      container.appendChild(this.createActionPill("🗑️ Delete (Del)", () => this.commands.execute("E"), "danger"));
      container.appendChild(this.createActionPill("✕ Deselect", () => {
        this.engine.selectedEntities.clear();
        this.engine.render();
        this.updateCommandActionPills();
        this.updateQuickProperties();
      }, "cancel"));
    } else {
      // Helpful quick shortcuts for beginners
      container.appendChild(this.createActionPill("+ Line (L)", () => this.commands.startCommand("LINE"), "quick"));
      container.appendChild(this.createActionPill("+ Pline (PL)", () => this.commands.startCommand("POLYLINE"), "quick"));
      container.appendChild(this.createActionPill("+ Circle (C)", () => this.commands.startCommand("CIRCLE"), "quick"));
      container.appendChild(this.createActionPill("+ Rect (REC)", () => this.commands.startCommand("RECTANGLE"), "quick"));
      container.appendChild(this.createActionPill("📂 Templates", () => this.openTemplatesModal(), "accent"));
      container.appendChild(this.createActionPill("❓ Help", () => this.openHelpModal(), "help"));
    }
  }

  createActionPill(label, onClick, variant = "action") {
    const btn = document.createElement("button");
    btn.className = `cmd-action-pill pill-${variant}`;
    btn.type = "button";
    btn.innerText = label;
    if (onClick) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      });
    }
    return btn;
  }

  // Floating Quick Properties Inspector
  updateQuickProperties() {
    const card = document.getElementById("quick-props-card");
    if (!card) return;

    if (!this.engine || this.engine.selectedEntities.size === 0) {
      card.style.display = "none";
      return;
    }

    card.style.display = "flex";
    const selected = Array.from(this.engine.selectedEntities);
    const count = selected.length;

    const titleEl = document.getElementById("qp-title");
    const infoEl = document.getElementById("qp-info");
    const layerSelect = document.getElementById("qp-layer-select");

    if (count === 1) {
      const ent = selected[0];
      let title = ent.type;
      let info = "";

      if (ent.type === "LINE") {
        const len = Math.hypot(ent.x2 - ent.x1, ent.y2 - ent.y1).toFixed(2);
        const ang = (((Math.atan2(ent.y2 - ent.y1, ent.x2 - ent.x1) * 180) / Math.PI + 360) % 360).toFixed(1);
        title = "Line";
        info = `Length: ${len} mm · Angle: ${ang}°`;
      } else if (ent.type === "CIRCLE") {
        title = "Circle";
        info = `Radius: ${ent.r.toFixed(2)} mm · Ø: ${(ent.r * 2).toFixed(2)} mm`;
      } else if (ent.type === "RECTANGLE") {
        const w = Math.abs(ent.x2 - ent.x1).toFixed(2);
        const h = Math.abs(ent.y2 - ent.y1).toFixed(2);
        title = "Rectangle";
        info = `Width: ${w} mm · Height: ${h} mm`;
      } else if (ent.type === "POLYLINE") {
        title = "Polyline";
        info = `${ent.points.length} Vertices · ${ent.closed ? "Closed" : "Open"}`;
      } else if (ent.type === "BLOCK") {
        title = `Block: ${ent.blockName}`;
        info = `Scale: ${ent.scale}x · Rotation: ${(ent.rotation * 180 / Math.PI).toFixed(1)}°`;
      } else if (ent.type === "HATCH") {
        title = `Hatch (${ent.pattern})`;
        info = `${ent.points.length} Boundary Points`;
      } else if (ent.type === "DIMENSION") {
        title = "Dimension";
        info = `Measured: ${Math.hypot(ent.x2 - ent.x1, ent.y2 - ent.y1).toFixed(2)} mm`;
      } else if (ent.type === "TEXT") {
        title = "Text Annotation";
        info = `"${ent.text}"`;
      }

      if (titleEl) titleEl.innerText = title;
      if (infoEl) infoEl.innerText = info;
      if (layerSelect) layerSelect.value = ent.layer || "0";
    } else {
      if (titleEl) titleEl.innerText = `${count} Objects Selected`;
      if (infoEl) infoEl.innerText = "Auto-drag anywhere or use tools below";
    }
  }

  changeSelectedLayer(layerId) {
    if (!this.engine || !this.engine.selectedEntities.size) return;
    for (const ent of this.engine.selectedEntities) {
      ent.layer = layerId;
    }
    this.engine.render();
    this.setPrompt(`Selected objects moved to Layer "${layerId}".`);
  }

  setQuickColor(colorHex) {
    if (!this.engine || !this.engine.selectedEntities.size) return;
    let match = this.engine.layers.find(l => l.color.toLowerCase() === colorHex.toLowerCase());
    if (!match) {
      const newId = "color_" + colorHex.replace("#", "");
      match = { id: newId, name: "Color " + colorHex, color: colorHex, visible: true, locked: false, weight: 1 };
      this.engine.layers.push(match);
      this.updateLayerDropdown();
    }
    for (const ent of this.engine.selectedEntities) {
      ent.layer = match.id;
    }
    this.engine.render();
    this.updateQuickProperties();
    this.setPrompt("Color updated on selected objects.");
  }

  // --- Beginner Tips Rotation ---
  initBeginnerTips() {
    this.tips = [
      "💡 Auto-Drag: Click and drag any selected object to move it directly without typing MOVE!",
      "💡 Quick Extend: In TRIM mode (TR), hold Shift to instantly switch to EXTEND!",
      "💡 Distraction-Free: Press F11 or CTRL+0 anytime to switch to CleanScreen Fullscreen!",
      "💡 Quick Measure: Hover your cursor in QM mode to see live wall and room dimensions!",
      "💡 Sample Templates: Click 'Templates' in the top bar to load 2BHK, Civil Site, or Mechanical drawings!",
      "💡 Snapping (F3): Endpoint, Midpoint, Center, and Centroid snaps keep your drawings 100% precise!",
      "💡 AutoCAD DXF Export: Click 'DXF' in the top bar to save files compatible with AutoCAD & Revit!"
    ];
    this.currentTipIdx = 0;
    this.renderTip();
    setInterval(() => this.nextTip(), 14000);
  }

  nextTip() {
    this.currentTipIdx = (this.currentTipIdx + 1) % this.tips.length;
    this.renderTip();
  }

  renderTip() {
    const tipEl = document.getElementById("beginner-tip-text");
    if (tipEl) {
      tipEl.innerText = this.tips[this.currentTipIdx];
    }
  }

  // --- Templates & Help Modals ---
  openTemplatesModal() {
    const modal = document.getElementById("templates-modal");
    if (modal) modal.style.display = "flex";
  }

  closeTemplatesModal() {
    const modal = document.getElementById("templates-modal");
    if (modal) modal.style.display = "none";
  }

  openHelpModal() {
    const modal = document.getElementById("help-modal");
    if (modal) modal.style.display = "flex";
  }

  closeHelpModal() {
    const modal = document.getElementById("help-modal");
    if (modal) modal.style.display = "none";
  }

  loadTemplate(type) {
    this.closeTemplatesModal();
    if (!window.XcadTemplates) return;
    if (type === "floorplan") {
      window.XcadTemplates.loadFloorPlan(this.engine, this.commands, this);
    } else if (type === "civilsite") {
      window.XcadTemplates.loadCivilSite(this.engine, this.commands, this);
    } else if (type === "mechanical") {
      window.XcadTemplates.loadMechanicalPart(this.engine, this.commands, this);
    } else if (type === "clear") {
      this.engine.entities = [];
      this.engine.selectedEntities.clear();
      this.commands.resetView();
      this.setPrompt("Canvas cleared. Start drafting!");
    }
    this.updateCommandActionPills();
    this.updateQuickProperties();
  }

  logCommand(text) {
    const line = document.createElement("div");
    line.className = "cmd-history-line";
    line.innerText = `Command: ${text}`;
    this.cmdHistory.prepend(line);
  }

  updateCoordinates(wx, wy) {
    this.coordDisplay.innerText = `X: ${wx.toFixed(3)}  Y: ${wy.toFixed(3)}  Z: 0.000`;

    // Dynamic Input (DYNMODE / F12)
    if (this.engine.dynInputEnabled) {
      this.dynInput.style.display = "block";
      this.dynInput.style.left = `${this.engine.mouseScreen.x + 18}px`;
      this.dynInput.style.top = `${this.engine.mouseScreen.y + 12}px`;

      if (this.commands.activeCommand && this.commands.tempPoints.length > 0) {
        const p1 = this.commands.tempPoints[this.commands.tempPoints.length - 1];
        const dist = Math.hypot(wx - p1.x, wy - p1.y).toFixed(2);
        const ang = ((Math.atan2(wy - p1.y, wx - p1.x) * 180) / Math.PI + 360) % 360;
        this.dynInput.innerText = `Length: ${dist}  < ${ang.toFixed(1)}°`;
      } else {
        this.dynInput.innerText = `${wx.toFixed(2)}, ${wy.toFixed(2)}`;
      }
    } else {
      this.dynInput.style.display = "none";
    }
  }

  updateActiveRibbonButton(cmdName) {
    const buttons = document.querySelectorAll("[data-cmd]");
    buttons.forEach(btn => {
      if (btn.getAttribute("data-cmd") === cmdName) btn.classList.add("active");
      else btn.classList.remove("active");
    });
  }

  // --- Drafting Aids Toggles (Status Bar F1-F12) ---
  toggleDraft(name) {
    const pill = this.pills[name];
    if (!pill) return;

    if (name === "grid") {
      this.engine.gridEnabled = !this.engine.gridEnabled;
      pill.classList.toggle("active", this.engine.gridEnabled);
      this.logCommand(`GRID ${this.engine.gridEnabled ? "<ON>" : "<OFF>"}`);
    } else if (name === "snap") {
      this.engine.gridSnap = !this.engine.gridSnap;
      pill.classList.toggle("active", this.engine.gridSnap);
      this.logCommand(`SNAP ${this.engine.gridSnap ? "<ON>" : "<OFF>"}`);
    } else if (name === "ortho") {
      this.engine.orthoEnabled = !this.engine.orthoEnabled;
      pill.classList.toggle("active", this.engine.orthoEnabled);
      this.logCommand(`ORTHO ${this.engine.orthoEnabled ? "<ON>" : "<OFF>"}`);
    } else if (name === "polar") {
      this.engine.polarEnabled = !this.engine.polarEnabled;
      pill.classList.toggle("active", this.engine.polarEnabled);
      this.logCommand(`POLAR ${this.engine.polarEnabled ? "<ON>" : "<OFF>"}`);
    } else if (name === "osnap") {
      this.engine.osnapEnabled = !this.engine.osnapEnabled;
      pill.classList.toggle("active", this.engine.osnapEnabled);
      this.logCommand(`OSNAP ${this.engine.osnapEnabled ? "<ON>" : "<OFF>"}`);
    } else if (name === "dyn") {
      this.engine.dynInputEnabled = !this.engine.dynInputEnabled;
      pill.classList.toggle("active", this.engine.dynInputEnabled);
      this.dynInput.style.display = this.engine.dynInputEnabled ? "block" : "none";
      this.logCommand(`DYNMODE ${this.engine.dynInputEnabled ? "<ON>" : "<OFF>"}`);
    }
    this.engine.render();
  }

  // --- Layer Management ---
  updateLayerDropdown() {
    this.layerSelect.innerHTML = "";
    this.engine.layers.forEach(lay => {
      const opt = document.createElement("option");
      opt.value = lay.id;
      opt.innerText = lay.name;
      this.layerSelect.appendChild(opt);
    });
    this.layerSelect.value = this.engine.activeLayerId;
  }

  openLayerManager() {
    const modal = document.getElementById("layer-modal");
    const tbody = document.getElementById("layer-table-body");
    tbody.innerHTML = "";

    this.engine.layers.forEach((lay) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${lay.name}</td>
        <td>
          <input type="color" value="${lay.color}" class="color-bullet" onchange="window.cadApp.setLayerColor('${lay.id}', this.value)" />
        </td>
        <td>
          <input type="checkbox" ${lay.visible ? "checked" : ""} onchange="window.cadApp.toggleLayerVisibility('${lay.id}')" />
        </td>
        <td>
          <button class="btn-small-action" onclick="window.cadApp.setCurrentLayer('${lay.id}')">${this.engine.activeLayerId === lay.id ? "✓ Current" : "Set Current"}</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    modal.style.display = "flex";
  }

  closeLayerManager() {
    document.getElementById("layer-modal").style.display = "none";
  }

  addNewLayer() {
    const name = prompt("Enter new Layer Name:", `Layer_${this.engine.layers.length + 1}`);
    if (name) {
      const colors = ["#00e5ff", "#76ff03", "#ffea00", "#ff1744", "#d500f9", "#ff9100"];
      const col = colors[this.engine.layers.length % colors.length];
      this.engine.layers.push({
        id: `lay_${Date.now()}`,
        name: name.trim(),
        color: col,
        weight: 1,
        visible: true,
        locked: false
      });
      this.updateLayerDropdown();
      this.openLayerManager();
    }
  }

  setLayerColor(id, color) {
    const lay = this.engine.layers.find(l => l.id === id);
    if (lay) { lay.color = color; this.engine.render(); }
  }

  toggleLayerVisibility(id) {
    const lay = this.engine.layers.find(l => l.id === id);
    if (lay) { lay.visible = !lay.visible; this.engine.render(); }
  }

  setCurrentLayer(id) {
    this.engine.activeLayerId = id;
    this.updateLayerDropdown();
    this.openLayerManager();
  }

  // --- Save / Load & Export ---
  saveProject() {
    const data = {
      app: "XCAD 2D v2026",
      layers: this.engine.layers,
      entities: this.engine.entities
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "XCAD_Drawing.cad";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.setPrompt("Drawing saved to XCAD_Drawing.cad");
  }

  loadProject() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".cad,.json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (parsed.layers) this.engine.layers = parsed.layers;
          if (parsed.entities) {
            this.engine.entities = [];
            for (const item of parsed.entities) {
              if (item.type === "LINE") this.engine.entities.push(new CadLine(item.x1, item.y1, item.x2, item.y2, item.layer));
              else if (item.type === "CIRCLE") this.engine.entities.push(new CadCircle(item.cx, item.cy, item.r, item.layer));
              else if (item.type === "ARC") this.engine.entities.push(new CadArc(item.cx, item.cy, item.r, item.startAngle, item.endAngle, item.layer));
              else if (item.type === "RECTANGLE") this.engine.entities.push(new CadRectangle(item.x1, item.y1, item.x2, item.y2, item.layer));
              else if (item.type === "HATCH") this.engine.entities.push(new CadHatch(item.points, item.pattern, item.scale, item.angle, item.layer));
              else if (item.type === "CENTERMARK") this.engine.entities.push(new CadCenterMark(item.cx, item.cy, item.r, item.layer));
              else if (item.type === "CENTERLINE") this.engine.entities.push(new CadCenterline(item.x1, item.y1, item.x2, item.y2, item.layer));
              else if (item.type === "MLEADER") this.engine.entities.push(new CadMultiLeader(item.arrowX, item.arrowY, item.elbowX, item.elbowY, item.text, item.layer));
              else if (item.type === "BLOCK") this.engine.entities.push(new CadBlockInstance(item.blockName, item.x, item.y, item.scale, item.rotation, item.attributes, item.layer));
              else if (item.type === "TABLE") this.engine.entities.push(new CadTable(item.x, item.y, item.rows, item.title, item.layer));
              else if (item.type === "DIMENSION") this.engine.entities.push(new CadDimension(item.x1, item.y1, item.x2, item.y2, item.offset, item.layer));
              else if (item.type === "TEXT") this.engine.entities.push(new CadText(item.x, item.y, item.text, item.size, item.layer));
            }
          }
          this.updateLayerDropdown();
          this.engine.render();
          this.commands.zoomExtents();
          this.setPrompt(`Loaded ${this.engine.entities.length} entities into XCAD 2D.`);
        } catch (err) {
          alert("Failed to load XCAD file: " + err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  exportDxf() {
    DxfExporter.export(this.engine, "XCAD_Drawing.dxf");
    this.setPrompt("Exported standard AutoCAD DXF file (XCAD_Drawing.dxf).");
  }

  exportPng() {
    const url = this.engine.canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "XCAD_Drawing_Plot.png";
    a.click();
    this.setPrompt("Plot image exported as XCAD_Drawing_Plot.png.");
  }
}

if (typeof window !== "undefined") {
  window.CadUI = CadUI;
}
