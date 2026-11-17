import json,sys,subprocess,os
ep,src=sys.argv[1],sys.argv[2]
cj=json.load(open(f'/tmp/rt/cuts{ep}.json')); cuts,pad=cj['cuts'],cj['pad']
n=len(cuts)-1; FPS=30
# audio: each segment + pad silence, then loudnorm
fc=''.join(f'[0]atrim={cuts[i]:.4f}:{cuts[i+1]:.4f},asetpts=PTS-STARTPTS,apad=pad_dur={pad:.4f}[a{i}];' for i in range(n))
fc+=''.join(f'[a{i}]' for i in range(n))+f'concat=n={n}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100[o]'
os.makedirs('public/audio',exist_ok=True)
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',src,'-filter_complex',fc,'-map','[o]','-b:a','192k',f'public/audio/mae-ep{ep}.mp3'],check=True)
# shot durations in whole frames from cumulative new times
newc=[0];acc=0
for i in range(n): acc+=cuts[i+1]-cuts[i]+pad; newc.append(round(acc*FPS))
p=f'clips/mae-ep{ep}.json'; c=json.load(open(p))
assert len(c['shots'])==n,(len(c['shots']),n)
for i,s in enumerate(c['shots']):
    nd=(newc[i+1]-newc[i])/FPS; r=nd/s['dur']; s['dur']=round(nd,4)
    for a in s.get('actors',[]):
        for t in a.get('then',[]): t['at']=round(t['at']*r,3)
    for f in s.get('fx',[]):
        if isinstance(f.get('at'),(int,float)): f['at']=round(f['at']*r,3)
c['audio']=f'mae-ep{ep}.mp3'
json.dump(c,open(p,'w'),ensure_ascii=False,indent=2)
print('frames',newc[-1],'durs',[s['dur'] for s in c['shots']][:6])
