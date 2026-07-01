// ============================================================
// PackDrop WC26 — Matches schedule + Pronostici data
// Static schedule. Results are written by the admin into
// Firestore (pd_matches/{matchId}) at runtime.
// All kickoff times are in Europe/Rome (CEST, UTC+2).
// ============================================================

// ISO-2 / sub-national codes for flagcdn.com (lowercase)
// e.g. https://flagcdn.com/w160/it.png
const WC26_FLAG = {
  'Argentina': 'ar', 'Austria': 'at', 'Francia': 'fr', 'Iraq': 'iq',
  'Norvegia': 'no', 'Senegal': 'sn', 'Giordania': 'jo', 'Algeria': 'dz',
  'Portogallo': 'pt', 'Uzbekistan': 'uz', 'Inghilterra': 'gb-eng', 'Ghana': 'gh',
  'Panama': 'pa', 'Croazia': 'hr', 'Colombia': 'co', 'RD Congo': 'cd',
  'Svizzera': 'ch', 'Canada': 'ca', 'Bosnia ed Erzegovina': 'ba', 'Qatar': 'qa',
  'Marocco': 'ma', 'Haiti': 'ht', 'Scozia': 'gb-sct', 'Brasile': 'br',
  'Repubblica Ceca': 'cz', 'Messico': 'mx', 'Sudafrica': 'za', 'Corea del Sud': 'kr',
  'Curaçao': 'cw', "Costa d'Avorio": 'ci', 'Ecuador': 'ec', 'Germania': 'de',
  'Tunisia': 'tn', 'Paesi Bassi': 'nl', 'Giappone': 'jp', 'Svezia': 'se',
  'Turchia': 'tr', 'Stati Uniti': 'us', 'Paraguay': 'py', 'Australia': 'au',
  'Capo Verde': 'cv', 'Arabia Saudita': 'sa', 'Uruguay': 'uy', 'Spagna': 'es',
  'Egitto': 'eg', 'Iran': 'ir', 'Nuova Zelanda': 'nz', 'Belgio': 'be',
  'Da definire': '_', 'Vincente Gruppo L': '_'
};

function flagUrl(code, w = 160) {
  return `https://flagcdn.com/w${w}/${code}.png`;
}

// Each match: id, kickoff (ISO with +02:00 offset), home {name}, away {name}, phase
const WC26_MATCHES = [
  // ── Lunedì 22 giugno ──
  { id:'m01', kickoff:'2026-06-22T19:00:00+02:00', home:'Argentina',        away:'Austria',           phase:'Fase a Gironi' },
  { id:'m02', kickoff:'2026-06-22T23:00:00+02:00', home:'Francia',           away:'Iraq',              phase:'Fase a Gironi' },

  // ── Martedì 23 giugno ──
  { id:'m03', kickoff:'2026-06-23T02:00:00+02:00', home:'Norvegia',          away:'Senegal',           phase:'Fase a Gironi' },
  { id:'m04', kickoff:'2026-06-23T05:00:00+02:00', home:'Giordania',         away:'Algeria',           phase:'Fase a Gironi' },
  { id:'m05', kickoff:'2026-06-23T19:00:00+02:00', home:'Portogallo',        away:'Uzbekistan',        phase:'Fase a Gironi' },
  { id:'m06', kickoff:'2026-06-23T22:00:00+02:00', home:'Inghilterra',       away:'Ghana',             phase:'Fase a Gironi' },

  // ── Mercoledì 24 giugno ──
  { id:'m07', kickoff:'2026-06-24T01:00:00+02:00', home:'Panama',            away:'Croazia',           phase:'Fase a Gironi' },
  { id:'m08', kickoff:'2026-06-24T04:00:00+02:00', home:'Colombia',          away:'RD Congo',          phase:'Fase a Gironi' },
  { id:'m09', kickoff:'2026-06-24T21:00:00+02:00', home:'Svizzera',          away:'Canada',            phase:'Fase a Gironi' },
  { id:'m10', kickoff:'2026-06-24T21:00:00+02:00', home:'Bosnia ed Erzegovina', away:'Qatar',          phase:'Fase a Gironi' },

  // ── Giovedì 25 giugno ──
  { id:'m11', kickoff:'2026-06-25T00:00:00+02:00', home:'Marocco',           away:'Haiti',             phase:'Fase a Gironi' },
  { id:'m12', kickoff:'2026-06-25T00:00:00+02:00', home:'Scozia',            away:'Brasile',           phase:'Fase a Gironi' },
  { id:'m13', kickoff:'2026-06-25T03:00:00+02:00', home:'Repubblica Ceca',   away:'Messico',           phase:'Fase a Gironi' },
  { id:'m14', kickoff:'2026-06-25T03:00:00+02:00', home:'Sudafrica',         away:'Corea del Sud',     phase:'Fase a Gironi' },
  { id:'m15', kickoff:'2026-06-25T22:00:00+02:00', home:'Curaçao',           away:"Costa d'Avorio",    phase:'Fase a Gironi' },
  { id:'m16', kickoff:'2026-06-25T22:00:00+02:00', home:'Ecuador',           away:'Germania',          phase:'Fase a Gironi' },

  // ── Venerdì 26 giugno ──
  { id:'m17', kickoff:'2026-06-26T01:00:00+02:00', home:'Tunisia',           away:'Paesi Bassi',       phase:'Fase a Gironi' },
  { id:'m18', kickoff:'2026-06-26T01:00:00+02:00', home:'Giappone',          away:'Svezia',            phase:'Fase a Gironi' },
  { id:'m19', kickoff:'2026-06-26T04:00:00+02:00', home:'Turchia',           away:'Stati Uniti',       phase:'Fase a Gironi' },
  { id:'m20', kickoff:'2026-06-26T04:00:00+02:00', home:'Paraguay',          away:'Australia',         phase:'Fase a Gironi' },
  { id:'m21', kickoff:'2026-06-26T21:00:00+02:00', home:'Norvegia',          away:'Francia',           phase:'Fase a Gironi' },
  { id:'m22', kickoff:'2026-06-26T21:00:00+02:00', home:'Senegal',           away:'Iraq',              phase:'Fase a Gironi' },

  // ── Sabato 27 giugno ──
  { id:'m23', kickoff:'2026-06-27T02:00:00+02:00', home:'Capo Verde',        away:'Arabia Saudita',    phase:'Fase a Gironi' },
  { id:'m24', kickoff:'2026-06-27T02:00:00+02:00', home:'Uruguay',           away:'Spagna',            phase:'Fase a Gironi' },
  { id:'m25', kickoff:'2026-06-27T05:00:00+02:00', home:'Egitto',            away:'Iran',              phase:'Fase a Gironi' },
  { id:'m26', kickoff:'2026-06-27T05:00:00+02:00', home:'Nuova Zelanda',     away:'Belgio',            phase:'Fase a Gironi' },
  { id:'m27', kickoff:'2026-06-27T23:00:00+02:00', home:'Panama',            away:'Inghilterra',       phase:'Fase a Gironi' },
  { id:'m28', kickoff:'2026-06-27T23:00:00+02:00', home:'Croazia',           away:'Ghana',             phase:'Fase a Gironi' },

  // ── Domenica 28 giugno ──
  { id:'m29', kickoff:'2026-06-28T01:30:00+02:00', home:'Colombia',          away:'Portogallo',        phase:'Fase a Gironi' },
  { id:'m30', kickoff:'2026-06-28T01:30:00+02:00', home:'RD Congo',          away:'Uzbekistan',        phase:'Fase a Gironi' },
  { id:'m31', kickoff:'2026-06-28T04:00:00+02:00', home:'Algeria',           away:'Austria',           phase:'Fase a Gironi' },
  { id:'m32', kickoff:'2026-06-28T04:00:00+02:00', home:'Giordania',         away:'Argentina',         phase:'Fase a Gironi' },
  { id:'m33', kickoff:'2026-06-28T21:00:00+02:00', home:'Sudafrica',         away:'Canada',            phase:'Sedicesimi di finale' },

  // ── Lunedì 29 giugno ──
  { id:'m34', kickoff:'2026-06-29T19:00:00+02:00', home:'Brasile',           away:'Giappone',          phase:'Sedicesimi di finale' },
  { id:'m35', kickoff:'2026-06-29T22:30:00+02:00', home:'Germania',          away:'Paraguay',          phase:'Sedicesimi di finale' },

  // ── Martedì 30 giugno ──
  { id:'m36', kickoff:'2026-06-30T03:00:00+02:00', home:'Paesi Bassi',       away:'Marocco',           phase:'Sedicesimi di finale' },
  { id:'m37', kickoff:'2026-06-30T19:00:00+02:00', home:"Costa d'Avorio",    away:'Norvegia',          phase:'Sedicesimi di finale' },
  { id:'m38', kickoff:'2026-06-30T23:00:00+02:00', home:'Francia',           away:'Svezia',            phase:'Sedicesimi di finale' },

  // ── Mercoledì 1 luglio ──
  { id:'m39', kickoff:'2026-07-01T04:00:00+02:00', home:'Messico',           away:'Ecuador',           phase:'Sedicesimi di finale' },
  { id:'m40', kickoff:'2026-07-01T18:00:00+02:00', home:'Inghilterra',       away:'RD Congo',          phase:'Sedicesimi di finale' },
  { id:'m41', kickoff:'2026-07-01T22:00:00+02:00', home:'Belgio',            away:'Senegal',           phase:'Sedicesimi di finale' },

  // ── Giovedì 2 luglio ──
  { id:'m42', kickoff:'2026-07-02T02:00:00+02:00', home:'Stati Uniti',       away:'Bosnia ed Erzegovina', phase:'Sedicesimi di finale' },
  { id:'m43', kickoff:'2026-07-02T21:00:00+02:00', home:'Spagna',            away:'Austria',           phase:'Sedicesimi di finale' },

  // ── Venerdì 3 luglio ──
  { id:'m44', kickoff:'2026-07-03T01:00:00+02:00', home:'Portogallo',        away:'Croazia',           phase:'Sedicesimi di finale' },
  { id:'m45', kickoff:'2026-07-03T05:00:00+02:00', home:'Svizzera',          away:'Algeria',           phase:'Sedicesimi di finale' },
  { id:'m46', kickoff:'2026-07-03T20:00:00+02:00', home:'Australia',         away:'Egitto',            phase:'Sedicesimi di finale' },

  // ── Sabato 4 luglio ──
  { id:'m47', kickoff:'2026-07-04T00:00:00+02:00', home:'Argentina',         away:'Capo Verde',        phase:'Sedicesimi di finale' },
  { id:'m48', kickoff:'2026-07-04T03:30:00+02:00', home:'Colombia',          away:'Ghana',             phase:'Sedicesimi di finale' },
  { id:'m49', kickoff:'2026-07-04T19:00:00+02:00', home:'Canada',            away:'Marocco',           phase:'Ottavi di finale' },
  { id:'m50', kickoff:'2026-07-04T23:00:00+02:00', home:'Paraguay',          away:'Francia',           phase:'Ottavi di finale' },

  // ── Domenica 5 luglio ──
  { id:'m51', kickoff:'2026-07-05T22:00:00+02:00', home:'Brasile',           away:'Norvegia',          phase:'Ottavi di finale' },

  // ── Lunedì 6 luglio ──
  { id:'m52', kickoff:'2026-07-06T02:00:00+02:00', home:'Messico',           away:'Inghilterra',       phase:'Ottavi di finale' },
  { id:'m53', kickoff:'2026-07-06T21:00:00+02:00', home:'Vincente [Belgio/Senegal]', away:'Vincente [Stati Uniti/Bosnia ed Erzegovina]', phase:'Ottavi di finale' },

  // ── Martedì 7 luglio ──
  { id:'m54', kickoff:'2026-07-07T02:00:00+02:00', home:'Vincente [Spagna/Austria]', away:'Vincente [Portogallo/Croazia]', phase:'Ottavi di finale' },
  { id:'m55', kickoff:'2026-07-07T18:00:00+02:00', home:'Vincente [Argentina/Capo Verde]', away:'Vincente [Australia/Egitto]', phase:'Ottavi di finale' },
  { id:'m56', kickoff:'2026-07-07T22:00:00+02:00', home:'Vincente [Svizzera/Algeria]', away:'Vincente [Colombia/Ghana]', phase:'Ottavi di finale' },

  // ── Giovedì 9 luglio ──
  { id:'m57', kickoff:'2026-07-09T22:00:00+02:00', home:'Vincente [Canada/Marocco]', away:'Vincente [Paraguay/Francia]', phase:'Quarti di finale' },

  // ── Venerdì 10 luglio ──
  { id:'m58', kickoff:'2026-07-10T21:00:00+02:00', home:'Vincente [Brasile/Norvegia]', away:'Vincente [Messico/Inghilterra]', phase:'Quarti di finale' },

  // ── Sabato 11 luglio ──
  { id:'m59', kickoff:'2026-07-11T23:00:00+02:00', home:'Vincente Ottavo 5', away:'Vincente Ottavo 6', phase:'Quarti di finale' },

  // ── Domenica 12 luglio ──
  { id:'m60', kickoff:'2026-07-12T03:00:00+02:00', home:'Vincente Ottavo 7', away:'Vincente Ottavo 8', phase:'Quarti di finale' },

  // ── Martedì 14 luglio ──
  { id:'m61', kickoff:'2026-07-14T21:00:00+02:00', home:'Vincente Quarto 1', away:'Vincente Quarto 2', phase:'Semifinale' },

  // ── Mercoledì 15 luglio ──
  { id:'m62', kickoff:'2026-07-15T21:00:00+02:00', home:'Vincente Quarto 3', away:'Vincente Quarto 4', phase:'Semifinale' },

  // ── Sabato 18 luglio ──
  { id:'m63', kickoff:'2026-07-18T23:00:00+02:00', home:'Perdente Semifinale 1', away:'Perdente Semifinale 2', phase:'Finale 3°/4° posto' },

  // ── Domenica 19 luglio ──
  { id:'m64', kickoff:'2026-07-19T21:00:00+02:00', home:'Vincente Semifinale 1', away:'Vincente Semifinale 2', phase:'Finale' }
];

// Normalise matches into a richer shape used by the renderer
const WC26_MATCHES_FULL = WC26_MATCHES.map(m => ({
  id: m.id,
  kickoff: m.kickoff,
  kickoffMs: new Date(m.kickoff).getTime(),
  phase: m.phase,
  home: { name: m.home, code: WC26_FLAG[m.home] || '_' },
  away: { name: m.away, code: WC26_FLAG[m.away] || '_' }
}));

// Sortable by kickoff ascending (closest first)
WC26_MATCHES_FULL.sort((a, b) => a.kickoffMs - b.kickoffMs);

function getMatchById(id) {
  return WC26_MATCHES_FULL.find(m => m.id === id) || null;
}
