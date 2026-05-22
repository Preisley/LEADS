# Deploy Futurematch online — trin for trin

Du skal bruge ca. 15 minutter og to gratis konti:
- **GitHub** (kode-opbevaring)
- **Railway** (hosting)

---

## Trin 1 — Gem din data lokalt

Inden du uploader koden, skal du gemme dine data ned fra den lokale version.

1. Åbn `futurematch-likviditet.html` i din browser
2. Klik på **Eksportér data** (knappen et sted nede på siden)
3. Gem filen — du bruger den i **Trin 6**

---

## Trin 2 — Opret GitHub-konto (spring over hvis du allerede har en)

Gå til **github.com** og opret en gratis konto.

---

## Trin 3 — Opret et nyt privat repository på GitHub

1. Gå til **github.com/new**
2. Giv det navn: `futurematch`
3. Sæt det til **Private** (vigtigt — dine data skal ikke være offentlige)
4. Klik **Create repository**
5. GitHub viser nu en side med kommandoer — lad den stå åben

---

## Trin 4 — Upload koden til GitHub

Åbn **Terminal** på din Mac og kør disse kommandoer én ad gangen:

```bash
cd /Users/nicolaikirk/Projekter/futurematch

git init
git add futurematch-likviditet.html server.js package.json .gitignore
git commit -m "Første upload"
git branch -M main
```

Nu skal du forbinde til dit GitHub-repository.
Erstat `DIT-BRUGERNAVN` med dit GitHub-brugernavn:

```bash
git remote add origin https://github.com/DIT-BRUGERNAVN/futurematch.git
git push -u origin main
```

GitHub beder dig muligvis logge ind. Brug dit brugernavn og adgangskode (eller en "Personal Access Token" som du opretter under Settings → Developer Settings).

---

## Trin 5 — Opret Railway-konto og deploy

1. Gå til **railway.app** og opret en gratis konto (log ind med GitHub — nemmest)
2. Klik **New Project**
3. Vælg **Deploy from GitHub repo**
4. Vælg dit `futurematch` repository
5. Railway starter automatisk med at bygge og deploye — det tager 1-2 minutter
6. Når det er klar, klik på dit projekt og find **Settings → Domains**
7. Klik **Generate Domain** — du får et link som fx `futurematch-production.up.railway.app`

---

## Trin 6 — Sæt adgangskode

1. I Railway: klik på dit projekt → **Variables**
2. Klik **New Variable**
3. Navn: `APP_PASSWORD`
4. Værdi: vælg selv en kode (fx `fm2026`) — **del denne kode med Helle**
5. Klik **Add** — Railway genstarter automatisk med adgangskoden aktiv

Når I nu åbner linket, beder browseren om brugernavn og kode:
- **Brugernavn:** hvad som helst (fx `futurematch`)
- **Kode:** den kode du satte i APP_PASSWORD

---

## Trin 7 — Importer dine data

1. Åbn dit nye link (fx `futurematch-production.up.railway.app`)
2. Log ind med adgangskoden
3. Find **Importér data**-knappen og upload filen fra Trin 1
4. Dine data er nu i den delte database ✓

---

## Trin 8 — Del linket med Helle

Send hende:
- **Linket** (fx `futurematch-production.up.railway.app`)
- **Koden** fra Trin 6

I kan begge åbne og redigere — ændringer gemmes automatisk til den fælles database.

---

## Vigtig info om data

- Data gemmes i en fil på Railway-serveren
- Railway har **ikke** gratis persistent storage som standard
- Data *kan* forsvinde hvis Railway genstarter serveren (sker sjældent)
- **Anbefaling:** Brug **Eksportér data** en gang om ugen som backup

### Vil du have 100% sikker data-opbevaring?

Sig til — så tilføjer vi en gratis database (Upstash Redis) som aldrig mister data, også
ved genstart. Det er 10 minutters ekstra arbejde.

---

## Opdatér siden fremover

Når du har lavet ændringer i HTML-filen lokalt:

```bash
cd /Users/nicolaikirk/Projekter/futurematch
git add futurematch-likviditet.html
git commit -m "Opdatering"
git push
```

Railway opdaterer automatisk den live side inden for 1-2 minutter.
