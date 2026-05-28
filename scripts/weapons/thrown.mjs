const MODULE_ID = "neuroshima-2026-overrides";

export function registerThrownWeapons() {
  Hooks.on("dnd5e.postUseActivity", onPostUseActivity);
  console.log("Neuroshima 5e | Thrown weapons system registered");
}

async function onPostUseActivity(activity, usageConfig, results) {
  const item = activity.item;
  if (item?.type !== "weapon" || !item?.actor) return;
  
  // Sprawdzamy czy broń posiada właściwość 'rzucana' (thr)
  if (!item.system.properties?.has("thr")) return;

  // Sprawdzamy czy użyta aktywność to atak dystansowy (Rzut) lub wprost nazywa się "Rzut"
  const isThrowing = activity.attack?.type?.value === "ranged" || activity.name === "Rzut";
  if (!isThrowing) return;

  const currentQty = item.system.quantity;
  
  if (currentQty > 1) {
    // Zużywamy 1 sztukę
    await item.update({ "system.quantity": currentQty - 1 });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: item.actor }),
      content: `<div><strong>${item.name}</strong> zostaje rzucona! (Pozostało: ${currentQty - 1})</div>`
    });
  } else {
    // Ilość wynosi 1. Nie niszczymy przedmiotu, tylko go odekwipowujemy.
    if (item.system.equipped) {
      await item.update({ "system.equipped": false });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: item.actor }),
        content: `<div><strong>${item.name}</strong> zostaje rzucona i wylatuje z rąk (odekwipowana).</div>`
      });
    }
  }
}
