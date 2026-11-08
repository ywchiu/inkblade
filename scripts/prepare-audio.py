"""Prepare locally downloaded, CC0 audio. Originals and source pages live in art/audio/source."""
from pathlib import Path
import subprocess, zipfile, json, hashlib
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'art/audio/source'; OUT=ROOT/'dist/assets/audio'; OUT.mkdir(parents=True,exist_ok=True)
def run(args):subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*map(str,args)],check=True)
# A 60 second selection with the last two seconds crossfaded onto its first two.
# The resulting 58s file wraps from the head's end directly into the body.
for name,file,offset in [('exploration','asianoriental1.ogg',0),('battle','Battle.mp3',12)]:
 f='[0:a]atrim=duration=60,asetpts=PTS-STARTPTS,asplit=3[b][t][h];[b]atrim=start=2:end=58,asetpts=PTS-STARTPTS[body];[t]atrim=start=58:end=60,asetpts=PTS-STARTPTS[tail];[h]atrim=end=2,asetpts=PTS-STARTPTS[head];[tail][head]acrossfade=d=2:c1=tri:c2=tri[join];[body][join]concat=n=2:v=0:a=1,highpass=f=45,lowpass=f=10000,loudnorm=I=-21:TP=-3:LRA=10,afade=t=in:d=0.003,afade=t=out:st=57.997:d=0.003[out]'
 run(['-ss',offset,'-i',SRC/file,'-filter_complex',f,'-map','[out]','-ar',48000,'-ac',2,'-c:a','libopus','-b:a','128k',OUT/(name+'.ogg')])
selections={
 'rpg-audio':{'whoosh-1':'knifeSlice','whoosh-2':'knifeSlice2','cloth-1':'cloth1','cloth-2':'cloth2','draw':'drawKnife2','heal':'handleSmallLeather'},
 'impact-sounds':{'hit-1':'impactPunch_medium_000','hit-2':'impactPunch_medium_001','heavy-hit':'impactPunch_heavy_000','metal-1':'impactMetal_medium_000','metal-2':'impactMetal_medium_002','bell':'impactBell_heavy_000','stone':'impactMining_000','step-1':'footstep_concrete_000','step-2':'footstep_concrete_001','step-3':'footstep_concrete_002'}
}
manifest=[]
for pack,entries in selections.items():
 with zipfile.ZipFile(SRC/(pack+'.zip')) as z:
  (OUT/(pack+'-LICENSE.txt')).write_bytes(z.read('License.txt'))
  for dest,name in entries.items():
   original=SRC/(name+'.ogg');original.write_bytes(z.read('Audio/'+name+'.ogg'))
   # Remove leading dead air, retain transient detail, cap tails and spectral harshness.
   run(['-i',original,'-af','silenceremove=start_periods=1:start_duration=0.002:start_threshold=-48dB,highpass=f=55,lowpass=f=7500,alimiter=limit=0.7:level=false,volume=0.65,areverse,afade=t=in:d=0.012,areverse','-t',1.6,'-ac',1,'-ar',48000,'-c:a','libopus','-b:a','128k',OUT/(dest+'.ogg')])
   manifest.append({'file':dest+'.ogg','source_archive':pack+'.zip','source_file':'Audio/'+name+'.ogg','license':'CC0-1.0','author':'Kenney','changes':'Leading silence trimmed; EQ, limiter, -3.74 dB gain, 12 ms tail fade, mono Opus encoding','url':'https://kenney.nl/assets/'+pack})
for name,source,author,url in [('exploration','asianoriental1.ogg','Tozan','https://opengameart.org/content/asianoriental1'),('battle','Battle.mp3','Wolfgang_','https://opengameart.org/content/battle-theme-0')]:
 manifest.append({'file':name+'.ogg','source_file':source,'author':author,'url':url,'license':'CC0-1.0','changes':'60 second selection, 2 second end-to-start crossfade, EQ, loudness normalization; 58 second loop with 3 ms boundary fades'})
for item in manifest:
 p=OUT/item['file'];item['sha256']=hashlib.sha256(p.read_bytes()).hexdigest();item['bytes']=p.stat().st_size
 item['duration']=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(p)]))
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(manifest),'bytes':sum(x['bytes'] for x in manifest),'durations':{x['file']:round(x['duration'],3) for x in manifest}},indent=2))

# Reapply completed generated assets so rebuilding the pack keeps the selected soundtrack.
if (ROOT/'art/audio/higgsfield/downloads.json').exists():
 import sys
 subprocess.run([sys.executable,str(ROOT/'scripts/prepare-higgsfield-audio.py')],check=True)
