const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223");
  const context = browser.contexts()[0];
  const page = context.pages().find((p) => p.url().includes("44.213.63.39"));
  await page.bringToFront();
  console.log("viewport", await page.viewportSize());
  console.log("url", page.url());
  console.log(
    "frames",
    page.frames().map((frame) => ({
      name: frame.name(),
      url: frame.url(),
    }))
  );
  console.log(
    await page.evaluate(() =>
      Array.from(document.querySelectorAll("button,a,input,div,span"))
        .slice(0, 300)
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            cls: el.className,
            id: el.id,
            text: (el.innerText || el.value || el.getAttribute("aria-label") || "")
              .trim()
              .slice(0, 60),
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          };
        })
        .filter((x) => x.text || /close|modal|dialog|lightbox|fancybox/i.test(`${x.cls} ${x.id}`))
    )
  );
  process.exit(0);
})();
