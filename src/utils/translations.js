/**
 * translations.js
 * All UI strings in English and Polish.
 * Usage: import { useT } from '../utils/translations'
 *        const t = useT(lang)
 *        t('totalShots') → 'Total Shots' or 'Łączna liczba strzałów'
 */

export const TRANSLATIONS = {
  en: {
    // Nav
    appTitle: 'CAC PLAYER REPORT',
    single: 'SINGLE',
    compare: 'COMPARE',
    selectPlayer1: 'SELECT PLAYER 1',
    selectPlayer2: 'SELECT PLAYER 2',
    vs: 'vs',
    loadingMatch: 'LOADING MATCH DATA…',
    selectTwoPlayers: 'SELECT TWO PLAYERS TO COMPARE',
    selectAPlayer: 'SELECT A PLAYER',
    downloadPdf: '⬇ DOWNLOAD PDF',
    generating: 'GENERATING…',
    pdf: '⬇ PDF',
    noData: 'NO DATA',

    // Sidebar
    startingXi: 'STARTING XI',
    substitutes: 'SUBSTITUTES',
    players: 'PLAYERS',
    withData: 'WITH DATA',

    // Identity
    playerMatchReport: 'PLAYER MATCH REPORT',
    no: 'NO.',
    score: 'SCORE',

    // KPI labels
    kpiPasses: 'PASSES',
    kpiGoals: 'GOALS',
    kpiAssists: 'ASSISTS',
    kpiTackles: 'TACKLES',
    kpiIntercept: 'INTERCEPT',
    kpiDribbles: 'DRIBBLES',
    kpiAcc: 'ACC',
    kpiKeyPass: 'KEY PASS',
    kpiWon: 'WON',
    kpiSucc: 'SUCC',

    // Tabs
    tabReport: 'REPORT',
    tabOverview: 'OVERVIEW',
    tabPassing: 'PASSING & VISION',
    tabDefensive: 'DEFENSIVE',
    tabHeatmaps: 'HEATMAPS',
    tabHighlights: 'HIGHLIGHTS',

    // Module titles
    modRadar: 'PERFORMANCE RADAR',
    modShooting: 'SHOOTING',
    modDribbling: 'DRIBBLING & CARRIES',
    modPassing: 'PASSING',
    modCreative: 'CREATIVE',
    modPassMap: 'PASS MAP',
    modTackling: 'TACKLING',
    modInterceptions: 'INTERCEPTIONS',
    modDuels: 'DUELS & PRESSURE',
    modDefSummary: 'DEFENSIVE SUMMARY',
    modHeatmap: 'TOUCH HEATMAP',
    modShotMap: 'SHOT MAP',
    noPassData: 'NO PASS DATA',
    noShots: 'NO SHOTS',

    // Stat rows — Shooting
    totalShots: 'Total Shots',
    shotsOnTarget: 'Shots on Target',
    goals: 'Goals',
    xg: 'xG',
    xgSub: 'expected goals',
    xgot: 'xGOT',
    xgotSub: 'xg on target',
    conversionRate: 'Conversion Rate',

    // Stat rows — Dribbling
    dribbles: 'Dribbles',
    carriesFinal3rd: 'Carries into Final 3rd',
    carriesBox: 'Carries into Box',
    ballControls: 'Ball Controls',

    // Stat rows — Passing
    totalPasses: 'Total Passes',
    passAccuracy: 'Pass Accuracy',
    progressivePasses: 'Progressive Passes',
    longBalls: 'Long Balls',
    crosses: 'Crosses',
    passesIntoBox: 'Passes into Box',
    keyPasses: 'Key Passes',
    assists: 'Assists',
    passesOwnHalf: 'Passes in Own Half',
    passesOppHalf: 'Passes in Opp. Half',
    incompletePasses: 'Incomplete Passes',

    // Stat rows — Defensive
    totalTackles: 'Total Tackles',
    successful: 'Successful',
    withPossession: 'With Possession',
    successRate: 'Success Rate',
    totalInterceptions: 'Total Interceptions',
    withPossessionRegained: 'With Possession Regained',
    aerialDuelsWon: 'Aerial Duels Won',
    pressuresApplied: 'Pressures Applied',
    blocks: 'Blocks',
    clearances: 'Clearances',
    totalDefActions: 'Total Defensive Actions',
    saves: 'Saves',

    // Compare table sections
    cmpPassing: 'PASSING',
    cmpAttacking: 'ATTACKING & SHOOTING',
    cmpDribbling: 'DRIBBLING & CARRIES',
    cmpDefensive: 'DEFENSIVE',
    cmpDefComparison: 'DEFENSIVE COMPARISON',

    // Compare row labels
    cmpTotalPasses: 'Total Passes',
    cmpCompletedPasses: 'Completed Passes',
    cmpPassAccuracy: 'Pass Accuracy %',
    cmpProgPasses: 'Progressive Passes',
    cmpProgCompleted: 'Progressive Completed',
    cmpLongBalls: 'Long Balls',
    cmpLongBallsCompleted: 'Long Balls Completed',
    cmpCrosses: 'Crosses',
    cmpCrossesCompleted: 'Crosses Completed',
    cmpPassesIntoBox: 'Passes into Box',
    cmpKeyPasses: 'Key Passes',
    cmpAssists: 'Assists',
    cmpIncompletePasses: 'Incomplete Passes',
    cmpOwnHalf: 'Passes in Own Half',
    cmpOppHalf: 'Passes in Opp. Half',
    cmpGoals: 'Goals',
    cmpTotalShots: 'Total Shots',
    cmpShotsOnTarget: 'Shots on Target',
    cmpXg: 'xG (Expected Goals)',
    cmpXgot: 'xGOT (xG on Target)',
    cmpConversion: 'Conversion Rate %',
    cmpDribblesAttempted: 'Dribbles Attempted',
    cmpDribblesSuccessful: 'Dribbles Successful',
    cmpDribbleSuccess: 'Dribble Success %',
    cmpCarriesFinal3rd: 'Carries into Final 3rd',
    cmpCarriesBox: 'Carries into Box',
    cmpBallControls: 'Ball Controls',
    cmpTotalTackles: 'Total Tackles',
    cmpTacklesWon: 'Tackles Won',
    cmpTacklesPossession: 'Tackles with Possession',
    cmpTackleSuccess: 'Tackle Success %',
    cmpInterceptions: 'Interceptions',
    cmpInterceptionsRegained: 'Interceptions (Regained)',
    cmpAerialDuels: 'Aerial Duels Won',
    cmpBlocks: 'Blocks',
    cmpClearances: 'Clearances',
    cmpPressures: 'Pressures Applied',
    cmpSaves: 'Saves',
    cmpTotalDefActions: 'Total Defensive Actions',

    // Radar
    radarNote: 'Values normalised 0-100 relative to all players in this match',

    // Setup
    setupRequired: 'SETUP REQUIRED',
  },

  pl: {
    // Nav
    appTitle: 'CAC RAPORT ZAWODNIKA',
    single: 'POJEDYNCZY',
    compare: 'PORÓWNAJ',
    selectPlayer1: 'WYBIERZ ZAWODNIKA 1',
    selectPlayer2: 'WYBIERZ ZAWODNIKA 2',
    vs: 'vs',
    loadingMatch: 'ŁADOWANIE DANYCH MECZU…',
    selectTwoPlayers: 'WYBIERZ DWÓCH ZAWODNIKÓW DO PORÓWNANIA',
    selectAPlayer: 'WYBIERZ ZAWODNIKA',
    downloadPdf: '⬇ POBIERZ PDF',
    generating: 'GENEROWANIE…',
    pdf: '⬇ PDF',
    noData: 'BRAK DANYCH',

    // Sidebar
    startingXi: 'SKŁAD PODSTAWOWY',
    substitutes: 'REZERWA',
    players: 'ZAWODNIKÓW',
    withData: 'Z DANYMI',

    // Identity
    playerMatchReport: 'RAPORT Z MECZU',
    no: 'NR',
    score: 'WYNIK',

    // KPI labels
    kpiPasses: 'PODANIA',
    kpiGoals: 'GOLE',
    kpiAssists: 'ASYSTY',
    kpiTackles: 'ODBIORY',
    kpiIntercept: 'PRZECHWYTY',
    kpiDribbles: 'DRYBLINGI',
    kpiAcc: 'SKT.',
    kpiKeyPass: 'KL. PODANIE',
    kpiWon: 'WYGRANY',
    kpiSucc: 'SKUT.',

    // Tabs
    tabReport: 'RAPORT',
    tabOverview: 'PRZEGLĄD',
    tabPassing: 'PODANIA I WIZJA',
    tabDefensive: 'OBRONA',
    tabHeatmaps: 'MAPY CIEPLNE',
    tabHighlights: 'AKCJE',

    // Module titles
    modRadar: 'RADAR WYDAJNOŚCI',
    modShooting: 'STRZAŁY',
    modDribbling: 'DRYBLINGI I NOSZENIE',
    modPassing: 'PODANIA',
    modCreative: 'KREATYWNOŚĆ',
    modPassMap: 'MAPA PODAŃ',
    modTackling: 'ODBIORY',
    modInterceptions: 'PRZECHWYTY',
    modDuels: 'POJEDYNKI I PRESSING',
    modDefSummary: 'PODSUMOWANIE OBRONY',
    modHeatmap: 'MAPA CIEPLNA KONTAKTÓW',
    modShotMap: 'MAPA STRZAŁÓW',
    noPassData: 'BRAK DANYCH PODAŃ',
    noShots: 'BRAK STRZAŁÓW',

    // Stat rows — Shooting
    totalShots: 'Łączna liczba strzałów',
    shotsOnTarget: 'Strzały celne',
    goals: 'Gole',
    xg: 'xG',
    xgSub: 'oczekiwane gole',
    xgot: 'xGOT',
    xgotSub: 'xg celnych strzałów',
    conversionRate: 'Skuteczność',

    // Stat rows — Dribbling
    dribbles: 'Dryblingi',
    carriesFinal3rd: 'Wejścia w ostatnią tercję',
    carriesBox: 'Wejścia w pole karne',
    ballControls: 'Kontrole piłki',

    // Stat rows — Passing
    totalPasses: 'Łączna liczba podań',
    passAccuracy: 'Celność podań',
    progressivePasses: 'Podania progresywne',
    longBalls: 'Długie piłki',
    crosses: 'Dośrodkowania',
    passesIntoBox: 'Podania w pole karne',
    keyPasses: 'Kluczowe podania',
    assists: 'Asysty',
    passesOwnHalf: 'Podania na własnej połowie',
    passesOppHalf: 'Podania na połowie rywala',
    incompletePasses: 'Niecelne podania',

    // Stat rows — Defensive
    totalTackles: 'Łączna liczba odbiorów',
    successful: 'Skuteczne',
    withPossession: 'Z przejęciem piłki',
    successRate: 'Skuteczność',
    totalInterceptions: 'Łączna liczba przechwytów',
    withPossessionRegained: 'Z odzyskaniem posiadania',
    aerialDuelsWon: 'Wygrane pojedynki powietrzne',
    pressuresApplied: 'Pressing',
    blocks: 'Bloki',
    clearances: 'Wybicia',
    totalDefActions: 'Łączna liczba akcji defensywnych',
    saves: 'Obrony',

    // Compare table sections
    cmpPassing: 'PODANIA',
    cmpAttacking: 'ATAK I STRZAŁY',
    cmpDribbling: 'DRYBLINGI I NOSZENIE',
    cmpDefensive: 'OBRONA',
    cmpDefComparison: 'PORÓWNANIE OBRONY',

    // Compare row labels
    cmpTotalPasses: 'Łączna liczba podań',
    cmpCompletedPasses: 'Podania celne',
    cmpPassAccuracy: 'Celność podań %',
    cmpProgPasses: 'Podania progresywne',
    cmpProgCompleted: 'Progresywne celne',
    cmpLongBalls: 'Długie piłki',
    cmpLongBallsCompleted: 'Długie piłki celne',
    cmpCrosses: 'Dośrodkowania',
    cmpCrossesCompleted: 'Dośrodkowania celne',
    cmpPassesIntoBox: 'Podania w pole karne',
    cmpKeyPasses: 'Kluczowe podania',
    cmpAssists: 'Asysty',
    cmpIncompletePasses: 'Niecelne podania',
    cmpOwnHalf: 'Podania na własnej połowie',
    cmpOppHalf: 'Podania na połowie rywala',
    cmpGoals: 'Gole',
    cmpTotalShots: 'Łączna liczba strzałów',
    cmpShotsOnTarget: 'Strzały celne',
    cmpXg: 'xG (Oczekiwane gole)',
    cmpXgot: 'xGOT (xG celnych strzałów)',
    cmpConversion: 'Skuteczność %',
    cmpDribblesAttempted: 'Dryblingi (próby)',
    cmpDribblesSuccessful: 'Dryblingi (skuteczne)',
    cmpDribbleSuccess: 'Skuteczność dryblingów %',
    cmpCarriesFinal3rd: 'Wejścia w ostatnią tercję',
    cmpCarriesBox: 'Wejścia w pole karne',
    cmpBallControls: 'Kontrole piłki',
    cmpTotalTackles: 'Łączna liczba odbiorów',
    cmpTacklesWon: 'Odbiory wygrane',
    cmpTacklesPossession: 'Odbiory z przejęciem',
    cmpTackleSuccess: 'Skuteczność odbiorów %',
    cmpInterceptions: 'Przechwyty',
    cmpInterceptionsRegained: 'Przechwyty (z odzyskaniem)',
    cmpAerialDuels: 'Wygrane pojedynki powietrzne',
    cmpBlocks: 'Bloki',
    cmpClearances: 'Wybicia',
    cmpPressures: 'Pressing',
    cmpSaves: 'Obrony',
    cmpTotalDefActions: 'Łączna liczba akcji defensywnych',

    // Radar
    radarNote: 'Wartości znormalizowane 0-100 względem wszystkich zawodników w meczu',

    // Setup
    setupRequired: 'WYMAGANA KONFIGURACJA',
  },
}

/** Returns a translation function for the given language */
export function useT(lang = 'en') {
  const dict = TRANSLATIONS[lang] ?? TRANSLATIONS.en
  return (key) => dict[key] ?? TRANSLATIONS.en[key] ?? key
}
