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

// Aggiungi la funzione window.updateFatturatoTotale
window.updateFatturatoTotale = updateFatturatoTotale;