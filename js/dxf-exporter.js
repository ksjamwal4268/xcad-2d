/**
 * Standard AutoCAD DXF (Drawing Exchange Format) Exporter
 * Generates official ASCII DXF format compatible with Autodesk AutoCAD & LibreCAD.
 */

class DxfExporter {
  static export(engine, fileName = "Drawing1.dxf") {
    let dxf = "";

    // Header Section
    dxf += "0\nSECTION\n2\nHEADER\n";
    dxf += "9\n$ACADVER\n1\nAC1015\n"; // AutoCAD 2000 format (maximum compatibility)
    dxf += "9\n$INSUNITS\n70\n4\n"; // Millimeters
    dxf += "0\nENDSEC\n";

    // Tables Section (Layers)
    dxf += "0\nSECTION\n2\nTABLES\n";
    dxf += "0\nTABLE\n2\nLAYER\n70\n" + engine.layers.length + "\n";
    for (const lay of engine.layers) {
      dxf += "0\nLAYER\n2\n" + lay.name + "\n70\n0\n62\n7\n6\nCONTINUOUS\n";
    }
    dxf += "0\nENDTAB\n";
    dxf += "0\nENDSEC\n";

    // Entities Section
    dxf += "0\nSECTION\n2\nENTITIES\n";

    for (const ent of engine.entities) {
      const layer = ent.layer || "0";

      if (ent.type === "LINE") {
        dxf += "0\nLINE\n";
        dxf += "8\n" + layer + "\n";
        dxf += "10\n" + ent.x1.toFixed(4) + "\n";
        dxf += "20\n" + ent.y1.toFixed(4) + "\n";
        dxf += "30\n0.0\n";
        dxf += "11\n" + ent.x2.toFixed(4) + "\n";
        dxf += "21\n" + ent.y2.toFixed(4) + "\n";
        dxf += "31\n0.0\n";
      } else if (ent.type === "CIRCLE") {
        dxf += "0\nCIRCLE\n";
        dxf += "8\n" + layer + "\n";
        dxf += "10\n" + ent.cx.toFixed(4) + "\n";
        dxf += "20\n" + ent.cy.toFixed(4) + "\n";
        dxf += "30\n0.0\n";
        dxf += "40\n" + ent.r.toFixed(4) + "\n";
      } else if (ent.type === "RECTANGLE") {
        // Output as 4 lines
        const lines = [
          { x1: ent.x1, y1: ent.y1, x2: ent.x2, y2: ent.y1 },
          { x1: ent.x2, y1: ent.y1, x2: ent.x2, y2: ent.y2 },
          { x1: ent.x2, y1: ent.y2, x2: ent.x1, y2: ent.y2 },
          { x1: ent.x1, y1: ent.y2, x2: ent.x1, y2: ent.y1 },
        ];
        for (const l of lines) {
          dxf += "0\nLINE\n";
          dxf += "8\n" + layer + "\n";
          dxf += "10\n" + l.x1.toFixed(4) + "\n";
          dxf += "20\n" + l.y1.toFixed(4) + "\n";
          dxf += "30\n0.0\n";
          dxf += "11\n" + l.x2.toFixed(4) + "\n";
          dxf += "21\n" + l.y2.toFixed(4) + "\n";
          dxf += "31\n0.0\n";
        }
      } else if (ent.type === "POLYLINE" && ent.points && ent.points.length > 0) {
        dxf += "0\nLWPOLYLINE\n";
        dxf += "8\n" + layer + "\n";
        dxf += "90\n" + ent.points.length + "\n";
        dxf += "70\n" + (ent.closed ? "1" : "0") + "\n";
        for (const p of ent.points) {
          dxf += "10\n" + p.x.toFixed(4) + "\n";
          dxf += "20\n" + p.y.toFixed(4) + "\n";
        }
      } else if (ent.type === "DIMENSION") {
        dxf += "0\nLINE\n";
        dxf += "8\n" + layer + "\n";
        dxf += "10\n" + ent.x1.toFixed(4) + "\n";
        dxf += "20\n" + ent.y1.toFixed(4) + "\n";
        dxf += "30\n0.0\n";
        dxf += "11\n" + ent.x2.toFixed(4) + "\n";
        dxf += "21\n" + ent.y2.toFixed(4) + "\n";
        dxf += "31\n0.0\n";
      } else if (ent.type === "ARC") {
        dxf += "0\nARC\n";
        dxf += "8\n" + layer + "\n";
        dxf += "10\n" + ent.cx.toFixed(4) + "\n";
        dxf += "20\n" + ent.cy.toFixed(4) + "\n";
        dxf += "30\n0.0\n";
        dxf += "40\n" + ent.r.toFixed(4) + "\n";
        dxf += "50\n" + (ent.startAngle * 180 / Math.PI).toFixed(4) + "\n";
        dxf += "51\n" + (ent.endAngle * 180 / Math.PI).toFixed(4) + "\n";
      } else if (ent.type === "TEXT") {
        dxf += "0\nTEXT\n";
        dxf += "8\n" + layer + "\n";
        dxf += "10\n" + ent.x.toFixed(4) + "\n";
        dxf += "20\n" + ent.y.toFixed(4) + "\n";
        dxf += "30\n0.0\n";
        dxf += "40\n" + (ent.size || 16).toFixed(4) + "\n";
        dxf += "1\n" + (ent.text || "") + "\n";
      } else if (ent.type === "CENTERLINE") {
        dxf += "0\nLINE\n";
        dxf += "8\n" + (ent.layer || "center") + "\n";
        dxf += "6\nCENTER\n";
        dxf += "10\n" + ent.x1.toFixed(4) + "\n";
        dxf += "20\n" + ent.y1.toFixed(4) + "\n";
        dxf += "30\n0.0\n";
        dxf += "11\n" + ent.x2.toFixed(4) + "\n";
        dxf += "21\n" + ent.y2.toFixed(4) + "\n";
        dxf += "31\n0.0\n";
      } else if (ent.type === "CENTERMARK") {
        const arm = ent.r + 10;
        dxf += "0\nLINE\n8\n" + (ent.layer || "center") + "\n6\nCENTER\n";
        dxf += "10\n" + (ent.cx - arm).toFixed(4) + "\n20\n" + ent.cy.toFixed(4) + "\n30\n0.0\n";
        dxf += "11\n" + (ent.cx + arm).toFixed(4) + "\n21\n" + ent.cy.toFixed(4) + "\n31\n0.0\n";
        dxf += "0\nLINE\n8\n" + (ent.layer || "center") + "\n6\nCENTER\n";
        dxf += "10\n" + ent.cx.toFixed(4) + "\n20\n" + (ent.cy - arm).toFixed(4) + "\n30\n0.0\n";
        dxf += "11\n" + ent.cx.toFixed(4) + "\n21\n" + (ent.cy + arm).toFixed(4) + "\n31\n0.0\n";
      } else if (ent.type === "MLEADER") {
        dxf += "0\nLINE\n8\n" + (ent.layer || "text") + "\n";
        dxf += "10\n" + ent.arrowX.toFixed(4) + "\n20\n" + ent.arrowY.toFixed(4) + "\n30\n0.0\n";
        dxf += "11\n" + ent.elbowX.toFixed(4) + "\n21\n" + ent.elbowY.toFixed(4) + "\n31\n0.0\n";
        dxf += "0\nTEXT\n8\n" + (ent.layer || "text") + "\n";
        dxf += "10\n" + (ent.elbowX + 2).toFixed(4) + "\n20\n" + ent.elbowY.toFixed(4) + "\n30\n0.0\n";
        dxf += "40\n14.0\n1\n" + (ent.text || "Note") + "\n";
      } else if (ent.type === "BLOCK") {
        dxf += "0\nINSERT\n8\n" + (ent.layer || "blocks") + "\n";
        dxf += "2\n" + (ent.blockName || "BLOCK") + "\n";
        dxf += "10\n" + ent.x.toFixed(4) + "\n20\n" + ent.y.toFixed(4) + "\n30\n0.0\n";
        dxf += "41\n" + (ent.scale || 1.0).toFixed(4) + "\n";
        dxf += "42\n" + (ent.scale || 1.0).toFixed(4) + "\n";
        dxf += "50\n" + ((ent.rotation || 0) * 180 / Math.PI).toFixed(4) + "\n";
      }
    }

    dxf += "0\nENDSEC\n";
    dxf += "0\nEOF\n";

    // Trigger download
    const blob = new Blob([dxf], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
