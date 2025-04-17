// differenzaPrecedente.js - Gestione popup differenza mese precedente

// Funzione per aprire il popup differenza mese precedente
function openDifferenzaPrecedentePopup() {
    // Verifica che esistano le variabili necessarie
    if (typeof window.selectedCell === 'undefined') {
      console.error("La variabile selectedCell non è definita");
      return;
    }
    
    var col = window.selectedCell.col;
    
    // Verifica che la riga e la cella esistano nella tabella
    if (typeof window.hot === 'undefined' || !window.hot.getDataAtCell) {
      console.error("Tabella non disponibile");
      return;
    }
    
    // Ottieni il nome del dipendente (se applicabile)
    var unitInfo = getUnitByCol(col);
    if (!unitInfo || unitInfo.unit.type !== "employee") return;
    
    var pairIndex = unitInfo.unitIndex;
    var empName = window.pairToEmployee[pairIndex];
    
    // Controlla se l'overlay esiste, altrimenti lo crea
    var overlay = document.getElementById("differenzaPrecedenteOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "differenzaPrecedenteOverlay";
      overlay.className = "cellOverlay";
      overlay.onclick = function(event) {
        if (event.target === this) closeDifferenzaPrecedentePopup();
      };
      document.body.appendChild(overlay);
    }
  
    // Ottieni il valore corrente
    var currentValue = window.hot.getDataAtCell(window.diffPrecedenteRowIndex, col);
    var numericValue = "";
    
    if (currentValue && currentValue.trim() !== "") {
      // Converte il valore in formato numerico da visualizzare nell'input
      numericValue = currentValue.toString().replace(",", ".");
    }
    
    // Crea il popup con le opzioni
    var popup = document.createElement("div");
    popup.id = "differenzaPrecedentePopup";
    popup.className = "custom-popup";
    popup.onclick = function(event) {
      event.stopPropagation();
    };
    
    popup.innerHTML = `
      <div class="popup-header">
        <i class="fas fa-exchange-alt" style="margin-right: 8px;"></i> Differenza Mese Precedente: ${empName}
      </div>
      <div style="margin: 15px 0;">
        <p>Inserisci la differenza delle ore dal mese precedente (negativo o positivo):</p>
        <div style="margin-top: 10px;">
          <input type="number" id="differenzaPrecedenteInput" value="${numericValue}" step="0.01" style="width: 100%;" placeholder="Inserisci valore (es. 2.50 o -1.25)">
        </div>
      </div>
      <div style="text-align: right;">
        <button id="differenzaPrecedenteResetBtn"><i class="fas fa-undo"></i> Reset</button>
        <button id="differenzaPrecedenteCancelBtn"><i class="fas fa-times"></i> Annulla</button>
        <button id="differenzaPrecedenteOkBtn"><i class="fas fa-check"></i> Conferma</button>
      </div>
    `;
    
    overlay.innerHTML = '';
    overlay.appendChild(popup);
    overlay.style.display = "flex";
    
    // Focus sull'input
    setTimeout(function() {
      document.getElementById("differenzaPrecedenteInput").focus();
    }, 100);
    
    // Aggiungi listener ai pulsanti
    document.getElementById("differenzaPrecedenteResetBtn").addEventListener("click", function() {
      document.getElementById("differenzaPrecedenteInput").value = "";
    });
    
    document.getElementById("differenzaPrecedenteCancelBtn").addEventListener("click", function() {
      closeDifferenzaPrecedentePopup();
    });
    
    document.getElementById("differenzaPrecedenteOkBtn").addEventListener("click", function() {
      var inputVal = document.getElementById("differenzaPrecedenteInput").value;
      
      // Controlla se il valore è valido
      if (inputVal === "") {
        // Se non c'è input, impostiamo a 0
        inputVal = "0";
      }
      
      var numValue = parseFloat(inputVal);
      if (isNaN(numValue)) {
        alert("Inserisci un valore numerico valido.");
        return;
      }
      
      // Formatta il valore con due decimali e virgola come separatore
      var formattedValue = numValue.toFixed(2).replace(".", ",");
      
      // Aggiorna la cella nella tabella
      window.hot.setDataAtCell(window.diffPrecedenteRowIndex, col, formattedValue);
      
      // Aggiorna anche la colonna accoppiata (inizio + fine)
      if (col % 2 === 0) {
        window.hot.setDataAtCell(window.diffPrecedenteRowIndex, col + 1, formattedValue);
      } else {
        window.hot.setDataAtCell(window.diffPrecedenteRowIndex, col - 1, formattedValue);
      }
      
      // Applica la classe CSS in base al valore (positivo o negativo)
      var cssClass = numValue >= 0 ? "differenza-positiva" : "differenza-negativa";
      window.hot.setCellMeta(window.diffPrecedenteRowIndex, col, "className", cssClass);
      
      if (col % 2 === 0) {
        window.hot.setCellMeta(window.diffPrecedenteRowIndex, col + 1, "className", cssClass);
      } else {
        window.hot.setCellMeta(window.diffPrecedenteRowIndex, col - 1, "className", cssClass);
      }
      
      // Ricalcola i totali
      window.updateTotaleOre();
      
      closeDifferenzaPrecedentePopup();
    });
    
    // Aggiungi listener per il tasto Enter
    document.getElementById("differenzaPrecedenteInput").addEventListener("keyup", function(event) {
      if (event.key === "Enter") {
        document.getElementById("differenzaPrecedenteOkBtn").click();
      }
    });
  }
  
  // Funzione per chiudere il popup
  function closeDifferenzaPrecedentePopup() {
    var overlay = document.getElementById("differenzaPrecedenteOverlay");
    if (overlay) {
      overlay.style.display = "none";
    }
  }
  
  // Funzione helper per ottenere l'unità corrispondente alla colonna
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
  
  // Esponi le funzioni globalmente
  window.openDifferenzaPrecedentePopup = openDifferenzaPrecedentePopup;
  window.closeDifferenzaPrecedentePopup = closeDifferenzaPrecedentePopup;