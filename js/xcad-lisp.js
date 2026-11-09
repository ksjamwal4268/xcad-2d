/**
 * XCAD 2D - AutoLISP & Script Automation Engine
 * Implements:
 * 1. S-Expression Parser & Evaluator
 * 2. Standard AutoLISP Primitive Functions: command, setq, defun, princ, alert, distance, angle, polar, car, cadr, caddr
 * 3. Interactive Visual LISP Console & Script Runner
 */

class XcadLisp {
  constructor(engine, ui) {
    this.engine = engine;
    this.ui = ui;
    this.environment = new Map();
    this.initDefaultEnv();
  }

  initDefaultEnv() {
    // Math functions
    this.environment.set("+", (...args) => args.reduce((a, b) => a + b, 0));
    this.environment.set("-", (a, ...rest) => rest.length === 0 ? -a : rest.reduce((acc, b) => acc - b, a));
    this.environment.set("*", (...args) => args.reduce((a, b) => a * b, 1));
    this.environment.set("/", (a, b) => a / b);
    this.environment.set("SQRT", Math.sqrt);
    this.environment.set("SIN", Math.sin);
    this.environment.set("COS", Math.cos);
    this.environment.set("ATAN", Math.atan);
    this.environment.set("PI", Math.PI);

    // List functions
    this.environment.set("LIST", (...args) => args);
    this.environment.set("CAR", list => Array.isArray(list) ? list[0] : null);
    this.environment.set("CADR", list => Array.isArray(list) ? list[1] : null);
    this.environment.set("CADDR", list => Array.isArray(list) ? list[2] : null);
    this.environment.set("CDR", list => Array.isArray(list) ? list.slice(1) : []);

    // CAD Geometry primitives
    this.environment.set("DISTANCE", (pt1, pt2) => Math.hypot(pt2[0] - pt1[0], pt2[1] - pt1[1]));
    this.environment.set("ANGLE", (pt1, pt2) => Math.atan2(pt2[1] - pt1[1], pt2[0] - pt1[0]));
    this.environment.set("POLAR", (pt, ang, dist) => [pt[0] + dist * Math.cos(ang), pt[1] + dist * Math.sin(ang)]);

    // I/O & Commands
    this.environment.set("ALERT", msg => alert(msg));
    this.environment.set("PRINC", msg => {
      this.logOutput(String(msg));
      return msg;
    });

    // Core CAD Command execution via Lisp: (command "LINE" '(0 0) '(100 100) "")
    this.environment.set("COMMAND", (...args) => {
      this.executeCommandSequence(args);
      return "T";
    });
  }

  executeCommandSequence(args) {
    if (!args.length) return;
    const cmd = String(args[0]).toUpperCase();

    if (cmd === "LINE" && args.length >= 3) {
      const p1 = args[1];
      const p2 = args[2];
      if (Array.isArray(p1) && Array.isArray(p2)) {
        this.engine.entities.push(new CadLine(p1[0], p1[1], p2[0], p2[1]));
        this.engine.render();
      }
    } else if (cmd === "CIRCLE" && args.length >= 3) {
      const c = args[1];
      const r = parseFloat(args[2]);
      if (Array.isArray(c)) {
        this.engine.entities.push(new CadCircle(c[0], c[1], r));
        this.engine.render();
      }
    } else if (cmd === "RECTANGLE" && args.length >= 3) {
      const p1 = args[1];
      const p2 = args[2];
      if (Array.isArray(p1) && Array.isArray(p2)) {
        this.engine.entities.push(new CadRectangle(p1[0], p1[1], p2[0], p2[1]));
        this.engine.render();
      }
    } else if (cmd === "ZOOM") {
      this.ui.commands.zoomExtents();
    }
  }

  tokenize(code) {
    return code
      .replace(/;.*$/gm, "") // Strip comments
      .replace(/'\(/g, " ( quote ")
      .replace(/\(/g, " ( ")
      .replace(/\)/g, " ) ")
      .trim()
      .split(/\s+/)
      .filter(t => t.length > 0);
  }

  parse(tokens) {
    if (tokens.length === 0) return null;
    const token = tokens.shift();

    if (token === "(") {
      const list = [];
      while (tokens.length > 0 && tokens[0] !== ")") {
        list.push(this.parse(tokens));
      }
      tokens.shift(); // Remove ')'
      return list;
    } else if (token === ")") {
      throw new Error("Unexpected ')'");
    } else {
      // Numbers, Strings, or Identifiers
      if (!isNaN(token)) return Number(token);
      if (token.startsWith('"') && token.endsWith('"')) return token.slice(1, -1);
      return token;
    }
  }

  eval(ast) {
    if (ast === null || ast === undefined) return null;

    // Atom: Number
    if (typeof ast === "number") return ast;

    // Atom: String or Symbol
    if (typeof ast === "string") {
      const upper = ast.toUpperCase();
      if (this.environment.has(upper)) return this.environment.get(upper);
      return ast;
    }

    // List: Function call or Special Form
    if (Array.isArray(ast)) {
      if (ast.length === 0) return [];
      const first = ast[0];

      // Special form: QUOTE
      if (typeof first === "string" && first.toUpperCase() === "QUOTE") {
        return ast[1];
      }

      // Special form: SETQ
      if (typeof first === "string" && first.toUpperCase() === "SETQ") {
        const varName = ast[1].toUpperCase();
        const val = this.eval(ast[2]);
        this.environment.set(varName, val);
        return val;
      }

      // Special form: DEFUN
      if (typeof first === "string" && first.toUpperCase() === "DEFUN") {
        const fnName = ast[1].toUpperCase();
        const fnParams = ast[2];
        const fnBody = ast.slice(3);

        const customFn = (...args) => {
          const oldVals = new Map();
          fnParams.forEach((param, i) => {
            const pUpper = param.toUpperCase();
            oldVals.set(pUpper, this.environment.get(pUpper));
            this.environment.set(pUpper, args[i]);
          });

          let result = null;
          for (const expr of fnBody) {
            result = this.eval(expr);
          }

          // Restore scope
          oldVals.forEach((val, key) => {
            if (val !== undefined) this.environment.set(key, val);
            else this.environment.delete(key);
          });
          return result;
        };

        this.environment.set(fnName, customFn);
        return fnName;
      }

      // Evaluate function call
      const fn = this.eval(first);
      if (typeof fn === "function") {
        const evaluatedArgs = ast.slice(1).map(arg => this.eval(arg));
        return fn(...evaluatedArgs);
      } else {
        throw new Error(`Invalid function call: "${first}" is not a function.`);
      }
    }

    return ast;
  }

  run(code) {
    try {
      const tokens = this.tokenize(code);
      let lastResult = null;
      while (tokens.length > 0) {
        const ast = this.parse(tokens);
        lastResult = this.eval(ast);
      }
      return lastResult;
    } catch (err) {
      this.logOutput(`[AutoLISP Error] ${err.message}`);
      return null;
    }
  }

  logOutput(text) {
    const consoleLog = document.getElementById("lisp-output");
    if (consoleLog) {
      const p = document.createElement("div");
      p.innerText = text;
      consoleLog.appendChild(p);
      consoleLog.scrollTop = consoleLog.scrollHeight;
    }
    this.ui.logCommand(`LISP >> ${text}`);
  }
}
