# Verkehrsverhalten – das Quiz

Live-Quiz-Webseite zum Referat „Verkehrsverhalten – Mobilität, Umwelt und wie wir sie neu denken“.
Reines HTML/CSS/JavaScript – kein Build-Schritt, keine Installation. Der ganze Ordner `verkehrsquiz/` ist die Webseite.

| Adresse        | Inhalt                                             |
|----------------|----------------------------------------------------|
| `/`            | Startseite                                         |
| `/mitspielen/` | Handy: Spielcode + Spitzname (per QR-Code mit Code) |
| `/leiten/`     | Spielleitung für den Beamer                        |
| `/ergebnis/`   | Siegerpodest, Rangliste, CSV-Export, Tipps         |
| `/infos/`      | Zusammenfassung, Quellen, Impressum                |

Wichtige Dateien:
- `assets/questions.js` – **alle Fragen, Antworten, Erklärungen** (hier ändern)
- `assets/config.js` – Zugangsdaten für die Echtzeit-Verbindung (Supabase)
- `FRAGEN.md` – alle Fragen als Liste zum Prüfen

---

## Online stellen – Schritt für Schritt

Du brauchst zwei kostenlose Dinge: **(A)** einen Echtzeit-Dienst, damit alle Handys synchron sind, und **(B)** ein Hosting, damit die Seite eine Adresse hat.

### A) Echtzeit-Verbindung einrichten (Supabase, kostenlos, ca. 5 Minuten)

1. Auf <https://supabase.com> mit „Start your project“ ein kostenloses Konto anlegen.
2. „New project“ → Name z. B. `verkehrsquiz`, Region **Frankfurt (eu-central-1)**, beliebiges Datenbank-Passwort → „Create new project“. Kurz warten.
3. Links auf ⚙️ **Project Settings → API** (bzw. „Data API“ / „API Keys“) gehen und zwei Werte kopieren:
   - **Project URL** (z. B. `https://abcdefgh.supabase.co`)
   - **anon public**-Key (unter „Legacy API Keys“) – alternativ den **Publishable key** (`sb_publishable_…`)
4. Die Datei `assets/config.js` mit einem Texteditor öffnen und eintragen:
   ```js
   export const SUPABASE_URL = 'https://abcdefgh.supabase.co';
   export const SUPABASE_KEY = 'eyJhbGciOi…';
   ```
   Beide Werte sind öffentlich und dürfen im Browser stehen. Es werden **keine Tabellen** gebraucht – das Quiz nutzt nur „Realtime Broadcast“.
5. Falls unter **Project Settings → Realtime** die Option „Allow public access“ / „Private channels only“ existiert: öffentlicher Zugriff muss **erlaubt** sein (Standard).

> Ohne diese Daten läuft die Seite im **Demo-Modus**: Mitspielen klappt dann nur in weiteren Tabs desselben Browsers – gut zum Ausprobieren.

> Hinweis: Kostenlose Supabase-Projekte werden nach ca. 1 Woche ohne Nutzung pausiert. Dann einfach im Supabase-Dashboard auf „Restore“ klicken – am besten am Tag vor dem Referat einmal testen.

### B) Webseite veröffentlichen

**Variante 1 – Netlify Drop (am einfachsten, ohne Konto-Einrichtung)**
1. <https://app.netlify.com/drop> öffnen.
2. Den kompletten Ordner `verkehrsquiz` (mit der eingetragenen `config.js`) ins Browserfenster ziehen.
3. Fertig – du bekommst sofort eine Adresse wie `https://fröhlicher-name-123.netlify.app`.
4. Damit die Seite dauerhaft bleibt: kostenlos registrieren („Claim site“) und unter *Site configuration → Change site name* einen schönen Namen wählen, z. B. `verkehrsquiz-7b.netlify.app`.

**Variante 2 – Vercel (mit GitHub)**
1. Auf <https://vercel.com> mit dem GitHub-Konto anmelden → „Add New… → Project“ → dieses Repository importieren.
2. Bei **Root Directory** den Ordner `verkehrsquiz` auswählen, Framework „Other“, kein Build-Befehl.
3. „Deploy“ – die Adresse lautet dann z. B. `https://verkehrsquiz.vercel.app`.

**Variante 3 – GitHub Pages**
Repository → Settings → Pages → „Deploy from a branch“ → Branch wählen, Ordner `/ (root)`. Die Seite liegt dann unter `https://<name>.github.io/<repo>/verkehrsquiz/`.

Alle Links in der Seite sind relativ – sie funktioniert in jedem Unterordner.

---

## Ablauf im Unterricht

1. Laptop am Beamer: `…/leiten/` öffnen → **Neues Spiel starten** → mit ⛶ oder Taste **F** Vollbild.
2. Die Klasse scannt den QR-Code (Code ist schon eingetragen) und gibt Spitznamen ein. Max. 30 Spieler, keine doppelten Namen, einfacher Schimpfwortfilter. Namen lassen sich mit × entfernen.
3. **Spiel starten**. Pro Frage: 4 bzw. 6 Sekunden Vorschau („Achtung, doppelte Punkte!“ vor der letzten Frage), dann 20 Sekunden zum Antworten. Haben alle geantwortet, endet die Frage sofort.
4. Auflösung mit Antwort-Balkendiagramm, Erklärung und Fakten-Diagramm → **Zwischenstand** (Top 5) → **Nächste Frage**.
5. Am Ende: Siegerpodest, komplette Rangliste, Tipps, Abschlusszitat, Konfetti. **CSV-Export** für die Lehrkraft.

Tastatur: **Leertaste/→** = weiter · **P** = Pause · **F** = Vollbild.
Steuerung: Pausieren, Jetzt auflösen, Frage überspringen, Spieler entfernen, Beenden.

**Verbindungsabbruch:** Wer die Seite neu lädt, ist automatisch wieder drin. Wer den Tab schließt, bekommt beim erneuten Öffnen den Knopf „Als … wieder einsteigen“ oder tippt einfach denselben Spitznamen ein (nach ca. 15 Sekunden ohne Verbindung) – die Punkte bleiben erhalten.
Lädt die Spielleitung die Seite neu, erscheint „Laufendes Spiel fortsetzen“.

## Punkte
- Richtig: 500–1.000 Punkte, je schneller desto mehr. Falsch/keine Antwort: 0.
- Serienbonus: +100 für jede weitere richtige Antwort in Folge (max. +500).
- Letzte Frage zählt doppelt.
- Gleichstand: kürzere Gesamtantwortzeit gewinnt.

## Lokal testen
Im Ordner `verkehrsquiz` z. B. `python3 -m http.server 8000` starten und `http://localhost:8000/leiten/` öffnen (direkt per Doppelklick auf die HTML-Datei funktioniert es nicht).
