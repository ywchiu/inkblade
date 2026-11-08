"""Build game audio from the eight saved Higgsfield results. Never submits jobs."""
from pathlib import Path
import array, hashlib, json, math, os, subprocess, tempfile
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'art/audio/higgsfield'; OUT=ROOT/'dist/assets/audio'
source={row['name']:row for row in json.loads((SRC/'downloads.json').read_text())}
base=ROOT/'art/audio/source/cc0-manifest.json'
if not base.exists():
    current=json.loads((OUT/'manifest.json').read_text())
    assert all(x.get('license')=='CC0-1.0' for x in current), 'Missing original CC0 manifest'
    base.write_text(json.dumps(current,indent=2)+'\n')
manifest={r['file']:r for r in json.loads(base.read_text())}
def ff(args):
    return subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-y',*map(str,args)])
def decode(path):
    return array.array('f',ff(['-i',path,'-ac','1','-ar',48000,'-f','f32le','-']))
# One generated recording can supply two locally edited variants, not two model outputs.
variants={
 'sword-whoosh':[('whoosh-1',.28,1.28,1.7,.52),('whoosh-2',.30,1.32,1.5,.48)],
 'armor-hit':[('hit-1',0,.49,1.05,.50),('hit-2',.01,.53,1.14,.48),('heavy-hit',0,.78,.9,.58)],
 'parry':[('metal-1',.025,.57,1,.55),('metal-2',.03,.62,1.13,.52)],
 'dash':[('cloth-1',0,.55,1.12,.48),('cloth-2',.02,.59,1.02,.44)],
 'wolf-growl':[('wolf-growl',0,1.75,1.06,.46)],
 'stone':[('stone',0,1.35,1,.58)]}
with tempfile.TemporaryDirectory(prefix='inkblade-audio-') as tmp:
    tmp=Path(tmp); products=[]
    for name,row in source.items():
        original=SRC/row['file']
        assert hashlib.sha256(original.read_bytes()).hexdigest()==row['sha256'],name
        if name in ['exploration','battle']:
            dest=tmp/(name+'.ogg')
            graph='[0:a]atrim=duration=60,asetpts=PTS-STARTPTS,asplit=3[b][t][h];[b]atrim=start=2:end=58,asetpts=PTS-STARTPTS[body];[t]atrim=start=58:end=60,asetpts=PTS-STARTPTS[tail];[h]atrim=end=2,asetpts=PTS-STARTPTS[head];[tail][head]acrossfade=d=2:c1=tri:c2=tri[join];[body][join]concat=n=2:v=0:a=1,highpass=f=45,lowpass=f=11000,loudnorm=I=-21:TP=-4:LRA=10,volume=0.65,afade=t=in:d=0.005,afade=t=out:st=57.995:d=0.005[out]'
            ff(['-i',original,'-filter_complex',graph,'-map','[out]','-ar',48000,'-ac',2,'-c:a','libopus','-b:a','128k',dest])
            products.append((name,dest,{'loop_seconds':58,'changes':'2 second end-to-start crossfade, EQ, -21 LUFS target plus -3.74 dB headroom, 5 ms boundary fades'}))
        else:
            for output,start,end,tempo,peak_target in variants[name]:
                pcm=array.array('f',ff(['-i',original,'-af',f'atrim=start={start}:end={end},asetpts=PTS-STARTPTS,atempo={tempo},highpass=f=60,lowpass=f=7500','-ac',1,'-ar',48000,'-f','f32le','-']))
                peak=max(map(abs,pcm));assert peak>.0001,name
                scale=min(40,peak_target/peak); fade_in=96;fade_out=1440
                for i in range(len(pcm)):
                    pcm[i]*=scale*min(1,i/fade_in,(len(pcm)-1-i)/fade_out)
                raw=tmp/(output+'.f32');raw.write_bytes(pcm.tobytes());dest=tmp/(output+'.ogg')
                ff(['-f','f32le','-ar',48000,'-ac',1,'-i',raw,'-c:a','libopus','-b:a','128k',dest])
                products.append((name,dest,{'source_cut':[start,end],'tempo':tempo,'peak_target':peak_target,'changes':'Local trim/tempo variant, EQ, peak normalization, 2 ms attack and 30 ms tail fades'}))
    report=[]
    for name,path,edit in products:
        pcm=decode(path);peak=max(map(abs,pcm));assert 0.001<peak<.8,(path.name,peak,len(pcm))
        duration=len(pcm)/48000
        row=source[name]
        entry={'file':path.name,'provider':'Higgsfield','model':row['model'],'job_id':row['job_id'],'source_file':row['file'],'source_url':row['source_url'],'license':'Generated via user Higgsfield account; provider/model terms apply; not CC0',**edit,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'duration':duration}
        manifest[path.name]=entry
        report.append({'file':path.name,'duration':duration,'peak_db':20*math.log10(peak),'rms_db':20*math.log10(math.sqrt(sum(x*x for x in pcm)/len(pcm))),'boundary_delta':abs(pcm[0]-pcm[-1]) if name in ['exploration','battle'] else None})
    # Publish only after every generated file has passed decode and level checks.
    for _,path,_ in products:os.replace(path,OUT/path.name)
    (OUT/'manifest.json').write_text(json.dumps([{k:v for k,v in x.items() if k not in {'source_url','source_file','job_id'}} for x in manifest.values()],ensure_ascii=False,indent=2)+'\n')
    (ROOT/'docs/higgsfield-audio-signal-check.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'generated_game_files':len(products),'total_game_files':len(manifest),'bytes':sum(x['bytes'] for x in manifest.values()),'signal':report},indent=2))
