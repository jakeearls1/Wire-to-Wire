# Wire to Wire

A mobile-first baseball roster challenge inspired by the spin → draft → build → simulate loop.

## Game loop
1. Spin a valid Team + Era combination.
2. Choose one eligible historical player.
3. Assign him to C, 1B, 2B, 3B, SS, LF, CF, RF, DH, or SP.
4. Repeat for 10 rounds.
5. Simulate a 162-game season.
6. Earn coins and share the result.

## Data
The production data pipeline is designed for the SABR Lahman Baseball Database (1871–2025). It uses Teams, People, Batting, Pitching, Appearances, and FieldingOFsplit to build team/decade player pools. The source database is © SABR / Sean Lahman and distributed under CC BY-SA 3.0. See ATTRIBUTION.md.

The repository ships with a small seed dataset so the UI is immediately playable before the full data build runs.

## Historical identities
Current MLB clubs are included alongside historical identities such as Montreal Expos, Brooklyn Dodgers, New York Giants, Seattle Pilots, St. Louis Browns, Washington Senators, Philadelphia/Kansas City Athletics, Milwaukee/Boston Braves, Florida Marlins, Tampa Bay Devil Rays, Houston Colt .45s, and others.

## Deploy
This is a static web app. It can be hosted on GitHub Pages, Cloudflare Pages, Netlify, Vercel, or any static host.
