# Futurematch — Sådan åbner du projektet

## Trin for trin

**1. Åbn Terminal**
Finder → Programmer → Utilities → Terminal
— eller —
`Cmd + Space` → skriv "Terminal" → Enter

**2. Start serveren**
```
node /Users/nicolaikirk/Projekter/futurematch/server.js
```
Du ser: `✓ Futurematch kører på http://localhost:3456`

**3. Åbn dashboardet i browseren**
```
http://localhost:3456
```

**4. Åbn Claude Code for at arbejde videre**
```
claude /Users/nicolaikirk/Projekter/futurematch
```
Instruer Claude direkte — ændringer slår igennem med det samme i browseren.

---

## Når du er færdig
Luk serveren med `Ctrl + C` i terminalen.

## Backup
Al data gemmes i filen `data.json` i denne mappe.
Tag kopi af den fil hvis du vil have en backup.
