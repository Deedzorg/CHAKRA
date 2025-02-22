document.addEventListener("DOMContentLoaded", () => {
  const appContainer = document.getElementById("app");
  new MainApp(appContainer);
});

// Helper: Rotate a point (x, y) about center (cx, cy) by angle (radians)
function rotatePoint(x, y, angle, cx, cy) {
  const tx = x - cx;
  const ty = y - cy;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const rx = tx * cosA - ty * sinA + cx;
  const ry = tx * sinA + ty * cosA + cy;
  return [rx, ry];
}

// InfoModal: Manages the "About CHAKRA" modal dialog.
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
  }
  
  show() {
    this.modal.style.display = "block";
  }
  
  hide() {
    this.modal.style.display = "none";
  }
}

// StartScreen: Renders the initial setup screens.
class StartScreen {
  constructor(container, startCallback) {
    this.container = container;
    this.startCallback = startCallback;
    // Default colors: ensure each player gets a different one.
    this.defaultColors = ['blue', 'red', 'green', 'orange', 'purple', 'yellow'];
    // All available colors (in the dropdown)
    this.allowedColors = ['blue', 'red', 'green', 'orange', 'purple', 'yellow', 'pink', 'cyan', 'magenta'];
    this.renderInitialScreen();
  }
  
  renderInitialScreen() {
    this.container.innerHTML = `
      <div class="start-screen">
        <h2>☸ CHAKRA ☸</h2>
        <label>Total Number of Players (2-4):</label>
        <select id="totalPlayers">
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
        <br>
        <label>Number of Human Players:</label>
        <select id="humanPlayers">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
        <br>
        <label>
          <input type="checkbox" id="enableRotation">
          Enable Board Rotation
        </label>
        <br>
        <button id="nextBtn" class="btn next-btn">Next</button>
        <button id="infoBtn" class="btn info-btn" style="font-size: 12px;">☸ Info</button>
      </div>
    `;
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
      <h2>Enter Player Details</h2>
      <form id="playerForm">`;
    for (let i = 0; i < totalPlayers; i++) {
      const type = i < humanPlayers ? "Human" : "Computer";
      // Use a different default color for each player
      const defaultColor = this.defaultColors[i] || this.allowedColors[0];
      html += `
        <div>
          <label>Player ${i+1} (${type}) Name:</label>
          <input type="text" name="playerName${i}" value="Player ${i+1}" required>
          <label>Color:</label>
          <select name="playerColor${i}" class="color-select">
      `;
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
    
    // Update color select backgrounds when changed.
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

// GameApp: Contains game logic, board data, drawing routines, and move handling.
class GameApp {
  constructor(container, totalPlayers, humanPlayers, playerNames, playerColors, enableRotation, resetCallback) {
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
    if (this.totalPlayers === 2) {
      // 2-player mode board
      this.nodePositions = {
        'T1': [220,200], 'T2': [300,200], 'T3': [380,200],
        'T4': [260,250], 'T5': [300,250], 'T6': [340,250],
        'B1': [220,400], 'B2': [300,400], 'B3': [380,400],
        'B4': [260,350], 'B5': [300,350], 'B6': [340,350],
        'G': [300,300]
      };
      // Initialize graph for every node.
      this.graph = {};
      for (let node in this.nodePositions) {
        this.graph[node] = [];
      }
      // Top row connections
      this.graph['T1'].push('T2','T4');
      this.graph['T2'].push('T1','T3','T5');
      this.graph['T3'].push('T2','T6');
      this.graph['T4'].push('T1','T5');
      this.graph['T5'].push('T2','T4','T6');
      this.graph['T6'].push('T3','T5');
      // Bottom row connections
      this.graph['B1'].push('B2','B4');
      this.graph['B2'].push('B1','B3','B5');
      this.graph['B3'].push('B2','B6');
      this.graph['B4'].push('B1','B5');
      this.graph['B5'].push('B2','B4','B6');
      this.graph['B6'].push('B3','B5');
      // Center connections: connect G to T4, T5, T6 and B4, B5, B6
      ['T4','T5','T6'].forEach(n => {
        this.graph[n].push('G');
        this.graph['G'].push(n);
      });
      ['B4','B5','B6'].forEach(n => {
        this.graph[n].push('G');
        this.graph['G'].push(n);
      });
      // Initialize board state
      this.boardState = {};
      for (let node in this.nodePositions) {
        this.boardState[node] = null;
      }
      // Place starting pieces
      ['T1','T2','T3','T4','T5','T6'].forEach(node => {
        this.boardState[node] = { player: 0, color: this.players[0].color };
      });
      ['B1','B2','B3','B4','B5','B6'].forEach(node => {
        this.boardState[node] = { player: 1, color: this.players[1].color };
      });
      
    } else if (this.totalPlayers === 3) {
      // 3-player mode board (using Python reference)
      const midpoint = (p1, p2) => [ (p1[0]+p2[0])/2, (p1[1]+p2[1])/2 ];
      this.nodePositions = {
        'I1': [300,450],
        'I2': [170,225],
        'I3': [430,225]
      };
      Object.assign(this.nodePositions, {
        'B7': [ (300+170)/2, (450+225)/2 ],
        'T7': [ (170+430)/2, (225+225)/2 ],
        'R7': [ (430+300)/2, (225+450)/2 ]
      });
      Object.assign(this.nodePositions, {
        'T1': [240,121.08],
        'T2': [300,121.08],
        'T3': [360,121.08],
        'T4': [270,173.04],
        'T6': [330,173.04]
      });
      this.nodePositions['T5'] = midpoint(this.nodePositions['T4'], this.nodePositions['T6']);
      Object.assign(this.nodePositions, {
        'R1': [485,337.5],
        'R2': [455,389.46],
        'R3': [425,441.42],
        'R4': [425,337.5],
        'R6': [395,389.46]
      });
      this.nodePositions['R5'] = midpoint(this.nodePositions['R4'], this.nodePositions['R6']);
      Object.assign(this.nodePositions, {
        'B1': [175,441.42],
        'B2': [145,389.46],
        'B3': [115,337.5],
        'B4': [205,389.46],
        'B6': [175,337.5]
      });
      this.nodePositions['B5'] = midpoint(this.nodePositions['B4'], this.nodePositions['B6']);
      // Set up graph connections (as per Python code)
      this.graph = {
        'I1': ['B7', 'R7'],
        'I2': ['B7', 'T7'],
        'I3': ['T7', 'R7'],
        'B7': ['I1', 'I2', 'B4', 'B5', 'B6'],
        'T7': ['I2', 'I3', 'T4', 'T5', 'T6'],
        'R7': ['I3', 'I1', 'R4', 'R5', 'R6'],
        'T1': ['T2', 'T4'],
        'T2': ['T1', 'T3', 'T5'],
        'T3': ['T2', 'T6'],
        'T4': ['T1', 'T5', 'T7'],
        'T5': ['T2', 'T4', 'T6', 'T7'],
        'T6': ['T3', 'T5', 'T7'],
        'R1': ['R2', 'R4'],
        'R2': ['R1', 'R3', 'R5'],
        'R3': ['R2', 'R6'],
        'R4': ['R1', 'R5', 'R7'],
        'R5': ['R2', 'R4', 'R6', 'R7'],
        'R6': ['R3', 'R5', 'R7'],
        'B1': ['B2', 'B4'],
        'B2': ['B1', 'B3', 'B5'],
        'B3': ['B2', 'B6'],
        'B4': ['B1', 'B5', 'B7'],
        'B5': ['B2', 'B4', 'B6', 'B7'],
        'B6': ['B3', 'B5', 'B7']
      };
      // Add extra connections between T7, B7, and R7
      this.graph['T7'].push('B7','R7');
      this.graph['B7'].push('T7','R7');
      this.graph['R7'].push('T7','B7');
      // Initialize board state
      this.boardState = {};
      for (let node in this.nodePositions) {
        this.boardState[node] = null;
      }
      const startingPositions = {
        'T': ['T1','T2','T3','T4','T5','T6','T7'],
        'R': ['R1','R2','R3','R4','R5','R6','R7'],
        'B': ['B1','B2','B3','B4','B5','B6','B7']
      };
      for (let player of this.players) {
        let area = player.area;
        for (let pos of startingPositions[area]) {
          this.boardState[pos] = { player: player.id, color: player.color };
        }
      }
      
    } else if (this.totalPlayers === 4) {
      // 4-player mode board (from Python reference)
      this.nodePositions = {};
      this.graph = {};
      this.boardState = {};
      // Central nodes I1, I2, I3, I4
      this.nodePositions['I1'] = [130,130];
      this.nodePositions['I2'] = [470,130];
      this.nodePositions['I3'] = [470,470];
      this.nodePositions['I4'] = [130,470];
      ['I1','I2','I3','I4'].forEach(label => {
        this.graph[label] = [];
      });
      // Set connections for central nodes
      this.graph['I1'] = ['T7', 'L7'];
      this.graph['I2'] = ['T7', 'R7'];
      this.graph['I3'] = ['R7', 'B7'];
      this.graph['I4'] = ['B7', 'L7'];
      this.nodePositions['T7'] = [300,130];
      this.nodePositions['R7'] = [470,300];
      this.nodePositions['B7'] = [300,470];
      this.nodePositions['L7'] = [130,300];
      ['T7','R7','B7','L7'].forEach(label => {
        this.graph[label] = [];
      });
      this.graph['T7'].push('R7','L7');
      this.graph['R7'].push('T7','B7');
      this.graph['B7'].push('R7','L7');
      this.graph['L7'].push('B7','T7');
      this.graph['T7'].push('I1','I2');
      this.graph['I1'].push('T7');
      this.graph['I2'].push('T7');
      this.graph['R7'].push('I2','I3');
      this.graph['I2'].push('R7');
      this.graph['I3'].push('R7');
      this.graph['B7'].push('I3','I4');
      this.graph['I3'].push('B7');
      this.graph['I4'].push('B7');
      this.graph['L7'].push('I4','I1');
      this.graph['I4'].push('L7');
      this.graph['I1'].push('L7');
      // Top coordinates
      let topCoords = {
        'T1': [220,50], 'T2': [300,50], 'T3': [380,50],
        'T4': [260,90], 'T5': [300,90], 'T6': [340,90],
        'T7': this.nodePositions['T7']
      };
      let rightCoords = {};
      for (let label in topCoords) {
        let pos = topCoords[label];
        let dx = pos[0] - 300;
        let dy = pos[1] - 130;
        let new_x = 470 - dy;
        let new_y = 300 + dx;
        rightCoords[label.replace('T','R')] = [new_x, new_y];
      }
      let bottomCoords = {};
      for (let label in topCoords) {
        let pos = topCoords[label];
        let dx = pos[0] - 300;
        let dy = pos[1] - 130;
        let new_x = 300 - dx;
        let new_y = 470 - dy;
        bottomCoords[label.replace('T','B')] = [new_x, new_y];
      }
      let leftCoords = {};
      for (let label in topCoords) {
        let pos = topCoords[label];
        let dx = pos[0] - 300;
        let dy = pos[1] - 130;
        let new_x = 130 + dy;
        let new_y = 300 - dx;
        leftCoords[label.replace('T','L')] = [new_x, new_y];
      }
      // Incorporate area nodes and add area edges.
      for (let [area, coords] of [['T', topCoords], ['R', rightCoords], ['B', bottomCoords], ['L', leftCoords]]) {
        for (let label in coords) {
          this.nodePositions[label] = coords[label];
          if (!this.graph[label]) this.graph[label] = [];
        }
        const addAreaEdges = (prefix) => {
          for (let i = 1; i <= 7; i++) {
            let key = prefix + i;
            if (!this.graph[key]) this.graph[key] = [];
          }
          this.graph[prefix+'1'].push(prefix+'2');
          this.graph[prefix+'2'].push(prefix+'1', prefix+'3');
          this.graph[prefix+'3'].push(prefix+'2');
          this.graph[prefix+'1'].push(prefix+'4');
          this.graph[prefix+'4'].push(prefix+'1');
          this.graph[prefix+'2'].push(prefix+'5');
          this.graph[prefix+'5'].push(prefix+'2');
          this.graph[prefix+'3'].push(prefix+'6');
          this.graph[prefix+'6'].push(prefix+'3');
          this.graph[prefix+'4'].push(prefix+'5');
          this.graph[prefix+'5'].push(prefix+'4', prefix+'6');
          this.graph[prefix+'6'].push(prefix+'5');
          this.graph[prefix+'4'].push(prefix+'7');
          this.graph[prefix+'7'].push(prefix+'4');
          this.graph[prefix+'5'].push(prefix+'7');
          this.graph[prefix+'7'].push(prefix+'5');
          this.graph[prefix+'6'].push(prefix+'7');
          this.graph[prefix+'7'].push(prefix+'6');
        };
        ['T','R','B','L'].forEach(a => addAreaEdges(a));
      }
      for (let node in this.nodePositions) {
        this.boardState[node] = null;
      }
      const startingPositions = {
        'T': ['T1','T2','T3','T4','T5','T6','T7'],
        'R': ['R1','R2','R3','R4','R5','R6','R7'],
        'B': ['B1','B2','B3','B4','B5','B6','B7'],
        'L': ['L1','L2','L3','L4','L5','L6','L7']
      };
      for (let player of this.players) {
        let area = player.area;
        for (let pos of startingPositions[area]) {
          this.boardState[pos] = { player: player.id, color: player.color };
        }
      }
    }
  }
  
  renderGameUI() {
    this.container.innerHTML = `
      <div id="scoreDisplay"></div>
      <canvas id="gameCanvas" width="600" height="600"></canvas>
      <div id="gameControls">
        <button id="infoButton" class="btn info-btn">☸ Info</button>
        <button id="resetButton" class="btn reset-btn">Reset</button>
      </div>
      <div id="turnLabel"></div>
    `;
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.scoreDisplay = document.getElementById("scoreDisplay");
    this.turnLabelDiv = document.getElementById("turnLabel");
    
    this.canvas.addEventListener("click", (e) => this.onCanvasClick(e));
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
    let scoreText = "Scores: ";
    this.players.forEach(p => {
      scoreText += `${p.name}(${p.color}): ${p.score}  `;
    });
    this.scoreDisplay.textContent = scoreText;
  }
  
  getRotatedPosition(node) {
    let pos = this.nodePositions[node];
    if (!this.enableRotation) return pos;
    return rotatePoint(pos[0], pos[1], this.rotationAngle, 300, 300);
  }
  
  drawBoard() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = "black";
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
      this.ctx.fillStyle = "white";
      this.ctx.fill();
      this.ctx.strokeStyle = "black";
      this.ctx.stroke();
      this.ctx.fillStyle = "gray";
      this.ctx.font = "10px Arial";
      this.ctx.fillText(node, pos[0] - 10, pos[1] - 10);
    }
  }
  
  drawPieces() {
    for (let node in this.boardState) {
      if (this.boardState[node]) {
        let pos = this.getRotatedPosition(node);
        this.ctx.beginPath();
        this.ctx.arc(pos[0], pos[1], 12, 0, 2 * Math.PI);
        this.ctx.fillStyle = this.boardState[node].color;
        this.ctx.fill();
        this.ctx.strokeStyle = "black";
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
    let sx = this.nodePositions[source][0],
        sy = this.nodePositions[source][1];
    let dx = this.nodePositions[dest][0],
        dy = this.nodePositions[dest][1];
    let totalDist = Math.hypot(dx - sx, dy - sy);
    if (totalDist === 0) return null;
    for (let mid of this.graph[source]) {
      if (!this.graph[mid].includes(dest)) continue;
      if (!this.boardState[mid] || this.boardState[mid].player === this.boardState[source].player)
        continue;
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
    }
    this.selectedNode = null;
    this.drawBoard();
    this.drawPieces();
    this.checkEndGame(currentPlayer);
    setTimeout(() => this.advanceTurn(), 1500);
  }
  
  nextTurn() {
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (this.enableRotation) {
      const mapping = { 'T': Math.PI, 'B': 0, 'R': Math.PI / 2, 'L': (3 * Math.PI) / 2 };
      this.rotationAngle = mapping[currentPlayer.area] || 0;
    } else {
      this.rotationAngle = 0;
    }
    this.drawBoard();
    this.drawPieces();
    this.showTurnLabel(currentPlayer);
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
    setTimeout(() => {
      this.movePiece(source, dest, isJump, jumpedNode);
    }, 500);
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

// MainApp: Entry point for the application.
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
