# 📞 Callcenter Chaos

Browser-Klon von *Scam With Your Friends*: Ihr betreibt im 3D-Büro (Ego-Perspektive) ein absurdes Betrugs-Callcenter, quatscht KI-Anrufer **per Mikrofon** über den Tisch, erfüllt die Tagesquote und überlebt die Beurteilung vom cholerischen Chef. Online-Koop für bis zu 4 Spieler.

Spielen: `index.html` über einen Webserver öffnen (z.B. GitHub Pages → `/motorcycle-game/callcenter/`). Für das Mikrofon Chrome oder Edge nehmen.

## Spielablauf

1. Am Platz setzen (`E`) → das Telefon klingelt → annehmen.
2. `V` gedrückt halten und reden (oder tippen). Der Anrufer ist eine KI mit eigener Persönlichkeit und reagiert frei.
3. Vertrauen aufbauen → **RemoteBuddy** installieren lassen → nach dem **Code** fragen → in der RemoteBuddy-App verbinden.
4. Auf dem PC des Opfers das Online-Banking öffnen → Anrufer zum **Login** überreden → überweisen. Der Anrufer sieht, was du tust (außer du schwärzt den Bildschirm, was ihn aber misstrauisch macht).
5. Gefahren: **Viren** (falsche Datei geöffnet → Popups auf deinem PC), **Scambaiter** (Fake-Konto, -20 %, du landest auf YouTube), **Polizeirazzia** (zum Schredder rennen), **Stromausfall** (Sicherungskasten).
6. Um 17:00 Uhr kommt die **Leistungsbeurteilung**. Quote verfehlt bedeutet gefeuert, und der Run startet neu. Jeden Tag wird eine neue Masche freigeschaltet.

## Apps auf dem PC (wie im Original)

- Telefon (Anrufer-Vertrauen mit Änderung, Porträt, Annehmen/Auflegen), RemoteBuddy (Fernzugriff), Kamera (mit Untertiteln), Skript, Notizen, Hintergründe
- Daten-Apps mit einzeln geprüften Feldern, im Scamazon-Tab „Scams“ nach Tagen freischaltbar: Gutscheine, Kreditkarte, Bitcoin, Identität, Bank, Passwort-Wiederherstellung, Flugmeilen, Kundeninfo (Live-Profil des Anrufers)
- 16 Bezahl-Portale (Krankenkasse, Dating, Rentenfonds ...), Scamazon-Shop, Rainbit-Casino, Meteor Cookie, JW Paint, Discorde, Zoomy, Malwarebits, Ledger, Browser, Banditcam
- Viren: „VIRUS ENTDECKT“, Glitch, fliegende Symbole, Werbe-Taskleiste, Popups, System-Meldungen
- Feierabend: Countdown, Live-Statistik an der Wand, Beurteilungs-Karte, Kündigungsbericht, brennendes Büro

## KI-Modi (Anrufer-Gehirn)

| Modus | Einrichtung |
|---|---|
| **Eigener API-Key** | Claude-API-Key im Menü eintragen; er bleibt nur im Browser (localStorage). Am schnellsten zum Ausprobieren. |
| **Server (Supabase)** | Edge Function `supabase/functions/caller-brain` deployen, Secret `ANTHROPIC_API_KEY` setzen, URL und Key in `config.js` eintragen. Danach brauchen Mitspieler keinen eigenen Key. |
| **Offline-Testmodus** | Automatisch ohne Key: einfache Schlüsselwort-Logik, nur zum Testen. |

## Online-Koop einrichten

1. Supabase-Projekt anlegen (Realtime ist standardmäßig an).
2. In `config.js` `SUPABASE_URL` und den publishable/anon `SUPABASE_KEY` eintragen.
3. Optional die Edge Function für die KI deployen:
   ```
   supabase functions deploy caller-brain
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase secrets set ALLOWED_ORIGIN=https://<dein-name>.github.io
   ```
   Der Endpunkt ist öffentlich erreichbar. Setz deshalb in der Anthropic Console ein Ausgabenlimit.

Ein Spieler erstellt einen Raum, die anderen treten mit dem 5-stelligen Code bei. Der erste Spieler im Raum ist der Host: Er steuert Uhr, Quote, Chaos-Events und die Chef-Beurteilung. Jeder führt seine eigenen Telefonate; die Sätze erscheinen als Sprechblasen über dem Platz.

## Modding

`personas.json` enthält die Anrufer (Persönlichkeit, Leichtgläubigkeit, Kontostand, Stimme, Scambaiter ja/nein), `config.js` die Maschen (`SCAMS`), die Tageslänge und die Quote.

## Dateien

- `js/main.js`: 3D-Spiel, Bewegung, Tagesablauf, Chef, Chaos, Koop-Sync
- `js/office.js`: Büro (Three.js)
- `js/computer.js`: PC mit Telefon, RemoteBuddy, Bank und Viren
- `js/brain.js`: Anbindung an die KI (API-Key, Supabase oder offline)
- `js/voice.js`: Spracherkennung, Sprachausgabe und Sounds (Web Speech API)
- `js/net.js`: Supabase Realtime (Presence und Broadcast)
- `supabase/functions/caller-brain/`: Edge Function mit Prompt-Logik (`brain-core.js` nutzt auch der Browser)
