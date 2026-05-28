/**
 * Run this in the Foundry VTT console (or as a GM macro) to retroactively 
 * update all PC weapons to use the new Neuroshima override icons.
 */

const PATH = "modules/neuroshima-2026-overrides/icons";
    
// Keywords mapping
const RULES = [
    { keys: ["revolver", "rewolwer", "magnum", "python"], icon: "weapons/revolver.svg" },
    { keys: ["pistol", "pistolet", "glock", "beretta", "desert eagle", "g17"], icon: "weapons/semi_auto_pistol.svg" },
    { keys: ["machine pistol", "pistolet maszynowy", "mac-10", "uzi", "vz"], icon: "weapons/machine_pistol.svg" },
    { keys: ["smg", "pm ", "p90"], icon: "weapons/submachinegun.svg" },
    { keys: ["assault", "szturmow", "g3", "kara"], icon: "weapons/fully_automatic_rifle.svg" },
    { keys: ["lmg", "km", "km ", "rkm", "ckm", "machine gun"], icon: "weapons/light_machine_gun.svg" },
    { keys: ["bolt", "powtarzal", "mosin", "kar98"], icon: "weapons/bolt_action_rifle.svg" },
    { keys: ["snajper", "sniper", "hunter", "scoped", "lupką", "lunet"], icon: "weapons/scoped_bolt_action_rifle.svg" },
    { keys: ["lever", "winchester", "marlin"], icon: "weapons/lever_action_rifle.svg" },
    { keys: ["shotgun", "strzelba", "pompka"], icon: "weapons/semi_auto_shotgun.svg" },
    { keys: ["sawed", "obrzyn", "obrzynem"], icon: "weapons/sawed_off_shotgun.svg" },
    { keys: ["grenade", "granatnik", "m79", "rpg"], icon: "weapons/grenade_launcher.svg" },
    { keys: ["rocket", "wyrzutnia", "bazooka", "law"], icon: "weapons/tube_rocket_launcher.svg" },
    { keys: ["bow", "łuk", "luk"], icon: "weapons/bow.svg" },
    { keys: ["crossbow", "kusza", "arbalest"], icon: "weapons/crossbow.svg" },
    { keys: ["spear", "włócznia", "wlocznia", "dzida"], icon: "weapons/spear.svg" },
    { keys: ["baseball", "kij", "bat"], icon: "weapons/baseball_bat.svg" },
    { keys: ["nóż", "noz", "knife", "sztylet", "dagger", "maczeta"], icon: "weapons/combat_knife.svg" },
    { keys: ["kafar", "pile driver"], icon: "weapons/pile_driver.svg" },
    { keys: ["łańcuch", "lancuch", "chain"], icon: "weapons/chain.svg" },
    { keys: ["piła łańcuchowa", "pila lancuchowa", "chainsaw", "piła"], icon: "weapons/combat_chainsaw.svg" },
    { keys: ["piłomiecz", "pilomiecz", "machine sword"], icon: "weapons/machine_sword.svg" },
    { keys: ["szabla", "saber"], icon: "weapons/saber.svg" },
    { keys: ["szoker", "paralyzer", "taser", "stun gun"], icon: "weapons/paralyzer.svg" },
    { keys: ["kilof", "pickaxe", "czekan"], icon: "weapons/pickaxe.svg" },
    { keys: ["katana", "miecz samurajski", "wakizashi"], icon: "weapons/katana.svg" },
    { keys: ["kastet", "brass knuckles"], icon: "weapons/brass_knuckles.svg" },
    { keys: ["nadziak", "horseman's pick"], icon: "weapons/horsemans_pick.svg" },
    { keys: ["widły", "widly", "pitchfork"], icon: "weapons/pitchfork.svg" },
    { keys: ["toporek", "hatchet", "siekierka"], icon: "weapons/hatchet.svg" },
    { keys: ["oszczep", "javelin"], icon: "weapons/javelin.svg" },
    { keys: ["barrett", "m82", "light fifty", "ciężki snajperski", "ciezki snajperski", "anti-materiel"], icon: "weapons/heavy_sniper_rifle.svg" },
    { keys: ["m2", "browning", "hkm", "wielkokalibrowy", "heavy machine gun", "wkm"], icon: "weapons/heavy_machine_gun.svg" },
    { keys: ["minigun", "działko obrotowe", "dzialko obrotowe", "gatling"], icon: "weapons/minigun.svg" },
    { keys: ["moździerz", "mozdzierz", "mortar", "m224"], icon: "weapons/light_mortar.svg" },
    { keys: ["thumper"], icon: "weapons/thumper_grenade_launcher.svg" },
    { keys: ["miotacz", "flamethrower"], icon: "weapons/flamethrower.svg" },
    { keys: ["dwururka", "double barrel"], icon: "weapons/double_barreled_shotgun.svg" },
    { keys: ["samoróbka", "samorobka", "pipe gun", "zip gun"], icon: "weapons/pipe_gun.svg" },
    { keys: ["palmera", "strzykaw", "syringe"], icon: "weapons/syringe_gun.svg" },
    { keys: ["granat", "frag", "odłamkowy", "odlamkowy"], icon: "weapons/frag_grenade.svg" },
    { keys: ["mołotow", "molotow", "koktajl", "molotov"], icon: "weapons/molotov_cocktail.svg" },
    { keys: ["dymny", "łzawiący", "lzawiacy", "smoke grenade"], icon: "weapons/smoke_grenade.svg" },
    { keys: ["dynamit", "dynamite"], icon: "weapons/dynamite.svg" },
    { keys: ["c4", "plastik", "plastic explosive"], icon: "weapons/c4_explosive.svg" },
    
    // Grid 8
    { keys: ["slingshot", "proca", "procy"], icon: "weapons/slingshot.svg" },
    { keys: ["blowgun", "dmuchawka", "dmuchawki"], icon: "weapons/blowgun.svg" },
    { keys: ["boomerang", "bumerang", "bumerangu"], icon: "weapons/boomerang.svg" },
    { keys: ["bola", "bolas"], icon: "weapons/bola.svg" },
    { keys: ["fireman axe", "topór strażacki", "topor strazacki", "topór", "topor"], icon: "weapons/fireman_axe.svg" },
    { keys: ["iron pipe club", "rurka", "crash"], icon: "weapons/iron_pipe_club.svg" },
    { keys: ["m60", "the pig"], icon: "weapons/m60_machine_gun.svg" },
    { keys: ["minimi", "fn minimi"], icon: "weapons/fn_minimi.svg" },
    { keys: ["mgl1s"], icon: "weapons/mgl1s.svg" },

    // Grid 9
    { keys: ["m14"], icon: "weapons/m14_rifle.svg" },
    { keys: ["m1 us rifle", "garand"], icon: "weapons/m1_us_rifle.svg" },
    { keys: ["field 03"], icon: "weapons/field_03_rifle.svg" },
    { keys: ["xm-8", "xm8"], icon: "weapons/xm_8_rifle.svg" },
    { keys: ["armalite", "ar", "m16", "m4"], icon: "weapons/armalite_carbine.svg" },
    { keys: ["scar"], icon: "weapons/scar_assault_rifle.svg" },
    { keys: ["ak-47", "kałach", "kalach", "ak "], icon: "weapons/ak_47.svg" },
    { keys: ["tommy gun", "thompson"], icon: "weapons/tommy_gun.svg" },
    { keys: ["mp5", "empepiątka", "empepiatka"], icon: "weapons/hk_mp5.svg" },

    // Grid 10
    { keys: ["hk universal", "ump"], icon: "weapons/hk_ump.svg" },
    { keys: ["b 92"], icon: "weapons/beretta_b92.svg" },
    { keys: ["trzydziestka"], icon: "weapons/m642_revolver.svg" },
    { keys: ["k-22"], icon: "weapons/k_22_revolver.svg" },
    { keys: ["mk iv"], icon: "weapons/ruger_mark_iv.svg" },
    { keys: ["mark 23"], icon: "weapons/hk_mark_23.svg" },
    { keys: ["colt", "jedenastka", "1911"], icon: "weapons/colt_1911.svg" },
    { keys: ["b 93r"], icon: "weapons/beretta_b93r.svg" },
    { keys: ["peacemaker"], icon: "weapons/peacemaker_revolver.svg" },

    // Ammunition
    { keys: [".22", "22 lr", "22lr"], icon: "ammo/ammo_22_lr.svg" },
    { keys: [".38", "38 spl", "38 special"], icon: "ammo/ammo_38_spl.svg" },
    { keys: ["9mm", "9 mm", "9x19"], icon: "ammo/ammo_9_mm.svg" },
    { keys: [".45", "45 acp"], icon: "ammo/ammo_45_acp.svg" },
    { keys: [".44", "44 mag"], icon: "ammo/ammo_44_mag.svg" },
    { keys: ["5,56", "5.56", "5.56x45", "5,56x45"], icon: "ammo/ammo_5_56_mm.svg" },
    { keys: ["7,62x39", "7.62x39", "x39", "do ak", "do kałacha", "do kalacha"], icon: "ammo/ammo_7_62x39_mm.svg" },
    { keys: ["7,62", "7.62", "7.62x51", "7,62x51", "7.62x54", "308 win", ".308 win"], icon: "ammo/ammo_7_62_mm.svg" },
    { keys: [".30-06", "30-06", "3006"], icon: "ammo/ammo_30_06.svg" },
    { keys: [".50", "bmg", "12,7", "12.7", "0.50"], icon: "ammo/ammo_50_bmg.svg" },
    { keys: ["12ga", "12 ga", "12 gauge", "do strzelb", "12 kalibar", "12 cal", "śrut", "srut"], icon: "ammo/ammo_12_ga.svg" },
    { keys: ["40mm", "40 mm", "40-mm"], icon: "ammo/ammo_40mm_grenade.svg" },
    { keys: ["60mm", "60 mm", "60-mm"], icon: "ammo/ammo_60mm_rocket.svg" },
    { keys: ["120mm", "120 mm", "120-mm"], icon: "ammo/ammo_120mm_mortar.svg" },
    { keys: ["dart", "lotk", "strzałk", "strzalk"], icon: "ammo/ammo_dart.svg" },
    { keys: ["bearing", "łożysk", "lozysk", "kulki", "kulkę", "kulka"], icon: "ammo/ammo_ball_bearing.svg" },
    { keys: ["arrow", "strzała", "strzały", "strzala", "strzaly"], icon: "ammo/ammo_arrow.svg" },
    { keys: ["bolt", "bełt", "belty", "bełty"], icon: "ammo/ammo_bolt.svg" }
];

async function updatePCWeapons() {
    let updatedCount = 0;
    
    for (let actor of game.actors) {
        const updates = [];
        
        for (let item of actor.items) {
            // Check weapons, consumables, equipment, loot for matches
            if (!["weapon", "consumable", "loot", "equipment"].includes(item.type)) continue;
            
            const nameKey = item.name.toLowerCase();
            let targetIcon = null;
            
            for (let rule of RULES) {
                if (rule.keys.some(k => nameKey.includes(k))) {
                    targetIcon = `${PATH}/${rule.icon}`;
                    break;
                }
            }
            
            if (targetIcon && item.img !== targetIcon) {
                updates.push({ _id: item.id, img: targetIcon });
                updatedCount++;
            }
        }
        
        if (updates.length > 0) {
            await actor.updateEmbeddedDocuments("Item", updates);
            console.log(`Updated ${updates.length} items on ${actor.name}`);
        }
    }
    
    ui.notifications.info(`Updated ${updatedCount} weapon icons across all actors.`);
}

updatePCWeapons();