// popups.js - Gestione dei popup con miglioramenti estetici

function openWarningPopup() {
  var warningOverlay = document.getElementById("warningOverlay");
  if (!warningOverlay) {
    // Creazione dinamica dell'elemento warningOverlay se non esiste
    warningOverlay = document.createElement("div");
    warningOverlay.id = "warningOverlay";
    warningOverlay.className = "cellOverlay";
    warningOverlay.style.zIndex = "1100";

    var popup = document.createElement("div");
    popup.className = "custom-popup";

    // Header migliorato
    var header = document.createElement("div");
    header.className = "popup-header";
    header.innerHTML =
      '<i class="fas fa-exclamation-triangle" style="color: #e74c3c; margin-right: 8px;"></i> Attenzione';

    var content = document.createElement("div");
    content.innerHTML =
      "<p>La cella è già valorizzata. Vuoi cancellare il valore?</p>";
    content.style.margin = "15px 0";

    var buttonsDiv = document.createElement("div");
    buttonsDiv.style.textAlign = "right";

    var confirmBtn = document.createElement("button");
    confirmBtn.id = "warningConfirmBtn";
    confirmBtn.innerHTML = '<i class="fas fa-check"></i> Conferma';
    confirmBtn.className = "btn-primary";

    var cancelBtn = document.createElement("button");
    cancelBtn.id = "warningCancelBtn";
    cancelBtn.innerHTML = '<i class="fas fa-times"></i> Annulla';
    cancelBtn.className = "btn-secondary";

    buttonsDiv.appendChild(cancelBtn);
    buttonsDiv.appendChild(confirmBtn);

    popup.appendChild(header);
    popup.appendChild(content);
    popup.appendChild(buttonsDiv);
    warningOverlay.appendChild(popup);
    document.body.appendChild(warningOverlay);
  }

  warningOverlay.style.display = "flex";
  document.getElementById("warningConfirmBtn").onclick = function () {
    var row = window.selectedCell.row;
    var col = window.selectedCell.col;

    // Cancello le celle con un approccio robusto e sicuro
    if (col % 2 === 0) {
      // Colonna inizio
      window.hot.setDataAtCell(row, col, "");
      window.hot.setDataAtCell(row, col + 1, "");
    } else {
      // Colonna fine
      window.hot.setDataAtCell(row, col, "");
      window.hot.setDataAtCell(row, col - 1, "");
    }

    // Ricalcola tutti i totali in modo corretto invece di fare aggiustamenti parziali
    window.recalculateAllTotals();

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
    '<i class="fas fa-clock" style="margin-right: 8px;"></i> Inserimento Orario: ' +
    empName +
    " - " +
    dayOfWeek +
    " " +
    dayOfMonth;

  // Popolo la select delle ore (da 0 a 24)
  var hoursSelect = document.getElementById("manualTimeHours");
  hoursSelect.innerHTML = "";
  for (var i = 0; i <= 24; i++) {
    var opt = document.createElement("option");
    opt.value = i;
    opt.text = i < 10 ? "0" + i : i;
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
  var existingManual = window.hot.getDataAtCell(
    window.selectedCell.row,
    window.selectedCell.col
  );
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

    // Identifica in quale cella dobbiamo inserire il valore
    var col = window.selectedCell.col;
    var row = window.selectedCell.row;

    // Determina se dobbiamo inserire in cella "inizio" o "fine"
    var inizioCol, fineCol;
    if (col % 2 === 0) {
      // Siamo su una colonna "inizio"
      inizioCol = col;
      fineCol = col + 1;
    } else {
      // Siamo su una colonna "fine"
      inizioCol = col - 1;
      fineCol = col;
    }

    // Prima pulisci i valori esistenti
    window.hot.setDataAtCell(row, inizioCol, "");
    window.hot.setDataAtCell(row, fineCol, "");

    // Poi inserisci il nuovo valore
    window.hot.setDataAtCell(row, fineCol, formatted);

    // Ricalcola i totali
    window.recalculateAllTotals();

    closeManualTimePopup();
  };

  document.getElementById("manualTimeCancelBtn").onclick = function () {
    closeManualTimePopup();
  };

  document.getElementById("manualTimeResetBtn").onclick = function () {
    hoursSelect.value = "";
    minutesSelect.value = "";
  };
}

function closeManualTimePopup() {
  document.getElementById("manualTimeOverlay").style.display = "none";
}

function showDateSelection() {
  var mesi = [
    "Gennaio",
    "Febbraio",
    "Marzo",
    "Aprile",
    "Maggio",
    "Giugno",
    "Luglio",
    "Agosto",
    "Settembre",
    "Ottobre",
    "Novembre",
    "Dicembre",
  ];
  var html =
    '<div id="dateSelection" class="custom-popup" onclick="event.stopPropagation()">' +
    '<div class="popup-header"><i class="fas fa-calendar-alt" style="margin-right: 8px;"></i> Seleziona Periodo</div>' +
    '<div style="margin-bottom: 15px;">' +
    '<label for="selectMonth">Mese:</label>' +
    '<select id="selectMonth" style="width: 100%; margin-top: 5px;">';

  // Generazione dinamica delle opzioni mese
  for (var i = 0; i < mesi.length; i++) {
    var selected = i === 2 ? " selected" : "";
    html +=
      '<option value="' + i + '"' + selected + ">" + mesi[i] + "</option>";
  }

  html +=
    "</select></div>" +
    '<div style="margin-bottom: 20px;">' +
    '<label for="selectYear">Anno:</label>' +
    '<select id="selectYear" style="width: 100%; margin-top: 5px;">';

  // Generazione dinamica delle opzioni anno
  var currentYear = new Date().getFullYear();
  for (var y = currentYear - 2; y <= currentYear + 5; y++) {
    var selected = y === 2025 ? " selected" : "";
    html += '<option value="' + y + '"' + selected + ">" + y + "</option>";
  }

  html +=
    "</select></div>" +
    '<div style="text-align: right">' +
    '<button id="creaBtn"><i class="fas fa-check"></i> Crea</button>' +
    "</div></div>";

  document.getElementById("initialPopup").innerHTML = html;
  document.getElementById("creaBtn").addEventListener("click", function () {
    var selMonth = document.getElementById("selectMonth");
    var selYear = document.getElementById("selectYear");
    if (!selMonth || !selYear) return;
    window.mese = parseInt(selMonth.value);
    window.anno = parseInt(selYear.value);
    document.getElementById("initialPopup").style.display = "none";

    // Aggiornamento display periodo
    var periodoDisplay = document.getElementById("periodoDisplay");
    if (periodoDisplay) {
      periodoDisplay.innerHTML =
        '<i class="fas fa-calendar-alt"></i> ' +
        mesi[window.mese] +
        " " +
        window.anno;
    }

    if (typeof initTable === "function") {
      initTable();
    }
  });
}

// Sostituiamo la funzione openHeaderPopup per evitare errori
function openHeaderPopup(unitIndex) {
  console.log(
    "Funzione openHeaderPopup deprecata, usa openHeaderPopupForEmployee"
  );
  // Se viene chiamata direttamente questa funzione (codice legacy)
  if (unitIndex !== undefined && window.pairToEmployee[unitIndex]) {
    openHeaderPopupForEmployee(window.pairToEmployee[unitIndex], unitIndex);
  } else {
    alert(
      "Errore nell'apertura del popup variazioni orario. Ricaricare la pagina."
    );
  }
}

// NUOVA FUNZIONE per gestire il popup variazioni orario
function openHeaderPopupForEmployee(employeeName, unitIndex) {
  if (!employeeName || !window.employees[employeeName]) {
    console.error("Dipendente non valido: " + employeeName);
    alert("Errore: Dipendente non valido o non trovato.");
    return;
  }

  var defaultHours = window.employees[employeeName];
  var pairIndex = unitIndex;

  // Salviamo la colonna corrispondente per aggiornamenti futuri
  window.selectedCell = { col: 2 + 2 * pairIndex, row: 0 };

  var html =
    '<div class="popup-header"><i class="fas fa-user-clock" style="margin-right: 8px;"></i> Gestione Orario: ' +
    employeeName +
    "</div>" +
    "<div>" +
    '<p style="margin-bottom: 10px;"><strong>Dipendente:</strong> ' +
    employeeName +
    "</p>" +
    '<p style="margin-bottom: 15px;"><strong>Ore settimanali standard:</strong> ' +
    defaultHours +
    "</p>" +
    '<button id="headerAddVariationBtn" style="background: #f1f2f6; color: #333; width: 100%; margin: 0 0 10px 0; padding: 8px;">' +
    '<i class="fas fa-plus-circle"></i> Aggiungi Variazione' +
    "</button>" +
    '<div id="headerVariationsContainer" class="variation-container"></div>' +
    "</div>" +
    '<div style="margin-top: 15px; text-align: right;">' +
    '<button id="headerAnnullaBtn"><i class="fas fa-times"></i> Annulla</button> ' +
    '<button id="headerConfermaBtn"><i class="fas fa-check"></i> Conferma</button>' +
    "</div>";

  document.getElementById("headerPopup").innerHTML = html;
  document.getElementById("headerOverlay").style.display = "flex";

  var container = document.getElementById("headerVariationsContainer");
  container.innerHTML = ""; // Puliamo il container per evitare duplicazioni

  if (
    window.employeeVariations[employeeName] &&
    window.employeeVariations[employeeName].length > 0
  ) {
    window.employeeVariations[employeeName].forEach(function (variation) {
      addVariationRowForEmployee(container, variation, employeeName);
    });
  }

  document
    .getElementById("headerAnnullaBtn")
    .addEventListener("click", cancelHeaderPopup);
  document
    .getElementById("headerAddVariationBtn")
    .addEventListener("click", function () {
      addVariationRowForEmployee(container, null, employeeName);
    });

  document
    .getElementById("headerConfermaBtn")
    .addEventListener("click", function () {
      var container = document.getElementById("headerVariationsContainer");
      var variations = [];
      var rows = container.getElementsByClassName("variation-row");
      for (var i = 0; i < rows.length; i++) {
        var startInput = rows[i].querySelector(
          "input[type='date']:first-of-type"
        );
        var endInput = rows[i].querySelector(
          "input[type='date']:nth-of-type(2)"
        );
        var numInput = rows[i].querySelector("input[type='number']");
        if (
          startInput &&
          endInput &&
          numInput &&
          startInput.value &&
          endInput.value &&
          numInput.value
        ) {
          variations.push({
            start: startInput.value,
            end: endInput.value,
            hours: parseFloat(numInput.value),
          });
        }
      }
      window.employeeVariations[employeeName] = variations;
      var assignedHours = [];
      var giorniNelMese = new Date(window.anno, window.mese + 1, 0).getDate();
      for (var day = 1; day <= giorniNelMese; day++) {
        var rowDate = new Date(window.anno, window.mese, day);
        var hoursForDay = window.employees[employeeName];
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
      uniqueHours.sort(function (a, b) {
        return a - b;
      });
      var headerValue = uniqueHours.join("-");
      var headerCol = window.selectedCell.col + 1;
      window.hot.setDataAtCell(0, headerCol, headerValue);

      // Ricalcola tutti i totali
      window.recalculateAllTotals();

      cancelHeaderPopup();
    });
}

// NUOVA FUNZIONE per aggiungere una riga di variazione
function addVariationRowForEmployee(container, variation, employeeName) {
  if (!employeeName || !window.employees[employeeName]) {
    console.error("Dipendente non valido per row variation: " + employeeName);
    return;
  }

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
  if (variation) startInput.value = variation.start;

  var endInput = document.createElement("input");
  endInput.type = "date";
  endInput.min = minDateStr;
  endInput.max = maxDateStr;
  endInput.required = true;
  if (variation) endInput.value = variation.end;

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
  numInput.placeholder = "Ore";
  numInput.required = true;
  if (variation) numInput.value = variation.hours;

  var defaultHours = window.employees[employeeName];

  numInput.addEventListener("change", function () {
    if (parseFloat(this.value) === defaultHours) {
      alert(
        "Il valore non può essere uguale a quello originale (" +
          defaultHours +
          ")."
      );
      this.value = "";
    }
  });

  var removeBtn = document.createElement("button");
  removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
  removeBtn.addEventListener("click", function () {
    container.removeChild(div);
  });

  div.appendChild(startInput);
  div.appendChild(endInput);
  div.appendChild(numInput);
  div.appendChild(removeBtn);
  container.appendChild(div);
}

function openCellPopup() {
  var cellPopup = document.getElementById("cellPopup");
  var popupInput1 = document.getElementById("popupInput1");
  var popupInput2 = document.getElementById("popupInput2");

  var existingHeader = document.getElementById("cellPopupHeader");
  if (existingHeader) {
    existingHeader.innerHTML = ""; // Svuoto il contenuto invece di rimuovere l'elemento
  }

  var dayOfWeek = window.hot.getDataAtCell(window.selectedCell.row, 0);
  var dayOfMonth = window.hot.getDataAtCell(window.selectedCell.row, 1);
  var pairIndex = Math.floor((window.selectedCell.col - 2) / 2);
  var empName = window.pairToEmployee[pairIndex];

  // Aggiorno l'header con icona e layout migliorato
  existingHeader.innerHTML =
    '<i class="fas fa-user-clock" style="margin-right: 8px;"></i> ' +
    empName +
    ": " +
    dayOfWeek +
    " " +
    dayOfMonth;

  // Popola le select degli orari usando window.allTimes
  populateSelectOptions(popupInput1, "Orario Inizio", window.allTimes);
  populateSelectOptions(popupInput2, "Orario Fine", window.allTimes);

  // Se la cella ha già un intervallo "HH:MM - HH:MM", lo prepopola
  var cellValue = window.hot.getDataAtCell(
    window.selectedCell.row,
    window.selectedCell.col
  );
  if (cellValue && cellValue.trim() !== "" && cellValue.indexOf(" - ") !== -1) {
    var parts = cellValue.split(" - ");
    popupInput1.value = parts[0].trim();
    popupInput2.value = parts[1].trim();
  } else {
    popupInput1.value = "";
    popupInput2.value = "";
  }

  // Gestione della modalità in base alla cella adiacente
  var adjacentVal = window.hot.getDataAtCell(
    window.selectedCell.row,
    window.selectedCell.col + 1
  );
  if (adjacentVal && adjacentVal.indexOf("|") !== -1) {
    var partsA = adjacentVal.split("|");
    document.getElementById("aCasaMotivazioni").value = partsA[0].trim();
    document.getElementById("aCasaAbbr").value = partsA[1].trim();
    var aCasaRadio = document.querySelector(
      'input[name="workOption"][value="aCasa"]'
    );
    if (aCasaRadio) {
      aCasaRadio.checked = true;
    }
  } else {
    var lavoraRadio = document.querySelector(
      'input[name="workOption"][value="lavora"]'
    );
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
  popupInput1.addEventListener("change", function () {
    filterOptionsForPopupInput2();
    var col = window.selectedCell.col;
    var durationStr = window.hot.getDataAtCell(
      window.selectedCell.row,
      col + 1
    );
    var effectiveCell = window.hot.getDataAtCell(window.selectedCell.row, col);
    if (
      durationStr &&
      durationStr.trim() !== "" &&
      (!effectiveCell || effectiveCell.trim() === "")
    ) {
      var baseNumber = parseFloat(durationStr.replace(",", "."));
      if (!isNaN(baseNumber)) {
        popupInput2.value = addMinutes(popupInput1.value, baseNumber * 60);
      }
    }
  });

  popupInput2.addEventListener("change", function () {
    filterOptionsForPopupInput1();
    var col = window.selectedCell.col;
    var durationStr;
    var effectiveCell;
    if (col % 2 === 0) {
      durationStr = window.hot.getDataAtCell(window.selectedCell.row, col + 1);
      effectiveCell = window.hot.getDataAtCell(window.selectedCell.row, col);
    } else {
      durationStr = window.hot.getDataAtCell(window.selectedCell.row, col);
      effectiveCell = window.hot.getDataAtCell(
        window.selectedCell.row,
        col - 1
      );
    }
    if (
      durationStr &&
      durationStr.trim() !== "" &&
      (!effectiveCell || effectiveCell.trim() === "")
    ) {
      var baseNumber = parseFloat(durationStr.replace(",", "."));
      if (!isNaN(baseNumber)) {
        popupInput1.value = subtractMinutes(popupInput2.value, baseNumber * 60);
      }
    }
  });

  var existingResetBtn = document.getElementById("cellPopupResetBtn");
  if (existingResetBtn) {
    existingResetBtn.innerHTML = '<i class="fas fa-undo"></i> Reset';
    existingResetBtn.addEventListener("click", function () {
      popupInput1.value = "";
      popupInput2.value = "";
      window.hot.setDataAtCell(
        window.selectedCell.row,
        window.selectedCell.col,
        ""
      );
      window.hot.setDataAtCell(
        window.selectedCell.row,
        window.selectedCell.col + 1,
        ""
      );
    });
  }
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
    popupInput2.innerHTML =
      '<option value="" disabled selected>Orario Fine</option>';
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
    popupInput1.innerHTML =
      '<option value="" disabled selected>Orario Inizio</option>';
  }
}

function updateWorkMode() {
  var selectedRadio = document.querySelector(
    'input[name="workOption"]:checked'
  );
  if (!selectedRadio) return;

  var lavoraContainer = document.getElementById("lavoraContainer");
  var timeContainer = document.getElementById("timeContainer");
  var aCasaExtraContainer = document.getElementById("aCasaExtraContainer");

  if (selectedRadio.value === "lavora") {
    lavoraContainer.style.opacity = "1";
    timeContainer.style.opacity = "1";
    timeContainer.style.pointerEvents = "auto";

    aCasaExtraContainer.style.opacity = "0.5";
    aCasaExtraContainer.style.pointerEvents = "none";

    var lavoroInputs = document.querySelectorAll("#timeContainer select");
    lavoroInputs.forEach(function (input) {
      input.disabled = false;
    });

    var aCasaInputs = aCasaExtraContainer.querySelectorAll("input, select");
    aCasaInputs.forEach(function (input) {
      input.disabled = true;
    });
  } else if (selectedRadio.value === "aCasa") {
    lavoraContainer.style.opacity = "0.5";
    timeContainer.style.opacity = "0.5";
    timeContainer.style.pointerEvents = "none";

    aCasaExtraContainer.style.opacity = "1";
    aCasaExtraContainer.style.pointerEvents = "auto";

    var lavoroInputs = document.querySelectorAll("#timeContainer select");
    lavoroInputs.forEach(function (input) {
      input.disabled = true;
    });

    var aCasaInputs = aCasaExtraContainer.querySelectorAll("input, select");
    aCasaInputs.forEach(function (input) {
      input.disabled = false;
    });

    // Abilita/disabilita l'input abbreviazione in base alla motivazione
    var motivazione = document.getElementById("aCasaMotivazioni").value;
    var abbrInput = document.getElementById("aCasaAbbr");
    if (motivazione === "nessuna") {
      abbrInput.disabled = true;
      abbrInput.style.opacity = "0.5";
    } else {
      abbrInput.disabled = false;
      abbrInput.style.opacity = "1";
    }
  }
}

// Esporta tutte le funzioni necessarie nell'oggetto window
window.openWarningPopup = openWarningPopup;
window.closeWarningPopup = closeWarningPopup;
window.openManualTimePopup = openManualTimePopup;
window.closeManualTimePopup = closeManualTimePopup;
window.showDateSelection = showDateSelection;
window.openHeaderPopup = openHeaderPopup;
window.openHeaderPopupForEmployee = openHeaderPopupForEmployee;
window.addVariationRowForEmployee = addVariationRowForEmployee;
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

  // Recupera la data dalla riga selezionata
  var dayOfWeek = window.hot.getDataAtCell(window.selectedCell.row, 0);
  var dayOfMonth = window.hot.getDataAtCell(window.selectedCell.row, 1);

  // Crea il popup all'interno dell'overlay con design migliorato
  overlay.innerHTML = ""; // svuota eventuali contenuti
  var popup = document.createElement("div");
  popup.id = "fatturatoPopup";
  popup.className = "custom-popup";
  popup.onclick = function (event) {
    event.stopPropagation();
  };

  popup.innerHTML =
    '<div class="popup-header">' +
    '<i class="fas fa-euro-sign" style="margin-right: 8px;"></i> Inserimento Fatturato' +
    "</div>" +
    '<div style="margin: 15px 0;">' +
    '<p style="margin-bottom: 10px;"><strong>Data:</strong> ' +
    dayOfWeek +
    " " +
    dayOfMonth +
    "</p>" +
    "<div>" +
    '<label for="fatturatoInput">Importo (€)</label>' +
    '<input type="number" id="fatturatoInput" placeholder="Inserisci importo" style="width: 100%; margin-top: 5px;" step="0.01">' +
    "</div>" +
    "</div>" +
    '<div style="text-align: right;">' +
    '<button id="fatturatoResetBtn"><i class="fas fa-undo"></i> Reset</button>' +
    '<button id="fatturatoCancelBtn"><i class="fas fa-times"></i> Annulla</button>' +
    '<button id="fatturatoOkBtn"><i class="fas fa-check"></i> Conferma</button>' +
    "</div>";

  overlay.appendChild(popup);
  overlay.style.display = "flex";

  // Prepopola il campo se la cella ha già un valore
  var currentValue = window.hot.getDataAtCell(
    window.selectedCell.row,
    window.selectedCell.col
  );
  if (currentValue && currentValue.trim() !== "") {
    // Estrae il valore numerico dalla stringa (es. "123,45 €" -> 123.45)
    var numValue = currentValue.replace(/[^\d,]/g, "").replace(",", ".");
    document.getElementById("fatturatoInput").value = numValue;
  }

  document.getElementById("fatturatoOkBtn").onclick = function () {
    var inputVal = document.getElementById("fatturatoInput").value;
    if (inputVal === "" || isNaN(parseFloat(inputVal))) {
      alert("Inserisci un importo valido.");
      return;
    }
    var formatted = parseFloat(inputVal).toFixed(2).replace(".", ",") + " €";
    // Aggiorna la cella selezionata nella colonna Fatturato
    window.hot.setDataAtCell(
      window.selectedCell.row,
      window.selectedCell.col,
      formatted
    );
    // Aggiorna il totale fatturato
    if (typeof window.updateFatturatoTotale === "function") {
      window.updateFatturatoTotale();
    }
    closeFatturatoPopup();
  };

  document.getElementById("fatturatoResetBtn").onclick = function () {
    document.getElementById("fatturatoInput").value = "";
  };

  document.getElementById("fatturatoCancelBtn").onclick = function () {
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
