// main.js - Punto di ingresso dell'applicazione

// Variabili globali
window.pairToEmployee = ["ANNA", "ELEONORA", "KATIA"];
window.giorniLavorativiSettimanali = 6;
window.employeeVariations = {
  ANNA: [],
  ELEONORA: [],
  KATIA: [],
};
window.employees = {
  ANNA: 40,
  ELEONORA: 25,
  KATIA: 30,
};
window.selectedCell = null;
window.currentCellData = null;
window.anno = 2025;
window.mese = 2;
window.allTimes = [];

// Assicurarsi che le variabili globali siano inizializzate correttamente
window.sums = window.sums || Array(window.pairToEmployee.length).fill(0);
window.ferieTotals = window.ferieTotals || Array(window.pairToEmployee.length).fill(0);
window.exFestivitaTotals = window.exFestivitaTotals || Array(window.pairToEmployee.length).fill(0);
window.rolTotals = window.rolTotals || Array(window.pairToEmployee.length).fill(0);

// Al caricamento del DOM, visualizza il popup per la selezione di mese e anno
document.addEventListener("DOMContentLoaded", function () {
  showDateSelection();

  // Rimosso il listener che abilitava/disabilitava gli input in base al radio selezionato.
  // In questa versione gli input rimangono sempre attivi.

  // Rimosso anche il listener per il cambio di "aCasaMotivazioni".
});