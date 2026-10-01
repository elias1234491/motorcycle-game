// Zentrale Einstellungen. SUPABASE_URL + SUPABASE_KEY (publishable/anon, öffentlich)
// aktivieren Online-Koop (Realtime) und die KI über die Edge Function "caller-brain".
export const CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_KEY: '',
  BRAIN_FUNCTION: 'caller-brain',
  MODEL: 'claude-opus-5-5',

  DAY_SECONDS: 360,          // echte Sekunden pro Arbeitstag (09:00-17:00)
  BASE_QUOTA: 1500,          // Quote Tag 1
  QUOTA_GROWTH: 1.55,        // Faktor pro Tag
  MAX_PLAYERS: 4,
};

// Maschen, die pro Tag freigeschaltet werden (wie im Original: "unlock more scams")
export const SCAMS = [
  { id: 'techsupport', day: 1, icon: '🖥️', name: 'Tech-Support',
    lure: 'Ein Popup auf dem PC des Anrufers behauptet: "IHR PC HAT 4.817 VIREN! Rufen Sie sofort den Microhard-Support an!"',
    tip: 'Behaupte, ihr PC sei infiziert. Lass sie RemoteBuddy installieren und dir den Code sagen.' },
  { id: 'gewinnspiel', day: 2, icon: '🎉', name: 'Gewinnspiel',
    lure: 'Der Anrufer hat eine SMS bekommen: "Glückwunsch! Sie haben einen Rasenmäher-Roboter gewonnen! Rufen Sie an, um die Versandgebühr zu klären."',
    tip: 'Gratuliere! Für die "Versandgebühr" brauchst du kurz Zugriff auf ihr Online-Banking.' },
  { id: 'krypto', day: 3, icon: '🐧', name: 'PinguCoin',
    lure: 'Der Anrufer hat eine Werbung gesehen: "PinguCoin - die Kryptowährung für Pinguine. 10.000% Rendite garantiert! Jetzt anrufen!"',
    tip: 'Verkaufe ihnen PinguCoin. Je absurder das Versprechen, desto besser.' },
  { id: 'prinz', day: 4, icon: '👑', name: 'Prinz von Absurdistan',
    lure: 'Der Anrufer hat eine E-Mail bekommen: Ein Prinz aus Absurdistan möchte 8 Millionen Euro erben lassen und braucht nur eine kleine Bearbeitungsgebühr.',
    tip: 'Du bist der Anwalt des Prinzen. Das Erbe wartet - nur die Gebühr fehlt noch.' },
  { id: 'luft', day: 5, icon: '🌬️', name: 'Premium-Luft-Abo',
    lure: 'Der Anrufer hat einen Flyer gefunden: "Ihre Luft ist veraltet! Upgraden Sie jetzt auf Premium-Luft 5G - Abo-Hotline anrufen!"',
    tip: 'Normale Luft läuft dieses Jahr aus. Verkaufe das Premium-Luft-Abo.' },
  { id: 'finanzamt', day: 6, icon: '🏛️', name: 'Finanzamt-Rückerstattung',
    lure: 'Der Anrufer hat einen Brief vom "Bundesamt für Rückerstattungen und Sonstiges" bekommen: Er bekommt 3.412 Euro zurück, muss aber vorher seine Steuer-ID bestätigen.',
    tip: 'Du bist Sachbearbeiter beim Amt. Frag nach der Steuer-ID und tipp sie in "Identität" ein.' },
  { id: 'romanze', day: 7, icon: '💘', name: 'Liebes-Hotline',
    lure: 'Der Anrufer hat online "Prinz Valentino, Ölbohrinsel-Kapitän" kennengelernt, der dringend Gutscheinkarten für ein Flugticket braucht. Die Nummer ist angeblich Valentinos Assistent.',
    tip: 'Du bist Valentinos Assistent. Überrede zu Gutscheinkarten und lös den Code in "Gutscheine" ein.' },
  { id: 'wunder', day: 8, icon: '🧪', name: 'Wundermittel "Jungbrunnen 3000"',
    lure: 'Der Anrufer hat eine Fernsehwerbung gesehen: "Jungbrunnen 3000 - macht 40 Jahre jünger! Nur heute mit Kreditkarte bestellen!"',
    tip: 'Nimm die Bestellung auf. Lass dir die Kreditkartennummer geben und gib sie in "Kreditkarte" ein.' },
];

// Vorzeitig freischalten im Scamazon-Shop (Preis vom persönlichen Konto)
export const SCAM_PRICES = { gewinnspiel: 300, krypto: 600, prinz: 900, luft: 1200, finanzamt: 1500, romanze: 1800, wunder: 2200 };
