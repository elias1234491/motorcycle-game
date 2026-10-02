// Fiktive Daten eines Anrufers (wie im Original: Gutschein-Code, Kreditkarte, Bitcoin-Wallet, Online-Banking ...).
// Die KI liest sie im Gespräch vor, die Spieler tippen sie in die passende App.
const dig = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
const LET = 'ABCDEFGHJKLMNPRSTUVWXYZ';
const let_ = (n) => Array.from({ length: n }, () => LET[Math.floor(Math.random() * LET.length)]).join('');

// Gruppen = info_type der KI → zugehörige Felder
export const GROUPS = {
  giftcard: ['Gutschein-Code'],
  creditcard: ['Kreditkartennummer', 'Prüfziffer (CVC)', 'Ablaufdatum'],
  taxid: ['Steuer-ID'],
  bitcoin: ['Bitcoin-Wallet', 'Wiederherstellungs-Phrase Teil 1', 'Wiederherstellungs-Phrase Teil 2', 'Wiederherstellungs-Phrase Teil 3'],
  bank: ['Online-Banking Benutzername', 'Online-Banking Passwort', 'Kontonummer'],
  password: ['E-Mail-Adresse', 'Passwort-Reset-Code'],
  miles: ['Flugmeilen-Nummer', 'Flugmeilen-PIN'],
};

export function makeCallerData(persona) {
  const first = String(persona?.name || 'kunde').replace(/^(Dr\.|Graf|Kommandant) /, '').split(/[ "]/)[0].toLowerCase().replace(/[^a-zäöü]/g, '') || 'kunde';
  const cc = '4' + dig(15);
  const tax = dig(11);
  return {
    'Gutschein-Code': `${dig(4)}-${dig(4)}`,
    'Kreditkartennummer': cc.match(/.{4}/g).join(' '),
    'Prüfziffer (CVC)': dig(3),
    'Ablaufdatum': `${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}/${27 + Math.floor(Math.random() * 5)}`,
    'Steuer-ID': `${tax.slice(0, 2)} ${tax.slice(2, 5)} ${tax.slice(5, 8)} ${tax.slice(8)}`,
    'Bitcoin-Wallet': `${dig(4)}-${dig(4)}-${dig(4)}`,
    'Wiederherstellungs-Phrase Teil 1': dig(3),
    'Wiederherstellungs-Phrase Teil 2': dig(3),
    'Wiederherstellungs-Phrase Teil 3': dig(3),
    'Online-Banking Benutzername': `${let_(2)}-${dig(2)}`,
    'Online-Banking Passwort': `${let_(2)}-${dig(1)}-${let_(2)}`,
    'Kontonummer': `${dig(4)}-${dig(4)}`,
    'E-Mail-Adresse': `${first}${dig(2)}@webmail.de`,
    'Passwort-Reset-Code': dig(6),
    'Flugmeilen-Nummer': `LH-${dig(7)}`,
    'Flugmeilen-PIN': dig(4),
  };
}

// Vergleich ohne Leerzeichen/Bindestriche/Groß-Klein
export const norm = (s) => String(s).toUpperCase().replace(/[^A-Z0-9@.ÄÖÜ]/g, '');
