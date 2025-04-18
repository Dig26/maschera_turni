// super-fast-swap.js - Spostamento colonne estremamente veloce usando DOM manipulation
// Questa soluzione agisce direttamente sul DOM, bypassando completamente le operazioni di Handsontable

(function() {
    console.log("Inizializzazione super-fast-swap...");
    
    // Attiva il patch una volta che la pagina è completamente caricata
    const tryActivate = function() {
      if (document.readyState === 'complete' && window.hot) {
        setTimeout(applySuperFastSwapPatch, 500);
      } else {
        setTimeout(tryActivate, 100);
      }
    };
    
    tryActivate();
    
    function applySuperFastSwapPatch() {
      // Riferimenti agli elementi DOM
      const hotContainer = document.getElementById('hot');
      const dragPreview = document.getElementById('dragPreview');
      const dropIndicator = document.getElementById('dropIndicator');
      
      if (!hotContainer || !window.hot || !dragPreview || !dropIndicator) {
        console.warn("Elementi DOM necessari non trovati, impossibile applicare la patch");
        return;
      }
      
      // Salva riferimenti alle funzioni originali
      window.originalStartDrag = window.startDrag;
      window.originalOnMouseMove = window.onMouseMove;
      window.originalOnMouseUp = window.onMouseUp;
      
      // Sostituisci la funzione di inizio drag
      window.startDrag = function(event, unitIndex) {
        // Imposta lo stato del drag
        window.dragging = true;
        window.dragStartUnitIndex = unitIndex;
        
        // Crea la preview (usa la funzione esistente)
        try {
          dragPreview.innerHTML = '';
          const previewContent = window.buildDragPreview ? 
                                window.buildDragPreview(unitIndex) : 
                                createSimplePreview(unitIndex);
          dragPreview.innerHTML = previewContent;
        } catch (e) {
          console.error("Errore nella creazione preview:", e);
          dragPreview.innerHTML = `<div style="padding:5px;background:white;border:1px solid #ddd">Colonna ${unitIndex+1}</div>`;
        }
        
        // Mostra la preview
        dragPreview.style.display = "block";
        dragPreview.style.left = (event.pageX + 10) + "px";
        dragPreview.style.top = (event.pageY + 10) + "px";
        
        // Aggiungi listener per il movimento e rilascio del mouse
        document.addEventListener("mousemove", superFastMouseMove);
        document.addEventListener("mouseup", superFastMouseUp);
        
        // Previeni comportamento di default
        event.preventDefault();
      };
      
      // Funzione di movimento ottimizzata
      function superFastMouseMove(e) {
        if (!window.dragging) return;
        
        // Aggiorna posizione della preview
        dragPreview.style.left = (e.pageX + 10) + "px";
        dragPreview.style.top = (e.pageY + 10) + "px";
        
        // Mostra l'indicatore di drop
        updateDropIndicator(e);
        
        // Previeni selezione testo
        e.preventDefault();
      }
      
      // Funzione di rilascio super-veloce
      function superFastMouseUp(e) {
        if (!window.dragging) return;
        
        // Nascondi elementi visivi immediatamente
        dragPreview.style.display = "none";
        dropIndicator.style.display = "none";
        
        // Rimuovi event listener
        document.removeEventListener("mousemove", superFastMouseMove);
        document.removeEventListener("mouseup", superFastMouseUp);
        
        // Calcola la nuova posizione
        const newUnitIndex = calculateNewPosition(e);
        
        // Se la posizione non è cambiata, termina
        if (newUnitIndex === window.dragStartUnitIndex) {
          window.dragging = false;
          return;
        }
        
        // Mostra indicatore di spostamento (minimo)
        showMicroIndication("Spostamento...");
        
        // STRATEGIA: Manipolazione diretta del DOM + aggiornamento dei dati interni
        setTimeout(function() {
          try {
            // 1. Manipolazione del DOM per lo spostamento visuale immediato
            performDirectDOMColumnSwap(window.dragStartUnitIndex, newUnitIndex);
            
            // 2. Aggiorna anche l'array interno delle unità 
            const movedUnit = window.columnUnits.splice(window.dragStartUnitIndex, 1)[0];
            window.columnUnits.splice(newUnitIndex, 0, movedUnit);
            
            // 3. Forza un aggiornamento solo dei totali (non dell'intera tabella)
            setTimeout(function() {
              updateSummaryRows();
              hideMicroIndication();
            }, 10);
          } catch (e) {
            console.error("Errore nello spostamento:", e);
            
            // In caso di errore, esegui l'updateSettings standard come fallback
            window.hot.updateSettings({
              columns: window.buildColumnsFromUnits(),
              mergeCells: window.buildMerges()
            });
            
            hideMicroIndication();
          }
          
          // Reimposta lo stato
          window.dragging = false;
        }, 0);
      }
      
      // Aggiorna l'indicatore di drop
      function updateDropIndicator(e) {
        dropIndicator.style.display = "block";
        
        // Calcola altezza tabella
        try {
          const headerCell = window.hot.getCell(0, 2);
          const lastRowCell = window.hot.getCell(window.hot.countRows() - 1, 0);
          
          if (headerCell && lastRowCell) {
            const headerRect = headerCell.getBoundingClientRect();
            const lastRect = lastRowCell.getBoundingClientRect();
            dropIndicator.style.top = headerRect.top + "px";
            dropIndicator.style.height = (lastRect.bottom - headerRect.top) + "px";
          } else {
            const containerRect = hotContainer.getBoundingClientRect();
            dropIndicator.style.top = containerRect.top + "px";
            dropIndicator.style.height = containerRect.height + "px";
          }
        } catch (e) {
          // Fallback
          const containerRect = hotContainer.getBoundingClientRect();
          dropIndicator.style.top = containerRect.top + "px";
          dropIndicator.style.height = containerRect.height + "px";
        }
        
        // Trova posizione orizzontale
        for (let i = 0; i < window.columnUnits.length; i++) {
          const rect = window.getUnitRect ? window.getUnitRect(i) : getColumnRect(i);
          if (!rect) continue;
          
          const centerX = (rect.left + rect.right) / 2;
          if (e.clientX < centerX) {
            dropIndicator.style.left = rect.left + "px";
            break;
          }
          
          // Se siamo oltre l'ultima colonna
          if (i === window.columnUnits.length - 1) {
            dropIndicator.style.left = rect.right + "px";
          }
        }
      }
      
      // Calcola la nuova posizione per la colonna trascinata
      function calculateNewPosition(e) {
        let newUnitIndex = null;
        
        for (let i = 0; i < window.columnUnits.length; i++) {
          const rect = window.getUnitRect ? window.getUnitRect(i) : getColumnRect(i);
          if (!rect) continue;
          
          const centerX = (rect.left + rect.right) / 2;
          if (e.clientX < centerX) {
            newUnitIndex = i;
            break;
          }
        }
        
        if (newUnitIndex === null) {
          newUnitIndex = window.columnUnits.length;
        }
        
        if (newUnitIndex > window.dragStartUnitIndex) {
          newUnitIndex = newUnitIndex - 1;
        }
        
        return newUnitIndex;
      }
      
      // Funzione per ottenere il rettangolo di una colonna
      function getColumnRect(unitIndex) {
        try {
          const startCol = window.getUnitStartIndex(unitIndex);
          const width = window.getUnitWidth(window.columnUnits[unitIndex]);
          const firstCell = window.hot.getCell(0, startCol);
          const lastCell = window.hot.getCell(0, startCol + width - 1);
          
          if (firstCell && lastCell) {
            const firstRect = firstCell.getBoundingClientRect();
            const lastRect = lastCell.getBoundingClientRect();
            return {
              left: firstRect.left,
              right: lastRect.right
            };
          }
        } catch (e) {
          console.warn("Errore nel calcolo del rettangolo:", e);
        }
        
        return null;
      }
      
      // Preview semplificata nel caso quella originale non sia disponibile
      function createSimplePreview(unitIndex) {
        const unit = window.columnUnits[unitIndex];
        let html = '<table style="border-collapse:collapse;width:100%;background:white;border:2px solid #3498db">';
        
        // Header
        html += '<tr><td style="padding:5px;border:1px solid #ddd;font-weight:bold;background:#f5f5f5;text-align:center">';
        if (unit.type === "employee") {
          html += window.pairToEmployee[unitIndex] || 'Dipendente';
        } else if (unit.type === "fatturato") {
          html += 'Fatturato';
        } else if (unit.type === "particolarita") {
          html += 'Particolarità';
        }
        html += '</td></tr>';
        
        // Contenuto semplificato
        for (let i = 0; i < 5; i++) { // Solo alcune righe
          html += '<tr><td style="padding:5px;border:1px solid #ddd;text-align:center">...</td></tr>';
        }
        
        html += '</table>';
        return html;
      }
      
      // Manipolazione diretta del DOM per lo spostamento delle colonne
      function performDirectDOMColumnSwap(fromIndex, toIndex) {
        // Ottieni le colonne effettive dal DOM
        const tableElement = hotContainer.querySelector('.htCore');
        if (!tableElement) throw new Error("Tabella non trovata nel DOM");
        
        // Calcola gli indici delle colonne nel DOM
        const fromColStart = window.getUnitStartIndex(fromIndex);
        const fromColWidth = window.getUnitWidth(window.columnUnits[fromIndex]);
        const toColStart = window.getUnitStartIndex(toIndex);
        
        // Ottieni tutte le righe della tabella
        const rows = tableElement.querySelectorAll('tbody tr');
        
        // Per ogni riga della tabella
        for (let i = 0; i < rows.length; i++) {
          const cells = rows[i].querySelectorAll('td');
          
          // Ottieni le celle da spostare
          const cellsToMove = [];
          for (let j = 0; j < fromColWidth; j++) {
            if (fromColStart + j < cells.length) {
              cellsToMove.push(cells[fromColStart + j]);
            }
          }
          
          // Rimuovi le celle dalla loro posizione originale
          for (let cell of cellsToMove) {
            if (cell.parentNode) {
              cell.parentNode.removeChild(cell);
            }
          }
          
          // Inserisci le celle nella nuova posizione
          let insertBeforeCell = null;
          
          if (toColStart < cells.length) {
            // Se la colonna di destinazione esiste, inserisci prima di quella
            insertBeforeCell = cells[toColStart];
          }
          
          // Inserisci le celle
          for (let cell of cellsToMove) {
            if (insertBeforeCell) {
              rows[i].insertBefore(cell, insertBeforeCell);
            } else {
              rows[i].appendChild(cell);
            }
          }
        }
      }
      
      // Aggiorna solo le righe di riepilogo (totali)
      function updateSummaryRows() {
        if (typeof window.updateTotaleOre === 'function') window.updateTotaleOre();
        if (typeof window.updateOrePagate === 'function') window.updateOrePagate();
        if (typeof window.updateFatturatoTotale === 'function') window.updateFatturatoTotale();
        if (typeof window.updateDifferenzeCorrente === 'function') window.updateDifferenzeCorrente();
      }
      
      // Mostra un mini-indicatore non intrusivo
      function showMicroIndication(text) {
        let indicator = document.getElementById('micro-swap-indicator');
        
        if (!indicator) {
          indicator = document.createElement('div');
          indicator.id = 'micro-swap-indicator';
          indicator.style.position = 'fixed';
          indicator.style.bottom = '10px';
          indicator.style.right = '10px';
          indicator.style.background = '#3498db';
          indicator.style.color = 'white';
          indicator.style.padding = '4px 8px';
          indicator.style.borderRadius = '3px';
          indicator.style.fontSize = '12px';
          indicator.style.zIndex = '9999';
          indicator.style.opacity = '0.8';
          document.body.appendChild(indicator);
        }
        
        indicator.textContent = text;
        indicator.style.display = 'block';
      }
      
      // Nascondi l'indicatore
      function hideMicroIndication() {
        const indicator = document.getElementById('micro-swap-indicator');
        if (indicator) {
          indicator.style.display = 'none';
        }
      }
      
      console.log("Patch super-veloce applicata con successo!");
      
      // Sostituisci le funzioni originali
      window.onMouseMove = superFastMouseMove;
      window.onMouseUp = superFastMouseUp;
    }
    
    // Handler per DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(applySuperFastSwapPatch, 500);
      });
    } else {
      setTimeout(applySuperFastSwapPatch, 500);
    }
  })();