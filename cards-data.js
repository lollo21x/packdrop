// ============================================================
// PackDrop WC26 — Complete Card Database (220 cards)
// This file is loaded at startup. Never read from Firestore.
// ============================================================

const ALL_CARDS = [

  // ════════════════════════════════════════════════════════════
  // NATIONS PACK — Team Shield (48 cards)
  // ════════════════════════════════════════════════════════════

  // Legendary (3)
  { id:'team_arg', type:'team', name:'Argentina', subjectName:'Argentina', nation:'Argentina', rarity:'legendary', packType:'nations' },
  { id:'team_bra', type:'team', name:'Brasile', subjectName:'Brasile', nation:'Brasile', rarity:'legendary', packType:'nations' },
  { id:'team_fra', type:'team', name:'Francia', subjectName:'Francia', nation:'Francia', rarity:'legendary', packType:'nations' },

  // Epic (4)
  { id:'team_ger', type:'team', name:'Germania', subjectName:'Germania', nation:'Germania', rarity:'epic', packType:'nations' },
  { id:'team_esp', type:'team', name:'Spagna', subjectName:'Spagna', nation:'Spagna', rarity:'epic', packType:'nations' },
  { id:'team_eng', type:'team', name:'Inghilterra', subjectName:'Inghilterra', nation:'Inghilterra', rarity:'epic', packType:'nations' },
  { id:'team_por', type:'team', name:'Portogallo', subjectName:'Portogallo', nation:'Portogallo', rarity:'epic', packType:'nations' },

  // Rare (12)
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

  // Common (29)
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

  // ════════════════════════════════════════════════════════════
  // STARS PACK — Star Player (48 cards)
  // ════════════════════════════════════════════════════════════

  // Legendary (6)
  { id:'star_messi', type:'player', name:'Lionel Messi', subjectName:'Lionel Messi', nation:'Argentina', rarity:'legendary', packType:'stars' },
  { id:'star_mbappe', type:'player', name:'Kylian Mbappé', subjectName:'Kylian Mbappé', nation:'Francia', rarity:'legendary', packType:'stars' },
  { id:'star_vinicius', type:'player', name:'Vinícius Jr.', subjectName:'Vinícius Jr.', nation:'Brasile', rarity:'legendary', packType:'stars' },
  { id:'star_haaland', type:'player', name:'Erling Haaland', subjectName:'Erling Haaland', nation:'Norvegia', rarity:'legendary', packType:'stars' },
  { id:'star_neymar', type:'player', name:'Neymar Jr.', subjectName:'Neymar Jr.', nation:'Brasile', rarity:'legendary', packType:'stars' },
  { id:'star_mbappe_alt', type:'player', name:'Lautaro Martínez', subjectName:'Lautaro Martínez', nation:'Argentina', rarity:'legendary', packType:'stars' },

  // Epic (14)
  { id:'star_bellingham', type:'player', name:'Jude Bellingham', subjectName:'Jude Bellingham', nation:'Inghilterra', rarity:'epic', packType:'stars' },
  { id:'star_yamal', type:'player', name:'Lamine Yamal', subjectName:'Lamine Yamal', nation:'Spagna', rarity:'epic', packType:'stars' },
  { id:'star_ronaldo', type:'player', name:'Cristiano Ronaldo', subjectName:'Cristiano Ronaldo', nation:'Portogallo', rarity:'epic', packType:'stars' },
  { id:'star_salah', type:'player', name:'Mohamed Salah', subjectName:'Mohamed Salah', nation:'Egitto', rarity:'epic', packType:'stars' },
  { id:'star_kane', type:'player', name:'Harry Kane', subjectName:'Harry Kane', nation:'Inghilterra', rarity:'epic', packType:'stars' },
  { id:'star_rodri', type:'player', name:'Rodri', subjectName:'Rodri', nation:'Spagna', rarity:'epic', packType:'stars' },
  { id:'star_pedri', type:'player', name:'Pedri', subjectName:'Pedri', nation:'Spagna', rarity:'epic', packType:'stars' },
  { id:'star_son', type:'player', name:'Son Heung-min', subjectName:'Son Heung-min', nation:'Corea del Sud', rarity:'epic', packType:'stars' },
  { id:'star_leao', type:'player', name:'Rafael Leão', subjectName:'Rafael Leão', nation:'Portogallo', rarity:'epic', packType:'stars' },
  { id:'star_osimhen', type:'player', name:'Victor Osimhen', subjectName:'Victor Osimhen', nation:'Nigeria', rarity:'epic', packType:'stars' },
  { id:'star_alvarez', type:'player', name:'Julián Álvarez', subjectName:'Julián Álvarez', nation:'Argentina', rarity:'epic', packType:'stars' },
  { id:'star_olise', type:'player', name:'Michael Olise', subjectName:'Michael Olise', nation:'Francia', rarity:'epic', packType:'stars' },
  { id:'star_wirtz', type:'player', name:'Florian Wirtz', subjectName:'Florian Wirtz', nation:'Germania', rarity:'epic', packType:'stars' },
  { id:'star_guler', type:'player', name:'Arda Güler', subjectName:'Arda Güler', nation:'Turchia', rarity:'epic', packType:'stars' },

  // Rare (28)
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
  { id:'star_diallo', type:'player', name:'Amadou Diallo', subjectName:'Amadou Diallo', nation:'Senegal', rarity:'rare', packType:'stars' },
  { id:'star_ruiz', type:'player', name:'Pedri González', subjectName:'Pedri González', nation:'USA', rarity:'rare', packType:'stars' },
  { id:'star_szoboszlai', type:'player', name:'Dominik Szoboszlai', subjectName:'Dominik Szoboszlai', nation:'Ungheria', rarity:'rare', packType:'stars' },
  { id:'star_kudus', type:'player', name:'Mohammed Kudus', subjectName:'Mohammed Kudus', nation:'Ghana', rarity:'rare', packType:'stars' },
  { id:'star_nkunku', type:'player', name:'Christopher Nkunku', subjectName:'Christopher Nkunku', nation:'Francia', rarity:'rare', packType:'stars' },
  { id:'star_chiesa', type:'player', name:'Federico Chiesa', subjectName:'Federico Chiesa', nation:'Italia', rarity:'rare', packType:'stars' },
  { id:'star_vlahovic', type:'player', name:'Dušan Vlahović', subjectName:'Dušan Vlahović', nation:'Serbia', rarity:'rare', packType:'stars' },
  { id:'star_simeone', type:'player', name:'Giovanni Simeone', subjectName:'Giovanni Simeone', nation:'Argentina', rarity:'rare', packType:'stars' },
  { id:'star_hakimi', type:'player', name:'Achraf Hakimi', subjectName:'Achraf Hakimi', nation:'Marocco', rarity:'rare', packType:'stars' },
  { id:'star_carvajal', type:'player', name:'Dani Carvajal', subjectName:'Dani Carvajal', nation:'Spagna', rarity:'rare', packType:'stars' },

  // Common (28)
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
  { id:'star_tahith', type:'player', name:'Tahith Chong', subjectName:'Tahith Chong', nation:'Curaçao', rarity:'common', packType:'stars' },
  { id:'star_abdi', type:'player', name:'Abdi Sharif', subjectName:'Abdi Sharif', nation:'Giordania', rarity:'common', packType:'stars' },
  { id:'star_alzain', type:'player', name:'Ali Al-Bulaihi', subjectName:'Ali Al-Bulaihi', nation:'Arabia Saudita', rarity:'common', packType:'stars' },
  { id:'star_mensah', type:'player', name:'Jonathan Mensah', subjectName:'Jonathan Mensah', nation:'Ghana', rarity:'common', packType:'stars' },
  { id:'star_hamroun', type:'player', name:'Sofiane Hamroun', subjectName:'Sofiane Hamroun', nation:'Algeria', rarity:'common', packType:'stars' },
  { id:'star_silva_cpv', type:'player', name:'Ryan Mendes', subjectName:'Ryan Mendes', nation:'Cabo Verde', rarity:'common', packType:'stars' },
  { id:'star_msakni', type:'player', name:'Youssef Msakni', subjectName:'Youssef Msakni', nation:'Tunisia', rarity:'common', packType:'stars' },
  { id:'star_dolezsar', type:'player', name:'Bonfils-Caleb Bimenyimana', subjectName:'Bonfils-Caleb Bimenyimana', nation:'Sud Africa', rarity:'common', packType:'stars' },
  { id:'star_dirar', type:'player', name:'Abderazak Hamdallah', subjectName:'Abderazak Hamdallah', nation:'Marocco', rarity:'common', packType:'stars' },
  { id:'star_murillo', type:'player', name:'Jeffry Murillo', subjectName:'Jeffry Murillo', nation:'Panama', rarity:'common', packType:'stars' },

  // ════════════════════════════════════════════════════════════
  // LEGENDS PACK — Football Icon (48 cards)
  // ════════════════════════════════════════════════════════════

  // Legendary (8)
  { id:'icon_pele', type:'icon', name:'Pelé', subjectName:'Pelé', nation:'Brasile', rarity:'legendary', packType:'legends' },
  { id:'icon_maradona', type:'icon', name:'Diego Maradona', subjectName:'Diego Maradona', nation:'Argentina', rarity:'legendary', packType:'legends' },
  { id:'icon_zidane', type:'icon', name:'Zinedine Zidane', subjectName:'Zinedine Zidane', nation:'Francia', rarity:'legendary', packType:'legends' },
  { id:'icon_ronaldo9', type:'icon', name:'Ronaldo Nazário', subjectName:'Ronaldo Nazário', nation:'Brasile', rarity:'legendary', packType:'legends' },
  { id:'icon_cruyff', type:'icon', name:'Johan Cruyff', subjectName:'Johan Cruyff', nation:'Paesi Bassi', rarity:'legendary', packType:'legends' },
  { id:'icon_beckenbauer', type:'icon', name:'Franz Beckenbauer', subjectName:'Franz Beckenbauer', nation:'Germania', rarity:'legendary', packType:'legends' },
  { id:'icon_maldini', type:'icon', name:'Paolo Maldini', subjectName:'Paolo Maldini', nation:'Italia', rarity:'legendary', packType:'legends' },
  { id:'icon_puyol', type:'icon', name:'Carles Puyol', subjectName:'Carles Puyol', nation:'Spagna', rarity:'legendary', packType:'legends' },

  // Epic (20)
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
  { id:'icon_xavi', type:'icon', name:'Xavi Hernández', subjectName:'Xavi Hernández', nation:'Spagna', rarity:'epic', packType:'legends' },
  { id:'icon_iniesta', type:'icon', name:'Andrés Iniesta', subjectName:'Andrés Iniesta', nation:'Spagna', rarity:'epic', packType:'legends' },
  { id:'icon_raul', type:'icon', name:'Raúl González', subjectName:'Raúl González', nation:'Spagna', rarity:'epic', packType:'legends' },
  { id:'icon_totti', type:'icon', name:'Francesco Totti', subjectName:'Francesco Totti', nation:'Italia', rarity:'epic', packType:'legends' },
  { id:'icon_del_piero', type:'icon', name:'Alessandro Del Piero', subjectName:'Alessandro Del Piero', nation:'Italia', rarity:'epic', packType:'legends' },
  { id:'icon_rivaldo', type:'icon', name:'Rivaldo', subjectName:'Rivaldo', nation:'Brasile', rarity:'epic', packType:'legends' },

  // Rare (40)
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
  { id:'icon_baresi', type:'icon', name:'Franco Baresi', subjectName:'Franco Baresi', nation:'Italia', rarity:'rare', packType:'legends' },
  { id:'icon_pirlo', type:'icon', name:'Andrea Pirlo', subjectName:'Andrea Pirlo', nation:'Italia', rarity:'rare', packType:'legends' },
  { id:'icon_buffon', type:'icon', name:'Gianluigi Buffon', subjectName:'Gianluigi Buffon', nation:'Italia', rarity:'rare', packType:'legends' },
  { id:'icon_casillas', type:'icon', name:'Iker Casillas', subjectName:'Iker Casillas', nation:'Spagna', rarity:'rare', packType:'legends' },
  { id:'icon_hierro', type:'icon', name:'Fernando Hierro', subjectName:'Fernando Hierro', nation:'Spagna', rarity:'rare', packType:'legends' },
  { id:'icon_yashin', type:'icon', name:'Lev Yashin', subjectName:'Lev Yashin', nation:'URSS', rarity:'rare', packType:'legends' },
  { id:'icon_romario', type:'icon', name:'Romário', subjectName:'Romário', nation:'Brasile', rarity:'rare', packType:'legends' },
  { id:'icon_batistuta', type:'icon', name:'Gabriel Batistuta', subjectName:'Gabriel Batistuta', nation:'Argentina', rarity:'rare', packType:'legends' },
  { id:'icon_kempes', type:'icon', name:'Mario Kempes', subjectName:'Mario Kempes', nation:'Argentina', rarity:'rare', packType:'legends' },
  { id:'icon_canavaro', type:'icon', name:'Fabio Cannavaro', subjectName:'Fabio Cannavaro', nation:'Italia', rarity:'rare', packType:'legends' },
  { id:'icon_blanc', type:'icon', name:'Laurent Blanc', subjectName:'Laurent Blanc', nation:'Francia', rarity:'rare', packType:'legends' },
  { id:'icon_desailly', type:'icon', name:'Marcel Desailly', subjectName:'Marcel Desailly', nation:'Francia', rarity:'rare', packType:'legends' },

  // Rare — nuove aggiunte
  { id:'icon_roberto_baggio', type:'icon', name:'Roberto Baggio', subjectName:'Roberto Baggio', nation:'Italia', rarity:'rare', packType:'legends' },
  { id:'icon_vieri', type:'icon', name:'Christian Vieri', subjectName:'Christian Vieri', nation:'Italia', rarity:'rare', packType:'legends' },
  { id:'icon_maldini_p', type:'icon', name:'Cesare Maldini', subjectName:'Cesare Maldini', nation:'Italia', rarity:'rare', packType:'legends' },
  { id:'icon_zola', type:'icon', name:'Gianfranco Zola', subjectName:'Gianfranco Zola', nation:'Italia', rarity:'rare', packType:'legends' },
  { id:'icon_koeman', type:'icon', name:'Ronald Koeman', subjectName:'Ronald Koeman', nation:'Paesi Bassi', rarity:'rare', packType:'legends' },
  { id:'icon_van_basten', type:'icon', name:'Marco van Basten', subjectName:'Marco van Basten', nation:'Paesi Bassi', rarity:'rare', packType:'legends' },
  { id:'icon_gullit', type:'icon', name:'Ruud Gullit', subjectName:'Ruud Gullit', nation:'Paesi Bassi', rarity:'rare', packType:'legends' },
  { id:'icon_laudrup', type:'icon', name:'Michael Laudrup', subjectName:'Michael Laudrup', nation:'Danimarca', rarity:'rare', packType:'legends' },
  { id:'icon_schmeichel', type:'icon', name:'Peter Schmeichel', subjectName:'Peter Schmeichel', nation:'Danimarca', rarity:'rare', packType:'legends' },
  { id:'icon_moore', type:'icon', name:'Bobby Moore', subjectName:'Bobby Moore', nation:'Inghilterra', rarity:'rare', packType:'legends' },
  { id:'icon_lineker', type:'icon', name:'Gary Lineker', subjectName:'Gary Lineker', nation:'Inghilterra', rarity:'rare', packType:'legends' },
  { id:'icon_gascoigne', type:'icon', name:'Paul Gascoigne', subjectName:'Paul Gascoigne', nation:'Inghilterra', rarity:'rare', packType:'legends' },
  { id:'icon_netzer', type:'icon', name:'Günter Netzer', subjectName:'Günter Netzer', nation:'Germania', rarity:'rare', packType:'legends' },
  { id:'icon_muller_g', type:'icon', name:'Gerd Müller', subjectName:'Gerd Müller', nation:'Germania', rarity:'rare', packType:'legends' },
  { id:'icon_stoichkov', type:'icon', name:'Hristo Stoichkov', subjectName:'Hristo Stoichkov', nation:'Bulgaria', rarity:'rare', packType:'legends' },
  { id:'icon_butragueno', type:'icon', name:'Emilio Butragueño', subjectName:'Emilio Butragueño', nation:'Spagna', rarity:'rare', packType:'legends' },
  { id:'icon_zubizarreta', type:'icon', name:'Andoni Zubizarreta', subjectName:'Andoni Zubizarreta', nation:'Spagna', rarity:'rare', packType:'legends' },
  { id:'icon_kanu', type:'icon', name:'Nwankwo Kanu', subjectName:'Nwankwo Kanu', nation:'Nigeria', rarity:'rare', packType:'legends' },
  { id:'icon_yekini', type:'icon', name:'Rashidi Yekini', subjectName:'Rashidi Yekini', nation:'Nigeria', rarity:'rare', packType:'legends' },
  { id:'icon_mccarthy', type:'icon', name:'Benni McCarthy', subjectName:'Benni McCarthy', nation:'Sud Africa', rarity:'rare', packType:'legends' },
  { id:'icon_cubillas', type:'icon', name:'Teófilo Cubillas', subjectName:'Teófilo Cubillas', nation:'Perù', rarity:'rare', packType:'legends' },
  { id:'icon_garcia', type:'icon', name:'Luis García', subjectName:'Luis García', nation:'Messico', rarity:'rare', packType:'legends' },
  { id:'icon_suarez_luis', type:'icon', name:'Luis Suárez', subjectName:'Luis Suárez', nation:'Uruguay', rarity:'rare', packType:'legends' },
  { id:'icon_forlan', type:'icon', name:'Diego Forlán', subjectName:'Diego Forlán', nation:'Uruguay', rarity:'rare', packType:'legends' },
  { id:'icon_recoba', type:'icon', name:'Álvaro Recoba', subjectName:'Álvaro Recoba', nation:'Uruguay', rarity:'rare', packType:'legends' },
  { id:'icon_park', type:'icon', name:'Park Ji-sung', subjectName:'Park Ji-sung', nation:'Corea del Sud', rarity:'rare', packType:'legends' },
  { id:'icon_inamoto', type:'icon', name:'Junichi Inamoto', subjectName:'Junichi Inamoto', nation:'Giappone', rarity:'rare', packType:'legends' },
  { id:'icon_daei', type:'icon', name:'Ali Daei', subjectName:'Ali Daei', nation:'Iran', rarity:'rare', packType:'legends' },

  // ════════════════════════════════════════════════════════════
  // NATIONS PACK — Carte aggiuntive per pool bilanciato
  // ════════════════════════════════════════════════════════════

  // Epic (aggiunte: +8 → tot 12)
  { id:'team_uru2', type:'team', name:'Uruguay', subjectName:'Uruguay', nation:'Uruguay', rarity:'epic', packType:'nations' },
  { id:'team_col2', type:'team', name:'Colombia', subjectName:'Colombia', nation:'Colombia', rarity:'epic', packType:'nations' },
  { id:'team_mar2', type:'team', name:'Marocco', subjectName:'Marocco', nation:'Marocco', rarity:'epic', packType:'nations' },
  { id:'team_usa2', type:'team', name:'USA', subjectName:'USA', nation:'USA', rarity:'epic', packType:'nations' },
  { id:'team_jpn2', type:'team', name:'Giappone', subjectName:'Giappone', nation:'Giappone', rarity:'epic', packType:'nations' },
  { id:'team_nor2', type:'team', name:'Norvegia', subjectName:'Norvegia', nation:'Norvegia', rarity:'epic', packType:'nations' },
  { id:'team_mex2', type:'team', name:'Messico', subjectName:'Messico', nation:'Messico', rarity:'epic', packType:'nations' },
  { id:'team_sen2', type:'team', name:'Senegal', subjectName:'Senegal', nation:'Senegal', rarity:'epic', packType:'nations' },

  // Rare (aggiunte: +18 → tot 30)
  { id:'team_sco2', type:'team', name:'Scozia', subjectName:'Scozia', nation:'Scozia', rarity:'rare', packType:'nations' },
  { id:'team_aus2', type:'team', name:'Australia', subjectName:'Australia', nation:'Australia', rarity:'rare', packType:'nations' },
  { id:'team_sui2', type:'team', name:'Svizzera', subjectName:'Svizzera', nation:'Svizzera', rarity:'rare', packType:'nations' },
  { id:'team_can2', type:'team', name:'Canada', subjectName:'Canada', nation:'Canada', rarity:'rare', packType:'nations' },
  { id:'team_tur2', type:'team', name:'Turchia', subjectName:'Turchia', nation:'Turchia', rarity:'rare', packType:'nations' },
  { id:'team_cro2', type:'team', name:'Croazia', subjectName:'Croazia', nation:'Croazia', rarity:'rare', packType:'nations' },
  { id:'team_bel2', type:'team', name:'Belgio', subjectName:'Belgio', nation:'Belgio', rarity:'rare', packType:'nations' },
  { id:'team_ned2', type:'team', name:'Paesi Bassi', subjectName:'Paesi Bassi', nation:'Paesi Bassi', rarity:'rare', packType:'nations' },
  { id:'team_kor2', type:'team', name:'Corea del Sud', subjectName:'Corea del Sud', nation:'Corea del Sud', rarity:'rare', packType:'nations' },
  { id:'team_ire', type:'team', name:'Iran', subjectName:'Iran', nation:'Iran', rarity:'rare', packType:'nations' },
  { id:'team_alg2', type:'team', name:'Algeria', subjectName:'Algeria', nation:'Algeria', rarity:'rare', packType:'nations' },
  { id:'team_ecu2', type:'team', name:'Ecuador', subjectName:'Ecuador', nation:'Ecuador', rarity:'rare', packType:'nations' },
  { id:'team_par2', type:'team', name:'Paraguay', subjectName:'Paraguay', nation:'Paraguay', rarity:'rare', packType:'nations' },
  { id:'team_gha2', type:'team', name:'Ghana', subjectName:'Ghana', nation:'Ghana', rarity:'rare', packType:'nations' },
  { id:'team_tun2', type:'team', name:'Tunisia', subjectName:'Tunisia', nation:'Tunisia', rarity:'rare', packType:'nations' },
  { id:'team_cze2', type:'team', name:'Repubblica Ceca', subjectName:'Repubblica Ceca', nation:'Repubblica Ceca', rarity:'rare', packType:'nations' },
  { id:'team_swe2', type:'team', name:'Svezia', subjectName:'Svezia', nation:'Svezia', rarity:'rare', packType:'nations' },
  { id:'team_bih2', type:'team', name:'Bosnia ed Erzegovina', subjectName:'Bosnia ed Erzegovina', nation:'Bosnia ed Erzegovina', rarity:'rare', packType:'nations' },

  // ════════════════════════════════════════════════════════════
  // STARS PACK — Carte aggiuntive per pool bilanciato
  // ════════════════════════════════════════════════════════════

  // Epic (aggiunte: +10 → tot 24)
  { id:'star_dembele2', type:'player', name:'Ousmane Dembélé', subjectName:'Ousmane Dembélé', nation:'Francia', rarity:'epic', packType:'stars' },
  { id:'star_gakpo', type:'player', name:'Cody Gakpo', subjectName:'Cody Gakpo', nation:'Paesi Bassi', rarity:'epic', packType:'stars' },
  { id:'star_musiala2', type:'player', name:'Jamal Musiala', subjectName:'Jamal Musiala', nation:'Germania', rarity:'epic', packType:'stars' },
  { id:'star_mitoma2', type:'player', name:'Kaoru Mitoma', subjectName:'Kaoru Mitoma', nation:'Giappone', rarity:'epic', packType:'stars' },
  { id:'star_isak2', type:'player', name:'Alexander Isak', subjectName:'Alexander Isak', nation:'Svezia', rarity:'epic', packType:'stars' },
  { id:'star_nunez2', type:'player', name:'Darwin Núñez', subjectName:'Darwin Núñez', nation:'Uruguay', rarity:'epic', packType:'stars' },
  { id:'star_pulisic2', type:'player', name:'Christian Pulisic', subjectName:'Christian Pulisic', nation:'USA', rarity:'epic', packType:'stars' },
  { id:'star_james2', type:'player', name:'James Rodríguez', subjectName:'James Rodríguez', nation:'Colombia', rarity:'epic', packType:'stars' },
  { id:'star_hakimi2', type:'player', name:'Achraf Hakimi', subjectName:'Achraf Hakimi', nation:'Marocco', rarity:'epic', packType:'stars' },
  { id:'star_david2', type:'player', name:'Jonathan David', subjectName:'Jonathan David', nation:'Canada', rarity:'epic', packType:'stars' },

  // Rare (aggiunte: +32 → tot 60)
  { id:'star_szoboszlai2', type:'player', name:'Dominik Szoboszlai', subjectName:'Dominik Szoboszlai', nation:'Ungheria', rarity:'rare', packType:'stars' },
  { id:'star_morata', type:'player', name:'Álvaro Morata', subjectName:'Álvaro Morata', nation:'Spagna', rarity:'rare', packType:'stars' },
  { id:'star_bernardo', type:'player', name:'Bernardo Silva', subjectName:'Bernardo Silva', nation:'Portogallo', rarity:'rare', packType:'stars' },
  { id:'star_camavinga', type:'player', name:'Eduardo Camavinga', subjectName:'Eduardo Camavinga', nation:'Francia', rarity:'rare', packType:'stars' },
  { id:'star_gnonto', type:'player', name:'Wilfried Gnonto', subjectName:'Wilfried Gnonto', nation:'Svizzera', rarity:'rare', packType:'stars' },
  { id:'star_mckennie', type:'player', name:'Weston McKennie', subjectName:'Weston McKennie', nation:'USA', rarity:'rare', packType:'stars' },
  { id:'star_aaronson', type:'player', name:'Brenden Aaronson', subjectName:'Brenden Aaronson', nation:'USA', rarity:'rare', packType:'stars' },
  { id:'star_kramaric', type:'player', name:'Andrej Kramarić', subjectName:'Andrej Kramarić', nation:'Croazia', rarity:'rare', packType:'stars' },
  { id:'star_kovacic', type:'player', name:'Mateo Kovačić', subjectName:'Mateo Kovačić', nation:'Croazia', rarity:'rare', packType:'stars' },
  { id:'star_hojbjerg', type:'player', name:'Pierre-Emile Højbjerg', subjectName:'Pierre-Emile Højbjerg', nation:'Danimarca', rarity:'rare', packType:'stars' },
  { id:'star_fernandes', type:'player', name:'Bruno Fernandes', subjectName:'Bruno Fernandes', nation:'Portogallo', rarity:'rare', packType:'stars' },
  { id:'star_diatta', type:'player', name:'Krepin Diatta', subjectName:'Krepin Diatta', nation:'Senegal', rarity:'rare', packType:'stars' },
  { id:'star_ndidi', type:'player', name:'Wilfred Ndidi', subjectName:'Wilfred Ndidi', nation:'Nigeria', rarity:'rare', packType:'stars' },
  { id:'star_bah', type:'player', name:'Abdoulaye Bah', subjectName:'Abdoulaye Bah', nation:'Guinea', rarity:'rare', packType:'stars' },
  { id:'star_vanaken', type:'player', name:'Hans Vanaken', subjectName:'Hans Vanaken', nation:'Belgio', rarity:'rare', packType:'stars' },
  { id:'star_trossard', type:'player', name:'Leandro Trossard', subjectName:'Leandro Trossard', nation:'Belgio', rarity:'rare', packType:'stars' },
  { id:'star_tadic', type:'player', name:'Dušan Tadić', subjectName:'Dušan Tadić', nation:'Serbia', rarity:'rare', packType:'stars' },
  { id:'star_mitrovic', type:'player', name:'Aleksandar Mitrović', subjectName:'Aleksandar Mitrović', nation:'Serbia', rarity:'rare', packType:'stars' },
  { id:'star_guendouzi', type:'player', name:'Mattéo Guendouzi', subjectName:'Mattéo Guendouzi', nation:'Francia', rarity:'rare', packType:'stars' },
  { id:'star_llorente', type:'player', name:'Marcos Llorente', subjectName:'Marcos Llorente', nation:'Spagna', rarity:'rare', packType:'stars' },
  { id:'star_diagne', type:'player', name:'Mbaye Diagne', subjectName:'Mbaye Diagne', nation:'Senegal', rarity:'rare', packType:'stars' },
  { id:'star_aouar', type:'player', name:'Houssem Aouar', subjectName:'Houssem Aouar', nation:'Algeria', rarity:'rare', packType:'stars' },
  { id:'star_bennacer', type:'player', name:'Ismail Bennacer', subjectName:'Ismail Bennacer', nation:'Algeria', rarity:'rare', packType:'stars' },
  { id:'star_aboubakar', type:'player', name:'Vincent Aboubakar', subjectName:'Vincent Aboubakar', nation:'Camerun', rarity:'rare', packType:'stars' },
  { id:'star_sabitzer', type:'player', name:'Marcel Sabitzer', subjectName:'Marcel Sabitzer', nation:'Austria', rarity:'rare', packType:'stars' },
  { id:'star_arnautovic', type:'player', name:'Marko Arnautović', subjectName:'Marko Arnautović', nation:'Austria', rarity:'rare', packType:'stars' },
  { id:'star_wood2', type:'player', name:'Chris Wood', subjectName:'Chris Wood', nation:'Nuova Zelanda', rarity:'rare', packType:'stars' },
  { id:'star_olmo', type:'player', name:'Dani Olmo', subjectName:'Dani Olmo', nation:'Spagna', rarity:'rare', packType:'stars' },
  { id:'star_szczesny', type:'player', name:'Wojciech Szczęsny', subjectName:'Wojciech Szczęsny', nation:'Polonia', rarity:'rare', packType:'stars' },
  { id:'star_lewandowski', type:'player', name:'Robert Lewandowski', subjectName:'Robert Lewandowski', nation:'Polonia', rarity:'rare', packType:'stars' },
  { id:'star_frimpong', type:'player', name:'Jeremie Frimpong', subjectName:'Jeremie Frimpong', nation:'Paesi Bassi', rarity:'rare', packType:'stars' },
  { id:'star_simons', type:'player', name:'Xavi Simons', subjectName:'Xavi Simons', nation:'Paesi Bassi', rarity:'rare', packType:'stars' },

  // ════════════════════════════════════════════════════════════
  // LEGENDS PACK — Carte aggiuntive per pool bilanciato
  // ════════════════════════════════════════════════════════════

  // Epic (aggiunte: +12 → tot 32)
  { id:'icon_r9_epic', type:'icon', name:'Ronaldo Nazário', subjectName:'Ronaldo Nazário', nation:'Brasile', rarity:'epic', packType:'legends' },
  { id:'icon_zidane2', type:'icon', name:'Zinedine Zidane', subjectName:'Zinedine Zidane', nation:'Francia', rarity:'epic', packType:'legends' },
  { id:'icon_nedved2', type:'icon', name:'Pavel Nedvěd', subjectName:'Pavel Nedvěd', nation:'Repubblica Ceca', rarity:'epic', packType:'legends' },
  { id:'icon_shevchenko', type:'icon', name:'Andriy Shevchenko', subjectName:'Andriy Shevchenko', nation:'Ucraina', rarity:'epic', packType:'legends' },
  { id:'icon_lampard', type:'icon', name:'Frank Lampard', subjectName:'Frank Lampard', nation:'Inghilterra', rarity:'epic', packType:'legends' },
  { id:'icon_terry', type:'icon', name:'John Terry', subjectName:'John Terry', nation:'Inghilterra', rarity:'epic', packType:'legends' },
  { id:'icon_riquelme', type:'icon', name:'Juan Román Riquelme', subjectName:'Juan Román Riquelme', nation:'Argentina', rarity:'epic', packType:'legends' },
  { id:'icon_saviola', type:'icon', name:'Javier Saviola', subjectName:'Javier Saviola', nation:'Argentina', rarity:'epic', packType:'legends' },
  { id:'icon_ronaldinho2', type:'icon', name:'Ronaldinho', subjectName:'Ronaldinho', nation:'Brasile', rarity:'epic', packType:'legends' },
  { id:'icon_adriano', type:'icon', name:'Adriano', subjectName:'Adriano', nation:'Brasile', rarity:'epic', packType:'legends' },
  { id:'icon_kaka', type:'icon', name:'Kaká', subjectName:'Kaká', nation:'Brasile', rarity:'epic', packType:'legends' },
  { id:'icon_suarez_icon', type:'icon', name:'Luis Suárez', subjectName:'Luis Suárez', nation:'Uruguay', rarity:'epic', packType:'legends' },

  // Rare (aggiunte: +26 → tot 80)
  { id:'icon_etoo', type:'icon', name:'Samuel Eto’o', subjectName:'Samuel Eto’o', nation:'Camerun', rarity:'rare', packType:'legends' },
  { id:'icon_abedi', type:'icon', name:'Abedi Pelé', subjectName:'Abedi Pelé', nation:'Ghana', rarity:'rare', packType:'legends' },
  { id:'icon_toure', type:'icon', name:'Yaya Touré', subjectName:'Yaya Touré', nation:"Costa d'Avorio", rarity:'rare', packType:'legends' },
  { id:'icon_banega', type:'icon', name:'Ever Banega', subjectName:'Ever Banega', nation:'Argentina', rarity:'rare', packType:'legends' },
  { id:'icon_tevez', type:'icon', name:'Carlos Tevez', subjectName:'Carlos Tevez', nation:'Argentina', rarity:'rare', packType:'legends' },
  { id:'icon_cambiasso', type:'icon', name:'Esteban Cambiasso', subjectName:'Esteban Cambiasso', nation:'Argentina', rarity:'rare', packType:'legends' },
  { id:'icon_giggs', type:'icon', name:'Ryan Giggs', subjectName:'Ryan Giggs', nation:'Galles', rarity:'rare', packType:'legends' },
  { id:'icon_ferdinand', type:'icon', name:'Rio Ferdinand', subjectName:'Rio Ferdinand', nation:'Inghilterra', rarity:'rare', packType:'legends' },
  { id:'icon_owen', type:'icon', name:'Michael Owen', subjectName:'Michael Owen', nation:'Inghilterra', rarity:'rare', packType:'legends' },
  { id:'icon_cole', type:'icon', name:'Ashley Cole', subjectName:'Ashley Cole', nation:'Inghilterra', rarity:'rare', packType:'legends' },
  { id:'icon_ribery', type:'icon', name:'Franck Ribéry', subjectName:'Franck Ribéry', nation:'Francia', rarity:'rare', packType:'legends' },
  { id:'icon_thuram', type:'icon', name:'Lilian Thuram', subjectName:'Lilian Thuram', nation:'Francia', rarity:'rare', packType:'legends' },
  { id:'icon_malouda', type:'icon', name:'Florent Malouda', subjectName:'Florent Malouda', nation:'Francia', rarity:'rare', packType:'legends' },
  { id:'icon_schweinsteiger', type:'icon', name:'Bastian Schweinsteiger', subjectName:'Bastian Schweinsteiger', nation:'Germania', rarity:'rare', packType:'legends' },
  { id:'icon_lehmann', type:'icon', name:'Jens Lehmann', subjectName:'Jens Lehmann', nation:'Germania', rarity:'rare', packType:'legends' },
  { id:'icon_stam', type:'icon', name:'Jaap Stam', subjectName:'Jaap Stam', nation:'Paesi Bassi', rarity:'rare', packType:'legends' },
  { id:'icon_nesta', type:'icon', name:'Alessandro Nesta', subjectName:'Alessandro Nesta', nation:'Italia', rarity:'rare', packType:'legends' },
  { id:'icon_albertini', type:'icon', name:'Demetrio Albertini', subjectName:'Demetrio Albertini', nation:'Italia', rarity:'rare', packType:'legends' },
  { id:'icon_conte', type:'icon', name:'Antonio Conte', subjectName:'Antonio Conte', nation:'Italia', rarity:'rare', packType:'legends' },
  { id:'icon_hierro2', type:'icon', name:'Fernando Hierro', subjectName:'Fernando Hierro', nation:'Spagna', rarity:'rare', packType:'legends' },
  { id:'icon_morientes', type:'icon', name:'Fernando Morientes', subjectName:'Fernando Morientes', nation:'Spagna', rarity:'rare', packType:'legends' },
  { id:'icon_roberto_mancini', type:'icon', name:'Roberto Mancini', subjectName:'Roberto Mancini', nation:'Italia', rarity:'rare', packType:'legends' },
  { id:'icon_ronaldo_cr7_icon', type:'icon', name:'Cristiano Ronaldo', subjectName:'Cristiano Ronaldo', nation:'Portogallo', rarity:'rare', packType:'legends' },
  { id:'icon_deco', type:'icon', name:'Deco', subjectName:'Deco', nation:'Portogallo', rarity:'rare', packType:'legends' },
  { id:'icon_petit', type:'icon', name:'Emmanuel Petit', subjectName:'Emmanuel Petit', nation:'Francia', rarity:'rare', packType:'legends' },
  { id:'icon_zubizarreta2', type:'icon', name:'Andoni Zubizarreta', subjectName:'Andoni Zubizarreta', nation:'Spagna', rarity:'rare', packType:'legends' },

];

// ── Helper functions ──

function getCardById(id) {
  return ALL_CARDS.find(c => c.id === id);
}

function getCardsByPack(packType) {
  return ALL_CARDS.filter(c => c.packType === packType);
}

function getCardsByRarity(rarity) {
  return ALL_CARDS.filter(c => c.rarity === rarity);
}

function getCardsByPackAndRarity(packType, rarity) {
  return ALL_CARDS.filter(c => c.packType === packType && c.rarity === rarity);
}

// Pack type metadata for UI
const PACK_TYPES = {
  nations: { icon: 'globe', name: 'Nations Pack', subtitle: 'Team Shield', description: 'Carte stemma delle 48 nazioni qualificate ai Mondiali 2026.', accentColor: '#2dd4bf' },
  stars:   { icon: 'star', name: 'Stars Pack', subtitle: 'Star Player', description: 'Il giocatore di punta di ogni nazione qualificata.', accentColor: '#38bdf8' },
  legends: { icon: 'trophy', name: 'Legends Pack', subtitle: 'Football Icon', description: 'Leggende storiche del calcio mondiale. Nessuna carta comune!', accentColor: '#f8c35a' }
};

// Rarity metadata for UI
const RARITY_META = {
  common:    { label:'Comune',      color:'#7d8a86', gradient:['#26332f','#101b18'], glow:null,      particles:0  },
  rare:      { label:'Raro',        color:'#38bdf8', gradient:['#0e4661','#092633'], glow:'rgba(56,189,248,0.38)',  particles:8  },
  epic:      { label:'Epico',       color:'#b27bff', gradient:['#44225f','#1f1234'], glow:'rgba(178,123,255,0.5)', particles:16 },
  legendary: { label:'Leggendario', color:'#f8c35a', gradient:['#7a4211','#2f1d0b'], glow:'rgba(248,195,90,0.65)', particles:40 }
};
