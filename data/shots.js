const puppeteer = require("puppeteer-core");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE || "http://localhost:3501";
const OUT = process.env.OUT || "C:/Users/Felipe/AppData/Local/Temp/claude/shots";
const fs = require("fs");

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await puppeteer.launch({ executablePath: EDGE, headless: "new", args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setViewport({ width: 1360, height: 950, deviceScaleFactor: 1 });

  async function shot(name) {
    await p.screenshot({ path: `${OUT}/${name}.png` });
    console.log("saved", name);
  }

  await p.goto(`${BASE}/`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1200));
  await shot("01-home");

  await p.goto(`${BASE}/treino`, { waitUntil: "networkidle2" });
  await p.waitForFunction(() => /come[çc]ar/i.test(document.body.innerText), { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 900));
  await shot("02-setup");

  // math run so the calculator shows
  await p.evaluate(() => {
    [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Matemática").click();
  });
  await new Promise((r) => setTimeout(r, 500));
  await p.evaluate(() => {
    [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Começar").click();
  });
  await p.waitForFunction(() => /respondidas/i.test(document.body.innerText), { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 900));
  await shot("03-question");

  const fab = await p.$(".calc-fab");
  if (fab) {
    await fab.click();
    await p.waitForSelector(".calc-panel");
    await p.type(".calc-panel input", "sqrt(144)+2^5");
    await new Promise((r) => setTimeout(r, 600));
    await shot("04-calculator");
  }

  // answer to show feedback
  await p.evaluate(() => {
    const o = [...document.querySelectorAll("button.opt")].find((x) => !x.disabled);
    if (o) o.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  await shot("05-feedback");

  // run to result
  for (let i = 0; i < 60; i++) {
    if (await p.evaluate(() => /resultado/i.test(document.body.innerText))) break;
    await p.evaluate(() => {
      const o = [...document.querySelectorAll("button.opt")].find((x) => !x.disabled);
      if (o) o.click();
    });
    await new Promise((r) => setTimeout(r, 750));
  }
  await new Promise((r) => setTimeout(r, 1400));
  await shot("06-result");

  await p.goto(`${BASE}/desempenho`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1600));
  await shot("07-desempenho");

  await p.goto(`${BASE}/discursivas`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2200));
  await shot("08-discursivas");

  await p.goto(`${BASE}/redacao`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2600));
  await shot("09-redacao");

  await p.goto(`${BASE}/explorar`, { waitUntil: "networkidle2" });
  await p.waitForFunction(() => /quest(ões|ão) encontrad/i.test(document.body.innerText), { timeout: 20000 });
  await p.type("input", "Machado de Assis");
  await new Promise((r) => setTimeout(r, 1000));
  await shot("10-explorar");

  await b.close();
})();
