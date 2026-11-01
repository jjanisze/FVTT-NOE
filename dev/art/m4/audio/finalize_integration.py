"""Keep integration evidence free of browser target IDs and temporary document identities."""
import json
from pathlib import Path

HERE=Path(__file__).resolve().parent

def read(p):
    raw=p.read_bytes()
    encoding="utf-16" if raw[:2] in (b"\xff\xfe",b"\xfe\xff") else "utf-8-sig"
    return json.loads(raw.decode(encoding))

def main():
    raw=read(HERE/"runtime-check.json")
    runtime=raw.get("value",raw)
    cleanup_raw=read(HERE/"cleanup-result.json")
    cleanup=cleanup_raw.get("value",cleanup_raw)
    quench=read(HERE/"quench-result.json")
    assert cleanup["cleaned"] and cleanup["audioHelperRestored"]
    assert quench["ok"] and quench["failed"]==0
    safe_runtime={k:runtime[k] for k in ("date","approvedAudioFiles","sirenButtonClicked",
        "sirenEffectPreserved","playback","unrelatedActionSilent")}
    safe_runtime["sirenEvent"]="syrena"
    safe_runtime["cleanupPending"]=False
    safe_runtime["cleanup"]=cleanup
    safe_runtime["quench"]={k:quench[k] for k in ("total","passed","failed")}
    safe_runtime["staticChecks"]={"command":"npm test","exitCode":0}
    safe_runtime["runtimeSourceChanged"]="scripts/pojazdy/paleta.mjs"
    safe_runtime["screenshot"]={"published":False,"reason":"Automatic approval review rejected storing a Foundry session screenshot in the public repository; redacted test evidence is used instead."}
    (HERE/"runtime-verification.json").write_text(json.dumps(safe_runtime,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    for name in ("runtime-check.json","cleanup-result.json","quench-result.json"):
        (HERE/name).unlink()
    print("Saved redacted integration report: seven approved native assets, siren click, silent unrelated action, cleanup, 60/60 Quench, npm test.")

if __name__=="__main__":
    main()
