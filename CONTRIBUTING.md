# Contributing to XCAD 2D

Thank you for your interest in contributing to **XCAD 2D**! We welcome community contributions, bug reports, CAD command additions, and improvements to engineering graphics algorithms.

---

## 🛠️ Development Setup

XCAD 2D is intentionally built with **zero external dependencies** and requires **no build step**.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/xcad-2d.git
   cd xcad-2d
   ```

2. **Run locally:**
   - Simply double-click `index.html` in any web browser, **OR**
   - Run a lightweight HTTP server:
     ```bash
     npx serve .
     ```

3. **Run the Automated Test Suite:**
   Ensure Node.js (v18+) is installed, then run:
   ```bash
   npm test
   ```
   This executes the 20-cycle automated verification suite covering all 31 feature suites (840 assertions).

---

## 📐 Architecture Overview

- **`index.html`**: Main UI markup, ribbon panels, command prompt, status bar, and canvas viewport.
- **`css/cad.css`**: AutoCAD Dark Theme styling, HUD overlays, responsive layout.
- **`js/cad-engine.js`**: HTML5 Canvas 2D rendering pipeline, coordinate transforms (`worldToScreen`, `screenToWorld`), object snapping (OSNAP), pan/zoom matrix, and entity registry.
- **`js/cad-commands.js`**: Interactive command-line parser, prompt state engine, dynamic input, and shortcut router.
- **`js/cad-ui.js`**: Ribbon interactions, layer manager modal, quick properties inspector, and file dialogs.
- **`js/xcad-engineering-graphics.js`**: Mathematical procedural generators for curves (Cycloid, Involute, Spiral, Helix), Plain/Diagonal scales, and 1st/3rd angle orthographic projections.
- **`js/dxf-exporter.js`**: AutoCAD 2026 Release ASCII DXF vector serialization.
- **`js/xcad-smart-blocks.js`**: Predictive block placement and instance pattern search.
- **`js/xcad-lisp.js`**: In-browser AutoLISP / Visual LISP expression evaluator.

---

## 🤝 How to Add a New CAD Command

1. Open `js/cad-commands.js`.
2. Add your command and aliases to `switch (upper)` in `execute(cmdText)`.
3. Add prompt guidance in `startCommand(cmdName)`.
4. Implement coordinate handling in `handlePointInput(x, y)` or dedicated execution method.
5. Add test coverage in `test-runner-2d.js` and verify with `npm test`.
6. Submit a Pull Request!

---

## 📜 Pull Request Guidelines

- Ensure `npm test` passes with **0 failures**.
- Keep code clean, readable, and well-commented.
- Maintain zero-dependency client architecture (vanilla ES6 JavaScript only).
