import fs from "node:fs";
import path from "node:path";
export default {
  name: "poscig-baseline", clients: ["gm"], fixture: "poscig",
  async run(t) {
    await t.gm.send("Page.bringToFront");
    await t.gm.eval(() => { document.querySelector('.tour [data-action="exit"]')?.click(); canvas.pan({x:1400,y:900,scale:.52}); });
    await t.screenshot("gm", "before");
    const r = await t.gm.eval(async () => {
      const {measure}=await import('/agent-e2e/poscig-performance.mjs');
      return measure();
    });
    fs.writeFileSync(path.join(t.run.dir, "baseline.json"), JSON.stringify(r,null,2));
    t.log(JSON.stringify(r));
    t.assert(r.fps > 0 && r.frames > 100, "baseline did not sample rendered canvas frames", r);
  }
};
