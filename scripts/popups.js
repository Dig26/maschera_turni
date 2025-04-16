// popups.js - Gestione dei popup

function openWarningPopup() {
  var warningOverlay = document.getElementById("warningOverlay");
  if (!warningOverlay) {
    // Creazione dinamica dell'elemento warningOverlay se non esiste
    warningOverlay = document.createElement("div");
    warningOverlay.id = "warningOverlay";
    warningOverlay.style.position = "fixed";
    warningOverlay.style.top = "0";
    warningOverlay.style.left = "0";
    warningOverlay.style.width = "100vw";
    warningOverlay.style.height = "100vh";
    warningOverlay.style.background = "rgba(0, 0, 0, 0.5)";
    warningOverlay.style.display = "flex";
    warningOverlay.style.justifyContent = "center";
    warningOverlay.style.alignItems = "center";
    warningOverlay.style.zIndex = "1100";

    var popup = document.createElement("div");
    popup.className = "custom-popup";
    popup.innerHTML = "<p>La cella è già valorizzata. Vuoi cancellare il valore?</p>";

    var confirmBtn = document.createElement("button");
    confirmBtn.id = "warningConfirmBtn";
    confirmBtn.textContent = "Conferma";
    var cancelBtn = document.createElement("button");
    cancelBtn.id = "warningCancelBtn";
    cancelBtn.textContent = "Annulla";

    popup.appendChild(confirmBtn);
    popup.appendChild(cancelBtn);
    warningOverlay.appendChild(popup);
    document.body.appendChild(warningOverlay);
  }
  warningOverlay.style.display = "flex";
  document.getElementById("warningConfirmBtn").onclick = function () {
    var row = window.selectedCell.row;
    var col = window.selectedCell.col;
    var pairIndex = Math.floor((col - 2) / 2);

    // Controllo il valore della cella; uso trim() per assicurarmi di confrontare correttamente con "X"
    var cellVal = window.hot.getDataAtCell(row, col);
    if (cellVal && cellVal.trim() === "X") {
      // Modalità "a casa":
      // Il valore "X" è impostato e il motivo è nella cella adiacente (col+1)
      var motiveStr = window.hot.getDataAtCell(row, col + 1);
      if (motiveStr && motiveStr.indexOf("|") !== -1) {
        var motive = motiveStr.split("|")[0].trim().toLowerCase();
        if (motive === "ferie") {
          subtractTotalForMotive("ferie", window.ferieTotals, window.ferieRowIndex, pairIndex);
        } else if (motive === "rol") {
          subtractTotalForMotive("rol", window.rolTotals, window.rolRowIndex, pairIndex);
        } else if (motive === "exfestivita") { 
          subtractTotalForMotive("exFestivita", window.exFestivitaTotals, window.exFestivitaRowIndex, pairIndex);
        }
      }
      // Cancello entrambe le celle: "X" e la cella "inizio" (a sinistra)
      if (col % 2 === 1) {
        window.hot.setDataAtCell(row, col, "");
        window.hot.setDataAtCell(row, col - 1, "");
      } else {
        // Caso teorico
        window.hot.setDataAtCell(row, col, "");
        window.hot.setDataAtCell(row, col + 1, "");
      }
    } else {
      // Modalità "lavoro": la cella contiene un intervallo "HH:MM - HH:MM"
      // Controllo la cella che contiene il numero delle ore (in base alla parità della colonna)
      var durationCell;
      if (col % 2 === 0) {
        durationCell = window.hot.getDataAtCell(row, col + 1);
      } else {
        durationCell = window.hot.getDataAtCell(row, col);
      }
      var duration = parseFloat(durationCell.replace(",", "."));
      if (!isNaN(duration)) {
        // Se window.sums non esiste, lo inizializzo (per evitare l'errore)
        if (!window.sums) {
          window.sums = Array(window.pairToEmployee.length).fill(0);
        }
        window.sums[pairIndex] = (window.sums[pairIndex] || 0) - duration;
        window.hot.setDataAtCell(window.oreLavorateRowIndex, 2 + 2 * pairIndex, window.sums[pairIndex].toFixed(2).replace(".", ","));
      }
      // Cancello entrambe le celle (l'intervallo e il relativo valore numerico)
      if (col % 2 === 0) {
        window.hot.setDataAtCell(row, col, "");
        window.hot.setDataAtCell(row, col + 1, "");
      } else {
        window.hot.setDataAtCell(row, col, "");
        window.hot.setDataAtCell(row, col - 1, "");
      }
    }
    closeWarningPopup();
    openManualTimePopup();
  };
  document.getElementById("warningCancelBtn").onclick = function () {
    closeWarningPopup();
  };
}

function closeWarningPopup() {
  var warningOverlay = document.getElementById("warningOverlay");
  if (warningOverlay) {
    warningOverlay.style.display = "none";
  }
}

function openManualTimePopup() {
  var pairIndex = Math.floor((window.selectedCell.col - 2) / 2);
  var empName = window.pairToEmployee[pairIndex];
  var dayOfWeek = window.hot.getDataAtCell(window.selectedCell.row, 0);
  var dayOfMonth = window.hot.getDataAtCell(window.selectedCell.row, 1);

  document.getElementById("manualTimeHeader").innerHTML =
    empName + ": " + dayOfWeek + " " + dayOfMonth;

  // Popolo la select delle ore (da 0 a 24)
  var hoursSelect = document.getElementById("manualTimeHours");
  hoursSelect.innerHTML = "";
  for (var i = 0; i <= 24; i++) {
    var opt = document.createElement("option");
    opt.value = i;
    opt.text = i;
    hoursSelect.appendChild(opt);
  }

  // Popolo la select dei minuti (00, 15, 30, 45)
  var minutesSelect = document.getElementById("manualTimeMinutes");
  minutesSelect.innerHTML = "";
  var minuteOptions = ["00", "15", "30", "45"];
  minuteOptions.forEach(function (min) {
    var opt = document.createElement("option");
    opt.value = min;
    opt.text = min;
    minutesSelect.appendChild(opt);
  });

  hoursSelect.onchange = function () {
    if (this.value === "24") {
      minutesSelect.innerHTML = "";
      var opt = document.createElement("option");
      opt.value = "00";
      opt.text = "00";
      minutesSelect.appendChild(opt);
    } else {
      minutesSelect.innerHTML = "";
      minuteOptions.forEach(function (min) {
        var opt = document.createElement("option");
        opt.value = min;
        opt.text = min;
        minutesSelect.appendChild(opt);
      });
    }
  };

  // Se la cella contiene già un intervallo "HH:MM - HH:MM", prepopola le select
  var existingManual = window.hot.getDataAtCell(window.selectedCell.row, window.selectedCell.col);
  if (
    existingManual &&
    existingManual.trim() !== "" &&
    existingManual.indexOf(" - ") !== -1
  ) {
    var parts = existingManual.split(" - ");
    hoursSelect.value = parts[0].trim();
    var dec = parseFloat(existingManual.replace(",", "."));
    var mPart = Math.round((dec - Math.floor(dec)) * 60);
    var minuteString = mPart < 10 ? "0" + mPart.toString() : "" + mPart;
    if (["00", "15", "30", "45"].indexOf(minuteString) === -1) {
      minuteString = "00";
    }
    minutesSelect.value = minuteString;
  } else {
    hoursSelect.value = "";
    minutesSelect.value = "";
  }

  document.getElementById("manualTimeOverlay").style.display = "flex";

  document.getElementById("manualTimeOkBtn").onclick = function () {
    var h = parseInt(hoursSelect.value);
    var m = parseInt(minutesSelect.value);
    var decimalHours = h + m / 60;
    var formatted = formatDecimalHours(decimalHours);
    window.hot.setDataAtCell(window.selectedCell.row, window.selectedCell.col, formatted);

    var pairIndex = Math.floor((window.selectedCell.col - 2) / 2);
    var currentTotal = window.hot.getDataAtCell(window.oreLavorateRowIndex, 2 + 2 * pairIndex);
    currentTotal =
      currentTotal && currentTotal.trim() !== ""
        ? parseFloat(currentTotal.replace(",", "."))
        : 0;
    var newTotal = currentTotal + decimalHours;
    window.hot.setDataAtCell(window.oreLavorateRowIndex, 2 + 2 * pairIndex, newTotal.toFixed(2).replace(".", ","));

    closeManualTimePopup();
  };

  document.getElementById("manualTimeCancelBtn").onclick = function () {
    closeManualTimePopup();
  };
}

function closeManualTimePopup() {
  document.getElementById("manualTimeOverlay").style.display = "none";
}

function showDateSelection() {
  var html =
    '<div id="dateSelection" class="custom-popup" onclick="event.stopPropagation()">' +
    "<h3>Seleziona Mese e Anno</h3>" +
    '<label for="selectMonth">Mese:</label>' +
    '<select id="selectMonth">' +
    '<option value="0">Gennaio</option>' +
    '<option value="1">Febbraio</option>' +
    '<option value="2" selected>Marzo</option>' +
    '<option value="3">Aprile</option>' +
    '<option value="4">Maggio</option>' +
    '<option value="5">Giugno</option>' +
    '<option value="6">Luglio</option>' +
    '<option value="7">Agosto</option>' +
    '<option value="8">Settembre</option>' +
    '<option value="9">Ottobre</option>' +
    '<option value="10">Novembre</option>' +
    '<option value="11">Dicembre</option>' +
    "</select><br><br>" +
    '<label for="selectYear">Anno:</label>' +
    '<select id="selectYear">' +
    '<option value="2023">2023</option>' +
    '<option value="2024">2024</option>' +
    '<option value="2025" selected>2025</option>' +
    '<option value="2026">2026</option>' +
    '<option value="2027">2027</option>' +
    "</select><br><br>" +
    '<button id="creaBtn">Crea</button>' +
    "</div>";
  document.getElementById("initialPopup").innerHTML = html;
  document.getElementById("creaBtn").addEventListener("click", function () {
    var selMonth = document.getElementById("selectMonth");
    var selYear = document.getElementById("selectYear");
    if (!selMonth || !selYear) return;
    window.mese = parseInt(selMonth.value);
    window.anno = parseInt(selYear.value);
    document.getElementById("initialPopup").style.display = "none";
    if (typeof initTable === "function") {
      initTable();
    }
  });
}

function openHeaderPopup() {
  var pairIndex = Math.floor((window.selectedCell.col - 2) / 2);
  var emp = window.pairToEmployee[pairIndex];
  var defaultHours = window.employees[emp];
  var html = '<div id="headerPopupContainer">';
  html += "<p><strong>Dipendente:</strong> " + emp + "</p>";
  html += "<p><strong>Ore settimanali di default:</strong> " + defaultHours + "</p>";
  html += '<button id="headerAddVariationBtn">Variazioni ore +</button>';
  html += '<div id="headerVariationsContainer" class="variation-container"></div>';
  html += "<br>";
  html += '<button id="headerAnnullaBtn">Annulla</button> ';
  html += '<button id="headerConfermaBtn">Conferma</button>';
  html += "</div>";
  document.getElementById("headerPopup").innerHTML = html;
  document.getElementById("headerOverlay").style.display = "flex";
  
  var container = document.getElementById("headerVariationsContainer");
  if (window.employeeVariations[emp] && window.employeeVariations[emp].length > 0) {
    window.employeeVariations[emp].forEach(function (variation) {
      var div = document.createElement("div");
      div.className = "variation-row";
      var firstDayOfMonth = new Date(window.anno, window.mese, 1);
      var lastDayOfMonth = new Date(window.anno, window.mese + 1, 0);
      var minDateStr = getLocalDateString(firstDayOfMonth);
      var maxDateStr = getLocalDateString(lastDayOfMonth);
      var startInput = document.createElement("input");
      startInput.type = "date";
      startInput.min = minDateStr;
      startInput.max = maxDateStr;
      startInput.required = true;
      startInput.value = variation.start;
      var endInput = document.createElement("input");
      endInput.type = "date";
      endInput.min = minDateStr;
      endInput.max = maxDateStr;
      endInput.required = true;
      endInput.value = variation.end;
      startInput.addEventListener("change", function () {
        if (endInput.value < startInput.value) {
          endInput.value = startInput.value;
        }
        endInput.min = startInput.value;
      });
      endInput.addEventListener("change", function () {
        if (startInput.value > endInput.value) {
          startInput.value = endInput.value;
        }
        startInput.max = endInput.value;
      });
      var numInput = document.createElement("input");
      numInput.type = "number";
      numInput.placeholder = "Nuove ore";
      numInput.required = true;
      numInput.value = variation.hours;
      numInput.addEventListener("change", function () {
        if (parseFloat(this.value) === defaultHours) {
          alert("Il valore non può essere uguale a quello originale (" + defaultHours + ").");
          this.value = "";
        }
      });
      var removeBtn = document.createElement("button");
      removeBtn.textContent = "Rimuovi";
      removeBtn.addEventListener("click", function () {
        container.removeChild(div);
      });
      div.appendChild(startInput);
      div.appendChild(endInput);
      div.appendChild(numInput);
      div.appendChild(removeBtn);
      container.appendChild(div);
    });
  }

  document.getElementById("headerAnnullaBtn").addEventListener("click", cancelHeaderPopup);
  document.getElementById("headerAddVariationBtn").addEventListener("click", function () {
    var container = document.getElementById("headerVariationsContainer");
    var firstDayOfMonth = new Date(window.anno, window.mese, 1);
    var lastDayOfMonth = new Date(window.anno, window.mese + 1, 0);
    var minDateStr = getLocalDateString(firstDayOfMonth);
    var maxDateStr = getLocalDateString(lastDayOfMonth);
    var div = document.createElement("div");
    div.className = "variation-row";
    var startInput = document.createElement("input");
    startInput.type = "date";
    startInput.min = minDateStr;
    startInput.max = maxDateStr;
    startInput.required = true;
    var endInput = document.createElement("input");
    endInput.type = "date";
    endInput.min = minDateStr;
    endInput.max = maxDateStr;
    endInput.required = true;
    startInput.addEventListener("change", function () {
      if (endInput.value < startInput.value) {
        endInput.value = startInput.value;
      }
      endInput.min = startInput.value;
    });
    endInput.addEventListener("change", function () {
      if (startInput.value > endInput.value) {
        startInput.value = endInput.value;
      }
      startInput.max = endInput.value;
    });
    var numInput = document.createElement("input");
    numInput.type = "number";
    numInput.placeholder = "Nuove ore";
    numInput.required = true;
    numInput.addEventListener("change", function () {
      if (parseFloat(this.value) === defaultHours) {
        alert("Il valore non può essere uguale a quello originale (" + defaultHours + ").");
        this.value = "";
      }
    });
    var removeBtn = document.createElement("button");
    removeBtn.textContent = "Rimuovi";
    removeBtn.addEventListener("click", function () {
      container.removeChild(div);
    });
    div.appendChild(startInput);
    div.appendChild(endInput);
    div.appendChild(numInput);
    div.appendChild(removeBtn);
    container.appendChild(div);
  });

  document.getElementById("headerConfermaBtn").addEventListener("click", function () {
    var container = document.getElementById("headerVariationsContainer");
    var variations = [];
    var rows = container.getElementsByClassName("variation-row");
    for (var i = 0; i < rows.length; i++) {
      var startInput = rows[i].querySelector("input[type='date']:first-of-type");
      var endInput = rows[i].querySelector("input[type='date']:nth-of-type(2)");
      var numInput = rows[i].querySelector("input[type='number']");
      if (startInput && endInput && numInput && startInput.value && endInput.value && numInput.value) {
        variations.push({
          start: startInput.value,
          end: endInput.value,
          hours: parseFloat(numInput.value),
        });
      }
    }
    window.employeeVariations[emp] = variations;
    var assignedHours = [];
    var giorniNelMese = new Date(window.anno, window.mese + 1, 0).getDate();
    for (var day = 1; day <= giorniNelMese; day++) {
      var rowDate = new Date(window.anno, window.mese, day);
      var hoursForDay = window.employees[emp];
      for (var j = 0; j < variations.length; j++) {
        var variation = variations[j];
        var startDate = new Date(variation.start + "T00:00:00");
        var endDate = new Date(variation.end + "T00:00:00");
        if (rowDate >= startDate && rowDate <= endDate) {
          hoursForDay = variation.hours;
          break;
        }
      }
      assignedHours.push(hoursForDay);
    }
    var uniqueHours = Array.from(new Set(assignedHours));
    uniqueHours.sort(function (a, b) { return a - b; });
    var headerValue = uniqueHours.join("-");
    var headerCol = window.selectedCell.col + 1;
    window.hot.setDataAtCell(0, headerCol, headerValue);

    function calculateTotalForMotive(motiveName, pairIndex, emp, oreLavorateRowIndex) {
      var total = 0;
      for (var i = 1; i < oreLavorateRowIndex; i++) {
        var fineVal = window.hot.getDataAtCell(i, 2 + 2 * pairIndex + 1);
        if (fineVal && fineVal.indexOf("|") !== -1) {
          var motiveValue = fineVal.split("|")[0].trim().toLowerCase();
          if (motiveValue === motiveName) {
            var giornoMese = window.hot.getDataAtCell(i, 1);
            var dayNum = parseInt(giornoMese);
            if (!isNaN(dayNum)) {
              var rowDate = new Date(window.anno, window.mese, dayNum);
              var oreSettimanali = window.employees[emp];
              if (window.employeeVariations[emp]) {
                for (var k = 0; k < window.employeeVariations[emp].length; k++) {
                  var entry = window.employeeVariations[emp][k];
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

    window.ferieTotals[pairIndex] = calculateTotalForMotive("ferie", pairIndex, emp, window.oreLavorateRowIndex);
    window.exFestivitaTotals[pairIndex] = calculateTotalForMotive("exfestivita", pairIndex, emp, window.oreLavorateRowIndex);
    window.rolTotals[pairIndex] = calculateTotalForMotive("rol", pairIndex, emp, window.oreLavorateRowIndex);
    window.hot.setDataAtCell(window.ferieRowIndex, 2 + 2 * pairIndex, window.ferieTotals[pairIndex].toFixed(2).replace(".", ","));
    window.hot.setDataAtCell(window.exFestivitaRowIndex, 2 + 2 * pairIndex, window.exFestivitaTotals[pairIndex].toFixed(2).replace(".", ","));
    window.hot.setDataAtCell(window.rolRowIndex, 2 + 2 * pairIndex, window.rolTotals[pairIndex].toFixed(2).replace(".", ","));
    // Chiamata per aggiornare la riga ORE PAGATE dopo la conferma delle variazioni orario
    if (typeof window.updateOrePagate === "function") {
      window.updateOrePagate();
    }
    cancelHeaderPopup();
  });
}

function openCellPopup() {
  var cellPopup = document.getElementById("cellPopup");
  var popupInput1 = document.getElementById("popupInput1");
  var popupInput2 = document.getElementById("popupInput2");

  var existingHeader = document.getElementById("cellPopupHeader");
  if (existingHeader) {
    existingHeader.remove();
  }

  var dayOfWeek = window.hot.getDataAtCell(window.selectedCell.row, 0);
  var dayOfMonth = window.hot.getDataAtCell(window.selectedCell.row, 1);
  var pairIndex = Math.floor((window.selectedCell.col - 2) / 2);
  var empName = window.pairToEmployee[pairIndex];

  var headerDiv = document.createElement("div");
  headerDiv.id = "cellPopupHeader";
  headerDiv.style.textAlign = "left";
  headerDiv.style.fontWeight = "bold";
  headerDiv.style.marginBottom = "10px";
  headerDiv.innerHTML = empName + ": " + dayOfWeek + " " + dayOfMonth;
  cellPopup.insertBefore(headerDiv, cellPopup.firstChild);

  // Popola le select degli orari usando window.allTimes
  populateSelectOptions(popupInput1, "Orario Inizio", window.allTimes);
  populateSelectOptions(popupInput2, "Orario Fine", window.allTimes);

  // Se la cella ha già un intervallo "HH:MM - HH:MM", lo prepopola
  var cellValue = window.hot.getDataAtCell(window.selectedCell.row, window.selectedCell.col);
  if (cellValue && cellValue.trim() !== "" && cellValue.indexOf(" - ") !== -1) {
    var parts = cellValue.split(" - ");
    popupInput1.value = parts[0].trim();
    popupInput2.value = parts[1].trim();
  } else {
    popupInput1.value = "";
    popupInput2.value = "";
  }

  // Gestione della modalità in base alla cella adiacente
  var adjacentVal = window.hot.getDataAtCell(window.selectedCell.row, window.selectedCell.col + 1);
  if (adjacentVal && adjacentVal.indexOf("|") !== -1) {
    var partsA = adjacentVal.split("|");
    document.getElementById("aCasaMotivazioni").value = partsA[0].trim();
    document.getElementById("aCasaAbbr").value = partsA[1].trim();
    var aCasaRadio = document.querySelector('input[name="workOption"][value="aCasa"]');
    if (aCasaRadio) {
      aCasaRadio.checked = true;
    }
  } else {
    var lavoraRadio = document.querySelector('input[name="workOption"][value="lavora"]');
    if (lavoraRadio) {
      lavoraRadio.checked = true;
    }
  }

  // Attacca il listener per aggiornare lo stato degli input in base alla scelta del radio
  var radios = document.querySelectorAll('input[name="workOption"]');
  radios.forEach(function (radio) {
    radio.addEventListener("change", updateWorkMode);
  });
  updateWorkMode();

  // Listener "change" per le select con auto-riempimento.
  popupInput1.addEventListener("change", function() {
    filterOptionsForPopupInput2();
    var col = window.selectedCell.col;
    var durationStr = window.hot.getDataAtCell(window.selectedCell.row, col + 1);
    var effectiveCell = window.hot.getDataAtCell(window.selectedCell.row, col);
    if (durationStr && durationStr.trim() !== "" && (!effectiveCell || effectiveCell.trim() === "")) {
      var baseNumber = parseFloat(durationStr.replace(",", "."));
      if (!isNaN(baseNumber)) {
        popupInput2.value = addMinutes(popupInput1.value, baseNumber * 60);
      }
    }
  });
  
  popupInput2.addEventListener("change", function() {
    filterOptionsForPopupInput1();
    var col = window.selectedCell.col;
    var durationStr;
    var effectiveCell;
    if (col % 2 === 0) {
      durationStr = window.hot.getDataAtCell(window.selectedCell.row, col + 1);
      effectiveCell = window.hot.getDataAtCell(window.selectedCell.row, col);
    } else {
      durationStr = window.hot.getDataAtCell(window.selectedCell.row, col);
      effectiveCell = window.hot.getDataAtCell(window.selectedCell.row, col - 1);
    }
    if (durationStr && durationStr.trim() !== "" && (!effectiveCell || effectiveCell.trim() === "")) {
      var baseNumber = parseFloat(durationStr.replace(",", "."));
      if (!isNaN(baseNumber)) {
        popupInput1.value = subtractMinutes(popupInput2.value, baseNumber * 60);
      }
    }
  });

  var existingResetBtn = document.getElementById("cellPopupResetBtn");
  if (existingResetBtn) {
    existingResetBtn.remove();
  }
  var resetBtn = document.createElement("button");
  resetBtn.id = "cellPopupResetBtn";
  resetBtn.textContent = "Reset";
  resetBtn.addEventListener("click", function () {
    popupInput1.value = "";
    popupInput2.value = "";
    window.hot.setDataAtCell(window.selectedCell.row, window.selectedCell.col, "");
    window.hot.setDataAtCell(window.selectedCell.row, window.selectedCell.col + 1, "");
  });
  document.getElementById("cellPopup").appendChild(resetBtn);
  document.getElementById("cellOverlay").style.display = "flex";
}

function cancelCellPopup() {
  document.getElementById("cellOverlay").style.display = "none";
  window.selectedCell = null;
  window.currentCellData = null;
  document.getElementById("aCasaMotivazioni").value = "nessuna";
  document.getElementById("aCasaAbbr").value = "";
}

function cancelHeaderPopup() {
  document.getElementById("headerOverlay").style.display = "none";
  window.selectedCell = null;
}

function populateSelectOptions(selectElement, placeholder, timesArray) {
  var html = '<option value="" disabled selected>' + placeholder + "</option>";
  timesArray.forEach(function (time) {
    html += '<option value="' + time + '">' + time + "</option>";
  });
  selectElement.innerHTML = html;
}

function filterOptionsForPopupInput2() {
  var popupInput1 = document.getElementById("popupInput1");
  var popupInput2 = document.getElementById("popupInput2");
  var startTime = popupInput1.value;
  var filtered = window.allTimes.filter(function (time) {
    return time > startTime;
  });
  if (filtered.length > 0) {
    var currentValue = popupInput2.value;
    populateSelectOptions(popupInput2, "Orario Fine", filtered);
    if (filtered.indexOf(currentValue) !== -1) {
      popupInput2.value = currentValue;
    } else {
      popupInput2.value = "";
    }
  } else {
    popupInput2.innerHTML = '<option value="" disabled selected>Orario Fine</option>';
  }
}

function filterOptionsForPopupInput1() {
  var popupInput1 = document.getElementById("popupInput1");
  var popupInput2 = document.getElementById("popupInput2");
  var endTime = popupInput2.value;
  var filtered = window.allTimes.filter(function (time) {
    return time < endTime;
  });
  if (filtered.length > 0) {
    var currentValue = popupInput1.value;
    populateSelectOptions(popupInput1, "Orario Inizio", filtered);
    if (filtered.indexOf(currentValue) !== -1) {
      popupInput1.value = currentValue;
    } else {
      popupInput1.value = "";
    }
  } else {
    popupInput1.innerHTML = '<option value="" disabled selected>Orario Inizio</option>';
  }
}

function updateWorkMode() {
  var selectedRadio = document.querySelector('input[name="workOption"]:checked');
  if (!selectedRadio) return;
  if (selectedRadio.value === "lavora") {
    var lavoroInputs = [document.getElementById("popupInput1"), document.getElementById("popupInput2")];
    lavoroInputs.forEach(function (input) {
      input.disabled = false;
      input.style.opacity = "1";
    });
    var aCasaExtraContainer = document.getElementById("aCasaExtraContainer");
    aCasaExtraContainer.style.opacity = "0.5";
    var aCasaInputs = aCasaExtraContainer.querySelectorAll("input, select");
    aCasaInputs.forEach(function (input) {
      input.disabled = true;
    });
  } else if (selectedRadio.value === "aCasa") {
    var lavoroInputs = [document.getElementById("popupInput1"), document.getElementById("popupInput2")];
    lavoroInputs.forEach(function (input) {
      input.disabled = true;
      input.style.opacity = "0.5";
    });
    var aCasaExtraContainer = document.getElementById("aCasaExtraContainer");
    aCasaExtraContainer.style.opacity = "1";
    var aCasaInputs = aCasaExtraContainer.querySelectorAll("input, select");
    aCasaInputs.forEach(function (input) {
      input.disabled = false;
    });
  }
}

window.openWarningPopup = openWarningPopup;
window.closeWarningPopup = closeWarningPopup;
window.openManualTimePopup = openManualTimePopup;
window.closeManualTimePopup = closeManualTimePopup;
window.showDateSelection = showDateSelection;
window.openHeaderPopup = openHeaderPopup;
window.openCellPopup = openCellPopup;
window.cancelCellPopup = cancelCellPopup;
window.cancelHeaderPopup = cancelHeaderPopup;
window.populateSelectOptions = populateSelectOptions;
window.filterOptionsForPopupInput1 = filterOptionsForPopupInput1;
window.filterOptionsForPopupInput2 = filterOptionsForPopupInput2;
window.updateWorkMode = updateWorkMode;

// ------------------------------
// Popup per la colonna "Fatturato"
// ------------------------------

function openFatturatoPopup() {
  // Controlla se l'overlay esiste, altrimenti lo crea
  var overlay = document.getElementById("fatturatoOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "fatturatoOverlay";
    overlay.className = "cellOverlay";
    overlay.style.display = "none";
    document.body.appendChild(overlay);
  }
  // Crea il popup all'interno dell'overlay
  overlay.innerHTML = ""; // svuota eventuali contenuti
  var popup = document.createElement("div");
  popup.id = "fatturatoPopup";
  popup.className = "custom-popup";
  popup.onclick = function(event) {
    event.stopPropagation();
  };
  // Recupera la data dalla riga selezionata
  var dayOfWeek = window.hot.getDataAtCell(window.selectedCell.row, 0);
  var dayOfMonth = window.hot.getDataAtCell(window.selectedCell.row, 1);
  popup.innerHTML = 
    '<div id="fatturatoPopupHeader" style="text-align: left; font-weight: bold; margin-bottom: 10px;">' +
      "Data: " + dayOfWeek + " " + dayOfMonth +
    '</div>' +
    '<div>' +
      '<label for="fatturatoInput">€ </label>' +
      '<input type="number" id="fatturatoInput" placeholder="Inserisci importo" style="width: 100px;" step="0.01">' +
    '</div>' +
    '<br>' +
    '<button id="fatturatoOkBtn">OK</button>' +
    '<button id="fatturatoResetBtn">Reset</button>' +
    '<button id="fatturatoCancelBtn">Annulla</button>';
  overlay.appendChild(popup);
  overlay.style.display = "flex";
  
  document.getElementById("fatturatoOkBtn").onclick = function() {
    var inputVal = document.getElementById("fatturatoInput").value;
    if (inputVal === "" || isNaN(parseFloat(inputVal))) {
      alert("Inserisci un importo valido.");
      return;
    }
    var formatted = parseFloat(inputVal).toFixed(2).replace(".", ",") + " €";
    // Aggiorna la cella selezionata nella colonna Fatturato
    window.hot.setDataAtCell(window.selectedCell.row, window.selectedCell.col, formatted);
    closeFatturatoPopup();
  };
  
  document.getElementById("fatturatoResetBtn").onclick = function() {
    document.getElementById("fatturatoInput").value = "";
  };
  
  document.getElementById("fatturatoCancelBtn").onclick = function() {
    closeFatturatoPopup();
  };
}

function closeFatturatoPopup() {
  var overlay = document.getElementById("fatturatoOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

window.openFatturatoPopup = openFatturatoPopup;
window.closeFatturatoPopup = closeFatturatoPopup;
