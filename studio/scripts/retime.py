import json,sys,subprocess
ep,src,target=sys.argv[1],sys.argv[2],float(sys.argv[3])
D=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',src]))
sil=[tuple(map(float,l.split())) for l in open(f'/tmp/sil{ep}.txt')]
# merge adjacent silences
m=[]
for a,b in sil:
    if m and a-m[-1][1]<0.05: m[-1]=(m[-1][0],b)
    else: m.append((a,b))
lines=[l.strip() for l in open(f'clips/drafts/mae-ep{ep}.narration.txt') if l.strip()]
n=len(lines); w=[len(l.replace(' ',''))for l in lines]; tot=sum(w)
# speech start/end
s0=m[0][1] if m[0][0]<0.05 else 0.0
s1=m[-1][0] if m[-1][1]>D-0.05 else D
cand=[(a+b)/2 for a,b in m if a>s0+0.3 and b<s1-0.3]; gap={(a+b)/2:b-a for a,b in m}
exp=[];c=0
for x in w[:-1]: c+=x; exp.append(s0+(s1-s0)*c/tot)
# DP choose n-1 increasing candidates minimizing deviation - gap bonus
K=len(cand); INF=1e9
dp=[[INF]*K for _ in range(n-1)]; bk=[[-1]*K for _ in range(n-1)]
cost=lambda i,j:(cand[j]-exp[i])**2 - 2.0*gap[cand[j]]
for j in range(K): dp[0][j]=cost(0,j)
for i in range(1,n-1):
    best=INF;bj=-1
    for j in range(K):
        if j>0 and dp[i-1][j-1]<best: best=dp[i-1][j-1];bj=j-1
        if bj>=0: dp[i][j]=best+cost(i,j); bk[i][j]=bj
j=min(range(K),key=lambda j:dp[n-2][j]); cuts=[]
for i in range(n-2,-1,-1): cuts.append(cand[j]); j=bk[i][j]
cuts=[0.0]+cuts[::-1]+[D]
segs=[cuts[i+1]-cuts[i] for i in range(n)]
pad=max(0,(target-D)/n)
json.dump({'cuts':cuts,'pad':pad},open(f'/tmp/rt/cuts{ep}.json','w'))
for i,(l,e) in enumerate(zip(lines,[0]+exp)): print(f'{i+1:2d} {cuts[i]:6.2f} exp {e:6.2f} seg {segs[i]:5.2f} {l[:30]}')
print('pad',round(pad,3),'D',D)
