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
];
