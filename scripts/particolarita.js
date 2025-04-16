// particolarita.js - Gestione delle particolarità

// Lista delle particolarità disponibili (nome, descrizione, sigla)
window.particolaritaList = [
    { nome: "Turno notturno", descrizione: "Lavoro svolto durante le ore notturne (22:00-06:00)", sigla: "TN" },
    { nome: "Straordinario", descrizione: "Ore di lavoro eccedenti l'orario normale", sigla: "STR" },
    { nome: "Reperibilità", descrizione: "Disponibilità al di fuori dell'orario di lavoro", sigla: "REP" },
    { nome: "Festivo", descrizione: "Lavoro svolto durante un giorno festivo", sigla: "FES" },
    { nome: "Smart working", descrizione: "Lavoro svolto da remoto", sigla: "SW" },
    { nome: "Trasferta", descrizione: "Spostamento per lavoro fuori dalla sede abituale", sigla: "TR" },
    { nome: "Formazione", descrizione: "Partecipazione a corsi di formazione", sigla: "FOR" },
    { nome: "Riunione", descrizione: "Partecipazione a riunioni aziendali", sigla: "RIU" },
    { nome: "Cliente esterno", descrizione: "Lavoro presso sede del cliente", sigla: "CLE" },
    { nome: "Malattia", descrizione: "Assenza per malattia", sigla: "MAL" },
    { nome: "Permesso", descrizione: "Permesso retribuito", sigla: "PER" },
    { nome: "Congedo parentale", descrizione: "Assenza per cura dei figli", sigla: "CP" },
    { nome: "Sciopero", descrizione: "Assenza per adesione a sciopero", sigla: "SCI" },
    { nome: "Assemblea", descrizione: "Partecipazione ad assemblea sindacale", sigla: "ASS" },
    { nome: "Aspettativa", descrizione: "Periodo di aspettativa non retribuita", sigla: "ASP" },
    { nome: "Infortunio", descrizione: "Assenza per infortunio sul lavoro", sigla: "INF" },
    { nome: "Servizi esterni", descrizione: "Attività di servizio esterno", sigla: "SE" },
    { nome: "Corso sicurezza", descrizione: "Formazione obbligatoria sulla sicurezza", sigla: "CS" },
    { nome: "Turno festivo", descrizione: "Turno svolto in giorno festivo", sigla: "TF" },
    { nome: "Maternità", descrizione: "Congedo di maternità", sigla: "MAT" },
    { nome: "Paternità", descrizione: "Congedo di paternità", sigla: "PAT" },
    { nome: "Ferie solidali", descrizione: "Ferie donate ad altri dipendenti", sigla: "FS" },
    { nome: "Allattamento", descrizione: "Permesso per allattamento", sigla: "ALL" },
    { nome: "Visita medica", descrizione: "Assenza per visita medica", sigla: "VM" },
    { nome: "Donazione sangue", descrizione: "Assenza per donazione sangue", sigla: "DS" }
  ];
  
  // Funzione per aprire il popup delle particolarità
  function openParticolaritaPopup() {
    // Verifica che esistano le variabili necessarie
    if (typeof window.selectedCell === 'undefined') {
      console.error("La variabile selectedCell non è definita");
      return;
    }
    
    var row = window.selectedCell.row;
    var col = window.selectedCell.col;
    
    // Verifica che la riga e la cella esistano nella tabella
    if (typeof window.hot === 'undefined' || !window.hot.getDataAtCell) {
      console.error("Tabella non disponibile");
      return;
    }
    
    var dayOfWeek = window.hot.getDataAtCell(row, 0);
    var dayOfMonth = window.hot.getDataAtCell(row, 1);
    
    // Ottieni il nome del dipendente se applicabile
    var pairIndex = -1;
    var empName = '';
    
    // Trova l'unità corrispondente alla colonna selezionata
    for (var i = 0; i < window.columnUnits.length; i++) {
      var unit = window.columnUnits[i];
      var startCol = getUnitStartIndex(i);
      var width = getUnitWidth(unit);
      
      if (col >= startCol && col < startCol + width) {
        if (unit.type === "particolarita") {
          // Trovato!
          break;
        } else if (unit.type === "employee") {
          pairIndex = i;
          empName = window.pairToEmployee[pairIndex];
          break;
        }
      }
    }
  
    // Controlla se l'overlay esiste, altrimenti lo crea
    var overlay = document.getElementById("particolaritaOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "particolaritaOverlay";
      overlay.className = "cellOverlay";
      overlay.onclick = function(event) {
        if (event.target === this) closeParticolaritaPopup();
      };
      document.body.appendChild(overlay);
    }
    
    // Crea il popup
    var headerText = empName ? empName + ": " + dayOfWeek + " " + dayOfMonth : dayOfWeek + " " + dayOfMonth;
    
    var popup = document.createElement("div");
    popup.id = "particolaritaPopup";
    popup.className = "custom-popup particolarita-popup";
    popup.onclick = function(event) {
      event.stopPropagation();
    };
    
    // Costruisci l'HTML del popup
    popup.innerHTML = `
      <div class="popup-header">
        <i class="fas fa-tag" style="margin-right: 8px;"></i> Particolarità: ${headerText}
      </div>
      <div class="particolarita-search">
        <input type="text" id="particolaritaSearchInput" placeholder="Cerca particolarità..." />
      </div>
      <div class="particolarita-list" id="particolaritaList">
        ${renderParticolaritaListItems()}
      </div>
      <div style="margin-top: 15px; text-align: right;">
        <button id="particolaritaResetBtn"><i class="fas fa-undo"></i> Reset</button>
        <button id="particolaritaCancelBtn"><i class="fas fa-times"></i> Annulla</button>
        <button id="particolaritaOkBtn"><i class="fas fa-check"></i> Conferma</button>
      </div>
    `;
    
    overlay.innerHTML = '';
    overlay.appendChild(popup);
    overlay.style.display = "flex";
    
    // Recupera le particolarità già selezionate
    var currentValue = window.hot.getDataAtCell(window.selectedCell.row, window.selectedCell.col);
    var selectedSigle = [];
    
    if (currentValue && currentValue.trim() !== "") {
      selectedSigle = currentValue.split("+").map(function(sigla) {
        return sigla.trim();
      });
      
      // Seleziona le checkbox corrispondenti
      setTimeout(function() {
        selectedSigle.forEach(function(sigla) {
          var checkbox = document.querySelector(`.particolarita-item input[data-sigla="${sigla}"]`);
          if (checkbox) {
            checkbox.checked = true;
          }
        });
      }, 50);
    }
    
    // Aggiungi i listener
    setTimeout(function() {
      document.getElementById("particolaritaSearchInput").addEventListener("input", filterParticolarita);
      document.getElementById("particolaritaResetBtn").addEventListener("click", function() {
        // Deseleziona tutte le checkbox
        document.querySelectorAll('#particolaritaList input[type="checkbox"]').forEach(function(checkbox) {
          checkbox.checked = false;
        });
      });
      
      document.getElementById("particolaritaCancelBtn").addEventListener("click", closeParticolaritaPopup);
      document.getElementById("particolaritaOkBtn").addEventListener("click", function() {
        // Raccogli tutte le particolarità selezionate
        var checkedItems = document.querySelectorAll('#particolaritaList input[type="checkbox"]:checked');
        var selectedParticolarita = Array.from(checkedItems).map(function(checkbox) {
          return checkbox.getAttribute('data-sigla');
        });
        
        // Imposta il valore nella cella
        var cellValue = selectedParticolarita.length > 0 ? selectedParticolarita.join("+") : "";
        window.hot.setDataAtCell(window.selectedCell.row, window.selectedCell.col, cellValue);
        
        closeParticolaritaPopup();
      });
    }, 100);
  }
  
  // Funzione per renderizzare la lista delle particolarità
  function renderParticolaritaListItems() {
    var html = '';
    window.particolaritaList.forEach(function(item, index) {
      html += `
        <div class="particolarita-item">
          <label>
            <input type="checkbox" data-sigla="${item.sigla}" data-index="${index}" />
            <span class="particolarita-nome">${item.nome}</span>
            <span class="particolarita-descrizione">${item.descrizione}</span>
            <span class="particolarita-sigla">${item.sigla}</span>
          </label>
        </div>
      `;
    });
    return html;
  }
  
  // Funzione per filtrare le particolarità in base alla ricerca
  function filterParticolarita() {
    var searchText = document.getElementById("particolaritaSearchInput").value.toLowerCase();
    var items = document.querySelectorAll('.particolarita-item');
    
    items.forEach(function(item) {
      var nome = item.querySelector('.particolarita-nome').textContent.toLowerCase();
      var descrizione = item.querySelector('.particolarita-descrizione').textContent.toLowerCase();
      var sigla = item.querySelector('.particolarita-sigla').textContent.toLowerCase();
      
      if (nome.includes(searchText) || descrizione.includes(searchText) || sigla.includes(searchText)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }
  
  // Funzione per chiudere il popup
  function closeParticolaritaPopup() {
    var overlay = document.getElementById("particolaritaOverlay");
    if (overlay) {
      overlay.style.display = "none";
    }
  }
  
  // Esponi le funzioni globalmente
  window.openParticolaritaPopup = openParticolaritaPopup;
  window.closeParticolaritaPopup = closeParticolaritaPopup;