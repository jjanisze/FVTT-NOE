/**
 * Neuroshima 5e — budżet amunicji NPC („Szybkie palce" i pokrewne).
 *
 * NPC są **poza systemem magazynków** (PLAN_magazynki.md §9): żadnych pojemników jako
 * przedmiotów, kalibrów, komory ani luźnej amunicji. Ich amunicja to jeden licznik użyć na
 * itemie ataku, wpisany przez `dev/packs/build-packs.mjs`, odnawiany natywnym okresem dnd5e
 * `initiative` — czyli raz na walkę, dokładnie jak każe *Notatnik Łowcy*:
 *
 * > **Jeden magazynek.** Przeciwnicy, którzy używają broni palnej, mają jeden pełny magazynek
 * > lub bębenek.
 *
 * Ten plik dokłada jedyny kawałek, którego danymi wyrazić się nie da: cechę **„Szybkie palce"**
 * („Wymienia opróżniony magazynek lub usuwa zacięcie broni"), czyli akcję bonusową, która
 * zeruje ten licznik w środku walki. dnd5e nie ma natywnej aktywności „odnów użycia innego
 * przedmiotu", a bez tego cecha byłaby ozdobą — NPC z pustym magazynkiem musiałby czekać do
 * następnej walki.
 *
 * Zakres jest celowo wąski: **tylko itemy bestiariusza, tylko aktorzy `npc`.** Postacie graczy
 * mają prawdziwe magazynki i nie wolno im niczego napełniać z powietrza.
 */

const MODULE_ID = "neuroshima-2026-overrides";

export function registerNpcAmmo() {
  Hooks.on("dnd5e.postUseActivity", onPostUseResetAmmo);
  console.log("Neuroshima 5e | NPC ammo budget registered");
}

/**
 * Po użyciu cechy oznaczonej `ammoReset` zeruje `uses.spent` na wszystkich itemach ataku
 * tego samego NPC, które mają limit użyć.
 *
 * „Wszystkie" jest tu poprawne, a nie leniwe: statblock daje jedną taką cechę na stworzenie,
 * a wymiana magazynka w środku walki dotyczy broni, którą to stworzenie właśnie trzyma —
 * której item to jest, wie MG, nie kod. Zerowanie jednego licznika na chybił trafił byłoby
 * gorsze od zerowania wszystkich, bo wyglądałoby na działające.
 */
async function onPostUseResetAmmo(activity) {
  const item = activity?.item;
  const actor = item?.actor;
  if (!actor || actor.type !== "npc") return;
  if (item.getFlag(MODULE_ID, "bestiary")?.ammoReset !== true) return;

  const updates = [];
  for (const sibling of actor.items) {
    if (sibling.id === item.id) continue;
    if (!sibling.getFlag(MODULE_ID, "bestiary")) continue;
    if (!Number(sibling.system.uses?.max ?? 0)) continue;
    if (!Number(sibling.system.uses?.spent ?? 0)) continue;
    updates.push({ _id: sibling.id, "system.uses.spent": 0 });
  }
  if (!updates.length) return;

  await actor.updateEmbeddedDocuments("Item", updates);

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-mag-card">`
      + `<div class="neuro-mag-head"><strong>${actor.name}</strong> — ${item.name}</div>`
      + `<div class="neuro-mag-body">Świeży magazynek. Budżet amunicji odnowiony.</div></div>`
  });
}

export const __testing = Object.freeze({ onPostUseResetAmmo });
