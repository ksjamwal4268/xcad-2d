# 📐 XCAD 2D — Browser-Based Computer-Aided Design

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vanilla JavaScript](https://img.shields.io/badge/JavaScript-Vanilla%20ES6-yellow.svg)](js/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen.svg)]()
[![Automated Tests](https://img.shields.io/badge/Tests-840%20Passed%20(100%25)-success.svg)](test-runner-2d.js)
[![AutoCAD 2026 Compatible](https://img.shields.io/badge/AutoCAD-2026%20Shortcuts-red.svg)]()

> A lightweight, offline-first, zero-dependency 2D CAD drafting application engineered in pure HTML5 Canvas and Vanilla JavaScript. Built to provide authentic AutoCAD keyboard workflows, precision drafting tools, mathematical curve generation, and an automated syllabus engine for **Engineering Drawing with CAD (BMET21)**.

---

## 🚀 Live Demo

Run XCAD 2D directly in your browser with zero setup:  
👉 **[Launch XCAD 2D Online](https://ksjamwal4268.github.io/xcad-2d/)** *(Live on GitHub Pages)*

Or run locally by double-clicking `index.html`.

---

## ✨ Key Features

- **⚡ 100% Client-Side & Zero Setup:** Pure HTML5 Canvas + Vanilla ES6 JS. No Webpack, no npm install, no CORS, and zero server requirements.
- **⌨️ Authentic AutoCAD Command Line & Dynamic Input:**
  - Standard command shortcuts and aliases (`L`, `C`, `REC`, `PL`, `POL`, `EL`, `SPL`, `TR`, `EX`, `DIM`, `PU`, `X`, `J`, `O`, `RO`, `SC`, `MI`, etc.).
  - Spacebar or Enter repeats previous command or commits coordinates.
  - Absolute (`x,y`), Relative (`@dx,dy`), and Polar (`dist<angle`) coordinate entry.
  - Direct Distance Entry (type a number in the direction of your cursor).
- **🎯 Precision Snapping (OSNAP) & Tracking:**
  - Automatic snapping: Endpoint, Midpoint, Center, Quadrant, Intersection, Perpendicular, and Node.
  - Status bar toggles: Ortho Mode (`F8`), Snap (`F9`), Polar Tracking (`F10`), Fullscreen Clean Screen (`F11`), and Dynamic Input HUD (`F12`).
- **📏 Smart Annotation & Dimensions:**
  - Linear (`DLI`), Aligned (`DAL`), Radius (`DRA`), Diameter (`DDI`), Angular (`DAN`), Baseline (`DBA`), and Continue (`DCO`) dimensioning.
  - Aligned and Unidirectional dimensioning systems (ISO / BIS SP 46 standards).
  - Multi-Leaders (`MLEADER`), Single-Stroke Lettering (`LETTERING`), Center Marks (`CM`), and Centerlines (`CL`).
- **🎨 Layer Management & Visual Controls:**
  - Multi-layer support with color coding, visibility toggles, and lock states.
  - Quick Measure (`QM`) neon HUD for instant real-time distances and angle inspection.
  - Trace Review Mode and DWG Compare visual diff overlay.
- **🧩 Smart Blocks & AutoLISP Interpretation:**
  - Block definition (`BLOCK`) and predictive insertion (`INSERT`).
  - Native in-canvas AutoLISP / Visual LISP console (`LISP`) executing mathematical expressions directly.
- **💾 Industry Standard Export:**
  - Direct 1-click export to **AutoCAD 2026 Release ASCII DXF (`.dxf`)**, compatible with Autodesk AutoCAD, LibreCAD, and CNC slicers.

---

## 📚 Built-in Engineering Drawing Curriculum (BMET21)

XCAD 2D includes an automated procedural geometry generator designed for university engineering graphics courses:

| Curriculum Unit | Module | Command | Procedural Output |
| :--- | :--- | :--- | :--- |
| **Unit I** | Engineering Curves | `CYCLOID` | Rolling generating circle with cycloidal locus path |
| | Circle Involute | `INVOLUTE` | Involute unwinding curve with tangent chord projections |
| | Spirals | `SPIRAL` | Archimedean Spiral ($r = a + b\theta$) with multi-turn polar loci |
| | 2D Helices | `HELIX` | Projected 2D cylindrical helix with pitch divisions |
| | Plain Scales | `SCALEPLAIN` | Representative Fraction ($RF\ 1:50$), reads meters and decimeters |
| | Diagonal Scales | `SCALEDIAGONAL`| Diagonal scale ($RF\ 1:40$), reads meters, decimeters & centimeters |
| **Unit II** | Point Projections | `PROJPOINT` | 4-Quadrant projections relative to Horizontal (HP) and Vertical (VP) planes |
| | Line Projections | `PROJLINE` | Straight line $AB$ inclined to HP & VP, with True Length, Apparent Lengths & Traces |
| | Plane Projections | `PROJPLANE` | Planes inclined to HP & VP (Hexagonal lamina at $45^\circ$) via Rotation Method |
| **Unit III**| Solid Projections | `PROJSOLID` | Prisms and pyramids inclined to reference planes |
| | Section of Solids | `SECTIONSOLID` | Sliced cylinder/prism with Cutting Plane (V.T.), Sectional View & True Shape |
| | Surface Developments | `DEVCYLINDER` | Parallel-line stretch-out development of cylindrical ducts ($\pi D$) |
| | Conical Developments | `DEVCONE` | Radial-line sector development with calculated subtended angle $\theta$ |
| | Transition Pieces | `DEVTRANSITION`| Surface development of rectangular-to-round duct adapters |
| **Unit IV** | Orthographic 3-Views | `ORTHOPROJ` | Front Elevation, Top Plan, and Side Profile with fold lines ($XY$, $X_1Y_1$) |
| | Projection Angle | `TOGGLEANGLE` | Toggle between **1st Angle (ISO/BIS)** and **3rd Angle (ANSI/US)** |

---

## ⌨️ Command Reference & Aliases

| Command | Aliases | Description |
| :--- | :--- | :--- |
| `LINE` | `L` | Draws straight line segments with endpoint chaining |
| `CIRCLE` | `C` | Creates center-radius or center-diameter circles |
| `ARC` | `A` | 3-point arc construction |
| `RECTANGLE`| `REC`, `RECTANG` | Creates 2-point rectangular polylines |
| `POLYLINE` | `PL`, `PLINE` | Continuous multi-segment polyline with Close (`C`) |
| `POLYGON` | `POL` | Regular inscribed/circumscribed polygons |
| `ELLIPSE` | `EL` | Parametric ellipse with axis grips |
| `SPLINE` | `SPL` | Smooth NURBS curve through fit points |
| `POINT` | `PO`, `PT` | Crosshair node markers |
| `DONUT` | `DO` | Concentric circular rings |
| `XLINE` | `XL`, `RAY` | Infinite construction guide lines |
| `HATCH` | `H`, `BHATCH` | Boundary crosshatching with custom scale and angle |
| `MOVE` | `M` | Translates selected geometry by displacement vector |
| `COPY` | `CO`, `CP` | Duplicates geometry to new coordinate locations |
| `ROTATE` | `RO` | Rotates entities around a base point by angle |
| `SCALE` | `SC` | Scales entities uniformly by factor |
| `MIRROR` | `MI` | Reflects geometry across a mirror axis |
| `FILLET` | `F` | Rounds intersection corners with custom radius |
| `CHAMFER` | `CHA` | Bevels sharp corners with distance offsets |
| `DIVIDE` | `DIV` | Divides lines or curves into equal segments |
| `MATCHPROP`| `MA` | Copies layer and line properties between objects |
| `PURGE` | `PU` | Cleans unreferenced layers and unused blocks |
| `TRIM` | `TR` | Quick-mode edge trimming (Hold Shift to Extend) |
| `EXTEND` | `EX` | Quick-mode line extending (Hold Shift to Trim) |
| `JOIN` | `J` | Merges touching line segments into a single polyline |
| `EXPLODE` | `X` | Decomposes blocks and polylines into individual lines |
| `UNDO` | `U`, `Ctrl+Z` | Undo previous action with unlimited history stack |
| `REDO` | `Ctrl+Y` | Redoes previous undone action |
| `ZOOM` | `Z` | Zoom Extents, Zoom In, Zoom Out |
| `PAN` | `P` | Dynamic canvas panning (or click-drag Middle Mouse Wheel) |
| `DXF` | `EXPORTDXF` | Generates and downloads AutoCAD 2026 ASCII DXF |

---

## 🧪 Automated Testing Suite

XCAD 2D includes an automated Node.js verification harness:

```bash
# Run 20 cycles across 31 feature suites (840 assertions)
npm test
```

### Verification Highlights:
- **840 / 840 Passed (100% Success Rate)**
- Full coverage across Drawing, Modify, Curves, Scales, Projections, Booleans, DXF generation, and Undo/Redo integrity.

---

## 🛠️ Project Structure

```text
xcad-2d/
├── index.html                  # Main application interface
├── css/
│   └── cad.css                 # Dark theme CAD styling & UI layout
├── js/
│   ├── cad-engine.js           # Canvas 2D engine, coordinate system, OSNAP
│   ├── cad-commands.js         # Command line interpreter & prompt router
│   ├── cad-ui.js               # Ribbon panels, layer manager, inspector
│   ├── xcad-engineering-graphics.js # BMET21 mathematical curve & projection engine
│   ├── dxf-exporter.js         # AutoCAD 2026 ASCII DXF exporter
│   ├── xcad-smart-blocks.js    # Smart Block pattern recognition
│   ├── xcad-lisp.js            # AutoLISP interpreter
│   ├── xcad-templates.js       # Architectural & mechanical sample templates
│   └── xcad-gis-map.js         # GIS basemap coordinates overlay
├── test-runner-2d.js           # 20-cycle automated test suite
├── package.json                # Project metadata & npm test script
├── LICENSE                     # MIT Open Source License
└── README.md                   # Project documentation
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details. Free for academic, personal, and commercial use.
