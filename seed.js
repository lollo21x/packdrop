// ============================================================
// PackDrop WC26 — Firestore Seeding Script
// Run once: node seed.js
// Requires: service-account.json in the same directory
// ============================================================

const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ── All 144 cards (same data as cards-data.js) ──
const ALL_CARDS = [
  // NATIONS PACK (48)
  { id:'team_arg', type:'team', name:'Argentina', subjectName:'Argentina', nation:'Argentina', rarity:'legendary', packType:'nations' },
  { id:'team_bra', type:'team', name:'Brasile', subjectName:'Brasile', nation:'Brasile', rarity:'legendary', packType:'nations' },
  { id:'team_fra', type:'team', name:'Francia', subjectName:'Francia', nation:'Francia', rarity:'legendary', packType:'nations' },
  { id:'team_ger', type:'team', name:'Germania', subjectName:'Germania', nation:'Germania', rarity:'epic', packType:'nations' },
  { id:'team_esp', type:'team', name:'Spagna', subjectName:'Spagna', nation:'Spagna', rarity:'epic', packType:'nations' },
  { id:'team_eng', type:'team', name:'Inghilterra', subjectName:'Inghilterra', nation:'Inghilterra', rarity:'epic', packType:'nations' },
  { id:'team_por', type:'team', name:'Portogallo', subjectName:'Portogallo', nation:'Portogallo', rarity:'epic', packType:'nations' },
  { id:'team_ned', type:'team', name:'Paesi Bassi', subjectName:'Paesi Bassi', nation:'Paesi Bassi', rarity:'rare', packType:'nations' },
  { id:'team_bel', type:'team', name:'Belgio', subjectName:'Belgio', nation:'Belgio', rarity:'rare', packType:'nations' },
  { id:'team_cro', type:'team', name:'Croazia', subjectName:'Croazia', nation:'Croazia', rarity:'rare', packType:'nations' },
  { id:'team_uru', type:'team', name:'Uruguay', subjectName:'Uruguay', nation:'Uruguay', rarity:'rare', packType:'nations' },
  { id:'team_col', type:'team', name:'Colombia', subjectName:'Colombia', nation:'Colombia', rarity:'rare', packType:'nations' },
  { id:'team_mar', type:'team', name:'Marocco', subjectName:'Marocco', nation:'Marocco', rarity:'rare', packType:'nations' },
  { id:'team_usa', type:'team', name:'USA', subjectName:'USA', nation:'USA', rarity:'rare', packType:'nations' },
  { id:'team_jpn', type:'team', name:'Giappone', subjectName:'Giappone', nation:'Giappone', rarity:'rare', packType:'nations' },
  { id:'team_mex', type:'team', name:'Messico', subjectName:'Messico', nation:'Messico', rarity:'rare', packType:'nations' },
  { id:'team_nor', type:'team', name:'Norvegia', subjectName:'Norvegia', nation:'Norvegia', rarity:'rare', packType:'nations' },
  { id:'team_sen', type:'team', name:'Senegal', subjectName:'Senegal', nation:'Senegal', rarity:'rare', packType:'nations' },
  { id:'team_tur', type:'team', name:'Turchia', subjectName:'Turchia', nation:'Turchia', rarity:'rare', packType:'nations' },
  { id:'team_sco', type:'team', name:'Scozia', subjectName:'Scozia', nation:'Scozia', rarity:'common', packType:'nations' },
  { id:'team_aus', type:'team', name:'Australia', subjectName:'Australia', nation:'Australia', rarity:'common', packType:'nations' },
  { id:'team_irn', type:'team', name:'Iran', subjectName:'Iran', nation:'Iran', rarity:'common', packType:'nations' },
  { id:'team_kor', type:'team', name:'Corea del Sud', subjectName:'Corea del Sud', nation:'Corea del Sud', rarity:'common', packType:'nations' },
  { id:'team_ksa', type:'team', name:'Arabia Saudita', subjectName:'Arabia Saudita', nation:'Arabia Saudita', rarity:'common', packType:'nations' },
  { id:'team_uzb', type:'team', name:'Uzbekistan', subjectName:'Uzbekistan', nation:'Uzbekistan', rarity:'common', packType:'nations' },
  { id:'team_irq', type:'team', name:'Iraq', subjectName:'Iraq', nation:'Iraq', rarity:'common', packType:'nations' },
  { id:'team_jor', type:'team', name:'Giordania', subjectName:'Giordania', nation:'Giordania', rarity:'common', packType:'nations' },
  { id:'team_qat', type:'team', name:'Qatar', subjectName:'Qatar', nation:'Qatar', rarity:'common', packType:'nations' },
  { id:'team_alg', type:'team', name:'Algeria', subjectName:'Algeria', nation:'Algeria', rarity:'common', packType:'nations' },
  { id:'team_cpv', type:'team', name:'Cabo Verde', subjectName:'Cabo Verde', nation:'Cabo Verde', rarity:'common', packType:'nations' },
  { id:'team_cod', type:'team', name:'Congo DR', subjectName:'Congo DR', nation:'Congo DR', rarity:'common', packType:'nations' },
  { id:'team_civ', type:'team', name:"Costa d'Avorio", subjectName:"Costa d'Avorio", nation:"Costa d'Avorio", rarity:'common', packType:'nations' },
  { id:'team_egy', type:'team', name:'Egitto', subjectName:'Egitto', nation:'Egitto', rarity:'common', packType:'nations' },
  { id:'team_gha', type:'team', name:'Ghana', subjectName:'Ghana', nation:'Ghana', rarity:'common', packType:'nations' },
  { id:'team_rsa', type:'team', name:'Sud Africa', subjectName:'Sud Africa', nation:'Sud Africa', rarity:'common', packType:'nations' },
  { id:'team_tun', type:'team', name:'Tunisia', subjectName:'Tunisia', nation:'Tunisia', rarity:'common', packType:'nations' },
  { id:'team_cur', type:'team', name:'Curaçao', subjectName:'Curaçao', nation:'Curaçao', rarity:'common', packType:'nations' },
  { id:'team_hai', type:'team', name:'Haiti', subjectName:'Haiti', nation:'Haiti', rarity:'common', packType:'nations' },
  { id:'team_pan', type:'team', name:'Panama', subjectName:'Panama', nation:'Panama', rarity:'common', packType:'nations' },
  { id:'team_ecu', type:'team', name:'Ecuador', subjectName:'Ecuador', nation:'Ecuador', rarity:'common', packType:'nations' },
  { id:'team_par', type:'team', name:'Paraguay', subjectName:'Paraguay', nation:'Paraguay', rarity:'common', packType:'nations' },
  { id:'team_nzl', type:'team', name:'Nuova Zelanda', subjectName:'Nuova Zelanda', nation:'Nuova Zelanda', rarity:'common', packType:'nations' },
  { id:'team_aut', type:'team', name:'Austria', subjectName:'Austria', nation:'Austria', rarity:'common', packType:'nations' },
  { id:'team_bih', type:'team', name:'Bosnia ed Erzegovina', subjectName:'Bosnia ed Erzegovina', nation:'Bosnia ed Erzegovina', rarity:'common', packType:'nations' },
  { id:'team_cze', type:'team', name:'Repubblica Ceca', subjectName:'Repubblica Ceca', nation:'Repubblica Ceca', rarity:'common', packType:'nations' },
  { id:'team_swe', type:'team', name:'Svezia', subjectName:'Svezia', nation:'Svezia', rarity:'common', packType:'nations' },
  { id:'team_sui', type:'team', name:'Svizzera', subjectName:'Svizzera', nation:'Svizzera', rarity:'common', packType:'nations' },
  { id:'team_can', type:'team', name:'Canada', subjectName:'Canada', nation:'Canada', rarity:'common', packType:'nations' },

  // STARS PACK (48) — abbreviated for seed, include all IDs
  { id:'star_messi', type:'player', name:'Lionel Messi', subjectName:'Lionel Messi', nation:'Argentina', rarity:'legendary', packType:'stars' },
  { id:'star_mbappe', type:'player', name:'Kylian Mbappé', subjectName:'Kylian Mbappé', nation:'Francia', rarity:'legendary', packType:'stars' },
  { id:'star_vinicius', type:'player', name:'Vinícius Jr.', subjectName:'Vinícius Jr.', nation:'Brasile', rarity:'legendary', packType:'stars' },
  { id:'star_haaland', type:'player', name:'Erling Haaland', subjectName:'Erling Haaland', nation:'Norvegia', rarity:'legendary', packType:'stars' },
  { id:'star_bellingham', type:'player', name:'Jude Bellingham', subjectName:'Jude Bellingham', nation:'Inghilterra', rarity:'epic', packType:'stars' },
  { id:'star_yamal', type:'player', name:'Lamine Yamal', subjectName:'Lamine Yamal', nation:'Spagna', rarity:'epic', packType:'stars' },
  { id:'star_ronaldo', type:'player', name:'Cristiano Ronaldo', subjectName:'Cristiano Ronaldo', nation:'Portogallo', rarity:'epic', packType:'stars' },
  { id:'star_salah', type:'player', name:'Mohamed Salah', subjectName:'Mohamed Salah', nation:'Egitto', rarity:'epic', packType:'stars' },
  { id:'star_kane', type:'player', name:'Harry Kane', subjectName:'Harry Kane', nation:'Inghilterra', rarity:'epic', packType:'stars' },
  { id:'star_rodri', type:'player', name:'Rodri', subjectName:'Rodri', nation:'Spagna', rarity:'epic', packType:'stars' },
  { id:'star_pedri', type:'player', name:'Pedri', subjectName:'Pedri', nation:'Spagna', rarity:'epic', packType:'stars' },
  { id:'star_son', type:'player', name:'Son Heung-min', subjectName:'Son Heung-min', nation:'Corea del Sud', rarity:'epic', packType:'stars' },
  { id:'star_de_bruyne', type:'player', name:'Kevin De Bruyne', subjectName:'Kevin De Bruyne', nation:'Belgio', rarity:'rare', packType:'stars' },
  { id:'star_modric', type:'player', name:'Luka Modrić', subjectName:'Luka Modrić', nation:'Croazia', rarity:'rare', packType:'stars' },
  { id:'star_musiala', type:'player', name:'Jamal Musiala', subjectName:'Jamal Musiala', nation:'Germania', rarity:'rare', packType:'stars' },
  { id:'star_pulisic', type:'player', name:'Christian Pulisic', subjectName:'Christian Pulisic', nation:'USA', rarity:'rare', packType:'stars' },
  { id:'star_james', type:'player', name:'James Rodríguez', subjectName:'James Rodríguez', nation:'Colombia', rarity:'rare', packType:'stars' },
  { id:'star_nunez', type:'player', name:'Darwin Núñez', subjectName:'Darwin Núñez', nation:'Uruguay', rarity:'rare', packType:'stars' },
  { id:'star_ziyech', type:'player', name:'Hakim Ziyech', subjectName:'Hakim Ziyech', nation:'Marocco', rarity:'rare', packType:'stars' },
  { id:'star_saka', type:'player', name:'Bukayo Saka', subjectName:'Bukayo Saka', nation:'Inghilterra', rarity:'rare', packType:'stars' },
  { id:'star_reijnders', type:'player', name:'Tijjani Reijnders', subjectName:'Tijjani Reijnders', nation:'Paesi Bassi', rarity:'rare', packType:'stars' },
  { id:'star_gvardiol', type:'player', name:'Joško Gvardiol', subjectName:'Joško Gvardiol', nation:'Croazia', rarity:'rare', packType:'stars' },
  { id:'star_felix', type:'player', name:'João Félix', subjectName:'João Félix', nation:'Portogallo', rarity:'rare', packType:'stars' },
  { id:'star_diaz', type:'player', name:'Luis Díaz', subjectName:'Luis Díaz', nation:'Colombia', rarity:'rare', packType:'stars' },
  { id:'star_mitoma', type:'player', name:'Kaoru Mitoma', subjectName:'Kaoru Mitoma', nation:'Giappone', rarity:'rare', packType:'stars' },
  { id:'star_isak', type:'player', name:'Alexander Isak', subjectName:'Alexander Isak', nation:'Svezia', rarity:'rare', packType:'stars' },
  { id:'star_dembele', type:'player', name:'Ousmane Dembélé', subjectName:'Ousmane Dembélé', nation:'Francia', rarity:'rare', packType:'stars' },
  { id:'star_neuer', type:'player', name:'Manuel Neuer', subjectName:'Manuel Neuer', nation:'Germania', rarity:'rare', packType:'stars' },
  { id:'star_david', type:'player', name:'Jonathan David', subjectName:'Jonathan David', nation:'Canada', rarity:'rare', packType:'stars' },
  { id:'star_lookman', type:'player', name:'Ademola Lookman', subjectName:'Ademola Lookman', nation:'Ghana', rarity:'rare', packType:'stars' },
  { id:'star_raul', type:'player', name:'Raúl Jiménez', subjectName:'Raúl Jiménez', nation:'Messico', rarity:'common', packType:'stars' },
  { id:'star_schick', type:'player', name:'Patrik Schick', subjectName:'Patrik Schick', nation:'Repubblica Ceca', rarity:'common', packType:'stars' },
  { id:'star_shaqiri', type:'player', name:'Xherdan Shaqiri', subjectName:'Xherdan Shaqiri', nation:'Svizzera', rarity:'common', packType:'stars' },
  { id:'star_tierney', type:'player', name:'Kieran Tierney', subjectName:'Kieran Tierney', nation:'Scozia', rarity:'common', packType:'stars' },
  { id:'star_calhanoglu', type:'player', name:'Hakan Çalhanoğlu', subjectName:'Hakan Çalhanoğlu', nation:'Turchia', rarity:'common', packType:'stars' },
  { id:'star_leckie', type:'player', name:'Mathew Leckie', subjectName:'Mathew Leckie', nation:'Australia', rarity:'common', packType:'stars' },
  { id:'star_al_dawsari', type:'player', name:'Salem Al-Dawsari', subjectName:'Salem Al-Dawsari', nation:'Arabia Saudita', rarity:'common', packType:'stars' },
  { id:'star_akram', type:'player', name:'Akram Afif', subjectName:'Akram Afif', nation:'Qatar', rarity:'common', packType:'stars' },
  { id:'star_posch', type:'player', name:'Stefan Posch', subjectName:'Stefan Posch', nation:'Austria', rarity:'common', packType:'stars' },
  { id:'star_dzeko', type:'player', name:'Edin Džeko', subjectName:'Edin Džeko', nation:'Bosnia ed Erzegovina', rarity:'common', packType:'stars' },
  { id:'star_wood', type:'player', name:'Chris Wood', subjectName:'Chris Wood', nation:'Nuova Zelanda', rarity:'common', packType:'stars' },
  { id:'star_mahrez', type:'player', name:'Riyad Mahrez', subjectName:'Riyad Mahrez', nation:'Algeria', rarity:'common', packType:'stars' },
  { id:'star_kakuta', type:'player', name:'Gaël Kakuta', subjectName:'Gaël Kakuta', nation:'Congo DR', rarity:'common', packType:'stars' },
  { id:'star_shomurodov', type:'player', name:'Eldor Shomurodov', subjectName:'Eldor Shomurodov', nation:'Uzbekistan', rarity:'common', packType:'stars' },
  { id:'star_nazon', type:'player', name:'Duckens Nazon', subjectName:'Duckens Nazon', nation:'Haiti', rarity:'common', packType:'stars' },
  { id:'star_estupinan', type:'player', name:'Pervis Estupiñán', subjectName:'Pervis Estupiñán', nation:'Ecuador', rarity:'common', packType:'stars' },
  { id:'star_almiron', type:'player', name:'Miguel Almirón', subjectName:'Miguel Almirón', nation:'Paraguay', rarity:'common', packType:'stars' },
  { id:'star_sarr', type:'player', name:'Ismaïla Sarr', subjectName:'Ismaïla Sarr', nation:'Senegal', rarity:'common', packType:'stars' },


  // LEGENDS PACK (48)
  { id:'icon_pele', type:'icon', name:'Pelé', subjectName:'Pelé', nation:'Brasile', rarity:'legendary', packType:'legends' },
  { id:'icon_maradona', type:'icon', name:'Diego Maradona', subjectName:'Diego Maradona', nation:'Argentina', rarity:'legendary', packType:'legends' },
  { id:'icon_zidane', type:'icon', name:'Zinedine Zidane', subjectName:'Zinedine Zidane', nation:'Francia', rarity:'legendary', packType:'legends' },
  { id:'icon_ronaldo9', type:'icon', name:'Ronaldo Nazário', subjectName:'Ronaldo Nazário', nation:'Brasile', rarity:'legendary', packType:'legends' },
  { id:'icon_cruyff', type:'icon', name:'Johan Cruyff', subjectName:'Johan Cruyff', nation:'Paesi Bassi', rarity:'legendary', packType:'legends' },
  { id:'icon_beckenbauer', type:'icon', name:'Franz Beckenbauer', subjectName:'Franz Beckenbauer', nation:'Germania', rarity:'legendary', packType:'legends' },
  { id:'icon_ronaldinho', type:'icon', name:'Ronaldinho', subjectName:'Ronaldinho', nation:'Brasile', rarity:'epic', packType:'legends' },
  { id:'icon_henry', type:'icon', name:'Thierry Henry', subjectName:'Thierry Henry', nation:'Francia', rarity:'epic', packType:'legends' },
  { id:'icon_figo', type:'icon', name:'Luís Figo', subjectName:'Luís Figo', nation:'Portogallo', rarity:'epic', packType:'legends' },
  { id:'icon_eusebio', type:'icon', name:'Eusébio', subjectName:'Eusébio', nation:'Portogallo', rarity:'epic', packType:'legends' },
  { id:'icon_shearer', type:'icon', name:'Alan Shearer', subjectName:'Alan Shearer', nation:'Inghilterra', rarity:'epic', packType:'legends' },
  { id:'icon_gerrard', type:'icon', name:'Steven Gerrard', subjectName:'Steven Gerrard', nation:'Inghilterra', rarity:'epic', packType:'legends' },
  { id:'icon_charlton', type:'icon', name:'Bobby Charlton', subjectName:'Bobby Charlton', nation:'Inghilterra', rarity:'epic', packType:'legends' },
  { id:'icon_roberto_carlos', type:'icon', name:'Roberto Carlos', subjectName:'Roberto Carlos', nation:'Brasile', rarity:'epic', packType:'legends' },
  { id:'icon_cafu', type:'icon', name:'Cafu', subjectName:'Cafu', nation:'Brasile', rarity:'epic', packType:'legends' },
  { id:'icon_ballack', type:'icon', name:'Michael Ballack', subjectName:'Michael Ballack', nation:'Germania', rarity:'epic', packType:'legends' },
  { id:'icon_klose', type:'icon', name:'Miroslav Klose', subjectName:'Miroslav Klose', nation:'Germania', rarity:'epic', packType:'legends' },
  { id:'icon_platini', type:'icon', name:'Michel Platini', subjectName:'Michel Platini', nation:'Francia', rarity:'epic', packType:'legends' },
  { id:'icon_cantona', type:'icon', name:'Eric Cantona', subjectName:'Eric Cantona', nation:'Francia', rarity:'epic', packType:'legends' },
  { id:'icon_vieira', type:'icon', name:'Patrick Vieira', subjectName:'Patrick Vieira', nation:'Francia', rarity:'epic', packType:'legends' },
  { id:'icon_seedorf', type:'icon', name:'Clarence Seedorf', subjectName:'Clarence Seedorf', nation:'Paesi Bassi', rarity:'rare', packType:'legends' },
  { id:'icon_bergkamp', type:'icon', name:'Dennis Bergkamp', subjectName:'Dennis Bergkamp', nation:'Paesi Bassi', rarity:'rare', packType:'legends' },
  { id:'icon_davids', type:'icon', name:'Edgar Davids', subjectName:'Edgar Davids', nation:'Paesi Bassi', rarity:'rare', packType:'legends' },
  { id:'icon_sammer', type:'icon', name:'Matthias Sammer', subjectName:'Matthias Sammer', nation:'Germania', rarity:'rare', packType:'legends' },
  { id:'icon_matthaus', type:'icon', name:'Lothar Matthäus', subjectName:'Lothar Matthäus', nation:'Germania', rarity:'rare', packType:'legends' },
  { id:'icon_suker', type:'icon', name:'Davor Šuker', subjectName:'Davor Šuker', nation:'Croazia', rarity:'rare', packType:'legends' },
  { id:'icon_boban', type:'icon', name:'Zvonimir Boban', subjectName:'Zvonimir Boban', nation:'Croazia', rarity:'rare', packType:'legends' },
  { id:'icon_modric_icon', type:'icon', name:'Luka Modrić (2018)', subjectName:'Luka Modrić', nation:'Croazia', rarity:'rare', packType:'legends' },
  { id:'icon_valderrama', type:'icon', name:'Carlos Valderrama', subjectName:'Carlos Valderrama', nation:'Colombia', rarity:'rare', packType:'legends' },
  { id:'icon_asprilla', type:'icon', name:'Faustino Asprilla', subjectName:'Faustino Asprilla', nation:'Colombia', rarity:'rare', packType:'legends' },
  { id:'icon_larsson', type:'icon', name:'Henrik Larsson', subjectName:'Henrik Larsson', nation:'Svezia', rarity:'rare', packType:'legends' },
  { id:'icon_ibrahimovic', type:'icon', name:'Zlatan Ibrahimović', subjectName:'Zlatan Ibrahimović', nation:'Svezia', rarity:'rare', packType:'legends' },
  { id:'icon_weah', type:'icon', name:'George Weah', subjectName:'George Weah', nation:'Liberia', rarity:'rare', packType:'legends' },
  { id:'icon_drogba', type:'icon', name:'Didier Drogba', subjectName:'Didier Drogba', nation:"Costa d'Avorio", rarity:'rare', packType:'legends' },
  { id:'icon_essien', type:'icon', name:'Michael Essien', subjectName:'Michael Essien', nation:'Ghana', rarity:'rare', packType:'legends' },
  { id:'icon_okocha', type:'icon', name:'Jay-Jay Okocha', subjectName:'Jay-Jay Okocha', nation:'Nigeria', rarity:'rare', packType:'legends' },
  { id:'icon_el_hadary', type:'icon', name:'Essam El-Hadary', subjectName:'Essam El-Hadary', nation:'Egitto', rarity:'rare', packType:'legends' },
  { id:'icon_mane_icon', type:'icon', name:'Sadio Mané', subjectName:'Sadio Mané', nation:'Senegal', rarity:'rare', packType:'legends' },
  { id:'icon_diop', type:'icon', name:'Papa Bouba Diop', subjectName:'Papa Bouba Diop', nation:'Senegal', rarity:'rare', packType:'legends' },
  { id:'icon_hagi', type:'icon', name:'Gheorghe Hagi', subjectName:'Gheorghe Hagi', nation:'Romania', rarity:'rare', packType:'legends' },
  { id:'icon_nedved', type:'icon', name:'Pavel Nedvěd', subjectName:'Pavel Nedvěd', nation:'Repubblica Ceca', rarity:'rare', packType:'legends' },
  { id:'icon_scholes', type:'icon', name:'Paul Scholes', subjectName:'Paul Scholes', nation:'Inghilterra', rarity:'rare', packType:'legends' },
  { id:'icon_kahn', type:'icon', name:'Oliver Kahn', subjectName:'Oliver Kahn', nation:'Germania', rarity:'rare', packType:'legends' },
  { id:'icon_nakata', type:'icon', name:'Hidetoshi Nakata', subjectName:'Hidetoshi Nakata', nation:'Giappone', rarity:'rare', packType:'legends' },
  { id:'icon_ahn', type:'icon', name:'Ahn Jung-hwan', subjectName:'Ahn Jung-hwan', nation:'Corea del Sud', rarity:'rare', packType:'legends' },
  { id:'icon_pak_doik', type:'icon', name:'Pak Doo-ik', subjectName:'Pak Doo-ik', nation:'Corea del Nord', rarity:'rare', packType:'legends' },
  { id:'icon_sanchez', type:'icon', name:'Hugo Sánchez', subjectName:'Hugo Sánchez', nation:'Messico', rarity:'rare', packType:'legends' },
  { id:'icon_zamorano', type:'icon', name:'Iván Zamorano', subjectName:'Iván Zamorano', nation:'Cile', rarity:'rare', packType:'legends' },
];

async function seed() {
  console.log(`Seeding ${ALL_CARDS.length} cards to Firestore...`);

  // Use batched writes (max 500 per batch)
  const batchSize = 450;
  for (let i = 0; i < ALL_CARDS.length; i += batchSize) {
    const batch = db.batch();
    const chunk = ALL_CARDS.slice(i, i + batchSize);

    chunk.forEach(card => {
      const ref = db.collection('pd_cards').doc(card.id);
      // Remove nationEmoji from Firestore (it's only needed client-side)
      const { nationEmoji, ...firestoreCard } = card;
      batch.set(ref, firestoreCard);
    });

    await batch.commit();
    console.log(`  Batch ${Math.floor(i / batchSize) + 1}: wrote ${chunk.length} cards`);
  }

  console.log('✅ Seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
