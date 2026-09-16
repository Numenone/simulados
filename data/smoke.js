/* End-to-end smoke test: drives the real app in a headless browser. */
const puppeteer = require("puppeteer-core");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = process.env.BASE || "http://localhost:3477";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const bad = [];
  page.on("response", (r) => {
    if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
  });

  // ---- home
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
  check("home renders", (await page.$eval("h1", (e) => e.textContent)).includes("UFPR"));

  // ---- treino: filter, start, answer, auto-advance
  await page.goto(`${BASE}/treino`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => /quest(ões|ão) dispon/i.test(document.body.innerText), {
    timeout: 20000,
  });
  const availAll = await page.evaluate(() => {
    const m = document.body.innerText.match(/(\d+)\s+questões disponíveis/);
    return m ? Number(m[1]) : -1;
  });
  check("dataset loaded in UI", availAll > 700, `${availAll} disponíveis (padrão: inglês nas LE)`);

  // pick a single subject
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Biologia");
    b.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  const availBio = await page.evaluate(() => {
    const m = document.body.innerText.match(/(\d+)\s+quest(ões|ão) dispon/);
    return m ? Number(m[1]) : -1;
  });
  check("subject filter narrows pool", availBio > 0 && availBio < availAll, `Biologia: ${availBio}`);

  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Começar").click();
  });
  await page.waitForFunction(() => /respondidas/i.test(document.body.innerText), { timeout: 15000 });
  check("runner started", true);

  const firstQ = await page.evaluate(() => document.body.innerText.slice(0, 400));
  check("question shown with subject tag", /Biologia/.test(firstQ));

  // answer via keyboard
  await page.keyboard.press("a");
  await page.waitForFunction(
    () => /Acertou|Errou/.test(document.body.innerText),
    { timeout: 8000 }
  );
  check("instant feedback appears", true);

  const idxBefore = await page.evaluate(() => {
    const m = document.body.innerText.match(/(\d+)\s*\/\s*(\d+)/);
    return m ? Number(m[1]) : -1;
  });
  await new Promise((r) => setTimeout(r, 1800));
  const idxAfter = await page.evaluate(() => {
    const m = document.body.innerText.match(/(\d+)\s*\/\s*(\d+)/);
    return m ? Number(m[1]) : -1;
  });
  check("auto-advance moves to next question", idxAfter === idxBefore + 1, `${idxBefore} -> ${idxAfter}`);

  // answer the rest quickly to reach the result screen
  for (let i = 0; i < 60; i++) {
    const done = await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Novo treino"));
    if (done) break;
    const clicked = await page.evaluate(() => {
      const btns = [...document.querySelectorAll("button.opt")];
      if (!btns.length || btns.some((b) => b.disabled)) return false;
      btns[0].click();
      return true;
    });
    await new Promise((r) => setTimeout(r, clicked ? 1150 : 400));
  }
  const gotResult = await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Novo treino"));
  check("reaches result screen", gotResult);
  if (gotResult) {
    await new Promise((r) => setTimeout(r, 1200));
    const res = await page.evaluate(() => ({
      pct: /\d+%/.test(document.body.innerText),
      bars: document.querySelectorAll(".bar-fill").length,
      grid: document.querySelectorAll('div[class*="grid-cols-10"] button, div[class*="grid-cols-6"] button').length,
    }));
    check(
      "result shows score and per-subject breakdown",
      res.pct && res.bars > 0,
      `barras=${res.bars}, grade=${res.grid}`
    );
  }

  // ---- desempenho picks up the attempts
  await page.goto(`${BASE}/desempenho`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1200));
  const perf = await page.evaluate(() => document.body.innerText);
  check("desempenho records history", /aproveitamento geral/i.test(perf), perf.slice(0, 60).replace(/\n/g, " "));

  // ---- explorar search
  await page.goto(`${BASE}/explorar`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => /quest(ões|ão) encontrad/i.test(document.body.innerText), {
    timeout: 20000,
  });
  await page.type("input", "fotossíntese");
  await new Promise((r) => setTimeout(r, 900));
  const found = await page.evaluate(() => {
    const m = document.body.innerText.match(/(\d+)\s+quest(ões encontradas|ão encontrada)/);
    return m ? Number(m[1]) : -1;
  });
  check("search returns hits", found > 0, `${found} para "fotossíntese"`);

  const firstHref = await page.evaluate(() => {
    const a = document.querySelector('a[href^="/questao/"]');
    return a ? a.getAttribute("href") : null;
  });
  check("search results link to questions", !!firstHref, firstHref || "");

  // ---- single question page
  if (firstHref) {
    await page.goto(BASE + firstHref, { waitUntil: "networkidle2" });
    await page.waitForFunction(() => /revelar gabarito/i.test(document.body.innerText), {
      timeout: 15000,
    });
    await page.evaluate(() => {
      [...document.querySelectorAll("button")]
        .find((x) => x.textContent.includes("Revelar gabarito"))
        .click();
    });
    await new Promise((r) => setTimeout(r, 400));
    check(
      "question page reveals official answer",
      await page.evaluate(() => /Gabarito oficial/.test(document.body.innerText))
    );
  }

  // ---- discursivas
  await page.goto(`${BASE}/discursivas`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => /sua resposta/i.test(document.body.innerText), { timeout: 20000 });
  const dImg = await page.evaluate(() => {
    const i = document.querySelector('img[src^="/d/"]');
    return i ? { src: i.getAttribute("src"), w: i.naturalWidth } : null;
  });
  check("discursiva renders original image", !!dImg && dImg.w > 0, dImg ? `${dImg.src} (${dImg.w}px)` : "none");
  await page.type("textarea", "resposta de teste");
  await new Promise((r) => setTimeout(r, 300));
  check(
    "discursiva counts words",
    await page.evaluate(() => /palavras/.test(document.body.innerText))
  );

  // ---- redação
  await page.goto(`${BASE}/redacao`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => /caderno original/i.test(document.body.innerText), {
    timeout: 20000,
  });
  const rImg = await page.evaluate(() => {
    const i = document.querySelector('img[src^="/r/"]');
    return i ? { src: i.getAttribute("src"), w: i.naturalWidth } : null;
  });
  check("redação renders exam pages", !!rImg && rImg.w > 0, rImg ? `${rImg.src} (${rImg.w}px)` : "none");
  const hasTa = await page.$("textarea");
  if (hasTa) {
    await page.type("textarea", "x".repeat(200));
    await new Promise((r) => setTimeout(r, 300));
    check(
      "redação counts lines against the limit",
      await page.evaluate(() => /linhas?\s*\/?\s*\d*/.test(document.body.innerText))
    );
  }

  // ---- simulado: no spoilers mid-run
  await page.goto(`${BASE}/simulado`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => /come[çc]ar/i.test(document.body.innerText), { timeout: 20000 });
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Começar").click();
  });
  await page.waitForFunction(() => /respondidas/i.test(document.body.innerText), { timeout: 15000 });
  await page.keyboard.press("a");
  await new Promise((r) => setTimeout(r, 700));
  check(
    "simulado hides the answer during the run",
    await page.evaluate(() => {
      const opts = [...document.querySelectorAll("button.opt")];
      const marked = opts.filter((o) => /anim-(ok|bad)/.test(o.className)).length;
      const panel = [...document.querySelectorAll("p")].some((p) =>
        /^(✓ Acertou|✗ Errou)/.test(p.textContent.trim())
      );
      return marked === 0 && !panel;
    })
  );

  // ---- calculator on a maths question
  await page.goto(`${BASE}/treino`, { waitUntil: "networkidle2" });
  await page.waitForFunction(() => /mat[ée]rias/i.test(document.body.innerText), { timeout: 20000 });
  await page.evaluate(() => {
    document.querySelectorAll('button[data-on="true"]').forEach((b) => {
      if (b.textContent.trim() === "Biologia") b.click();
    });
    [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Matemática").click();
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Começar").click();
  });
  await page.waitForFunction(() => /respondidas/i.test(document.body.innerText), { timeout: 15000 });
  const fab = await page.$(".calc-fab");
  check("calculator button shows on maths questions", !!fab);
  if (fab) {
    await fab.click();
    await page.waitForSelector(".calc-panel", { timeout: 5000 });
    await page.type(".calc-panel input", "2+3*4");
    await new Promise((r) => setTimeout(r, 300));
    const live = await page.evaluate(() => document.querySelector(".calc-panel").innerText);
    check("calculator evaluates live", /=\s*14/.test(live), live.slice(0, 90));
    await page.evaluate(() => {
      const i = document.querySelector(".calc-panel input");
      i.value = "";
      i.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.type(".calc-panel input", "sqrt(16)+sin(30)");
    await new Promise((r) => setTimeout(r, 300));
    const live2 = await page.evaluate(() => document.querySelector(".calc-panel").innerText);
    check("calculator handles functions in degrees", /=\s*4\.5/.test(live2), live2.slice(0, 90));
    // answering still works while the calculator is open
    await page.evaluate(() => document.querySelectorAll("button.opt")[0].click());
    await new Promise((r) => setTimeout(r, 400));
    check(
      "can still answer with the calculator open",
      await page.evaluate(() => /Acertou|Errou/.test(document.body.innerText))
    );
  }

  check("no 4xx/5xx responses", bad.length === 0, bad.slice(0, 5).join(" | "));
  const realErrors = errors.filter((e) => !/favicon|Download the React DevTools/i.test(e));
  check("no console/page errors", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error("SMOKE CRASHED:", e);
  process.exit(2);
});
