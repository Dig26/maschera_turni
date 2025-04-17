// table.js - Gestione della configurazione e inizializzazione della tabella

// Funzione per ottenere il numero di colonne occupate da un'unità
function getUnitWidth(unit) {
  return unit.type === "employee" ? 2 : 1;
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
  // Array per differenze mese precedente
  window.diffPrecedenteTotals = Array(dipendentiCount).fill(0);
  var giorniNelMese = new Date(window.anno, window.mese + 1, 0).getDate();

  // Genero gli orari
  window.allTimes = generateAllTimesTable();

  var data = [];
  // Header
  (function () {
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
        header: "☰ " + emp,
      });
    }
    // Aggiungiamo la nuova unità "Fatturato"
    window.columnUnits.push({
      type: "fatturato",
      key: "fatturato",
      header: "☰ Fatturato",
    });

    // Aggiungiamo la nuova unità "Particolarità"
    window.columnUnits.push({
      type: "particolarita",
      key: "particolarita",
      header: "☰ Particolarità",
    });

    // Impostazione dei dati header per ciascuna unità
    window.columnUnits.forEach(function (unit) {
      if (unit.type === "employee") {
        row[unit.inizio] = unit.header;
        // In "fine" mettiamo il valore di default (le ore di default per il dipendente)
        row[unit.fine] =
          window.employees[
            window.pairToEmployee[window.columnUnits.indexOf(unit)]
          ].toString();
      } else if (unit.type === "fatturato") {
        row[unit.key] = unit.header;
      } else if (unit.type === "particolarita") {
        row[unit.key] = unit.header;
      }
    });
    data.push(row);
  })();

  // Giorni del mese
  for (var i = 1; i <= giorniNelMese; i++) {
    var row = {};
    var currentDate = new Date(window.anno, window.mese, i);
    row["giorno"] = currentDate.toLocaleDateString("it-IT", {
      weekday: "long",
    });
    row["giornoMese"] = currentDate.getDate();
    window.columnUnits.forEach(function (unit) {
      if (unit.type === "employee") {
        row[unit.inizio] = "";
        row[unit.fine] = "";
      } else if (unit.type === "fatturato") {
        row[unit.key] = "";
      } else if (unit.type === "particolarita") {
        row[unit.key] = "";
      }
    });
    data.push(row);
  }
  // Righe riepilogative (ORE LAVORATE, FERIE, EX FESTIVITA, ROL, DIFFERENZA +/- MESE PRECEDENTE, TOTALE ORE, ORE PAGATE, DIFFERENZA +/- MESE CORRENTE)
  var summaryLabels = [
    "ORE LAVORATE",
    "FERIE",
    "EX FESTIVITA",
    "ROL",
    "Differenza +/- mese precedente",
    "TOTALE ORE",
    "ORE PAGATE",
    "Differenza +/- mese corrente",
  ];
  summaryLabels.forEach(function (label) {
    var row = {};
    row["giorno"] = label;
    row["giornoMese"] = "";
    window.columnUnits.forEach(function (unit) {
      if (unit.type === "employee") {
        row[unit.inizio] = "0,00";
        row[unit.fine] = "0,00";
      } else if (unit.type === "fatturato") {
        row[unit.key] = "0,00";
      } else if (unit.type === "particolarita") {
        row[unit.key] = "";
      }
    });
    data.push(row);
  });

  // Indici delle righe riepilogative
  var totalRows = data.length;
  window.oreLavorateRowIndex = totalRows - 8;
  window.ferieRowIndex = totalRows - 7;
  window.exFestivitaRowIndex = totalRows - 6;
  window.rolRowIndex = totalRows - 5;
  window.diffPrecedenteRowIndex = totalRows - 4;
  window.totaleOreRowIndex = totalRows - 3;
  window.orePagateRowIndex = totalRows - 2;
  window.diffCorrenteRowIndex = totalRows - 1;

  // Funzione per creare una preview esatta della colonna, includendo tutte le righe
  function buildDragPreview(unitIndex) {
    var unit = window.columnUnits[unitIndex];
    var width = getUnitWidth(unit);
    var startCol = getUnitStartIndex(unitIndex);

    // Crea un elemento tabella
    var table = document.createElement("table");
    table.className = "dragTable";
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";

    try {
      // Ottieni tutte le righe dalla tabella originale, INCLUDENDO le righe riepilogative
      var totalRows = window.hot.countRows();

      // Per ogni riga
      for (var i = 0; i < totalRows; i++) {
        var row = document.createElement("tr");

        // Per ogni colonna dell'unità
        for (var j = 0; j < width; j++) {
          var cell = document.createElement("td");
          var colIndex = startCol + j;

          try {
            // Ottieni il valore dalla cella originale e applica formattazione
            var value = window.hot.getDataAtCell(i, colIndex) || "";
            cell.textContent = value;

            // Replica lo stile dalla cella originale
            var originalCell = window.hot.getCell(i, colIndex);
            if (originalCell) {
              // Prendi altezza e larghezza dalla cella originale
              var rect = originalCell.getBoundingClientRect();
              cell.style.width = rect.width + "px";
              cell.style.height = rect.height + "px";

              // Replica lo stile di base
              cell.style.padding = "4px";
              cell.style.border = "1px solid #ddd";
              cell.style.textAlign = "center";

              // Se è la riga di intestazione
              if (i === 0) {
                cell.style.fontWeight = "bold";
                cell.style.backgroundColor = "#eef2f7";
              }
              // Controlla se è una riga riepilogativa
              else if (i >= window.oreLavorateRowIndex) {
                cell.style.backgroundColor = "#eef7f2";
                cell.style.fontWeight = "500";

                // Se è l'ultima riga (differenza mese corrente)
                if (i === window.diffCorrenteRowIndex) {
                  cell.style.borderTop = "2px solid #ddd";
                  cell.style.fontWeight = "bold";
                }

                // Se è una differenza positiva o negativa
                if (
                  (i === window.diffPrecedenteRowIndex ||
                    i === window.diffCorrenteRowIndex) &&
                  value
                ) {
                  var numValue = parseFloat(value.toString().replace(",", "."));
                  if (!isNaN(numValue)) {
                    cell.style.color = numValue >= 0 ? "#27ae60" : "#e74c3c";
                    cell.style.fontWeight = "bold";
                  }
                }
              }
              // Righe pari/dispari per le righe normali
              else if (i % 2 === 0) {
                cell.style.backgroundColor = "#fff";
              } else {
                cell.style.backgroundColor = "#f8f9fa";
              }
            }
          } catch (e) {
            console.error("Errore nella creazione della cella:", e);
            cell.textContent = "Errore";
          }

          row.appendChild(cell);
        }

        table.appendChild(row);
      }
    } catch (e) {
      console.error("Errore nella creazione della preview:", e);
      var errorRow = document.createElement("tr");
      var errorCell = document.createElement("td");
      errorCell.textContent = "Errore nella creazione della preview";
      errorRow.appendChild(errorCell);
      table.appendChild(errorRow);
    }

    return table;
  }

  // Helper per ottenere il rettangolo (left/right) che copre l'intera unità nel header
  function getUnitRect(unitIndex) {
    var start = getUnitStartIndex(unitIndex);
    var width = getUnitWidth(window.columnUnits[unitIndex]);
    var cellLeft = hotInstance.getCell(0, start);
    var cellRight = hotInstance.getCell(0, start + width - 1);
    if (cellLeft && cellRight) {
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
    Handsontable.renderers.TextRenderer(
      instance,
      td,
      row,
      col,
      prop,
      value,
      cellProperties
    );
  }

  // Costruisco le colonne partendo dalle unità
  function buildColumnsFromUnits() {
    var cols = [
      { data: "giorno", readOnly: true },
      { data: "giornoMese", readOnly: true },
    ];
    window.columnUnits.forEach(function (unit) {
      if (unit.type === "employee") {
        cols.push({ data: unit.inizio, editor: false });
        cols.push({ data: unit.fine, readOnly: true, renderer: fineRenderer });
      } else if (unit.type === "fatturato") {
        cols.push({ data: unit.key, readOnly: true });
      } else if (unit.type === "particolarita") {
        cols.push({
          data: unit.key,
          readOnly: true,
          className: "particolarita-cell",
        });
      }
    });
    return cols;
  }

  // Costruisco le merge per le righe riepilogative.
  // Per ogni riga riepilogativa, le 2 colonne fisse sono mergeate;
  // per le unità employee mergeiamo in celle di colspan 2,
  // mentre per la unità "fatturato" e "particolarita" uniamo verticalmente tutte le righe riepilogative.
  function buildMerges() {
    var merges = [];
    var summaryRows = [
      window.oreLavorateRowIndex,
      window.ferieRowIndex,
      window.exFestivitaRowIndex,
      window.rolRowIndex,
      window.diffPrecedenteRowIndex,
      window.totaleOreRowIndex,
      window.orePagateRowIndex,
      window.diffCorrenteRowIndex,
    ];
    summaryRows.forEach(function (rowIndex) {
      merges.push({ row: rowIndex, col: 0, rowspan: 1, colspan: 2 });
      var start = 2;
      window.columnUnits.forEach(function (unit) {
        if (unit.type === "employee") {
          merges.push({ row: rowIndex, col: start, rowspan: 1, colspan: 2 });
          start += 2;
        } else if (unit.type === "fatturato" || unit.type === "particolarita") {
          start += 1;
        }
      });
    });

    // Merge verticale delle colonne speciali ("fatturato" e "particolarita") nelle righe riepilogative
    var summaryRowCount =
      window.diffCorrenteRowIndex - window.oreLavorateRowIndex + 1;
    for (var i = 0; i < window.columnUnits.length; i++) {
      if (
        window.columnUnits[i].type === "fatturato" ||
        window.columnUnits[i].type === "particolarita"
      ) {
        merges.push({
          row: window.oreLavorateRowIndex,
          col: getUnitStartIndex(i),
          rowspan: summaryRowCount,
          colspan: 1,
        });
      }
    }

    return merges;
  }

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

  // Dichiarazione variabili drag and drop in un solo punto
  window.dragging = false;
  window.dragStartUnitIndex = null;
  window.lastMouseEvent = null;
  
  // Funzione per avviare il trascinamento
  function startDrag(event, unitIndex) {
    var dragPreview = document.getElementById("dragPreview");
    var dropIndicator = document.getElementById("dropIndicator");
    
    // Controlla che gli elementi esistano
    if (!dragPreview || !dropIndicator) {
      // Crea gli elementi se non esistono
      if (!dragPreview) {
        dragPreview = document.createElement("div");
        dragPreview.id = "dragPreview";
        dragPreview.className = "drag-preview";
        dragPreview.style.position = "fixed";
        dragPreview.style.display = "none";
        document.body.appendChild(dragPreview);
      }
      
      if (!dropIndicator) {
        dropIndicator = document.createElement("div");
        dropIndicator.id = "dropIndicator";
        dropIndicator.className = "drop-indicator";
        dropIndicator.style.position = "fixed";
        document.body.appendChild(dropIndicator);
      }
    }
    
    // Imposta le variabili
    window.dragging = true;
    window.dragStartUnitIndex = unitIndex;
    window.lastMouseEvent = event;
    
    // Crea la preview della colonna
    dragPreview.innerHTML = "";
    dragPreview.appendChild(buildDragPreview(unitIndex));
    dragPreview.style.display = "block";
    
    // Posiziona la preview vicino al cursore
    dragPreview.style.left = (event.clientX + 10) + "px";
    dragPreview.style.top = (event.clientY + 10) + "px";
    
    // Mostra l'indicatore di drop
    updateDropIndicator(event);
    
    // Aggiungi i listener per movimento e rilascio
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    window.addEventListener("scroll", onWindowScroll);
    
    // Aggiungi classe al body durante il trascinamento
    document.body.classList.add("dragging");
    
    // Previeni il comportamento di default
    event.preventDefault();
  }

  // Funzione chiamata quando si fa scroll durante il drag
  function onWindowScroll() {
    if (!window.dragging || !window.lastMouseEvent) return;
    
    // Aggiorna la posizione dell'indicatore usando l'ultimo evento mouse
    updateDropIndicator(window.lastMouseEvent);
  }

  // Funzione chiamata durante il movimento del mouse
  function onMouseMove(event) {
    if (!window.dragging) return;
    
    // Aggiorna l'ultimo evento mouse
    window.lastMouseEvent = event;
    
    var dragPreview = document.getElementById("dragPreview");
    if (dragPreview) {
      // Aggiorna la posizione della preview
      dragPreview.style.left = (event.clientX + 10) + "px";
      dragPreview.style.top = (event.clientY + 10) + "px";
    }
    
    // Aggiorna la posizione dell'indicatore di drop
    updateDropIndicator(event);
    
    // Previeni selezione di testo durante il drag
    event.preventDefault();
  }

  // Aggiorna la posizione dell'indicatore di drop
  function updateDropIndicator(event) {
    var dropIndicator = document.getElementById("dropIndicator");
    if (!dropIndicator) return;
    
    // Assicurati che sia position:fixed
    dropIndicator.style.position = "fixed";
    
    // Rendi visibile l'indicatore
    dropIndicator.style.display = "block";
    
    // Ottieni il container della tabella
    var tableContainer = document.getElementById("hot");
    if (!tableContainer) return;
    
    var tableRect = tableContainer.getBoundingClientRect();
    
    // Ottieni la prima cella dell'header e l'ultima cella dell'ultima riga
    var headerCell = null;
    var lastRowCell = null;
    
    try {
      headerCell = window.hot.getCell(0, 0);
      var lastRow = window.hot.countRows() - 1;
      lastRowCell = window.hot.getCell(lastRow, 0);
    } catch (e) {
      console.error("Errore nel recuperare le celle:", e);
    }
    
    if (headerCell && lastRowCell) {
      var headerRect = headerCell.getBoundingClientRect();
      var lastRect = lastRowCell.getBoundingClientRect();
      
      // Con position:fixed, usa le coordinate relative alla viewport
      var topPos = headerRect.top;
      var height = lastRect.bottom - headerRect.top;
      
      dropIndicator.style.top = topPos + "px";
      dropIndicator.style.height = height + "px";
    } else {
      // Fallback
      dropIndicator.style.top = tableRect.top + "px";
      dropIndicator.style.height = tableRect.height + "px";
    }
    
    // Determina la posizione orizzontale dell'indicatore
    var newUnitIndex = null;
    for (var i = 0; i < window.columnUnits.length; i++) {
      var rect = getUnitRect(i);
      if (!rect) continue;
      
      var centerX = (rect.left + rect.right) / 2;
      if (event.clientX < centerX) {
        newUnitIndex = i;
        dropIndicator.style.left = rect.left + "px";
        break;
      }
    }
    
    // Se il cursore è oltre l'ultima colonna
    if (newUnitIndex === null) {
      var lastIndex = window.columnUnits.length - 1;
      var rect = getUnitRect(lastIndex);
      if (rect) {
        dropIndicator.style.left = rect.right + "px";
      }
    }
  }

  // Funzione chiamata quando si rilascia il mouse
  function onMouseUp(event) {
    if (!window.dragging) return;
    
    var dragPreview = document.getElementById("dragPreview");
    var dropIndicator = document.getElementById("dropIndicator");
    
    // Nasconde gli elementi
    if (dragPreview) dragPreview.style.display = "none";
    if (dropIndicator) dropIndicator.style.display = "none";
    
    // Rimuove i listener
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("scroll", onWindowScroll);
    
    // Rimuovi la classe
    document.body.classList.remove("dragging");
    
    // Calcola la nuova posizione
    var newUnitIndex = null;
    for (var i = 0; i < window.columnUnits.length; i++) {
      var rect = getUnitRect(i);
      if (!rect) continue;
      
      var centerX = (rect.left + rect.right) / 2;
      if (event.clientX < centerX) {
        newUnitIndex = i;
        break;
      }
    }
    
    // Se il cursore è dopo l'ultima colonna
    if (newUnitIndex === null) {
      newUnitIndex = window.columnUnits.length;
    }
    
    // Aggiustamento per spostamenti verso destra
    if (newUnitIndex > window.dragStartUnitIndex) {
      newUnitIndex--;
    }
    
    // Se la posizione non è cambiata
    if (newUnitIndex === window.dragStartUnitIndex) {
      window.dragging = false;
      window.lastMouseEvent = null;
      return;
    }
    
    // Sposta l'unità
    var movedUnit = window.columnUnits.splice(window.dragStartUnitIndex, 1)[0];
    window.columnUnits.splice(newUnitIndex, 0, movedUnit);
    
    // Aggiorna la tabella
    window.hot.updateSettings({
      columns: buildColumnsFromUnits(),
      mergeCells: buildMerges(),
    });
    
    // Ricalcola i totali
    if (typeof window.recalculateAllTotals === "function") {
      window.recalculateAllTotals();
    }
    
    window.dragging = false;
    window.lastMouseEvent = null;
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
          startDrag(event, unitInfo.unitIndex);
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
        // NUOVO CONTROLLO: Verifica se stiamo cliccando su una riga riepilogativa
        // Se è una riga riepilogativa non dovremo aprire il popup (eccetto per la riga differenza precedente)
        var isRiepilogativaRow =
          coords.row === window.oreLavorateRowIndex ||
          coords.row === window.ferieRowIndex ||
          coords.row === window.exFestivitaRowIndex ||
          coords.row === window.rolRowIndex ||
          coords.row === window.totaleOreRowIndex ||
          coords.row === window.orePagateRowIndex ||
          coords.row === window.diffCorrenteRowIndex;

        // Se è una riga riepilogativa diversa da diffPrecedenteRowIndex non facciamo nulla
        if (
          isRiepilogativaRow &&
          coords.row !== window.diffPrecedenteRowIndex
        ) {
          return;
        }
        // Righe dati
        var unitInfo = getUnitByCol(coords.col);
        if (!unitInfo) return;

        // Se la cella appartiene alla colonna "Fatturato", apriamo il popup dedicato
        if (unitInfo.unit.type === "fatturato") {
          window.selectedCell = { row: coords.row, col: coords.col };
          openFatturatoPopup();
          return;
        }

        // Se la cella appartiene alla colonna "Particolarità", apriamo il popup dedicato
        if (unitInfo.unit.type === "particolarita") {
          window.selectedCell = { row: coords.row, col: coords.col };
          openParticolaritaPopup();
          return;
        }

        // Gestione clic sulla riga "Differenza +/- mese precedente"
        if (coords.row === window.diffPrecedenteRowIndex) {
          window.selectedCell = { row: coords.row, col: coords.col };
          openDifferenzaPrecedentePopup();
          return;
        }

        if ((coords.col - getUnitStartIndex(unitInfo.unitIndex)) % 2 === 0) {
          window.selectedCell = { row: coords.row, col: coords.col };
          var cellValue = this.getDataAtCell(coords.row, coords.col);
          var fineValue = this.getDataAtCell(coords.row, coords.col + 1);
          window.currentCellData = cellValue
            ? { inizio: cellValue, fine: fineValue }
            : null;
          openCellPopup();
        } else {
          window.selectedCell = { row: coords.row, col: coords.col };
          var fineCellValue = this.getDataAtCell(coords.row, coords.col);
          var inizioCellValue = this.getDataAtCell(coords.row, coords.col - 1);
          if (
            (!inizioCellValue || inizioCellValue.trim() === "") &&
            (!fineCellValue || fineCellValue.trim() === "")
          ) {
            openManualTimePopup();
          } else {
            openWarningPopup();
          }
        }
      }
    },
    afterChange: function (changes, source) {
      if (
        source === "updateTotaleOre" ||
        source === "updateOrePagate" ||
        source === "updateFatturatoTotale" ||
        source === "updateDifferenzeCorrente" ||
        !changes
      )
        return;

      var summaryIndices = [
        window.oreLavorateRowIndex,
        window.ferieRowIndex,
        window.exFestivitaRowIndex,
        window.rolRowIndex,
        window.diffPrecedenteRowIndex,
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

      // Aggiorna la differenza mese corrente se totale ore o ore pagate cambiano
      if (
        source === "updateTotaleOre" ||
        source === "updateOrePagate" ||
        changes.some(function (change) {
          return (
            change[0] === window.totaleOreRowIndex ||
            change[0] === window.orePagateRowIndex
          );
        })
      ) {
        updateDifferenzeCorrente();
      }

      // Controlla se sono stati modificati valori nella colonna "Fatturato"
      var fatturatoColIndex = null;
      for (var i = 0; i < window.columnUnits.length; i++) {
        if (window.columnUnits[i].type === "fatturato") {
          fatturatoColIndex = window.getUnitStartIndex(i);
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
    },
  });

  var hotInstance = window.hot;

  // Funzioni di aggiornamento per le righe riepilogative (rimangono simili alle versioni precedenti)
  function updateTotaleOre() {
    if (!window.hot || typeof window.hot.getDataAtCell !== "function") return;

    for (var u = 0, unitCol = 2; u < window.columnUnits.length; u++) {
      var unit = window.columnUnits[u];
      if (unit.type !== "employee") {
        unitCol += getUnitWidth(unit);
        continue;
      }

      var totale = 0;
      var summaryIndices = [
        window.oreLavorateRowIndex,
        window.ferieRowIndex,
        window.exFestivitaRowIndex,
        window.rolRowIndex,
        window.diffPrecedenteRowIndex,
      ];

      summaryIndices.forEach(function (rowIndex) {
        var cellVal = window.hot.getDataAtCell(rowIndex, unitCol);
        // Gestione sicura dei valori nella cella
        if (cellVal === null || cellVal === undefined || cellVal === "") {
          cellVal = "0";
        }
        var numStr = cellVal.toString().replace(",", ".");
        var num = parseFloat(numStr);
        if (!isNaN(num)) {
          totale += num;
        }
      });

      window.hot.setDataAtCell(
        window.totaleOreRowIndex,
        unitCol,
        totale.toFixed(2).replace(".", ","),
        "updateTotaleOre"
      );

      // Dopo aver aggiornato il totale ore, aggiorniamo la differenza mese corrente
      updateDifferenzeCorrente();

      unitCol += 2; // Avanza di 2 colonne per ogni dipendente
    }
  }
  window.updateTotaleOre = updateTotaleOre;

  function updateOrePagate() {
    if (!hotInstance || typeof hotInstance.getDataAtCell !== "function") return;
    var weekDays = [
      "lunedì",
      "martedì",
      "mercoledì",
      "giovedì",
      "venerdì",
      "sabato",
      "domenica",
    ];
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
          var oreGiornaliere =
            oreSettimanali / window.giorniLavorativiSettimanali;
          totale += oreGiornaliere;
        }
      }
      hotInstance.setDataAtCell(
        window.orePagateRowIndex,
        unitCol,
        totale.toFixed(2).replace(".", ","),
        "updateOrePagate"
      );

      // Dopo aver aggiornato le ore pagate, aggiorniamo anche la differenza corrente
      updateDifferenzeCorrente();

      unitCol += 2;
    }
  }
  window.updateOrePagate = updateOrePagate;

  // Funzione per calcolare la differenza tra TOTALE ORE e ORE PAGATE (differenza mese corrente)
  function updateDifferenzeCorrente() {
    if (!window.hot || typeof window.hot.getDataAtCell !== "function") return;

    for (var u = 0, unitCol = 2; u < window.columnUnits.length; u++) {
      var unit = window.columnUnits[u];
      if (unit.type !== "employee") {
        unitCol += getUnitWidth(unit);
        continue;
      }

      // Otteniamo i valori di TOTALE ORE e ORE PAGATE
      var totaleOreVal = window.hot.getDataAtCell(
        window.totaleOreRowIndex,
        unitCol
      );
      var orePagateVal = window.hot.getDataAtCell(
        window.orePagateRowIndex,
        unitCol
      );

      // Convertiamo in numeri
      var totaleOre =
        parseFloat(totaleOreVal.toString().replace(",", ".")) || 0;
      var orePagate =
        parseFloat(orePagateVal.toString().replace(",", ".")) || 0;

      // Calcoliamo la differenza
      var differenza = totaleOre - orePagate;

      // Aggiorniamo la cella
      window.hot.setDataAtCell(
        window.diffCorrenteRowIndex,
        unitCol,
        differenza.toFixed(2).replace(".", ","),
        "updateDifferenzeCorrente"
      );

      // Applichiamo una classe CSS in base al valore (positivo o negativo)
      var cssClass =
        differenza >= 0 ? "differenza-positiva" : "differenza-negativa";
      window.hot.setCellMeta(
        window.diffCorrenteRowIndex,
        unitCol,
        "className",
        cssClass
      );

      unitCol += 2;
    }

    // Forziamo il rendering per applicare le modifiche di stile
    window.hot.render();
  }
  window.updateDifferenzeCorrente = updateDifferenzeCorrente;

  // Handler per il pulsante OK nel popup cella (logica invariata per le celle dei dipendenti)
  document.getElementById("okBtn").addEventListener("click", function () {
    if (window.selectedCell !== null) {
      var unitInfo = getUnitByCol(window.selectedCell.col);
      if (!unitInfo) return;
      var pairIndex = unitInfo.unitIndex; // per le unità employee
      var selectedOption = document.querySelector(
        'input[name="workOption"]:checked'
      ).value;

      // Prima, rimuovi i dati precedenti in modo pulito
      var row = window.selectedCell.row;
      var col = window.selectedCell.col;

      if (col % 2 === 0) {
        window.hot.setDataAtCell(row, col, "");
        window.hot.setDataAtCell(row, col + 1, "");
      } else {
        window.hot.setDataAtCell(row, col, "");
        window.hot.setDataAtCell(row, col - 1, "");
      }

      // Poi, inserisci i nuovi dati
      if (selectedOption === "lavora") {
        if (
          document.getElementById("popupInput1").value &&
          document.getElementById("popupInput2").value
        ) {
          var parts1 = document.getElementById("popupInput1").value;
          var parts2 = document.getElementById("popupInput2").value;
          var partsA = parts1.split(":").map(Number);
          var partsB = parts2.split(":").map(Number);
          var h1 = partsA[0],
            m1 = partsA[1];
          var h2 = partsB[0],
            m2 = partsB[1];
          var diff = h2 * 60 + m2 - (h1 * 60 + m1);
          var decimalHours = parseFloat((diff / 60).toFixed(2));

          // Determina la colonna inizio
          var inizioCol = col % 2 === 0 ? col : col - 1;
          window.hot.setDataAtCell(
            window.selectedCell.row,
            inizioCol,
            parts1 + " - " + parts2
          );
          window.hot.setDataAtCell(
            window.selectedCell.row,
            inizioCol + 1,
            formatDecimalHours(decimalHours)
          );
        }
      } else {
        // Caso "a casa"
        // Determina la colonna inizio
        var inizioCol = col % 2 === 0 ? col : col - 1;
        window.hot.setDataAtCell(window.selectedCell.row, inizioCol, "X");
        window.hot.setCellMeta(
          window.selectedCell.row,
          inizioCol,
          "className",
          "htCenter"
        );

        var motivo = document.getElementById("aCasaMotivazioni").value;
        var abbr = "";
        if (motivo !== "nessuna") {
          abbr = document.getElementById("aCasaAbbr").value;
        }
        window.hot.setDataAtCell(
          window.selectedCell.row,
          inizioCol + 1,
          motivo + "|" + abbr
        );
      }

      // Ricalcola tutti i totali alla fine
      window.recalculateAllTotals();

      cancelCellPopup();
    }
  });

  // Aggiorno "ORE PAGATE" all'avvio della pagina
  updateOrePagate();

  // Aggiorna la "Differenza +/- mese corrente" all'avvio
  updateDifferenzeCorrente();

  // Inizializza il totale del fatturato all'avvio
  if (typeof window.updateFatturatoTotale === "function") {
    window.updateFatturatoTotale();
  }
}

// Assicurati che gli elementi di drag and drop esistano
document.addEventListener("DOMContentLoaded", function () {
  // Controlla se gli elementi esistono, altrimenti creali
  if (!document.getElementById("dragPreview")) {
    var dragPreview = document.createElement("div");
    dragPreview.id = "dragPreview";
    dragPreview.className = "drag-preview";
    dragPreview.style.position = "fixed";
    dragPreview.style.display = "none";
    document.body.appendChild(dragPreview);
  }

  if (!document.getElementById("dropIndicator")) {
    var dropIndicator = document.createElement("div");
    dropIndicator.id = "dropIndicator";
    dropIndicator.className = "drop-indicator";
    dropIndicator.style.position = "fixed";
    document.body.appendChild(dropIndicator);
  }
});