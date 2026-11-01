"""Validate the seven delivered M4 cues and prepare a shared-server audition page."""
import hashlib
import html
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
REVIEW = ROOT/"dev/icons/review/audio/pojazdy"

def read(p):
    return json.loads(p.read_text(encoding="utf-8"))

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    sources = {s["key"]:s for s in read(HERE.parent/"audio-sources.json")["sources"]}
    clips = read(HERE.parent/"audio-clips.json")["clips"]
    report = read(HERE.parent/"audio-report.json")
    originals = read(HERE.parent/"audio-originals.json")["originals"]
    approval_file = HERE/"approval.json"
    approval = read(approval_file) if approval_file.exists() else None
    approved_hashes = {f["path"]:f["sha256"] for f in approval["approvedFiles"]} if approval else {}
    approved = bool(approval and approval.get("decision") == "approve" and len(approved_hashes) == 7
        and all(approved_hashes.get(r["file"]) == r["outputSha256"] for r in report))
    limits = {"start-benzyna":(2,3), "start-diesel":(2,4), "start-motocykl":(1.5,2.5),
        "zgaszenie":(1,1.5), "nieudane-odpalenie":(2,3), "alarm":(2,4), "syrena":(3,5)}
    labels = {"start-benzyna":"Uruchomienie — benzyna", "start-diesel":"Uruchomienie — diesel",
        "start-motocykl":"Uruchomienie — motocykl", "zgaszenie":"Zgaszenie silnika",
        "nieudane-odpalenie":"Nieudane odpalenie", "alarm":"Alarm samochodowy", "syrena":"Syrena — opcjonalna"}
    summaries = {"start-benzyna":"Saturn Vue: rozrusznik, zapłon i krótka praca silnika.",
        "start-diesel":"Ciężarowy Ford LTL 9000 z lat 80.: ciężki rozruch diesla.",
        "start-motocykl":"Stary Harley-Davidson: rozruch i pierwsze wejście na obroty.",
        "zgaszenie":"Gaszenie tego samego Saturna; naturalny spadek obrotów i wybrzmienie.",
        "nieudane-odpalenie":"Rozrusznik starego auta kręci bez skutecznego zapłonu.",
        "alarm":"Kilka impulsów rzeczywistego alarmu samochodowego.",
        "syrena":"Sucha amerykańska syrena mechaniczna: szczyt i opadające wycie."}
    assert len(report) == len(clips) == len(limits) == 7
    assert len(sources) == len(originals) == 6
    assert {Path(r["file"]).stem for r in report} == set(limits)
    REVIEW.mkdir(parents=True,exist_ok=True)
    cards = []
    for clip in clips:
        key = Path(clip["output"]).stem
        source = sources[clip["source"]]
        r = next(r for r in report if r["file"] == clip["output"])
        assert source["status"] == 200 and any(l["text"] == "Creative Commons 0" for l in source["license"])
        assert r["sourceKind"] == "authenticated original"
        original = HERE/"in"/originals[clip["source"]]["file"]
        assert "?" not in originals[clip["source"]]["url"], "Signed download query must not be persisted"
        assert sha(original) == r["sourceSha256"] == originals[clip["source"]]["sha256"]
        output = ROOT/clip["output"]
        assert sha(output) == r["outputSha256"]
        assert r["codec"] == dict(codec_name="vorbis",sample_rate="44100",channels=1)
        assert r["peakDb"] <= -3 and r["rmsDb"] <= -23 and r["peakDb"] > -40
        lo,hi=limits[key]
        assert lo-.01 <= r["duration"] <= hi+.01
        assert abs(r["duration"]-clip["duration"]) < .05 and clip.get("tempo",1) == 1
        shutil.copyfile(output,REVIEW/output.name)
        assert sha(REVIEW/output.name) == r["outputSha256"]
        esc=html.escape
        cards.append(f"""<article><h2>{esc(labels[key])}</h2><p>{esc(summaries[key])}</p>
<audio controls preload="none"><source src="{esc(output.name)}" type="audio/ogg"></audio>
<p class="measure">{r['duration']:g} s · peak {r['peakDb']:g} dB · RMS {r['rmsDb']:g} dB</p>
<p class="source">CC0 · <a href="{esc(source['page'])}" target="_blank" rel="noopener">{esc(source['title'])}</a> — {esc(source['author'])}</p></article>""")
    review_status = "Komplet zaakceptowany przez MG — " + approval["date"] if approved else "Gotowe do odsłuchu i oceny MG"
    page="""<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Neuroshima · Dźwięki pojazdów</title><style>
*{box-sizing:border-box}body{margin:0;background:#202522;color:#eee9dc;font:16px/1.5 system-ui,sans-serif}header,main{max-width:1180px;margin:auto;padding:22px}h1{margin:16px 0 8px}header p{margin:8px 0}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:16px;padding-top:0}article{padding:20px;background:#2b342d;border:1px solid #52604e;border-radius:8px}h2{font-size:19px;margin:0 0 10px}audio{width:100%;margin:10px 0}a{color:#c6d6ae}.measure,.source{font-size:13px;color:#c9cfc3}.source a{overflow-wrap:anywhere}.volume{display:flex;gap:12px;align-items:center;flex-wrap:wrap}input{width:220px}
</style><header><h1>Dźwięki pojazdów</h1><p>Siedem krótkich sygnałów z oryginalnych nagrań CC0. Mono 44,1 kHz · OGG Vorbis · profil M5.</p>
<p>"""+html.escape(review_status)+"""</p>
<label class="volume">Głośność odsłuchu <input id="volume" type="range" min="0" max="1" step="0.05" value="0.65"></label></header>
<main>"""+ "\n".join(cards)+"""</main><script type="module" src="/navigation.mjs"></script><script>
const tracks=[...document.querySelectorAll('audio')],volume=document.querySelector('#volume');
function update(){tracks.forEach(a=>a.volume=Number(volume.value))}volume.addEventListener('input',update);update();
tracks.forEach(a=>a.addEventListener('play',()=>tracks.forEach(other=>{if(other!==a)other.pause()})));
const urls=[];
window.audioReviewReady=Promise.all(tracks.map(async a=>{
  const source=a.querySelector('source');a.dataset.originalSrc=source.getAttribute('src');
  const response=await fetch(source.src);if(!response.ok)throw new Error('Nie udało się pobrać '+a.dataset.originalSrc);
  const url=URL.createObjectURL(new Blob([await response.arrayBuffer()],{type:'audio/ogg'}));urls.push(url);
  const ready=new Promise((resolve,reject)=>{a.addEventListener('loadedmetadata',resolve,{once:true});a.addEventListener('error',()=>reject(new Error(a.dataset.originalSrc)),{once:true})});
  a.preload='metadata';a.src=url;a.load();await ready;return a.dataset.originalSrc;
}));
window.audioReviewReady.catch(error=>{const p=document.createElement('p');p.textContent=error.message;document.querySelector('header').append(p)});
window.addEventListener('pagehide',()=>urls.forEach(url=>URL.revokeObjectURL(url)),{once:true});
</script></html>
"""
    (REVIEW/"index.html").write_text(page,encoding="utf-8")
    result=dict(date="2026-11-01",files=7,originalRecordings=6,sourceLicense="CC0 1.0",
        normalizedProfile=dict(codec="vorbis",channels=1,sampleRate=44100,peakCeilingDb=-3,rmsCeilingDb=-23,fadeInMs=5,fadeOutMs=30,tempo=1),
        totalBytes=sum(r["bytes"] for r in report),allTechnicalChecksPassed=True,report=report,
        audition="dev/icons/review/audio/pojazdy/index.html",
        artisticFit="GM-approved; exact approved bytes retained." if approved else "Ready for GM audition; no approval fabricated.",
        approval="approval.json" if approved else None)
    (HERE/"validation.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:result[k] for k in ("files","originalRecordings","totalBytes","allTechnicalChecksPassed")},ensure_ascii=False))

if __name__ == "__main__":
    main()
