// =====================================================================
//  FRAGEN FÜR DAS QUIZ „Verkehrsverhalten – das Quiz“
// ---------------------------------------------------------------------
//  Diese Datei kann ohne Programmierkenntnisse angepasst werden:
//  - question    : Fragetext
//  - type        : "mc" (4 Antworten), "tf" (Wahr/Falsch), "estimate" (Schätzfrage)
//  - difficulty  : "leicht", "mittel" oder "schwer" (nur zur Info)
//  - answers     : Antworten in der angezeigten Reihenfolge
//  - correct     : Nummer der richtigen Antwort – ACHTUNG: Zählung beginnt bei 0!
//                  (0 = erste Antwort ▲, 1 = zweite ◆, 2 = dritte ●, 3 = vierte ■)
//  - explanation : Erklärung, die nach der Frage auf dem Beamer erscheint
//  - chart       : (optional) Diagramm zur Auflösung
//  Die LETZTE Frage zählt automatisch doppelt.
// =====================================================================

export const QUIZ = {
  title: 'Verkehrsverhalten – das Quiz',
  timeLimit: 20,      // Sekunden pro Frage
  maxPlayers: 30,

  questions: [
    // ---------- A) Mehr Autos ----------
    {
      topic: 'A', type: 'estimate', difficulty: 'schwer',
      question: 'Schätzfrage: Wie viele Pkw waren am 1. Januar 2026 in Deutschland zugelassen?',
      answers: ['unter 20 Millionen', '20 bis 35 Millionen', '35 bis 45 Millionen', 'über 45 Millionen'],
      correct: 3,
      explanation: '49,5 Millionen Pkw – das sind mehr als halb so viele Autos wie Einwohner! Erinnert ihr euch an die Kurve „Pkw je 1.000 Einwohner“: von 532 im Jahr 2000 auf 580 im Jahr 2023.',
      chart: {
        kind: 'line', title: 'Pkw je 1.000 Einwohner', unit: '',
        points: [[2000, 532], [2005, 559], [2010, 511], [2015, 548], [2020, 580], [2023, 580]],
        yMin: 450, yMax: 620,
        note: '2010: geänderte Zählweise'
      }
    },
    {
      topic: 'A', type: 'tf', difficulty: 'leicht',
      question: 'Wahr oder falsch? In Deutschland gibt es mehr Autos als Einwohner.',
      answers: ['Wahr', 'Falsch'],
      correct: 1,
      explanation: 'Falsch – aber es sind schon mehr als halb so viele: 49,5 Mio. Pkw. 2023 kamen auf 1.000 Einwohner 580 Autos.'
    },

    // ---------- B) Mobilität an einem Tag ----------
    {
      topic: 'B', type: 'mc', difficulty: 'leicht',
      question: 'Mit welchem Verkehrsmittel werden in Deutschland die meisten Wege zurückgelegt?',
      answers: ['Auto (selbst gefahren)', 'Zu Fuß', 'Fahrrad', 'Bus und Bahn'],
      correct: 0,
      explanation: '40 % aller Wege fahren die Menschen selbst mit dem Auto, zu Fuß sind es 26 %. Das zeigt die Studie „Mobilität in Deutschland“ 2023 aus dem Vortrag.',
      chart: {
        kind: 'bar', title: 'Anteil an allen Wegen (MiD 2023)', unit: '%',
        data: [['Auto selbst gefahren', 40], ['Zu Fuß', 26], ['Mitfahrer', 13], ['Fahrrad', 11], ['Bus/Bahn', 11]],
        highlight: ['Auto selbst gefahren']
      }
    },
    {
      topic: 'B', type: 'estimate', difficulty: 'schwer',
      question: 'Schätzfrage: Wie viele Minuten ist jede Person in Deutschland im Durchschnitt pro Tag unterwegs?',
      answers: ['15 bis 30 Minuten', '31 bis 60 Minuten', '61 bis 90 Minuten', 'mehr als 90 Minuten'],
      correct: 2,
      explanation: '84 Minuten und 35 km pro Person und Tag! Alle zusammen legen täglich 3 Milliarden km zurück – das ist 75.000-mal um die Erde.'
    },

    // ---------- C) Güterverkehr ----------
    {
      topic: 'C', type: 'mc', difficulty: 'mittel',
      question: 'Wie hat sich der Güterverkehr auf der Straße von 1991 bis 2020 entwickelt?',
      answers: ['Er ist ungefähr gleich geblieben', 'Er hat sich halbiert', 'Er hat sich fast verdoppelt', 'Er hat sich verzehnfacht'],
      correct: 2,
      explanation: 'Von 246 auf 487 Milliarden Tonnenkilometer (1 Tonne über 1 km transportiert) – fast doppelt so viel! Fast drei Viertel aller Güter fahren auf der Straße, das Binnenschiff ist sogar geschrumpft.',
      chart: {
        kind: 'grouped', title: 'Güterverkehr in Mrd. Tonnenkilometern', unit: '',
        categories: ['Straße', 'Schiene', 'Binnenschiff'],
        series: [['1991', [246, 82, 56]], ['2020', [487, 121, 46]]]
      }
    },

    // ---------- D) Stau ----------
    {
      topic: 'D', type: 'mc', difficulty: 'mittel',
      question: 'In welchem Jahr gab es laut ADAC am meisten Stau auf deutschen Autobahnen?',
      answers: ['2020', '2012', '2024', '2018'],
      correct: 3,
      explanation: '2018 war das Rekordjahr mit 1.528 Tausend Stau-Kilometern. 2020 gab es wegen Corona viel weniger Stau – seitdem steigt er wieder.',
      chart: {
        kind: 'bar', title: 'Stau auf Autobahnen (Tausend km, ADAC)', unit: '',
        data: [['2012', 595], ['2014', 960], ['2016', 1378], ['2018', 1528], ['2020', 679], ['2022', 733], ['2024', 859]],
        highlight: ['2018'],
        note: 'ab 2022 neue Messmethode'
      }
    },

    // ---------- E) Klima ----------
    {
      topic: 'E', type: 'mc', difficulty: 'schwer',
      question: 'Seit 1990 sind die Treibhausgase in Deutschland insgesamt um 39 % gesunken. Und im Verkehr?',
      answers: ['Auch um 39 %', 'Nur um 10 %', 'Um mehr als 50 %', 'Gar nicht – sie haben sich verdoppelt'],
      correct: 1,
      explanation: 'Im Verkehr nur −10 % (von 163 auf 147 Mio. t). Deshalb stieg sein Anteil an allen Treibhausgasen von 13 % auf 19 % – der Verkehr ist das Sorgenkind beim Klimaschutz.',
      chart: {
        kind: 'grouped', title: 'Treibhausgase in Mio. Tonnen', unit: '',
        categories: ['Insgesamt (−39 %)', 'Verkehr (−10 %)'],
        series: [['1990', [1242, 163]], ['heute', [759, 147]]]
      }
    },

    // ---------- F) Luftqualität: NO₂ an der Landshuter Allee ----------
    {
      topic: 'F', type: 'estimate', difficulty: 'mittel',
      question: 'Schätzfrage: Wie hoch war 2018 das NO₂-Jahresmittel an der Landshuter Allee in München? (NO₂ = Stickstoffdioxid, ein Abgas)',
      answers: ['bis 20 µg/m³', '21 bis 40 µg/m³', '41 bis 60 µg/m³', 'über 60 µg/m³'],
      correct: 3,
      explanation: '66 Mikrogramm pro Kubikmeter Luft – weit über dem Grenzwert von 40! Bis 2025 sank der Wert auf 38 µg/m³, also um 42 %. Erinnert ihr euch an die Folie zur Landshuter Allee?',
      chart: 'no2'
    },
    {
      topic: 'F', type: 'tf', difficulty: 'leicht',
      question: 'Wahr oder falsch? An der Landshuter Allee wird der NO₂-Grenzwert seit 2024 eingehalten.',
      answers: ['Wahr', 'Falsch'],
      correct: 0,
      explanation: 'Wahr! Seit 2024 liegt der Wert erstmals unter dem Grenzwert von 40 µg/m³ – 2025 waren es nur noch 38 µg/m³.',
      chart: 'no2'
    },
    {
      topic: 'F', type: 'mc', difficulty: 'mittel',
      question: 'Ab 2030 gilt ein strengerer EU-Grenzwert für NO₂. Wie hoch ist er?',
      answers: ['80 µg/m³', '60 µg/m³', '40 µg/m³', '20 µg/m³'],
      correct: 3,
      explanation: '20 µg/m³ – nur halb so viel wie bisher. Mit 38 µg/m³ müsste die Landshuter Allee ihren Wert also noch einmal fast halbieren.',
      chart: 'no2'
    },

    // ---------- G) Diesel-Fahrverbote & Umweltzonen ----------
    {
      topic: 'G', type: 'mc', difficulty: 'schwer',
      question: 'Welche Stadt hat 2018 das erste Diesel-Fahrverbot in Deutschland verhängt?',
      answers: ['Stuttgart', 'Darmstadt', 'Hamburg', 'München'],
      correct: 2,
      explanation: 'Hamburg am 31.05.2018 – kurz nachdem das Bundesverwaltungsgericht Leipzig Fahrverbote erlaubt hatte (2023 wieder aufgehoben). Auch in Hessen gibt es eins: in Darmstadt seit 2019.'
    },
    {
      topic: 'G', type: 'mc', difficulty: 'leicht',
      question: 'Welche Plakette braucht ein Auto, um in eine Umweltzone fahren zu dürfen?',
      answers: ['Grün', 'Gelb', 'Rot', 'Blau'],
      correct: 0,
      explanation: 'In Umweltzonen dürfen nur Autos mit grüner Plakette fahren. So bleiben besonders schmutzige Fahrzeuge draußen und die Luft in der Stadt wird sauberer.'
    },

    // ---------- H) Karikatur ----------
    {
      topic: 'H', type: 'mc', difficulty: 'leicht',
      question: 'Karikatur „Wir haben die Wahl …“: Gleich viele Menschen fahren Auto, Rad oder Bus. Was zeigt sie?',
      answers: ['Alle brauchen gleich viel Platz', 'Busse machen den meisten Stau', 'Radfahrer stehen am längsten im Stau', 'Sie brauchen ganz unterschiedlich viel Platz'],
      correct: 3,
      explanation: '„Stau.“ – „Stau?“ – „Staunen.“: Gleich viele Menschen, aber ganz unterschiedlich viel Platz und Abgase. Wir haben die Wahl!'
    },

    // ---------- I) CO₂ pro Person und Kilometer ----------
    {
      topic: 'I', type: 'mc', difficulty: 'mittel',
      question: 'Wie viel CO₂ verursacht eine 100-km-Fahrt mit dem Fernzug pro Person?',
      answers: ['3,6 kg', '13,9 kg', '0 kg', '20,1 kg'],
      correct: 0,
      explanation: 'Nur 3,6 kg – mit dem Auto (Verbrenner) wären es 13,9 kg, fast viermal so viel. Am besten schneidet das Fahrrad ab: 0 g CO₂.',
      chart: 'co2'
    },
    {
      topic: 'I', type: 'mc', difficulty: 'leicht', situation: true,
      question: 'Dein Schulweg ist 1,5 km lang. Was ist am besten für Luft und Klima?',
      answers: ['Elterntaxi mit dem Auto', 'Zu Fuß oder mit dem Fahrrad', 'Mit dem E-Auto der Eltern', 'Mit dem Auto, aber ganz langsam'],
      correct: 1,
      explanation: 'Zu Fuß oder mit dem Rad: 0 g CO₂, keine Abgase und kein Stau vor der Schule. Mit einem Walk-to-School-Day oder dem Aktionstag „Rund ums Fahrrad“ wird daraus eine Aktion für die ganze Schule.',
      chart: 'co2'
    },

    // ---------- J) Elektromobilität ----------
    {
      topic: 'J', type: 'mc', difficulty: 'mittel',
      question: 'Warum ist ein E-Auto nicht automatisch klimafreundlich?',
      answers: ['Es kommt auf den Strom an', 'Es stößt mehr NO₂ aus', 'Es ist lauter', 'Es braucht mehr Sprit'],
      correct: 0,
      explanation: 'Ein E-Auto hat keinen Auspuff – also kein NO₂ an der Straße und weniger Lärm. Fürs Klima zählt aber der Strom, und im Stau steht es genauso und braucht genauso viel Platz.',
      chart: {
        kind: 'bar', title: 'E-Autos in Deutschland (Mio., jeweils 1. Januar)', unit: ' Mio.',
        data: [['2024', 1.41], ['2025', 1.65], ['2026', 2.03]],
        highlight: ['2026'],
        note: '2026: erst 4,1 % aller Pkw'
      }
    },

    // ---------- K) Klimabilanz über ein Autoleben ----------
    {
      topic: 'K', type: 'tf', difficulty: 'schwer',
      question: 'Wahr oder falsch? Mit Ökostrom ist ein E-Auto über sein ganzes Autoleben fast fünfmal besser fürs Klima als ein Benziner.',
      answers: ['Wahr', 'Falsch'],
      correct: 0,
      explanation: 'Wahr: ca. 8 t statt 38 t CO₂ auf 225.000 km (ADAC). Mit normalem Strommix ist es dagegen nur etwa so gut wie ein Diesel – auch wegen des CO₂-Rucksacks durch den Akku.',
      chart: {
        kind: 'bar', title: 'CO₂ über ein Autoleben (225.000 km, ADAC 2019)', unit: ' t',
        data: [['Benzin', 38], ['Diesel', 34], ['E-Auto (Strommix)', 34], ['Erdgas', 31], ['Wasserstoff (Ökostrom)', 10], ['E-Auto (Ökostrom)', 8]],
        highlight: ['Benzin', 'E-Auto (Ökostrom)']
      }
    },

    // ---------- L) Was jede/r selbst tun kann ----------
    {
      topic: 'L', type: 'mc', difficulty: 'leicht', situation: true,
      question: 'Vier Kinder aus deiner Straße fahren zum selben Fußballtraining – jedes wird einzeln mit dem Auto gebracht. Was ist die beste Idee?',
      answers: ['Alles bleibt, wie es ist', 'Eine Fahrgemeinschaft bilden', 'Die Familien kaufen einen Zweitwagen', 'Schneller fahren, dann geht es kürzer'],
      correct: 1,
      explanation: 'Eine Fahrgemeinschaft macht aus vier Autofahrten eine – das spart Sprit, CO₂ und Platz. Noch besser: mit dem Rad oder dem Bus fahren, wenn es geht.'
    },
    {
      topic: 'L', type: 'mc', difficulty: 'mittel', situation: true,
      question: 'Deine Familie bestellt viel online. Was hilft, den Lieferverkehr zu verringern?',
      answers: ['Jedes Teil einzeln bestellen', 'Immer Expresslieferung wählen', 'Bestellungen bündeln, weniger zurückschicken', 'Mehrere Größen bestellen, Rest zurückschicken'],
      correct: 2,
      explanation: 'Jedes einzelne Paket und jede Rücksendung bedeutet zusätzliche Lieferfahrten. Noch besser: regional einkaufen – dann sind die Transportwege kürzer.'
    },

    // ---------- O) Fazit (zählt doppelt, weil letzte Frage) ----------
    {
      topic: 'O', type: 'mc', difficulty: 'mittel',
      question: 'Zum Schluss: Was schaffen wir nicht allein mit Technik, sondern nur mit unserem Verhalten?',
      answers: ['Sauberere Abgase', 'Weniger Verkehr', 'Leisere Motoren', 'Bessere Akkus'],
      correct: 1,
      explanation: 'Die Technik macht die Luft sauberer – weniger Verkehr schaffen wir nur mit unserem Verhalten. Also: Nicht nur anders fahren – sondern klüger unterwegs sein!'
    }
  ]
};

// Wiederverwendete Diagramme (werden oben per Name eingebunden)
export const SHARED_CHARTS = {
  no2: {
    kind: 'line', title: 'NO₂-Jahresmittel Landshuter Allee (µg/m³)', unit: '',
    points: [[2018, 66], [2025, 38]],
    yMin: 0, yMax: 80,
    refLines: [[40, 'Grenzwert 40', '#e0553d'], [20, 'ab 2030: 20', '#f28c28']],
    note: '−42 % von 2018 bis 2025'
  },
  co2: {
    kind: 'bar', title: 'CO₂ pro Person und km (Umweltbundesamt 2022)', unit: ' g',
    data: [['Fahrrad', 0], ['E-Bike', 8], ['Reisebus', 32], ['Bahn Fernverkehr', 36], ['S-Bahn', 75], ['E-Auto', 75], ['Pkw Verbrenner', 139], ['Flugzeug', 201]],
    highlight: ['Fahrrad', 'Bahn Fernverkehr']
  }
};

// Abschlussseite „Das kannst du ab morgen tun“ (aus Teil L)
export const TIPS = [
  { icon: '🚲', title: 'Kurze Wege zu Fuß oder mit dem Rad', text: 'Statt Elterntaxi: 0 g CO₂, keine Abgase vor der Schule – und du bist wach, wenn der Unterricht beginnt.' },
  { icon: '🚌', title: 'Bus und Bahn nutzen', text: 'Ein voller Bus ersetzt viele Autos – weniger Stau, weniger Abgase.' },
  { icon: '🤝', title: 'Fahrgemeinschaften bilden', text: 'Zum Training oder Ausflug gemeinsam fahren statt jede Familie einzeln – oder Carsharing statt Zweitwagen.' }
];

export const QUOTE = 'Nicht nur anders fahren – sondern klüger unterwegs sein.';
