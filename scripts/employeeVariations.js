// employeeVariations.js - Gestione delle variazioni dei dipendenti

function calculateTotalForMotive(motiveName, pairIndex, emp, oreLavorateRowIndex) {
    var total = 0;
    for (var i = 1; i < oreLavorateRowIndex; i++) {
      var fineVal = window.hot.getDataAtCell(i, 2 + 2 * pairIndex + 1);
      if (fineVal && fineVal.indexOf("|") !== -1) {
        var motive = fineVal.split("|")[0].trim().toLowerCase();
        if (motive === motiveName) {
          var giornoMese = window.hot.getDataAtCell(i, 1);
          var dayNum = parseInt(giornoMese);
          if (!isNaN(dayNum)) {
            var rowDate = new Date(window.anno, window.mese, dayNum);
            // La variabile weekStr non viene utilizzata, ma la lascio per mantenere il codice invariato
            var weekNum = getISOWeek(rowDate);
            var weekStr = window.anno + "-W" + (weekNum < 10 ? "0" : "") + weekNum;
            var oreSettimanali = window.employees[emp];
            if (window.employeeVariations[emp]) {
              for (var j = 0; j < window.employeeVariations[emp].length; j++) {
                var entry = window.employeeVariations[emp][j];
                var startDate = new Date(entry.start + "T00:00:00");
                var endDate = new Date(entry.end + "T00:00:00");
                if (rowDate >= startDate && rowDate <= endDate) {
                  oreSettimanali = entry.hours;
                  break;
                }
              }
            }
            var oreGiornaliere = oreSettimanali / window.giorniLavorativiSettimanali;
            total += oreGiornaliere;
          }
        }
      }
    }
    return total;
  }
  
  function updateTotalForMotive(motiveName, totalsArray, targetRowIndex, pairIndex) {
    var day = window.hot.getDataAtCell(window.selectedCell.row, 1);
    var rowDate = new Date(window.anno, window.mese, day);
    var emp = window.pairToEmployee[pairIndex];
    var oreSettimanali = window.employees[emp];
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
    var oreGiornaliere = oreSettimanali / window.giorniLavorativiSettimanali;
    totalsArray[pairIndex] += oreGiornaliere;
    window.hot.setDataAtCell(targetRowIndex, 2 + 2 * pairIndex, totalsArray[pairIndex].toFixed(2).replace(".", ","));
  }
  
  function subtractTotalForMotive(motiveName, totalsArray, targetRowIndex, pairIndex) {
    var day = window.hot.getDataAtCell(window.selectedCell.row, 1);
    var rowDate = new Date(window.anno, window.mese, day);
    var emp = window.pairToEmployee[pairIndex];
    var oreSettimanali = window.employees[emp];
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
    var oreGiornaliere = oreSettimanali / window.giorniLavorativiSettimanali;
    totalsArray[pairIndex] -= oreGiornaliere;
    window.hot.setDataAtCell(targetRowIndex, 2 + 2 * pairIndex, totalsArray[pairIndex].toFixed(2).replace(".", ","));
  }
  