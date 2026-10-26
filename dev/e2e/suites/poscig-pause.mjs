/** Global pause freezes chase rendering on every client and resumes without lost time. */
export default {
  name: "poscig-pause", clients: ["gm", "Gracz 1"], fixture: "poscig",
  async run(t) {
    const clients = [["gm", t.gm], ["Gracz 1", t.client("Gracz 1")]];
    for (const [, client] of clients) {
      await t.waitFor(client, id => canvas.ready && canvas.scene?.id === id,
        { args: [t.fixture.scene.id], message: "chase fixture drawn" });
      await client.eval(async () => {
        document.querySelector('.tour [data-action="exit"]')?.click();
        await game.settings.set("neuroshima-2026-overrides", "poscigVehicleSway", true);
        window.__pauseChaseSnapshot = () => {
          const nodes = [];
          function visit(node) {
            nodes.push([node.name, node.x, node.y, node.rotation, node.alpha, node.visible,
              node.tilePosition?.x, node.tilePosition?.y]);
            for (const child of node.children ?? []) visit(child);
          }
          for (const node of canvas.primary.children.filter(c => c.name?.startsWith("poscig-"))) visit(node);
          const stats = game.neuroshima.poscig.tlo.stats();
          return { distance: stats.travelDistance, emitted: stats.tyreEmitted, nodes,
            meshes: canvas.tokens.placeables.map(t => [t.id, t.mesh.x, t.mesh.y, t.mesh.rotation]) };
        };
        canvas.pan({ x: canvas.scene.width / 2, y: 850, scale: .53 });
      });
    }
    try {
      for (const theme of ["zima", "przedmiescia", "pustynia"]) await t.step(`${theme}: GM pause freezes both clients and resumes from the frozen frame`, async () => {
        await t.gm.eval(theme => {
          game.togglePause(false, { broadcast: true });
          return game.neuroshima.poscig.konfiguruj(canvas.scene, { motyw: theme, tempoTla: 2 });
        }, theme);
        for (const [, client] of clients) {
          await t.waitFor(client, theme => {
            const s = game.neuroshima.poscig.tlo.stats();
            return !game.paused && s.theme === theme && s.ready && s.pendingTextures === 0
              && s.travelDistance > 100 && (theme !== "zima" || s.tyreEmitted > 30);
          }, { args: [theme], message: "moving chase ready" });
          await client.eval(() => {
            window.__pauseChaseDocuments = JSON.stringify(canvas.scene.toObject());
            Hooks.once("pauseGame", paused => {
              if (!paused) return;
              window.__pauseChaseFrozen = JSON.stringify(window.__pauseChaseSnapshot());
              window.__pauseChaseAt = game.neuroshima.poscig.tlo.stats().travelDistance;
            });
          });
        }
        await t.gm.eval(() => game.togglePause(true, { broadcast: true }));
        for (const [, client] of clients) await t.waitFor(client, () => game.paused && !!window.__pauseChaseFrozen,
          { message: "global pause received" });
        await new Promise(r => setTimeout(r, 500));
        for (const [name, client] of clients) {
          const frozen = await client.eval(() => ({
            frozen: JSON.stringify(window.__pauseChaseSnapshot()) === window.__pauseChaseFrozen,
            documents: JSON.stringify(canvas.scene.toObject()) === window.__pauseChaseDocuments,
            tempo: canvas.scene.getFlag("neuroshima-2026-overrides", "poscig").tempoTla
          }));
          t.assert(frozen.frozen && frozen.documents && frozen.tempo === 2,
            `${name}: pause moved scenery, particles, tracks, vehicle meshes or documents`, frozen);
          await client.eval(() => canvas.pan({ x: canvas.scene.width * .6, y: 850, scale: .65 }));
          await t.screenshot(name, `${theme}-czas-stop`);
          t.assert(await client.eval(() => game.paused && game.neuroshima.poscig.tlo.stats().travelDistance === window.__pauseChaseAt),
            "camera pan/zoom advanced the frozen route");
          // Sample the first animation frame after resume, before a long evaluation can hide a jump.
          await client.eval(() => Hooks.once("pauseGame", paused => {
            if (paused) return;
            requestAnimationFrame(() => {
              window.__pauseChaseFirstDelta = game.neuroshima.poscig.tlo.stats().travelDistance - window.__pauseChaseAt;
            });
          }));
        }
        await t.gm.eval(() => game.togglePause(false, { broadcast: true }));
        for (const [name, client] of clients) {
          await t.waitFor(client, () => !game.paused && game.neuroshima.poscig.tlo.stats().travelDistance > window.__pauseChaseAt + 60,
            { message: `${name}: route resumes` });
          const resumed = await client.eval(() => ({
            firstDelta: window.__pauseChaseFirstDelta,
            moving: JSON.stringify(window.__pauseChaseSnapshot().meshes) !== JSON.stringify(JSON.parse(window.__pauseChaseFrozen).meshes),
            documents: JSON.stringify(canvas.scene.toObject()) === window.__pauseChaseDocuments
          }));
          t.assert(resumed.firstDelta >= 0 && resumed.firstDelta <= 26.001 && resumed.moving && resumed.documents,
            "resume caught up elapsed pause time or rewrote scene documents", resumed);
          await client.eval(() => {
            delete window.__pauseChaseFrozen; delete window.__pauseChaseAt; delete window.__pauseChaseFirstDelta;
          });
        }
      });
    } finally {
      await t.gm.eval(() => game.togglePause(false, { broadcast: true }));
      for (const [, client] of clients) await client.eval(() => {
        delete window.__pauseChaseSnapshot; delete window.__pauseChaseDocuments;
        delete window.__pauseChaseFrozen; delete window.__pauseChaseAt; delete window.__pauseChaseFirstDelta;
      });
    }
  }
};
