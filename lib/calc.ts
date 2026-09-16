/**
 * Small safe expression evaluator (shunting-yard -> RPN).
 * No eval/Function: input comes from a calculator keypad and the user.
 */

export type AngleMode = "deg" | "rad";

type Tok =
  | { t: "num"; v: number }
  | { t: "op"; v: string }
  | { t: "fn"; v: string }
  | { t: "lp" }
  | { t: "rp" }
  | { t: "sep" };

const FUNCS = new Set([
  "sin", "cos", "tan", "asin", "acos", "atan",
  "sinh", "cosh", "tanh",
  "ln", "log", "log2", "sqrt", "cbrt", "abs", "exp",
  "round", "floor", "ceil", "sign",
]);

const CONSTS: Record<string, number> = {
  pi: Math.PI,
  "π": Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
};

const PREC: Record<string, number> = {
  "+": 1, "-": 1,
  "*": 2, "/": 2, "%": 2,
  "^": 4,
  "u-": 5,
};
const RIGHT = new Set(["^", "u-"]);

function tokenize(src: string, ans: number): Tok[] {
  const s = src
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/,/g, ".")
    .replace(/√/g, "sqrt");
  const out: Tok[] = [];
  let i = 0;
  const prev = () => out[out.length - 1];

  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t") { i++; continue; }

    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      // scientific notation: 1e-3
      if (s[j] === "e" && /[0-9+\-]/.test(s[j + 1] ?? "") && /[0-9.]/.test(s[j - 1] ?? "")) {
        j++;
        if (s[j] === "+" || s[j] === "-") j++;
        while (j < s.length && /[0-9]/.test(s[j])) j++;
      }
      const raw = s.slice(i, j);
      const v = Number(raw);
      if (!Number.isFinite(v)) throw new Error("número inválido: " + raw);
      out.push({ t: "num", v });
      i = j;
      continue;
    }

    if (/[a-zA-Zπ]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z0-9π]/.test(s[j])) j++;
      const word = s.slice(i, j).toLowerCase();
      if (FUNCS.has(word)) out.push({ t: "fn", v: word });
      else if (word === "ans") out.push({ t: "num", v: ans });
      else if (word in CONSTS) out.push({ t: "num", v: CONSTS[word] });
      else throw new Error("não reconheço “" + word + "”");
      i = j;
      continue;
    }

    if (c === "(") { out.push({ t: "lp" }); i++; continue; }
    if (c === ")") { out.push({ t: "rp" }); i++; continue; }
    if (c === "!") { out.push({ t: "op", v: "!" }); i++; continue; }

    if ("+-*/^%".includes(c)) {
      const p = prev();
      const unary =
        c === "-" && (!p || p.t === "op" || p.t === "lp" || p.t === "sep");
      out.push({ t: "op", v: unary ? "u-" : c });
      i++;
      continue;
    }

    throw new Error("caractere inválido: " + c);
  }
  return out;
}

function toRPN(toks: Tok[]): Tok[] {
  const out: Tok[] = [];
  const stack: Tok[] = [];
  for (const tk of toks) {
    if (tk.t === "num") out.push(tk);
    else if (tk.t === "fn") stack.push(tk);
    else if (tk.t === "op") {
      if (tk.v === "!") { out.push(tk); continue; }
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.t === "fn") { out.push(stack.pop()!); continue; }
        if (top.t === "op") {
          const a = PREC[tk.v], b = PREC[top.v];
          if (b > a || (b === a && !RIGHT.has(tk.v))) { out.push(stack.pop()!); continue; }
        }
        break;
      }
      stack.push(tk);
    } else if (tk.t === "lp") stack.push(tk);
    else if (tk.t === "rp") {
      let found = false;
      while (stack.length) {
        const top = stack.pop()!;
        if (top.t === "lp") { found = true; break; }
        out.push(top);
      }
      if (!found) throw new Error("parêntese sem abertura");
      if (stack.length && stack[stack.length - 1].t === "fn") out.push(stack.pop()!);
    }
  }
  while (stack.length) {
    const top = stack.pop()!;
    if (top.t === "lp") throw new Error("parêntese não fechado");
    out.push(top);
  }
  return out;
}

function fact(n: number): number {
  if (n < 0 || !Number.isInteger(n)) throw new Error("fatorial só de inteiro ≥ 0");
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function applyFn(name: string, x: number, mode: AngleMode): number {
  const toRad = (v: number) => (mode === "deg" ? (v * Math.PI) / 180 : v);
  const fromRad = (v: number) => (mode === "deg" ? (v * 180) / Math.PI : v);
  switch (name) {
    case "sin": return Math.sin(toRad(x));
    case "cos": return Math.cos(toRad(x));
    case "tan": return Math.tan(toRad(x));
    case "asin": return fromRad(Math.asin(x));
    case "acos": return fromRad(Math.acos(x));
    case "atan": return fromRad(Math.atan(x));
    case "sinh": return Math.sinh(x);
    case "cosh": return Math.cosh(x);
    case "tanh": return Math.tanh(x);
    case "ln": return Math.log(x);
    case "log": return Math.log10(x);
    case "log2": return Math.log2(x);
    case "sqrt": return Math.sqrt(x);
    case "cbrt": return Math.cbrt(x);
    case "abs": return Math.abs(x);
    case "exp": return Math.exp(x);
    case "round": return Math.round(x);
    case "floor": return Math.floor(x);
    case "ceil": return Math.ceil(x);
    case "sign": return Math.sign(x);
    default: throw new Error("função desconhecida: " + name);
  }
}

export function evaluate(expr: string, mode: AngleMode = "deg", ans = 0): number {
  if (!expr.trim()) return 0;
  const rpn = toRPN(tokenize(expr, ans));
  const st: number[] = [];
  for (const tk of rpn) {
    if (tk.t === "num") st.push(tk.v);
    else if (tk.t === "fn") {
      if (!st.length) throw new Error("falta argumento");
      st.push(applyFn(tk.v, st.pop()!, mode));
    } else if (tk.t === "op") {
      if (tk.v === "u-") {
        if (!st.length) throw new Error("expressão incompleta");
        st.push(-st.pop()!);
        continue;
      }
      if (tk.v === "!") {
        if (!st.length) throw new Error("expressão incompleta");
        st.push(fact(st.pop()!));
        continue;
      }
      if (st.length < 2) throw new Error("expressão incompleta");
      const b = st.pop()!, a = st.pop()!;
      switch (tk.v) {
        case "+": st.push(a + b); break;
        case "-": st.push(a - b); break;
        case "*": st.push(a * b); break;
        case "/": st.push(a / b); break;
        case "%": st.push(a % b); break;
        case "^": st.push(Math.pow(a, b)); break;
        default: throw new Error("operador desconhecido");
      }
    }
  }
  if (st.length !== 1) throw new Error("expressão incompleta");
  const r = st[0];
  if (!Number.isFinite(r)) {
    if (Number.isNaN(r)) throw new Error("resultado indefinido");
    return r;
  }
  return r;
}

export function formatResult(n: number): string {
  if (!Number.isFinite(n)) return n > 0 ? "∞" : "-∞";
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e12)) return n.toExponential(8).replace(/\.?0+e/, "e");
  return String(Number(n.toPrecision(12)));
}
