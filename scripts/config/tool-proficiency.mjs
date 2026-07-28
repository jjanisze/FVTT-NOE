/**
 * Neuroshima 5e — tool proficiency (Biegłość / Specjalizacja narzędzi).
 *
 * dnd5e already models tool proficiency natively via `actor.system.tools[<kit>].value`
 * (0 = brak biegłości, 1 = Biegłość → +PB, 2 = Specjalizacja/Expertise → +2×PB) and the
 * native Tools panel + roll math honour it. The ONLY divergence from Neuroshima is that
 * dnd5e's `proficiency-cycle` widget also offers a 0.5 "half proficiency" step for tools,
 * which NS does not use.
 *
 * This patch removes the 0.5 step for the tool cycle ONLY (0 → Biegłość → Specjalizacja),
 * leaving the skill cycle untouched (skills may legitimately use 0.5 for Jack-of-all-Trades).
 */
export function registerToolProficiency() {
  const Cls = customElements.get("proficiency-cycle")
    ?? dnd5e?.applications?.components?.ProficiencyCycleElement;

  if ( !Cls ) {
    console.warn("Neuroshima 5e | proficiency-cycle element not found; tool cycle not patched");
    return;
  }

  const descriptor = Object.getOwnPropertyDescriptor(Cls.prototype, "validValues");
  if ( !descriptor?.get ) {
    console.warn("Neuroshima 5e | validValues getter not found; tool cycle not patched");
    return;
  }

  const original = descriptor.get;
  Object.defineProperty(Cls.prototype, "validValues", {
    get() {
      // Tools: no half-proficiency in Neuroshima → 0 / Biegłość / Specjalizacja only.
      if ( this.type === "tool" ) return [0, 1, 2];
      return original.call(this);
    },
    configurable: true
  });

  console.log("Neuroshima 5e | Tool proficiency cycle patched (0 → Biegłość → Specjalizacja)");
}
