#!/usr/bin/env python3
"""Rebuild dialogue Ogg files from saved Higgsfield receipts. No generation or charges."""
import concurrent.futures,json,subprocess,array,math,hashlib,html,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'art/audio/dialogue';OUT=ROOT/'dist/assets/audio/dialogue'
OUT.mkdir(parents=True,exist_ok=True)
plan=json.loads((RAW/'plan.json').read_text())
def prepare(line):
 source_root=RAW/line.get('sourceRevision','')
 source=source_root/(line['id']+'-source.mp3');target=OUT/(line['id']+'.ogg')
 job=json.loads((source_root/(line['id']+'-result.json')).read_text())[0]
 assert job['status']=='completed' and job['params']['model']=='elevenlabs'
 assert job['params']['prompt']==line.get('generationPrompt',line['text']) and job['params']['voice_id']==line['voiceId']
 # Performance tags and punctuation may differ; every spoken Chinese character must match the subtitle.
 spoken=lambda s:''.join(c for c in re.sub(r'\[[^]]*\]','',s) if '\u4e00'<=c<='\u9fff')
 assert spoken(job['params']['prompt'])==spoken(line['text']),line['id']
 filters='aresample=48000,highpass=f=80,lowpass=f=10000'
 if line['role']=='oni':filters+=',asetrate=43200,aresample=48000,atempo=1.111111,aecho=0.8:0.6:65:0.08'
 if line['role']=='ghost':filters+=',aecho=0.8:0.6:85:0.11'
 filters+=',loudnorm=I=-18:TP=-3:LRA=7,aresample=48000'
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(source),'-af',filters,'-ac','1','-c:a','libopus','-b:a','96k',str(target)],check=True)
 pcm=subprocess.run(['ffmpeg','-v','error','-i',str(target),'-f','f32le','-ac','1','-ar','48000','-'],capture_output=True,check=True).stdout
 samples=array.array('f',pcm);peak=max(map(abs,samples));rms=math.sqrt(sum(x*x for x in samples)/len(samples));duration=len(samples)/48000
 assert duration>1 and rms>.001 and peak<.95,(line['id'],duration,rms,peak)
 return {**line,'jobId':job['id'],'file':target.relative_to(ROOT/'dist').as_posix(),'duration':round(duration,3),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'peak':round(peak,4),'rms':round(rms,4),'voiceMetadata':job['params']['voice']}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:manifest=list(pool.map(prepare,plan['lines']))
(RAW/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
(OUT/'manifest.json').write_text(json.dumps([{k:x[k] for k in ['id','speaker','text','file','duration']} for x in manifest],ensure_ascii=False,indent=2))
cards=''.join(f'<article><h2>{html.escape(x["speaker"])}</h2><p>{html.escape(x["text"])}</p><audio controls preload="none" src="{x["id"]}.ogg"></audio></article>' for x in manifest)
comparison=''
for id in ['bark-wolf-voice','wolf-0','ronin-2']:
 if not (OUT/'comparison'/(id+'-before.ogg')).exists():continue
 line=next(x for x in manifest if x['id']==id)
 comparison+=f'<article><h2>{html.escape(line["speaker"])}</h2><p>{html.escape(line["text"])}</p><p>舊版</p><audio controls preload="none" src="comparison/{id}-before.ogg"></audio><p>新版 · 表演方向：{html.escape(line.get("direction",""))}</p><audio controls preload="none" src="{id}.ogg"></audio></article>'
if comparison:cards='<section id="performance"><h2>角色表演 · 前後對照</h2><p>兩版維持相同混音目標，主要差異來自重新生成時的角色表演指示。</p>'+comparison+'</section><h2>全部對白</h2>'+cards
(OUT/'index.html').write_text('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>借名山 · 對白試聽</title><style>body{font:16px/1.8 system-ui;background:#111b23;color:#e4d8c3;max-width:740px;margin:40px auto;padding:0 22px}a{color:#dbb982}h1,h2{font-weight:500}h2{font-size:18px}article{border-top:1px solid #405054;padding:18px 0}audio{width:100%}</style><h1>借名山 · 對白試聽</h1><p>包含完整劇情與結局。37 段對白由 Higgsfield / ElevenLabs 生成，六組固定聲線；聲音素材適用供應商及模型條款，非 CC0。</p><p><a href="../../../index.html">回到遊戲</a> · <a href="../CREDITS.html">聲音素材來源</a></p>'+cards+'<script>document.addEventListener("play",e=>{for(const a of document.querySelectorAll("audio"))if(a!==e.target)a.pause();},true);</script></html>')
print(json.dumps({'clips':len(manifest),'duration':round(sum(x['duration'] for x in manifest),2),'bytes':sum(x['bytes'] for x in manifest),'maxPeak':max(x['peak'] for x in manifest),'voices':{x['role']:{'name':x['voiceMetadata']['name'],'gender':x['voiceMetadata'].get('gender'),'age':x['voiceMetadata'].get('age')} for x in manifest}},ensure_ascii=False))
