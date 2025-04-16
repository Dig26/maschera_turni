// table.js - Gestione della configurazione e inizializzazione della tabella

// Funzione per ottenere il numero di colonne occupate da un'unità
function getUnitWidth(unit) {
  return (unit.type === "employee") ? 2 : 1;
}

// Data la posizione nell'array delle unità, restituisce il numero della colonna corrispondente
// Le prime 2 colonne sono fisse (giorno e giornoMese)
function getUnitStartIndex(unitIndex) {
  var index = 2;
  for (var i = 0; i < unitIndex; i++) {
    index += getUnitWidth(window.columnUnits[i]);
  }
  return index;
}

// Rendi disponibili le funzioni globalmente
window.getUnitWidth = getUnitWidth;
window.getUnitStartIndex = getUnitStartIndex;

function generateAllTimesTable() {
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

function initTable() {
  document.getElementById("hot").style.display = "block";
  var dipendentiCount = 3; // numero di dipendenti (corrisponde alle coppie iniziali)
  var sums = Array(dipendentiCount).fill(0);
  window.ferieTotals = Array(dipendentiCount).fill(0);
  window.exFestivitaTotals = Array(dipendentiCount).fill(0);
  window.rolTotals = Array(dipendentiCount).fill(0);
  var giorniNelMese = new Date(window.anno, window.mese + 1, 0).getDate();

  // Genero gli orari
  window.allTimes = generateAllTimesTable();

  var data = [];
  // Header
  (function() {
    var row = {};
    row["giorno"] = "Giorno Settimana";
    row["giornoMese"] = "Giorno";
    // Costruiamo l'array delle unità spostabili:
    // Ogni unità di tipo "employee" avrà le chiavi "inizio_i" e "fine_i"
    // e quella "fatturato" una chiave "fatturato"
    window.columnUnits = [];
    for (var i = 0; i < dipendentiCount; i++) {
      var emp = window.pairToEmployee[i];
      window.columnUnits.push({
        type: "employee",
        inizio: "inizio_" + i,
        fine: "fine_" + i,
        header: "☰ " + emp
      });
    }
    // Aggiungiamo la nuova unità "Fatturato"
    window.columnUnits.push({
      type: "fatturato",
      key: "fatturato",
      header: "☰ Fatturato"
    });
    // Impostazione dei dati header per ciascuna unità
    window.columnUnits.forEach(function(unit) {
      if(unit.type === "employee") {
        row[unit.inizio] = unit.header;
        // In "fine" mettiamo il valore di default (le ore di default per il dipendente)
        row[unit.fine] = window.employees[window.pairToEmployee[window.columnUnits.indexOf(unit)]].toString();
      } else if(unit.type === "fatturato") {
        row[unit.key] = unit.header;
      }
    });
    data.push(row);
  })();

  // Giorni del mese
  for (var i = 1; i <= giorniNelMese; i++) {
    var row = {};
    var currentDate = new Date(window.anno, window.mese, i);
    row["giorno"] = currentDate.toLocaleDateString("it-IT", { weekday: "long" });
    row["giornoMese"] = currentDate.getDate();
    window.columnUnits.forEach(function(unit) {
      if(unit.type === "employee") {
        row[unit.inizio] = "";
        row[unit.fine] = "";
      } else if(unit.type === "fatturato") {
        row[unit.key] = "";
      }
    });
    data.push(row);
  }
  // Righe riepilogative (ORE LAVORATE, FERIE, EX FESTIVITA, ROL, TOTALE ORE, ORE PAGATE)
  var summaryLabels = ["ORE LAVORATE", "FERIE", "EX FESTIVITA", "ROL", "TOTALE ORE", "ORE PAGATE"];
  summaryLabels.forEach(function(label) {
    var row = {};
    row["giorno"] = label;
    row["giornoMese"] = "";
    window.columnUnits.forEach(function(unit) {
      if(unit.type === "employee") {
        row[unit.inizio] = "0,00";
        row[unit.fine] = "0,00";
      } else if(unit.type === "fatturato") {
        row[unit.key] = "0,00";
      }
    });
    data.push(row);
  });

  // Indici delle righe riepilogative
  var totalRows = data.length;
  window.oreLavorateRowIndex = totalRows - 6;
  window.ferieRowIndex = totalRows - 5;
  window.exFestivitaRowIndex = totalRows - 4;
  window.rolRowIndex = totalRows - 3;
  window.totaleOreRowIndex = totalRows - 2;
  window.orePagateRowIndex = totalRows - 1;

  // Helper per ottenere il rettangolo (left/right) che copre l'intera unità nel header
  function getUnitRect(unitIndex) {
    var start = getUnitStartIndex(unitIndex);
    var width = getUnitWidth(window.columnUnits[unitIndex]);
    var cellLeft = hotInstance.getCell(0, start);
    var cellRight = hotInstance.getCell(0, start + width - 1);
    if(cellLeft && cellRight) {
      var leftX = cellLeft.getBoundingClientRect().left;
      var rightX = cellRight.getBoundingClientRect().right;
      return { left: leftX, right: rightX };
    }
    return null;
  }

  function fineRenderer(instance, td, row, col, prop, value, cellProperties) {
    if (typeof value === "string" && value.indexOf("|") !== -1) {
      value = value.split("|")[1];
    }
    Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties);
  }

  // Costruisco le colonne partendo dalle unità
  function buildColumnsFromUnits() {
    var cols = [
      { data: "giorno", readOnly: true },
      { data: "giornoMese", readOnly: true }
    ];
    window.columnUnits.forEach(function(unit) {
      if(unit.type === "employee") {
        cols.push({ data: unit.inizio, editor: false });
        cols.push({ data: unit.fine, readOnly: true, renderer: fineRenderer });
      } else if(unit.type === "fatturato") {
        cols.push({ data: unit.key, readOnly: true });
      }
    });
    return cols;
  }

  // Costruisco le merge per le righe riepilogative.
  // Per ogni riga riepilogativa, le 2 colonne fisse sono mergeate;
  // per le unità employee mergeiamo in celle di colspan 2,
  // mentre per la unità "fatturato" uniamo verticalmente tutte le righe riepilogative.
  function buildMerges() {
    var merges = [];
    var summaryRows = [
      window.oreLavorateRowIndex,
      window.ferieRowIndex,
      window.exFestivitaRowIndex,
      window.rolRowIndex,
      window.totaleOreRowIndex,
      window.orePagateRowIndex
    ];
    summaryRows.forEach(function(rowIndex) {
      merges.push({ row: rowIndex, col: 0, rowspan: 1, colspan: 2 });
      var start = 2;
      window.columnUnits.forEach(function(unit) {
        if(unit.type === "employee") {
          merges.push({ row: rowIndex, col: start, rowspan: 1, colspan: 2 });
          start += 2;
        } else if(unit.type === "fatturato") {
          start += 1;
        }
      });
    });
    // Merge verticale della colonna "fatturato" nelle righe riepilogative
    var summaryRowCount = window.orePagateRowIndex - window.oreLavorateRowIndex + 1;
    for(var i = 0; i < window.columnUnits.length; i++){
      if(window.columnUnits[i].type === "fatturato"){
        merges.push({ row: window.oreLavorateRowIndex, col: getUnitStartIndex(i), rowspan: summaryRowCount, colspan: 1 });
        break;
      }
    }
    return merges;
  }

  window.hot = new Handsontable(document.getElementById("hot"), {
    data: data,
    columns: buildColumnsFromUnits(),
    rowHeaders: false,
    colHeaders: false,
    mergeCells: buildMerges(),
    manualColumnResize: true,
    columnSorting: false,
    disableVisualSelection: true,
    licenseKey: "non-commercial-and-evaluation",
    afterOnCellMouseDown: function (event, coords, td) {
      if (coords.row === 0) {
        // In header: identifichiamo a quale unità appartiene la colonna cliccata
        var unitInfo = getUnitByCol(coords.col);
        if (!unitInfo) return;
        var rect = getUnitRect(unitInfo.unitIndex);
        if (!rect) return;
        var centerX = (rect.left + rect.right) / 2;
        if (event.clientX < centerX && event.offsetX <= 20) {
          dragging = true;
          dragStartUnitIndex = unitInfo.unitIndex;
          dragPreview.innerHTML = buildDragPreview(dragStartUnitIndex);
          dragPreview.style.display = "block";
          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
          return;
        } else {
          if (unitInfo.unit.type === "employee") {
            window.selectedUnitIndex = unitInfo.unitIndex;
            var pairIndex = unitInfo.unitIndex;
            var empName = window.pairToEmployee[pairIndex];
            openHeaderPopupForEmployee(empName, pairIndex);
          }
          return;
        }
      } else {
        // Righe dati
        var unitInfo = getUnitByCol(coords.col);
        if (!unitInfo) return;
        // Se la cella appartiene alla colonna "Fatturato", apriamo il popup dedicato
        if (unitInfo.unit.type === "fatturato") {
          window.selectedCell = { row: coords.row, col: coords.col };
          openFatturatoPopup(); // FUNZIONE DA DEFINIRE IN popup.js
          return;
        }
        if ((coords.col - getUnitStartIndex(unitInfo.unitIndex)) % 2 === 0) {
          window.selectedCell = { row: coords.row, col: coords.col };
          var cellValue = this.getDataAtCell(coords.row, coords.col);
          var fineValue = this.getDataAtCell(coords.row, coords.col + 1);
          window.currentCellData = cellValue ? { inizio: cellValue, fine: fineValue } : null;
          openCellPopup();
        } else {
          window.selectedCell = { row: coords.row, col: coords.col };
          var fineCellValue = this.getDataAtCell(coords.row, coords.col);
          var inizioCellValue = this.getDataAtCell(coords.row, coords.col - 1);
          if ((!inizioCellValue || inizioCellValue.trim() === "") &&
              (!fineCellValue || fineCellValue.trim() === "")) {
            openManualTimePopup();
          } else {
            openWarningPopup();
          }
        }
      }
    },
    afterChange: function (changes, source) {
      if (source === "updateTotaleOre" || source === "updateOrePagate" || source === "updateFatturatoTotale" || !changes) return;
      
      var summaryIndices = [
        window.oreLavorateRowIndex,
        window.ferieRowIndex,
        window.exFestivitaRowIndex,
        window.rolRowIndex
      ];
      
      // Controlla se ci sono cambiamenti nelle righe di riepilogo
      var updateNeeded = false;
      for (var i = 0; i < changes.length; i++) {
        if (summaryIndices.indexOf(changes[i][0]) !== -1) {
          updateNeeded = true;
          break;
        }
      }
      
      if (updateNeeded) {
        updateTotaleOre();
      }
      
      // Controlla se sono stati modificati valori nella colonna "Fatturato"
      var fatturatoColIndex = null;
      for (var i = 0; i < window.columnUnits.length; i++) {
        if (window.columnUnits[i].type === "fatturato") {
          fatturatoColIndex = getUnitStartIndex(i);
          break;
        }
      }
      
      if (fatturatoColIndex !== null) {
        for (var i = 0; i < changes.length; i++) {
          if (changes[i][1] === fatturatoColIndex) {
            if (typeof window.updateFatturatoTotale === "function") {
              window.updateFatturatoTotale();
            }
            break;
          }
        }
      }
    }
  });

  var hotInstance = window.hot;
  var dragging = false;
  var dragStartUnitIndex = null;
  var dragPreview = document.getElementById("dragPreview");
  var dropIndicator = document.getElementById("dropIndicator");

  // Restituisce l'unità a cui appartiene la colonna cliccata
  function getUnitByCol(col) {
    var current = 2;
    for (var i = 0; i < window.columnUnits.length; i++) {
      var unit = window.columnUnits[i];
      var width = getUnitWidth(unit);
      if (col >= current && col < current + width) {
        return { unit: unit, unitIndex: i, start: current, width: width };
      }
      current += width;
    }
    return null;
  }

  // Costruisce il drag preview dell'unità spostabile
  function buildDragPreview(unitIndex) {
    var unit = window.columnUnits[unitIndex];
    var html = '<table border="1" style="border-collapse: collapse;">';
    window.hot.getSourceData().forEach(function(row) {
      html += "<tr>";
      if (unit.type === "employee") {
        html += '<td style="padding:4px;">' + (row[unit.inizio] || "") + "</td>";
        html += '<td style="padding:4px;">' + (row[unit.fine] || "") + "</td>";
      } else {
        html += '<td style="padding:4px;">' + (row[unit.key] || "") + "</td>";
      }
      html += "</tr>";
    });
    html += "</table>";
    return html;
  }

  function onMouseMove(e) {
    dragPreview.style.left = e.pageX + 10 + "px";
    dragPreview.style.top = e.pageY + 10 + "px";
    updateDropIndicator(e);
  }

  // Aggiorniamo il drop indicator in modo che copra esattamente l'altezza della tabella
  function updateDropIndicator(e) {
    dropIndicator.style.display = "block";
    // Calcoliamo l'altezza dall'inizio del header fino al fondo dell'ultima riga
    var headerCell = hotInstance.getCell(0, 2);
    var lastRowCell = hotInstance.getCell(hotInstance.countRows() - 1, 0);
    if(headerCell && lastRowCell) {
      var headerRect = headerCell.getBoundingClientRect();
      var lastRect = lastRowCell.getBoundingClientRect();
      dropIndicator.style.top = headerRect.top + "px";
      dropIndicator.style.height = (lastRect.bottom - headerRect.top) + "px";
    } else {
      var containerRect = document.getElementById("hot").getBoundingClientRect();
      dropIndicator.style.top = containerRect.top + "px";
      dropIndicator.style.height = containerRect.height + "px";
    }
    var newUnitIndex = null;
    for (var i = 0; i < window.columnUnits.length; i++) {
      var rect = getUnitRect(i);
      if (!rect) continue;
      var centerX = (rect.left + rect.right) / 2;
      if (e.clientX < centerX) {
        newUnitIndex = i;
        dropIndicator.style.left = rect.left + "px";
        break;
      }
    }
    if (newUnitIndex === null) {
      var lastIndex = window.columnUnits.length - 1;
      var rect = getUnitRect(lastIndex);
      if (rect) {
        dropIndicator.style.left = rect.right + 2 + "px";
      }
      newUnitIndex = window.columnUnits.length;
    }
  }

  function onMouseUp(e) {
    if (!dragging) return;
    dragging = false;
    dragPreview.style.display = "none";
    dropIndicator.style.display = "none";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    var newUnitIndex = null;
    for (var i = 0; i < window.columnUnits.length; i++) {
      var rect = getUnitRect(i);
      if (!rect) continue;
      var centerX = (rect.left + rect.right) / 2;
      if (e.clientX < centerX) {
        newUnitIndex = i;
        break;
      }
    }
    if (newUnitIndex === null) {
      newUnitIndex = window.columnUnits.length;
    }
    if (newUnitIndex > dragStartUnitIndex) {
      newUnitIndex = newUnitIndex - 1;
    }
    if (newUnitIndex === dragStartUnitIndex) return;
    var movedUnit = window.columnUnits.splice(dragStartUnitIndex, 1)[0];
    window.columnUnits.splice(newUnitIndex, 0, movedUnit);
    hotInstance.updateSettings({
      columns: buildColumnsFromUnits(),
      mergeCells: buildMerges()
    });
  }

  // Funzioni di aggiornamento per le righe riepilogative (rimangono simili alle versioni precedenti)
  function updateTotaleOre() {
    if (!hotInstance || typeof hotInstance.getDataAtCell !== "function") return;
    for (var u = 0, unitCol = 2; u < window.columnUnits.length; u++) {
      var unit = window.columnUnits[u];
      if (unit.type !== "employee") continue;
      var totale = 0;
      var summaryIndices = [window.oreLavorateRowIndex, window.ferieRowIndex, window.exFestivitaRowIndex, window.rolRowIndex];
      summaryIndices.forEach(function(rowIndex) {
        var cellVal = hotInstance.getDataAtCell(rowIndex, unitCol);
        var num = parseFloat((cellVal || "0").replace(",", "."));
        if (!isNaN(num)) {
          totale += num;
        }
      });
      hotInstance.setDataAtCell(window.totaleOreRowIndex, unitCol, totale.toFixed(2).replace(".", ","), "updateTotaleOre");
      unitCol += 2;
    }
  }
  window.updateTotaleOre = updateTotaleOre;

  function updateOrePagate() {
    if (!hotInstance || typeof hotInstance.getDataAtCell !== "function") return;
    var weekDays = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];
    var x = window.giorniLavorativiSettimanali;
    var y = weekDays.slice(0, x);
    for (var u = 0, unitCol = 2; u < window.columnUnits.length; u++) {
      var unit = window.columnUnits[u];
      if (unit.type !== "employee") continue;
      var totale = 0;
      for (var i = 1; i <= giorniNelMese; i++) {
        var cellDay = hotInstance.getDataAtCell(i, 0);
        if (!cellDay) continue;
        var dayName = cellDay.toLowerCase();
        if (y.indexOf(dayName) !== -1) {
          var emp = window.pairToEmployee[u];
          var oreSettimanali = window.employees[emp];
          if (window.employeeVariations[emp]) {
            var currentDate = new Date(window.anno, window.mese, i);
            for (var k = 0; k < window.employeeVariations[emp].length; k++) {
              var entry = window.employeeVariations[emp][k];
              var startDate = new Date(entry.start + "T00:00:00");
              var endDate = new Date(entry.end + "T00:00:00");
              if (currentDate >= startDate && currentDate <= endDate) {
                oreSettimanali = entry.hours;
                break;
              }
            }
          }
          var oreGiornaliere = oreSettimanali / window.giorniLavorativiSettimanali;
          totale += oreGiornaliere;
        }
      }
      hotInstance.setDataAtCell(window.orePagateRowIndex, unitCol, totale.toFixed(2).replace(".", ","), "updateOrePagate");
      unitCol += 2;
    }
  }
  window.updateOrePagate = updateOrePagate;

  // Handler per il pulsante OK nel popup cella (logica invariata per le celle dei dipendenti)
  document.getElementById("okBtn").addEventListener("click", function () {
    if (window.selectedCell !== null) {
      var unitInfo = getUnitByCol(window.selectedCell.col);
      if (!unitInfo) return;
      var pairIndex = unitInfo.unitIndex; // per le unità employee
      var selectedOption = document.querySelector('input[name="workOption"]:checked').value;
      if (selectedOption === "lavora") {
        var oldVal = hotInstance.getDataAtCell(window.selectedCell.row, window.selectedCell.col + 1);
        if (oldVal && oldVal !== "X" && oldVal.indexOf("|") !== -1) {
          var oldMotive = oldVal.split("|")[0].trim().toLowerCase();
          if (oldMotive === "ferie") {
            subtractTotalForMotive("ferie", window.ferieTotals, window.ferieRowIndex, pairIndex);
          } else if (oldMotive === "rol") {
            subtractTotalForMotive("rol", window.rolTotals, window.rolRowIndex, pairIndex);
          } else if (oldMotive === "exfestivita") {
            subtractTotalForMotive("exFestivita", window.exFestivitaTotals, window.exFestivitaRowIndex, pairIndex);
          }
        }
        if (document.getElementById("popupInput1").value && document.getElementById("popupInput2").value) {
          var oldVal = hotInstance.getDataAtCell(window.selectedCell.row, window.selectedCell.col + 1);
          if (oldVal && oldVal !== "X") {
            if (oldVal.indexOf("|") === -1) {
              var oldNum = parseFloat(oldVal.replace(",", "."));
              if (!isNaN(oldNum)) {
                sums[pairIndex] -= oldNum;
              }
            }
          }
          var parts1 = document.getElementById("popupInput1").value;
          var parts2 = document.getElementById("popupInput2").value;
          var partsA = parts1.split(":").map(Number);
          var partsB = parts2.split(":").map(Number);
          var h1 = partsA[0], m1 = partsA[1];
          var h2 = partsB[0], m2 = partsB[1];
          var diff = h2 * 60 + m2 - (h1 * 60 + m1);
          var decimalHours = parseFloat((diff / 60).toFixed(2));
          sums[pairIndex] += decimalHours;
          hotInstance.setDataAtCell(window.selectedCell.row, window.selectedCell.col, parts1 + " - " + parts2);
          hotInstance.setDataAtCell(window.selectedCell.row, window.selectedCell.col + 1, formatDecimalHours(decimalHours));
          hotInstance.setDataAtCell(window.oreLavorateRowIndex, getUnitStartIndex(pairIndex), sums[pairIndex].toFixed(2).replace(".", ","));  
        }
        updateTotaleOre();
      } else {
        var oldVal = hotInstance.getDataAtCell(window.selectedCell.row, window.selectedCell.col + 1);
        if (oldVal && oldVal !== "X") {
          if (oldVal.indexOf("|") !== -1) {
            var oldMotive = oldVal.split("|")[0];
            if (oldMotive === "ferie") {
              subtractTotalForMotive("ferie", window.ferieTotals, window.ferieRowIndex, pairIndex);
            }
          } else {
            var oldNum = parseFloat(oldVal.replace(",", "."));
            if (!isNaN(oldNum)) {
              sums[pairIndex] -= oldNum;
              hotInstance.setDataAtCell(window.oreLavorateRowIndex, getUnitStartIndex(pairIndex), sums[pairIndex].toFixed(2).replace(".", ","));
            }
          }
        }
        hotInstance.setDataAtCell(window.selectedCell.row, window.selectedCell.col, "X");
        hotInstance.setCellMeta(window.selectedCell.row, window.selectedCell.col, "className", "htCenter");
        var motivo = document.getElementById("aCasaMotivazioni").value;
        var abbr = "";
        if (motivo !== "nessuna") {
          abbr = document.getElementById("aCasaAbbr").value;
        }
        hotInstance.setDataAtCell(window.selectedCell.row, window.selectedCell.col + 1, motivo + "|" + abbr);
        if (motivo === "ferie") {
          updateTotalForMotive("ferie", window.ferieTotals, window.ferieRowIndex, pairIndex);
        } else if (motivo === "rol") {
          updateTotalForMotive("rol", window.rolTotals, window.rolRowIndex, pairIndex);
        } else if (motivo === "exFestivita") {
          updateTotalForMotive("exFestivita", window.exFestivitaTotals, window.exFestivitaRowIndex, pairIndex);
        }
        updateTotaleOre();
      }
      cancelCellPopup();
    }
  });

  // Aggiorno "ORE PAGATE" all'avvio della pagina
  updateOrePagate();
  
  // Inizializza il totale del fatturato all'avvio
  if (typeof window.updateFatturatoTotale === "function") {
    window.updateFatturatoTotale();
  }
}