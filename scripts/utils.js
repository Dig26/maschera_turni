// utils.js - Funzioni di utilità

function getISOWeek(date) {
  var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}
  
function formatDecimalHours(decimalHours) {
  var fractional = decimalHours - Math.floor(decimalHours);
  if (Math.abs(fractional - 0.25) < 0.001 || Math.abs(fractional - 0.75) < 0.001) {
    return decimalHours.toFixed(2).replace(".", ",");
  } else {
    return decimalHours.toFixed(1).replace(".", ",");
  }
}
  
function addMinutes(timeStr, minutesToAdd) {
  var parts = timeStr.split(":").map(Number);
  var h = parts[0], m = parts[1];
  var total = h * 60 + m + minutesToAdd;
  var newH = Math.floor(total / 60) % 24;
  var newM = total % 60;
  return (newH < 10 ? "0" + newH : newH) + ":" + (newM < 10 ? "0" + newM : newM);
}
  
function subtractMinutes(timeStr, minutesToSubtract) {
  var parts = timeStr.split(":").map(Number);
  var h = parts[0], m = parts[1];
  var total = h * 60 + m - minutesToSubtract;
  if (total < 0) total += 24 * 60;
  var newH = Math.floor(total / 60) % 24;
  var newM = total % 60;
  return (newH < 10 ? "0" + newH : newH) + ":" + (newM < 10 ? "0" + newM : newM);
}
  
function getLocalDateString(date) {
  var year = date.getFullYear();
  var month = (date.getMonth() + 1).toString().padStart(2, "0");
  var day = date.getDate().toString().padStart(2, "0");
  return year + "-" + month + "-" + day;
}
  
function generateAllTimes() {
  var times = [];
  for (var h = 0; h < 24; h++) {
    var hour = h < 10 ? "0" + h : "" + h;
    for (var m = 0; m < 60; m += 15) {
      var minute = m < 10 ? "0" + m : "" + m;
      times.push(hour + ":" + minute);
    }
  }
  return times;
}
  
function getWeekRangeForMonth(anno, mese) {
  var firstDay = new Date(anno, mese, 1);
  var lastDay = new Date(anno, mese + 1, 0);
  var minWeek = getISOWeek(firstDay);
  var maxWeek = getISOWeek(lastDay);
  var minW = (minWeek < 10 ? "0" : "") + minWeek;
  var maxW = (maxWeek < 10 ? "0" : "") + maxWeek;
  return {
    min: anno + "-W" + minW,
    max: anno + "-W" + maxW,
    count: maxWeek - minWeek + 1,
  };
}
  
function getWeekStartEnd(weekValue) {
  var parts = weekValue.split("-W");
  var year = parseInt(parts[0]);
  var week = parseInt(parts[1]);
  var simple = new Date(year, 0, 1 + (week - 1) * 7);
  var dow = simple.getDay();
  var ISOday = dow === 0 ? 7 : dow;
  var startDate = new Date(simple);
  startDate.setDate(simple.getDate() - ISOday + 1);
  var endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return { start: startDate, end: endDate };
}

// Funzione per aggiornare il totale del fatturato
function updateFatturatoTotale() {
  if (!window.hot || typeof window.hot.getDataAtCell !== "function") return;
  
  // Verifica che getUnitStartIndex sia disponibile
  if (typeof window.getUnitStartIndex !== "function") {
    console.error("La funzione getUnitStartIndex non è disponibile");
    return;
  }
  
  // Cerca l'indice della colonna "Fatturato"
  var fatturatoColIndex = null;
  for (var i = 0; i < window.columnUnits.length; i++) {
    if (window.columnUnits[i].type === "fatturato") {
      fatturatoColIndex = window.getUnitStartIndex(i);
      break;
    }
  }
  
  if (fatturatoColIndex === null) return;
  
  var totale = 0;
  var giorniNelMese = new Date(window.anno, window.mese + 1, 0).getDate();
  
  // Somma tutti i valori nella colonna fatturato (escluso l'header)
  for (var i = 1; i <= giorniNelMese; i++) {
    var cellVal = window.hot.getDataAtCell(i, fatturatoColIndex);
    if (cellVal && cellVal.trim() !== "") {
      // Estrae il valore numerico dalla stringa (es. "123,45 €" -> 123.45)
      var numValue = parseFloat(cellVal.replace(/[^\d,]/g, '').replace(',', '.'));
      if (!isNaN(numValue)) {
        totale += numValue;
      }
    }
  }
  
  // Formatta il totale e lo inserisce nella cella merged
  var formattedTotal = totale.toFixed(2).replace(".", ",") + " €";
  window.hot.setDataAtCell(window.oreLavorateRowIndex, fatturatoColIndex, formattedTotal, "updateFatturatoTotale");
  
  // Applica la classe CSS per lo stile
  for (var i = window.oreLavorateRowIndex; i <= window.orePagateRowIndex; i++) {
    window.hot.setCellMeta(i, fatturatoColIndex, 'className', 'fatturato-totale');
  }
  
  // Forza il rendering per applicare le modifiche di stile
  window.hot.render();
}

// Funzione globale per ricalcolare tutti i totali delle ore
window.recalculateAllTotals = function() {
  if (!window.hot || typeof window.hot.getDataAtCell !== 'function') return;
  
  // Calcola ORE LAVORATE
  recalculateWorkHours();
  
  // Calcola FERIE, EX FESTIVITA, ROL
  recalculateMotiveHours();
  
  // Calcola TOTALE ORE
  window.updateTotaleOre();
  
  // Calcola ORE PAGATE  
  window.updateOrePagate();
  
  // Calcola FATTURATO
  if (typeof window.updateFatturatoTotale === "function") {
    window.updateFatturatoTotale();
  }
}

// Funzione per ricalcolare le ore lavorate
function recalculateWorkHours() {
  if (!window.hot || !window.pairToEmployee) return;
  
  // Inizializza o resetta l'array sums
  window.sums = Array(window.pairToEmployee.length).fill(0);
  
  // Ottieni il numero dei giorni nel mese
  var giorniNelMese = new Date(window.anno, window.mese + 1, 0).getDate();
  
  // Per ogni dipendente
  for (var pairIndex = 0; pairIndex < window.pairToEmployee.length; pairIndex++) {
    var sumHours = 0;
    
    // Per ogni giorno del mese
    for (var day = 1; day <= giorniNelMese; day++) {
      var inizio = window.hot.getDataAtCell(day, 2 + 2 * pairIndex);
      var fine = window.hot.getDataAtCell(day, 3 + 2 * pairIndex);
      
      // Se c'è un valore nella cella "fine" e non è "X" e non contiene "|"
      if (fine && fine !== "X" && fine.indexOf("|") === -1) {
        // Converti il valore in numero
        var hours = parseFloat(fine.replace(",", "."));
        if (!isNaN(hours)) {
          sumHours += hours;
        }
      }
    }
    
    // Imposta il valore nella tabella
    window.sums[pairIndex] = sumHours;
    window.hot.setDataAtCell(window.oreLavorateRowIndex, 2 + 2 * pairIndex, sumHours.toFixed(2).replace(".", ","), "recalculate");
  }
}

// Funzione per ricalcolare le ore di ferie, ex festivita e rol
function recalculateMotiveHours() {
  if (!window.hot || !window.pairToEmployee) return;
  
  // Inizializza gli array per i totali delle motivazioni
  window.ferieTotals = Array(window.pairToEmployee.length).fill(0);
  window.exFestivitaTotals = Array(window.pairToEmployee.length).fill(0);
  window.rolTotals = Array(window.pairToEmployee.length).fill(0);
  
  // Ottieni il numero dei giorni nel mese
  var giorniNelMese = new Date(window.anno, window.mese + 1, 0).getDate();
  
  // Per ogni dipendente
  for (var pairIndex = 0; pairIndex < window.pairToEmployee.length; pairIndex++) {
    var emp = window.pairToEmployee[pairIndex];
    
    // Per ogni giorno del mese
    for (var day = 1; day <= giorniNelMese; day++) {
      var inizio = window.hot.getDataAtCell(day, 2 + 2 * pairIndex);
      var fine = window.hot.getDataAtCell(day, 3 + 2 * pairIndex);
      
      // Se c'è una "X" nella cella "inizio" e un valore con "|" nella cella "fine"
      if (inizio === "X" && fine && fine.indexOf("|") !== -1) {
        var parts = fine.split("|");
        var motive = parts[0].trim().toLowerCase();
        
        // Calcola le ore giornaliere per il dipendente
        var rowDate = new Date(window.anno, window.mese, day);
        var oreSettimanali = window.employees[emp];
        
        // Controllo variazioni orarie
        if (window.employeeVariations[emp]) {
          for (var i = 0; i < window.employeeVariations[emp].length; i++) {
            var entry = window.employeeVariations[emp][i];
            var startDate = new Date(entry.start + "T00:00:00");
            var endDate = new Date(entry.end + "T00:00:00");
            if (rowDate >= startDate && rowDate <= endDate) {
              oreSettimanali = entry.hours;
              break;
            }
          }
        }
        
        // Calcola ore giornaliere
        var oreGiornaliere = oreSettimanali / window.giorniLavorativiSettimanali;
        
        // Aggiungi al totale corrispondente
        if (motive === "ferie") {
          window.ferieTotals[pairIndex] += oreGiornaliere;
        } else if (motive === "rol") {
          window.rolTotals[pairIndex] += oreGiornaliere;
        } else if (motive === "exfestivita") {
          window.exFestivitaTotals[pairIndex] += oreGiornaliere;
        }
      }
    }
    
    // Imposta i valori nella tabella
    window.hot.setDataAtCell(window.ferieRowIndex, 2 + 2 * pairIndex, 
      window.ferieTotals[pairIndex].toFixed(2).replace(".", ","), "recalculate");
      
    window.hot.setDataAtCell(window.exFestivitaRowIndex, 2 + 2 * pairIndex, 
      window.exFestivitaTotals[pairIndex].toFixed(2).replace(".", ","), "recalculate");
      
    window.hot.setDataAtCell(window.rolRowIndex, 2 + 2 * pairIndex, 
      window.rolTotals[pairIndex].toFixed(2).replace(".", ","), "recalculate");
  }
}

// Aggiungi funzioni all'oggetto window
window.recalculateWorkHours = recalculateWorkHours;
window.recalculateMotiveHours = recalculateMotiveHours;
window.updateFatturatoTotale = updateFatturatoTotale;