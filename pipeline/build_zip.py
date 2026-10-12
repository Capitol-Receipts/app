import csv,json,collections
F={'01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY','60':'AS','66':'GU','69':'MP','72':'PR','78':'VI'}
z=collections.defaultdict(lambda:collections.Counter())
with open('data/zip/cd119_zcta.txt',encoding='utf-8-sig') as f:
    r=csv.DictReader(f,delimiter='|')
    for row in r:
        zc=row['GEOID_ZCTA5_20']
        if not zc:continue
        g=row['GEOID_CD119_20'];st=F.get(g[:2]);d=g[2:]
        if not st or d=='ZZ':continue
        d=int(d) if d.isdigit() else 0
        if d in(98,99):d=0
        z[zc][(st,d)]+=int(row['AREALAND_PART'] or 0)+1
out=[]
for zc in sorted(z):
    c=z[zc];tot=sum(c.values());items=[k for k,v in c.most_common() if v/tot>=0.02] or [c.most_common(1)[0][0]]
    st=items[0][0]
    out.append(zc+st+'.'.join(str(d) for s,d in items if s==st))
s=','.join(out)
open('zipcd.txt','w').write(s)
print(len(out),len(s),out[:5],sum(1 for o in out if '.' in o))
