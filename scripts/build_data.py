#!/usr/bin/env python3
"""
Wire to Wire historical player-pool generator.

Builds data/seed-pools.js from the SABR Lahman Baseball Database.
Default source is an unofficial GitHub mirror of SABR's 1871-2025 CSV release.
For production/reproducibility, download the official comma-delimited release
from https://sabr.org/lahman-database and pass --data-dir PATH.

No third-party Python packages are required.
"""
from __future__ import annotations
import argparse, csv, io, json, math, statistics, sys, urllib.request
from collections import defaultdict
from pathlib import Path

MIRROR = "https://raw.githubusercontent.com/cbwinslow/lahman-database-csv/main/data"
FILES = ["People.csv", "Teams.csv", "TeamsFranchises.csv", "Batting.csv", "Pitching.csv", "Appearances.csv"]
POS_COLS = [("C","G_c"),("1B","G_1b"),("2B","G_2b"),("3B","G_3b"),("SS","G_ss"),
            ("LF","G_lf"),("CF","G_cf"),("RF","G_rf"),("DH","G_dh")]
ROSTER_POS = ["C","1B","2B","3B","SS","LF","CF","RF","DH","SP"]

def num(v, default=0.0):
    try:
        if v is None or str(v).strip()=="":
            return default
        return float(v)
    except (ValueError, TypeError):
        return default

def integer(v, default=0):
    return int(num(v, default))

def decade(y): return f"{(int(y)//10)*10}s"
def clamp(x, lo, hi): return max(lo, min(hi, x))

def read_csv_bytes(data: bytes):
    return list(csv.DictReader(io.StringIO(data.decode("utf-8-sig", errors="replace"))))

def load_table(name: str, data_dir: Path | None, cache_dir: Path):
    if data_dir:
        p = data_dir / name
        if not p.exists():
            raise FileNotFoundError(f"Missing {p}")
        return read_csv_bytes(p.read_bytes())
    cache_dir.mkdir(parents=True, exist_ok=True)
    p = cache_dir / name
    if not p.exists():
        url = f"{MIRROR}/{name}"
        print(f"Downloading {name} ...", file=sys.stderr)
        req = urllib.request.Request(url, headers={"User-Agent":"Wire-to-Wire-data-builder/1.0"})
        with urllib.request.urlopen(req, timeout=90) as r:
            p.write_bytes(r.read())
    return read_csv_bytes(p.read_bytes())

def mean_sd(vals):
    vals=[x for x in vals if math.isfinite(x)]
    if len(vals)<2: return (0.0,1.0)
    return statistics.mean(vals), max(statistics.pstdev(vals), 0.01)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--data-dir", type=Path, help="Folder containing official Lahman CSV files")
    ap.add_argument("--output", type=Path, default=Path("data/seed-pools.js"))
    ap.add_argument("--cache-dir", type=Path, default=Path(".cache/lahman"))
    ap.add_argument("--min-year", type=int, default=1901)
    ap.add_argument("--players-per-pool", type=int, default=24)
    ap.add_argument("--include-defunct-franchises", action="store_true")
    args=ap.parse_args()

    tables={n:load_table(n,args.data_dir,args.cache_dir) for n in FILES}
    people={r["playerID"]: f'{r.get("nameFirst","").strip()} {r.get("nameLast","").strip()}'.strip()
            for r in tables["People.csv"]}

    franchises=tables["TeamsFranchises.csv"]
    active_franch={r["franchID"] for r in franchises if r.get("active","").upper()=="Y"}
    if args.include_defunct_franchises:
        active_franch={r["franchID"] for r in franchises}

    # Exact historical team names from Teams.csv automatically preserve identities
    # such as Montreal Expos, Brooklyn Dodgers, Seattle Pilots, etc.
    team_meta={}
    for r in tables["Teams.csv"]:
        y=integer(r.get("yearID"))
        if y < args.min_year or r.get("franchID") not in active_franch:
            continue
        team_meta[(y,r["teamID"])]={"name":r.get("name",r["teamID"]).strip(),
                                    "franchID":r.get("franchID","")}
    valid_keys=set(team_meta)

    # Decade baselines make ratings fairer across high- and low-offense eras.
    ops_by_dec=defaultdict(list)
    for r in tables["Batting.csv"]:
        y=integer(r.get("yearID")); key=(y,r.get("teamID",""))
        if key not in valid_keys or num(r.get("AB")) < 100: continue
        ab=num(r.get("AB")); h=num(r.get("H")); d2=num(r.get("2B")); d3=num(r.get("3B"))
        hr=num(r.get("HR")); bb=num(r.get("BB")); hbp=num(r.get("HBP")); sf=num(r.get("SF"))
        den=ab+bb+hbp+sf
        obp=(h+bb+hbp)/den if den else 0
        slg=(h+d2+2*d3+3*hr)/ab if ab else 0
        ops_by_dec[decade(y)].append(obp+slg)

    era_by_dec=defaultdict(list)
    for r in tables["Pitching.csv"]:
        y=integer(r.get("yearID")); key=(y,r.get("teamID",""))
        ip=num(r.get("IPouts"))/3
        if key not in valid_keys or ip < 50: continue
        er=num(r.get("ER")); era=9*er/ip if ip else 99
        if era < 20: era_by_dec[decade(y)].append(era)

    ops_base={d:mean_sd(v) for d,v in ops_by_dec.items()}
    era_base={d:mean_sd(v) for d,v in era_by_dec.items()}

    bat=defaultdict(lambda:defaultdict(float))
    pit=defaultdict(lambda:defaultdict(float))
    apps=defaultdict(lambda:defaultdict(float))

    def group_key(row):
        y=integer(row.get("yearID")); tid=row.get("teamID","")
        m=team_meta.get((y,tid))
        if not m: return None
        return (m["name"], decade(y), row.get("playerID",""))

    for r in tables["Batting.csv"]:
        k=group_key(r)
        if not k: continue
        a=bat[k]
        for c in ["G","AB","R","H","2B","3B","HR","RBI","SB","CS","BB","SO","IBB","HBP","SH","SF","GIDP"]:
            a[c]+=num(r.get(c))

    for r in tables["Pitching.csv"]:
        k=group_key(r)
        if not k: continue
        a=pit[k]
        for c in ["W","L","G","GS","CG","SHO","SV","IPouts","H","ER","HR","BB","SO","BFP"]:
            a[c]+=num(r.get(c))

    for r in tables["Appearances.csv"]:
        k=group_key(r)
        if not k: continue
        a=apps[k]
        for _,c in POS_COLS:
            a[c]+=num(r.get(c))
        a["G_p"]+=num(r.get("G_p"))

    groups=defaultdict(set)
    for k in set(bat)|set(pit)|set(apps):
        groups[(k[0],k[1])].add(k[2])

    pools=[]
    for (team,era), pids in sorted(groups.items()):
        candidates=[]
        for pid in pids:
            k=(team,era,pid); b=bat[k]; p=pit[k]; a=apps[k]
            positions=[]
            maxg=max([a[c] for _,c in POS_COLS] or [0])
            for pos,c in POS_COLS:
                g=a[c]
                if g>=10 and (g>=0.20*maxg or g>=40):
                    positions.append(pos)

            ab=b["AB"]; h=b["H"]; d2=b["2B"]; d3=b["3B"]; hr=b["HR"]; bb=b["BB"]; hbp=b["HBP"]; sf=b["SF"]
            den=ab+bb+hbp+sf
            avg=h/ab if ab else 0
            obp=(h+bb+hbp)/den if den else 0
            slg=(h+d2+2*d3+3*hr)/ab if ab else 0
            ops=obp+slg

            hitter_rating=None
            if ab>=60 and positions:
                mu,sd=ops_base.get(era,(0.72,0.10))
                z=(ops-mu)/sd
                impact=min(1.5, math.log10(max(ab,1)/60+1))*1.4
                speed=min(1.2,b["SB"]/50)
                hitter_rating=round(clamp(84 + 6.0*z + impact + speed, 72, 99))

            ip=p["IPouts"]/3
            pitcher_rating=None
            if p["GS"]>=3 and ip>=20:
                era_val=9*p["ER"]/ip if ip else 99
                k9=9*p["SO"]/ip if ip else 0
                mu,sd=era_base.get(era,(4.0,1.0))
                z=(mu-era_val)/sd
                workload=min(2.0, math.log10(ip/20+1)*2)
                kbonus=clamp((k9-5.0)*0.35,-1.0,2.0)
                pitcher_rating=round(clamp(84 + 6.0*z + workload + kbonus,72,99))
                positions.append("SP")

            if hitter_rating is None and pitcher_rating is None:
                continue
            rating=max(x for x in [hitter_rating,pitcher_rating] if x is not None)
            if hitter_rating is not None and ab>=100 and "DH" not in positions:
                positions.append("DH")
            positions=[x for x in ROSTER_POS if x in set(positions)]
            if not positions: continue

            if pitcher_rating is not None and rating==pitcher_rating and (hitter_rating is None or pitcher_rating>=hitter_rating+3):
                era_val=9*p["ER"]/ip if ip else 0
                stat=f"{era_val:.2f} ERA · {int(round(p['SO']))} K · {int(round(ip))} IP"
            else:
                stat=f"{avg:.3f} AVG · {int(round(hr))} HR · {int(round(b['RBI']))} RBI"
            candidates.append({"name":people.get(pid,pid),"positions":positions,"rating":rating,
                               "stat":stat,"playerID":pid,"_ab":ab,"_ip":ip})

        # Secure up to 3 strong choices per roster position, then fill with best overall.
        chosen={}
        for pos in ROSTER_POS:
            eligible=[c for c in candidates if pos in c["positions"]]
            eligible.sort(key=lambda x:(x["rating"],x["_ab"]+x["_ip"]), reverse=True)
            for c in eligible[:3]:
                chosen[c["playerID"]]=c
        for c in sorted(candidates,key=lambda x:(x["rating"],x["_ab"]+x["_ip"]),reverse=True):
            if len(chosen)>=args.players_per_pool: break
            chosen[c["playerID"]]=c

        players=sorted(chosen.values(),key=lambda x:(-x["rating"],x["name"]))
        for c in players:
            c.pop("_ab",None); c.pop("_ip",None)
        coverage={pos:sum(pos in c["positions"] for c in players) for pos in ROSTER_POS}
        if len(players)>=8 and sum(v>0 for v in coverage.values())>=7:
            pools.append({"team":team,"era":era,"players":players,"coverage":coverage})

    payload=[{"team":p["team"],"era":p["era"],"players":p["players"]} for p in pools]
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text("window.WTW_POOLS="+json.dumps(payload,ensure_ascii=False,separators=(",",":"))+";\n",
                           encoding="utf-8")

    report=args.output.with_suffix(".report.json")
    report.write_text(json.dumps({
        "source":"SABR Lahman Baseball Database 1871-2025",
        "pools":len(payload),
        "players_total":sum(len(p["players"]) for p in payload),
        "teams":len({p["team"] for p in payload}),
        "eras":sorted({p["era"] for p in payload}),
        "note":"Ratings are Wire to Wire prototype/game ratings, not official MLB ratings.",
        "pool_coverage":[{"team":p["team"],"era":p["era"],"coverage":p["coverage"]} for p in pools]
    },indent=2),encoding="utf-8")

    print(f"Wrote {len(payload)} pools / {sum(len(p['players']) for p in payload)} player entries -> {args.output}")
    print(f"Report -> {report}")

if __name__=="__main__":
    main()
