document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("dark-mode");
    const appContainer = document.getElementById("app");
    new MainApp(appContainer);
    
    // Add dark mode toggle handler from the info modal.
    const darkModeToggle = document.getElementById("darkModeToggle");
    if (darkModeToggle) {
      darkModeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        // Use the stored instance to redraw the board.
        if (GameApp.instance) {
          GameApp.instance.drawBoard();
          GameApp.instance.drawPieces();
          
        }
      });
    }
  });
  

  // Global Sound and Text-to-Speech helper functions.
  function playSound(soundFile) {
    const audio = new Audio(soundFile);
    audio.play().catch(err => console.error("Error playing sound:", err));
  }
  
  function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  }
  
  // Global helper to determine if point B lies on the straight line between A and C.
  function isCollinearAndBetween(A, B, C, tol = 10) {
    const cross = Math.abs((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]));
    if (cross > tol) return false;
    const dAB = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const dBC = Math.hypot(C[0] - B[0], C[1] - B[1]);
    const dAC = Math.hypot(C[0] - A[0], C[1] - A[1]);
    return Math.abs(dAB + dBC - dAC) < tol;
  }
  
  // Helper to rotate a point (x, y) about center (cx, cy) by a given angle (radians)
  function rotatePoint(x, y, angle, cx, cy) {
    const tx = x - cx;
    const ty = y - cy;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const rx = tx * cosA - ty * sinA + cx;
    const ry = tx * sinA + ty * cosA + cy;
    return [rx, ry];
  }
  // --- Part 2: InfoModal and StartScreen Classes ---

class InfoModal {
    constructor(resetCallback) {
      this.modal = document.getElementById("infoModal");
      this.closeBtn = document.getElementById("closeModal");
      this.resetBtn = document.getElementById("resetGameBtn");
      this.resetCallback = resetCallback;
      this.init();
    }
    
    init() {
      this.closeBtn.onclick = () => this.hide();
      if (this.resetCallback) {
        this.resetBtn.style.display = "block";
        this.resetBtn.onclick = () => {
          if (confirm("Are you sure you want to reset the game?")) {
            this.resetCallback();
            this.hide();
          }
        };
      } else {
        this.resetBtn.style.display = "none";
      }

      // Assuming your GameApp instance is stored in GameApp.instance (see previous example)
      const modalRotationToggle = document.getElementById("modalRotationToggle");
      if (modalRotationToggle) {
    // Set the checkbox based on the current game setting
      modalRotationToggle.checked = GameApp.instance ? GameApp.instance.enableRotation : false;
    
      modalRotationToggle.addEventListener("change", (e) => {
          if (GameApp.instance) {
          GameApp.instance.enableRotation = e.target.checked;
          // Optionally, redraw the board to immediately reflect the change.
          GameApp.instance.drawBoard();
          // You might also want to update pieces if needed.
          GameApp.instance.drawPieces();
          }
       });
      }

    }
    
    show() {
      this.modal.style.display = "block";
    }
    
    hide() {
        this.modal.style.display = "none";
        
        if (GameApp.instance && GameApp.instance.enableRotation) {
          const game = GameApp.instance;
          const currentPlayer = game.players[game.currentPlayerIndex];
          let mapping = {};
          if (game.totalPlayers === 3) {
            mapping = { 'B': -Math.PI / 2 + 0.5, 'R': Math.PI / 2 - 0.5, 'T': Math.PI };
          } else {
            mapping = { 'T': Math.PI, 'B': 0, 'R': Math.PI / 2, 'L': 3 * Math.PI / 2 };
          }
          // Get the target angle for the current player
          const targetAngle = mapping[currentPlayer.area] || 0;
          
          // Instantly set the rotation without animation
          game.rotationAngle = targetAngle;
          game.boardRotation = targetAngle;  // Update if you're tracking this separately.
          
          // Redraw the board and pieces with the new rotation
          game.drawBoard();
          game.drawPieces();
        }
      
    }
  }
  
  class StartScreen {
    constructor(container, startCallback) {
      this.container = container;
      this.startCallback = startCallback;
      // Default colors to ensure unique selection per player.
      this.defaultColors = ['blue', 'red', 'green', 'orange', 'purple', 'yellow'];
      // Allowed colors.
      this.allowedColors = ['blue', 'red', 'green', 'orange', 'purple', 'yellow', 'pink', 'cyan', 'magenta'];
      this.renderInitialScreen();
    }
    
    renderInitialScreen() {
      this.container.innerHTML = `
        <div class="start-screen">
          <h2 style="font-size: 28px; font-weight: bold;">☸ CHAKRA ☸</h2>
          <label style="font-size: 18px;">Total Number of Players (2-4):</label>
          <select id="totalPlayers" style="font-size: 18px; padding: 8px;">
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
          <br><br>
          <label style="font-size: 18px;">Number of Human Players:</label>
          <select id="humanPlayers" style="font-size: 18px; padding: 8px;">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
          <br><br>
          <label style="font-size: 18px;">\n          <input type="checkbox" id="enableRotation">\n          Enable Board Rotation\n        </label>\n        <br><br>\n        <button id="nextBtn" class="btn next-btn">Next</button>\n        <button id="infoBtn" class="btn info-btn">☸ Info</button>\n      </div>\n    `;
      document.getElementById("nextBtn").onclick = () => this.renderPlayerDetailsScreen();
      document.getElementById("infoBtn").onclick = () => {
        const infoModal = new InfoModal(null);
        infoModal.show();
      };
    }
    
    renderPlayerDetailsScreen() {
      const totalPlayers = parseInt(document.getElementById("totalPlayers").value);
      const humanPlayers = parseInt(document.getElementById("humanPlayers").value);
      this.enableRotation = document.getElementById("enableRotation").checked;
      
      let html = `<div class="player-details">
        <h2 style="font-size: 28px; font-weight: bold;">Enter Player Details</h2>
        <form id="playerForm">`;
      for (let i = 0; i < totalPlayers; i++) {
        const type = i < humanPlayers ? "Human*.*" : "Computer";
        const defaultColor = this.defaultColors[i] || this.allowedColors[0];
        html += `
          <div style="margin-bottom: 10px;">
            <label style="font-size: 18px;">Player ${i+1} (${type}) :</label>
            <input type="text" name="playerName${i}" value="Player ${i+1}" required style="font-size: 18px; padding: 6px;">
            <label style="font-size: 18px;"> :</label>
            <select name="playerColor${i}" class="color-select" style="font-size: 18px; padding: 6px;">`;
        for (let color of this.allowedColors) {
          html += `<option value="${color}" style="background-color:${color};" ${color === defaultColor ? 'selected' : ''}>${color}</option>`;
        }
        html += `</select>
          </div>`;
      }
      html += `<button type="submit" class="btn next-btn">Start Game</button>
        </form>
      </div>`;
      
      this.container.innerHTML = html;
      
      // Update color select backgrounds on change.
      const selects = this.container.querySelectorAll(".color-select");
      selects.forEach(select => {
        select.addEventListener("change", function() {
          this.style.backgroundColor = this.value;
        });
        select.style.backgroundColor = select.value;
      });
      
      document.getElementById("playerForm").onsubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        let playerNames = [];
        let playerColors = [];
        for (let i = 0; i < totalPlayers; i++) {
          playerNames.push(formData.get(`playerName${i}`));
          playerColors.push(formData.get(`playerColor${i}`));
        }
        this.startCallback(totalPlayers, humanPlayers, playerNames, playerColors, this.enableRotation);
      };
    }
  }
// --- Part 3: GameApp and MainApp Classes with Mobile & Dark Mode Enhancements ---

class GameApp {
    
    constructor(container, totalPlayers, humanPlayers, playerNames, playerColors, enableRotation, resetCallback) {
      GameApp.instance = this;
      this.container = container;
      this.totalPlayers = totalPlayers;
      this.humanPlayers = humanPlayers;
      this.playerNames = playerNames;
      this.playerColors = playerColors;
      this.enableRotation = enableRotation;
      this.resetCallback = resetCallback;
      this.players = [];
      this.currentPlayerIndex = 0;
      this.selectedNode = null;
      this.gameOver = false;
      this.rotationAngle = 0;
      this.nodePositions = {};
      this.graph = {};
      this.boardState = {};
      this.canvas = null;
      this.ctx = null;
      this.scoreDisplay = null;
      this.turnLabelDiv = null;
      this.init();
    }
    
    init() {
      this.setupPlayers();
      this.createBoardData();
      this.renderGameUI();
      this.updateScoreDisplay();
      this.drawBoard();
      this.drawPieces();
      this.nextTurn();
    }
    
    setupPlayers() {
      let areas, targets;
      if (this.totalPlayers === 2) {
        areas = ['T', 'B'];
        targets = { 'T': 'B', 'B': 'T' };
      } else if (this.totalPlayers === 3) {
        areas = ['T', 'R', 'B'];
        targets = { 'T': 'B', 'R': 'T', 'B': 'T' };
      } else {
        areas = ['T', 'R', 'B', 'L'];
        targets = { 'T': 'B', 'R': 'L', 'B': 'T', 'L': 'R' };
      }
      for (let i = 0; i < this.totalPlayers; i++) {
        let type = (i < this.humanPlayers) ? 'human' : 'computer';
        this.players.push({
          id: i,
          name: this.playerNames[i],
          type: type,
          color: this.playerColors[i],
          area: areas[i],
          target: targets[areas[i]],
          score: 0,
          difficulty: "easy"
        });
      }
    }
    
    createBoardData() {
        const initGraph = () => { this.graph = {}; Object.keys(this.nodePositions).forEach(n => this.graph[n] = []); },
              initBoardState = () => { this.boardState = {}; Object.keys(this.nodePositions).forEach(n => this.boardState[n] = null); },
              addConn = (a, b) => { this.graph[a].push(b); this.graph[b].push(a); };
      
        if(this.totalPlayers === 2) {
          this.nodePositions = {
            T1: [220,200], T2: [300,200], T3: [380,200],
            T4: [260,250], T5: [300,250], T6: [340,250],
            B1: [220,400], B2: [300,400], B3: [380,400],
            B4: [260,350], B5: [300,350], B6: [340,350],
            G:  [300,300]
          };
          initGraph();
          [['T1','T2'], ['T1','T4'], ['T2','T3'], ['T2','T5'], ['T3','T6'], ['T4','T5'], ['T5','T6']]
            .forEach(pair => addConn(pair[0], pair[1]));
          [['B1','B2'], ['B1','B4'], ['B2','B3'], ['B2','B5'], ['B3','B6'], ['B4','B5'], ['B5','B6']]
            .forEach(pair => addConn(pair[0], pair[1]));
          ['T4','T5','T6','B4','B5','B6'].forEach(n => addConn(n, 'G'));
          initBoardState();
          ['T1','T2','T3','T4','T5','T6'].forEach(n => this.boardState[n] = { player: 0, color: this.players[0].color });
          ['B1','B2','B3','B4','B5','B6'].forEach(n => this.boardState[n] = { player: 1, color: this.players[1].color });
          
        } else if(this.totalPlayers === 3) {
          const mid = (p1, p2) => [(p1[0]+p2[0])/2, (p1[1]+p2[1])/2];
          this.nodePositions = {
            I1: [300,450], I2: [170,225], I3: [430,225],
            B7: [(300+170)/2, (450+225)/2],
            T7: [(170+430)/2, (225+225)/2],
            R7: [(430+300)/2, (225+450)/2],
            T1: [240,121.08], T2: [300,121.08], T3: [360,121.08],
            T4: [270,173.04], T6: [330,173.04],
            R1: [485,337.5], R2: [455,389.46], R3: [425,441.42],
            R4: [425,337.5], R6: [395,389.46],
            B1: [175,441.42], B2: [145,389.46], B3: [115,337.5],
            B4: [205,389.46], B6: [175,337.5]
          };
          this.nodePositions.T5 = mid(this.nodePositions.T4, this.nodePositions.T6);
          this.nodePositions.R5 = mid(this.nodePositions.R4, this.nodePositions.R6);
          this.nodePositions.B5 = mid(this.nodePositions.B4, this.nodePositions.B6);
          this.graph = {
            I1: ['B7','R7'], I2: ['B7','T7'], I3: ['T7','R7'],
            B7: ['I1','I2','B4','B5','B6'], T7: ['I2','I3','T4','T5','T6'],
            R7: ['I3','I1','R4','R5','R6'],
            T1: ['T2','T4'], T2: ['T1','T3','T5'], T3: ['T2','T6'],
            T4: ['T1','T5','T7'], T5: ['T2','T4','T6','T7'], T6: ['T3','T5','T7'],
            R1: ['R2','R4'], R2: ['R1','R3','R5'], R3: ['R2','R6'],
            R4: ['R1','R5','R7'], R5: ['R2','R4','R6','R7'], R6: ['R3','R5','R7'],
            B1: ['B2','B4'], B2: ['B1','B3','B5'], B3: ['B2','B6'],
            B4: ['B1','B5','B7'], B5: ['B2','B4','B6','B7'], B6: ['B3','B5','B7']
          };
          addConn('T7','B7'); addConn('T7','R7'); addConn('B7','R7');
          initBoardState();
          const starts = { T: ['T1','T2','T3','T4','T5','T6','T7'],
                           R: ['R1','R2','R3','R4','R5','R6','R7'],
                           B: ['B1','B2','B3','B4','B5','B6','B7'] };
          this.players.forEach(p => starts[p.area].forEach(n => this.boardState[n] = { player: p.id, color: p.color }));
          
        } else if(this.totalPlayers === 4) {
          this.nodePositions = Object.assign({}, {
            I1: [130,130], I2: [470,130], I3: [470,470], I4: [130,470],
            T7: [300,130], R7: [470,300], B7: [300,470], L7: [130,300]
          });
          Object.keys(this.nodePositions).forEach(n => this.graph[n] = []);
          addConn('I1','T7'); addConn('I1','L7');
          addConn('I2','T7'); addConn('I2','R7');
          addConn('I3','R7'); addConn('I3','B7');
          addConn('I4','B7'); addConn('I4','L7');
          addConn('T7','R7'); addConn('R7','B7'); addConn('B7','L7'); addConn('L7','T7');
          const topCoords = { T1: [220,50], T2: [300,50], T3: [380,50], T4: [260,90], T5: [300,90], T6: [340,90], T7: this.nodePositions.T7 },
                transform = (coords, prefix, fn) => {
                  const res = {}; for(let label in coords) res[label.replace('T', prefix)] = fn(coords[label]);
                  return res;
                },
                toRight = pos => { let dx = pos[0]-300, dy = pos[1]-130; return [470-dy,300+dx]; },
                toBottom = pos => { let dx = pos[0]-300, dy = pos[1]-130; return [300-dx,470-dy]; },
                toLeft = pos => { let dx = pos[0]-300, dy = pos[1]-130; return [130+dy,300-dx]; },
                rightCoords = transform(topCoords, 'R', toRight),
                bottomCoords = transform(topCoords, 'B', toBottom),
                leftCoords = transform(topCoords, 'L', toLeft);
          [topCoords, rightCoords, bottomCoords, leftCoords].forEach(area => {
            Object.entries(area).forEach(([n, pos]) => { this.nodePositions[n] = pos; this.graph[n] = this.graph[n] || []; });
          });
          const addAreaEdges = prefix => {
            for(let i = 1; i <= 7; i++) this.graph[prefix+i] = this.graph[prefix+i] || [];
            [['1','2'], ['2','3'], ['1','4'], ['2','5'], ['3','6'], ['4','5'], ['5','6'], ['4','7'], ['5','7'], ['6','7']]
              .forEach(pair => addConn(prefix+pair[0], prefix+pair[1]));
          };
          ['T','R','B','L'].forEach(addAreaEdges);
          initBoardState();
          const starts = { T: ['T1','T2','T3','T4','T5','T6','T7'],
                           R: ['R1','R2','R3','R4','R5','R6','R7'],
                           B: ['B1','B2','B3','B4','B5','B6','B7'],
                           L: ['L1','L2','L3','L4','L5','L6','L7'] };
          this.players.forEach(p => starts[p.area].forEach(n => this.boardState[n] = { player: p.id, color: p.color }));
        }
      }
      
    
    renderGameUI() {
        const scoreFontSize = (this.totalPlayers === 4) ? "16px" : "20px";
        this.container.innerHTML = `
          <div id="scoreDisplay" style="font-size: ${scoreFontSize}; margin-bottom: 10px;"></div>
          <canvas id="gameCanvas" width="600" height="600"></canvas>
          <div id="gameControls" style="margin-top: 10px; display: flex; align-items: center; gap: 10px;"> 
            <button id="infoButton" class="btn info-btn">☸ Info</button>
            <button id="resetButton" class="btn reset-btn">Reset</button>
            <div id="turnLabel" style="font-size: 28px; font-weight: bold; margin-left: 30px;"></div>
          </div>
        `;
      

      this.canvas = document.getElementById("gameCanvas");
      this.ctx = this.canvas.getContext("2d");
      this.scoreDisplay = document.getElementById("scoreDisplay");
      this.turnLabelDiv = document.getElementById("turnLabel");
      
      // Support both click and touch events for mobile.
      this.canvas.addEventListener("click", (e) => this.onCanvasClick(e));
      this.canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this.onCanvasClick({ clientX: touch.clientX, clientY: touch.clientY, target: e.target });
      });
      
      document.getElementById("infoButton").onclick = () => {
        const infoModal = new InfoModal(() => this.resetGame());
        infoModal.show();
      };
      document.getElementById("resetButton").onclick = () => {
        if (confirm("Reset game?")) this.resetGame();
      };
    }
    
    resetGame() {
      if (this.resetCallback) {
        this.resetCallback();
      }
    }


    updateScoreDisplay() {
        // Choose a smaller font size if there are 4 players.
        const fontSize = (this.players.length === 4) ? "18px" : "22px";
        
        let scoreHTML = `<strong style="font-size: ${fontSize};">Scores:</strong> `;
        this.players.forEach(p => {
          scoreHTML += `<span style="color: ${p.color}; margin-right: 10px; font-size: ${fontSize};">
                          ${p.name}: ${p.score}
                        </span>`;
        });
        this.scoreDisplay.innerHTML = scoreHTML;
      }
      
    getRotatedPosition(node) {
      let pos = this.nodePositions[node];
      if (!this.enableRotation) return pos;
      return rotatePoint(pos[0], pos[1], this.rotationAngle, 300, 300);
    }
    
    drawBoard() {
      const darkModeActive = document.body.classList.contains("dark-mode");
      // Clear canvas and set background based on dark mode.
      if (darkModeActive) {
        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = "#fff";
      } else {
        this.ctx.fillStyle = "#fff";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = "black";
      }
      
      this.ctx.lineWidth = 2;
      let drawn = new Set();
      for (let node in this.graph) {
        this.graph[node].forEach(neighbor => {
          let pair = [node, neighbor].sort().join("-");
          if (drawn.has(pair)) return;
          drawn.add(pair);
          let pos1 = this.getRotatedPosition(node);
          let pos2 = this.getRotatedPosition(neighbor);
          this.ctx.beginPath();
          this.ctx.moveTo(pos1[0], pos1[1]);
          this.ctx.lineTo(pos2[0], pos2[1]);
          this.ctx.stroke();
        });
      }
      for (let node in this.nodePositions) {
        let pos = this.getRotatedPosition(node);
        this.ctx.beginPath();
        this.ctx.arc(pos[0], pos[1], 5, 0, 2 * Math.PI);
        this.ctx.fillStyle = darkModeActive ? "#555" : "white";
        this.ctx.fill();
        this.ctx.strokeStyle = darkModeActive ? "#fff" : "black";
        this.ctx.stroke();
        // Draw node labels with increased font size for accessibility.
        this.ctx.fillStyle = darkModeActive ? "#fff" : "gray";
        this.ctx.font = "14px Arial";
        this.ctx.fillText(node, pos[0] - 12, pos[1] - 12);
      }
    }
    
    drawPieces() {
      const darkModeActive = document.body.classList.contains("dark-mode");
      for (let node in this.boardState) {
        if (this.boardState[node]) {
          let pos = this.getRotatedPosition(node);
          this.ctx.beginPath();
          this.ctx.arc(pos[0], pos[1], 12, 0, 2 * Math.PI);
          this.ctx.fillStyle = this.boardState[node].color;
          this.ctx.fill();
          this.ctx.strokeStyle = darkModeActive ? "#fff" : "black";
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
          if (this.selectedNode === node) {
            this.ctx.beginPath();
            this.ctx.arc(pos[0], pos[1], 15, 0, 2 * Math.PI);
            this.ctx.strokeStyle = "yellow";
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
          }
        }
      }
    }
    
    getNodeAtPosition(x, y) {
      for (let node in this.nodePositions) {
        let pos = this.getRotatedPosition(node);
        if ((x - pos[0]) ** 2 + (y - pos[1]) ** 2 <= 15 ** 2) {
          return node;
        }
      }
      return null;
    }
    
    onCanvasClick(event) {
      if (this.gameOver) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const clickedNode = this.getNodeAtPosition(x, y);
      if (!clickedNode) return;
      
      const currentPlayer = this.players[this.currentPlayerIndex];
      if (currentPlayer.type !== "human") return;
      
      if (this.selectedNode === null) {
        let piece = this.boardState[clickedNode];
        if (piece && piece.player === currentPlayer.id) {
          this.selectedNode = clickedNode;
          this.drawPieces();
          this.highlightValidMoves(clickedNode);
        }
      } else {
        if (this.boardState[clickedNode] === null) {
          let jumped = this.validJumpMove(this.selectedNode, clickedNode);
          if (jumped !== null) {
            this.movePiece(this.selectedNode, clickedNode, true, jumped);
          } else if (this.graph[this.selectedNode].includes(clickedNode)) {
            this.movePiece(this.selectedNode, clickedNode, false);
          } else {
            this.selectedNode = null;
            this.drawBoard();
            this.drawPieces();
          }
        } else {
          let piece = this.boardState[clickedNode];
          if (piece && piece.player === currentPlayer.id) {
            this.selectedNode = clickedNode;
            this.highlightValidMoves(clickedNode);
            this.drawPieces();
          }
        }
      }
    }
    
    validJumpMove(source, dest) {
      if (!this.boardState[source] || this.boardState[dest] !== null) return null;
      const A = this.nodePositions[source];
      const C = this.nodePositions[dest];
      for (let mid of this.graph[source]) {
        if (!this.graph[mid].includes(dest)) continue;
        const B = this.nodePositions[mid];
        if (!isCollinearAndBetween(A, B, C)) continue;
        if (!this.boardState[mid] || this.boardState[mid].player === this.boardState[source].player) continue;
        return mid;
      }
      return null;
    }
    
    highlightValidMoves(node) {
      this.drawBoard();
      this.drawPieces();
      const validMoves = [];
      this.graph[node].forEach(neighbor => {
        if (this.boardState[neighbor] === null)
          validMoves.push(neighbor);
      });
      for (let potential in this.nodePositions) {
        if (potential !== node && this.boardState[potential] === null) {
          let jumped = this.validJumpMove(node, potential);
          if (jumped !== null)
            validMoves.push(potential);
        }
      }
      validMoves.forEach(move => {
        let pos = this.getRotatedPosition(move);
        this.ctx.beginPath();
        this.ctx.arc(pos[0], pos[1], 15, 0, 2 * Math.PI);
        this.ctx.strokeStyle = "green";
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      });
    }
    
    movePiece(source, dest, jump = false, jumpedNode = null) {
      const currentPlayer = this.players[this.currentPlayerIndex];
      this.boardState[dest] = this.boardState[source];
      this.boardState[source] = null;
      if (jump && jumpedNode) {
        this.boardState[jumpedNode] = null;
        currentPlayer.score += 1;
        this.updateScoreDisplay();
        playSound('sounds/jump.mp3');
      } else {
        playSound('sounds/move.mp3');
      }
      this.selectedNode = null;
      this.drawBoard();
      this.drawPieces();
      this.checkEndGame(currentPlayer);
      setTimeout(() => this.advanceTurn(), 1500);
    }
    
    animateRotation(newAngle, duration = 1000) {
      const startAngle = this.rotationAngle;
      const startTime = performance.now();
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const fraction = Math.min(elapsed / duration, 1);
        this.rotationAngle = startAngle + (newAngle - startAngle) * fraction;
        this.drawBoard();
        this.drawPieces();
        if (fraction < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
    
    nextTurn() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        let newAngle = 0;
        if (this.enableRotation) {
          let mapping = {};
          if (this.totalPlayers === 3) {
            mapping = { 'B': -Math.PI / 2 + 0.52, 'R': Math.PI / 2 - 0.52, 'T': Math.PI };
          } else {
            mapping = { 'T': Math.PI, 'B': 0, 'R': Math.PI / 2, 'L': 3 * Math.PI / 2 };
          }
          const targetAngle = mapping[currentPlayer.area] || 0;
          const currentRotation = this.boardRotation || 0;
          // Calculate the minimal angle difference in the range (-π, π]
          let delta = targetAngle - currentRotation;
          delta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;
          newAngle = currentRotation + delta;
          this.animateRotation(newAngle);
          this.boardRotation = newAngle;
        } else {
          this.rotationAngle = 0;
        }
        this.drawBoard();
        this.drawPieces();
        this.showTurnLabel(currentPlayer);
        speakText(`${currentPlayer.name}'s turn`);
      
        if (currentPlayer.type === "human") {
          if (!this.selectedNode) {
            for (let node in this.boardState) {
              if (this.boardState[node] && this.boardState[node].player === currentPlayer.id) {
                this.selectedNode = node;
                this.highlightValidMoves(node);
                break;
              }
            }
          }
        } else {
          this.makeComputerMove(currentPlayer);
        }
      }
      
    
    showTurnLabel(player) {
    this.turnLabelDiv.textContent = `${player.name}'s turn`;
    this.turnLabelDiv.style.color = player.color; // Assuming player.color holds a valid CSS color
    }
    
    
    advanceTurn() {
      if (this.gameOver) return;
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      this.selectedNode = null;
      this.drawBoard();
      this.drawPieces();
      this.nextTurn();
    }
    
    makeComputerMove(player) {
      const moves = this.getAllValidMoves(player);
      if (moves.length === 0) {
        setTimeout(() => this.advanceTurn(), 500);
        return;
      }
      const move = moves[Math.floor(Math.random() * moves.length)];
      const [source, dest, isJump, jumpedNode] = move;
      setTimeout(() => this.movePiece(source, dest, isJump, jumpedNode), 500);
    }
    
    getValidMoves(node) {
      const validMoves = [];
      this.graph[node].forEach(neighbor => {
        if (this.boardState[neighbor] === null)
          validMoves.push([node, neighbor, false, null]);
      });
      for (let potential in this.nodePositions) {
        if (potential !== node && this.boardState[potential] === null) {
          let jumped = this.validJumpMove(node, potential);
          if (jumped !== null)
            validMoves.push([node, potential, true, jumped]);
        }
      }
      return validMoves;
    }
    
    getAllValidMoves(player) {
      let moves = [];
      for (let node in this.boardState) {
        if (this.boardState[node] && this.boardState[node].player === player.id) {
          moves = moves.concat(this.getValidMoves(node));
        }
      }
      return moves;
    }
    
    checkEndGame(player) {
      const target = player.target;
      const targetNodes = Object.keys(this.nodePositions).filter(n => n.startsWith(target));
      const count = targetNodes.filter(n => this.boardState[n] && this.boardState[n].player === player.id).length;
      if (count === targetNodes.length && targetNodes.length > 0) {
        alert(`${player.name} wins by filling the target area!`);
        this.gameOver = true;
        return;
      }
      const remaining = {};
      this.players.forEach(p => {
        remaining[p.id] = Object.values(this.boardState).filter(piece => piece && piece.player === p.id).length;
      });
      const activePlayers = this.players.filter(p => remaining[p.id] > 0);
      if (activePlayers.length === 1) {
        alert(`${activePlayers[0].name} wins! All opponents have been jumped.`);
        this.gameOver = true;
      }
    }
  }
  
  class MainApp {
    constructor(container) {
      this.container = container;
      this.showStartScreen();
    }
    
    showStartScreen() {
      this.container.innerHTML = "";
      new StartScreen(this.container, (totalPlayers, humanPlayers, playerNames, playerColors, enableRotation) => {
        this.startGame(totalPlayers, humanPlayers, playerNames, playerColors, enableRotation);
      });
    }
    
    startGame(totalPlayers, humanPlayers, playerNames, playerColors, enableRotation) {
      this.container.innerHTML = "";
      new GameApp(this.container, totalPlayers, humanPlayers, playerNames, playerColors, enableRotation, () => {
        this.showStartScreen();
      });
    }
  }
  
