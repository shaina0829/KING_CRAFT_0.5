
/* ===================================
   1. HTML 요소 가져오기
=================================== */

const startScreen = document.getElementById("start-screen");
const playScreen = document.getElementById("play-screen");
const resultScreen = document.getElementById("result-screen");

const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");

const resultTitle = document.getElementById("result-title");
const resultMessage = document.getElementById("result-message");
const resultStatus =
  document.getElementById("result-status");

const resultIcon =
  document.getElementById("result-icon");

const resultHP =
  document.getElementById("result-hp");

const ewhaScene =
  document.getElementById("ewha-scene");

const timer = document.getElementById("timer");

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;


/* ===================================
   2. 게임 기본 설정
=================================== */

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const GROUND_Y = 320;

const GRAVITY = 1800;
const JUMP_POWER = -600;
const DOUBLE_JUMP_POWER = -800;
const MAX_JUMPS = 2;

let gameRunning = false;
let animationId = null;
let lastTime = 0;
let elapsedTime = 0;


// 학교 도착 엔딩 애니메이션
let endingPlaying = false;
let endingTime = 0;

const ENDING_DURATION = 4.5;


let gameSpeed = 220;
let backgroundX = 0;

const MAX_HP = 100;
let hp = MAX_HP;

let obstacles = [];
let obstacleTimer = 0;

const FIRST_OBSTACLE_DELAY = 1.5;
let firstObstacleSpawned = false;


/* ===================================
   모든 장애물 랜덤 순환
=================================== */

// 레벨과 상관없이 모든 장애물 등장
const ALL_OBSTACLE_TYPES = [
  "rock",
  "cat",
  "branch",
  "log",
  "hole",
  "pigeon"
];

// 아직 등장하지 않은 장애물 목록
let obstacleBag = [];

// 직전에 등장한 장애물
let lastObstacleType = null;

// 장애물 순서 섞기
function shuffleObstacles() {
  const shuffled = [...ALL_OBSTACLE_TYPES];

  // Fisher-Yates 셔플
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] =
      [shuffled[j], shuffled[i]];
  }

  // 이전 묶음의 마지막 장애물과
  // 새 묶음의 첫 장애물이 같지 않게 설정
  if (
    lastObstacleType !== null &&
    shuffled[0] === lastObstacleType
  ) {
    const swapIndex = 1 + Math.floor(
      Math.random() * (shuffled.length - 1)
    );

    [shuffled[0], shuffled[swapIndex]] =
      [shuffled[swapIndex], shuffled[0]];
  }

  return shuffled;
}


/* ===================================
   5단계: 시간 및 난이도 설정
=================================== */

// 전체 게임 시간
const GAME_DURATION = 60;

// 현재 난이도
let currentLevel = 1;

// 난이도별 설정


const difficultySettings = [
  { level: 1, startTime: 0,  speed: 220, spawnInterval: 2.5 },
  { level: 2, startTime: 10, speed: 260, spawnInterval: 2.0 },
  { level: 3, startTime: 20, speed: 300, spawnInterval: 1.8 },
  { level: 4, startTime: 30, speed: 340, spawnInterval: 1.6 },
  { level: 5, startTime: 40, speed: 380, spawnInterval: 1.4 },
  { level: 6, startTime: 50, speed: 420, spawnInterval: 1.2 }
];



// 숙이기 키 입력 상태
let downPressed = false;

// 고양이 하트 효과
let heartEffects = [];


/* ===================================
   3. 캐릭터 정보
=================================== */

const player = {
  x: 110,
  y: GROUND_Y - 90,

  width: 48,
  height: 90,

  velocityY: 0,
  jumpCount: 0,

  isJumping: false,
  isDucking: false,

  animationTime: 0
};


/* ===================================
   4. 픽셀 그리기
=================================== */

function pixel(x, y, w, h, color) {
  ctx.fillStyle = color;

  ctx.fillRect(
    Math.round(x),
    Math.round(y),
    w,
    h
  );
}


/* ===================================
   5. 키보드 조작
=================================== */

function jump() {
  if (!gameRunning || endingPlaying) return;

  if (player.jumpCount >= MAX_JUMPS) {
    return;
  }

  if (player.jumpCount === 0) {
    player.velocityY = JUMP_POWER;
    console.log("1단 점프!");
  } else {
    player.velocityY = DOUBLE_JUMP_POWER;
    console.log("2단 점프!");
  }

  player.jumpCount++;
  player.isJumping = true;
  player.isDucking = false;
}

document.addEventListener("keydown", function(event) {
  if (!gameRunning || endingPlaying) return;

  if (event.code === "Space") {
    event.preventDefault();

    if (!event.repeat) {
      jump();
    }
  }

  if (event.code === "ArrowDown") {
    event.preventDefault();

    downPressed = true;

    if (!event.repeat) {
      petCat();
    }

    if (!player.isJumping) {
      player.isDucking = true;
    }
  }
});

document.addEventListener("keyup", function(event) {
  if (event.code === "ArrowDown") {
    event.preventDefault();

    downPressed = false;
    player.isDucking = false;
  }
});

// 게임 화면 밖으로 이동하면 숙이기 해제
window.addEventListener("blur", function() {
  downPressed = false;
  player.isDucking = false;
});


/* ===================================
   6. 캐릭터 물리 계산
=================================== */

function updatePlayer(dt) {
  if (player.isJumping) {
    player.velocityY += GRAVITY * dt;
    player.y += player.velocityY * dt;

    // 바닥에 착지
    if (player.y >= GROUND_Y - player.height) {
      player.y = GROUND_Y - player.height;
      player.velocityY = 0;
      player.jumpCount = 0;
      player.isJumping = false;
    }
  }

  player.isDucking =
    !player.isJumping && downPressed;

  if (!player.isJumping && !player.isDucking) {
    player.animationTime += dt;
  }
}


/* ===================================
   7. 배경 그리기
=================================== */

function drawBackground() {
  // 하늘
  pixel(0, 0, WIDTH, HEIGHT, "#cce7e0");

  // 구름
  for (let i = 0; i < 5; i++) {
    const x =
      ((i * 230 - backgroundX * 0.2) % 1100
      + 1100) % 1100 - 100;

    pixel(x, 55, 70, 18, "#ffffff");
    pixel(x + 15, 40, 40, 20, "#ffffff");
  }

  // 건물
  for (let i = 0; i < 8; i++) {
    const x =
      ((i * 150 - backgroundX * 0.4) % 1200
      + 1200) % 1200 - 150;

    pixel(x, 165, 100, 125, "#a7c9ba");

    for (let j = 0; j < 3; j++) {
      pixel(x + 15 + j * 28, 185, 14, 20, "#e8f2df");
      pixel(x + 15 + j * 28, 225, 14, 20, "#e8f2df");
    }
  }

  // 잔디
  pixel(0, 290, WIDTH, 110, "#83b796");

  // 도로
  pixel(0, 320, WIDTH, 80, "#b7b8aa");
  pixel(0, 320, WIDTH, 6, "#f5f5e9");

  // 도로 표시선
  const offset = backgroundX % 120;

  for (let i = -1; i < 9; i++) {
    pixel(
      i * 120 - offset,
      370,
      65,
      5,
      "#f5f5e9"
    );
  }
}


/* ===================================
   이화여대 도착 배경
=================================== */

function drawSchoolBackground() {
  // 하늘
  pixel(0, 0, WIDTH, HEIGHT, "#cce7e0");

  // 구름
  pixel(90, 55, 110, 20, "#ffffff");
  pixel(120, 38, 60, 25, "#ffffff");

  pixel(580, 65, 100, 18, "#ffffff");
  pixel(605, 48, 55, 24, "#ffffff");

  // 잔디
  pixel(0, 275, WIDTH, 125, "#86bd98");

  // 학교 건물 본체
  pixel(390, 115, 320, 175, "#e6d7bc");

  // 건물 그림자
  pixel(390, 260, 320, 30, "#c6b493");

  // 양쪽 건물
  pixel(340, 160, 70, 130, "#d5c4a8");
  pixel(690, 160, 70, 130, "#d5c4a8");

  // 지붕
  pixel(375, 100, 350, 20, "#66796e");
  pixel(405, 85, 290, 20, "#788c7d");

  // 중앙 장식
  pixel(525, 65, 55, 50, "#d5c4a8");
  pixel(535, 52, 35, 15, "#66796e");

  // 창문
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 6; col++) {
      pixel(
        415 + col * 47,
        145 + row * 52,
        25,
        34,
        "#6b948c"
      );
    }
  }

  // 중앙 출입문
  pixel(525, 210, 55, 80, "#486f61");
  pixel(550, 210, 4, 80, "#e6d7bc");

  // 입구 계단
  pixel(510, 290, 85, 8, "#a9a89b");
  pixel(495, 298, 115, 8, "#bdbbac");

  // 학교로 이어지는 길
  pixel(0, 320, WIDTH, 80, "#c7c1ae");

  // 도로 경계
  pixel(0, 317, WIDTH, 5, "#eee8d8");

  // 학교 간판
  ctx.fillStyle = "#286349";
  ctx.font = "bold 19px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("EWHA", 552, 135);
  ctx.textAlign = "left";
}


/* ===================================
   8. 캐릭터 그리기
=================================== */

function drawPlayer() {
  const x = player.x;
  const y = player.y;

  const running = Math.sin(player.animationTime * 14);
  const legOffset = running > 0 ? 6 : -6;
  const armOffset = running > 0 ? -5 : 5;

  const bounce =
    player.isJumping || player.isDucking
      ? 0
      : Math.abs(running) * 3;

  const py = y - bounce;

  // 그림자
  pixel(x + 8, 316, 35, 4, "#72917d");

  // 숙이기
  if (player.isDucking) {
    pixel(x - 5, 278, 12, 25, "#a57b57");
    pixel(x + 10, 304, 35, 12, "#414b60");

    pixel(x + 8, 280, 37, 25, "#f8f8f2");
    pixel(x + 8, 300, 37, 5, "#286349");

    pixel(x + 37, 285, 10, 19, "#e8b996");

    pixel(x + 12, 259, 30, 24, "#40332f");
    pixel(x + 17, 268, 24, 16, "#f2c5a5");
    pixel(x + 35, 274, 3, 3, "#282b2a");

    return;
  }

  // 가방
  pixel(x - 8, py + 36, 12, 30, "#a57b57");
  pixel(x - 5, py + 32, 8, 5, "#805a3e");

  // 다리
  if (player.isJumping) {
    pixel(x + 10, py + 67, 12, 14, "#414b60");
    pixel(x + 25, py + 67, 12, 14, "#414b60");

    pixel(x + 5, py + 78, 17, 7, "#333333");
    pixel(x + 25, py + 78, 17, 7, "#333333");
  } else {
    pixel(x + 25, py + 67, 10, 15, "#414b60");
    pixel(x + 25 + legOffset, py + 80, 10, 12, "#414b60");
    pixel(x + 23 + legOffset, py + 90, 16, 6, "#333333");

    pixel(x + 12, py + 67, 10, 15, "#414b60");
    pixel(x + 12 - legOffset, py + 80, 10, 12, "#414b60");
    pixel(x + 10 - legOffset, py + 90, 16, 6, "#333333");
  }

  // 몸통
  pixel(x + 7, py + 32, 34, 35, "#f8f8f2");
  pixel(x + 7, py + 57, 34, 5, "#286349");

  // 팔
  if (player.isJumping) {
    pixel(x + 2, py + 20, 8, 24, "#e8b996");
    pixel(x + 39, py + 20, 8, 24, "#e8b996");
  } else {
    pixel(x + 3, py + 36 + armOffset, 8, 23, "#e8b996");
    pixel(x + 38, py + 36 - armOffset, 8, 23, "#e8b996");
  }

  // 목
  pixel(x + 19, py + 27, 10, 9, "#f2c5a5");

  // 머리
  pixel(x + 8, py + 2, 33, 29, "#40332f");
  pixel(x + 5, py + 10, 8, 35, "#40332f");
  pixel(x + 37, py + 10, 8, 32, "#40332f");

  // 얼굴
  pixel(x + 12, py + 12, 26, 20, "#f2c5a5");
  pixel(x + 12, py + 7, 26, 8, "#40332f");

  // 눈과 볼
  pixel(x + 32, py + 20, 3, 3, "#282b2a");
  pixel(x + 35, py + 26, 4, 2, "#e89b91");
}

/* ===================================
   학교 도착 엔딩 애니메이션
=================================== */

function drawEnding() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  drawSchoolBackground();

  // 애니메이션 진행률: 0 ~ 1
  const progress = Math.min(
    endingTime / ENDING_DURATION,
    1
  );

  // 기존 위치에서 학교 입구 쪽으로 이동
  player.x = 110 + progress * 420;

  // 걷는 동작을 달리기보다 느리게
  player.animationTime += 0.018;

  drawPlayer();

  // 상단 안내 문구
  ctx.fillStyle = "#174d38";
  ctx.font = "bold 23px sans-serif";
  ctx.textAlign = "center";

  ctx.fillText(
    "학교에 거의 다 왔어!",
    WIDTH / 2,
    35
  );

  ctx.textAlign = "left";
}


function updateEnding(dt) {
  // 엔딩 진행 시간 증가
  endingTime += dt;

  // 학교 도착 애니메이션 그리기
  drawEnding();

  // 4.5초가 지나면 성공 화면으로 이동
  if (endingTime >= ENDING_DURATION) {
    winGame();
  }
}


/* ===================================
   난이도 업데이트
=================================== */

function updateDifficulty() {
  let newLevel = 1;

  // 경과 시간에 맞는 난이도 찾기
  for (const setting of difficultySettings) {
    if (elapsedTime >= setting.startTime) {
      newLevel = setting.level;
    }
  }

  // 난이도가 바뀌었을 때
  if (newLevel !== currentLevel) {
    currentLevel = newLevel;

    console.log(
      "난이도 상승! LEVEL " + currentLevel
    );
  }

  // 현재 난이도 설정 가져오기
  const currentSetting =
    difficultySettings[currentLevel - 1];

  // 속도 적용
  gameSpeed = currentSetting.speed;
}


/* ===================================
   남은 시간 표시
=================================== */

function updateTimer() {
  const remainingTime = Math.max(
    0,
    GAME_DURATION - elapsedTime
  );

  // 소수점 올림
  const seconds = Math.ceil(remainingTime);

  timer.textContent =
    "남은 시간: " + seconds + "초";
}


/* ===================================
   9. 장애물 생성
=================================== */

function createObstacle(type) {
  const settings = {
    rock: {
      width: 45,
      height: 30,
      y: GROUND_Y - 30
    },

    log: {
      width: 70,
      height: 85,
      y: GROUND_Y - 85
    },

    cat: {
      width: 40,
      height: 35,
      y: GROUND_Y - 35
    },

    branch: {
      width: 75,
      height: 25,
      y: 235
    },

    hole: {
      width: 85,
      height: 15,
      y: GROUND_Y
    },

    pigeon: {
      width: 45,
      height: 25,
      y: 220
    }
  };

  
return {
  type: type,
  x: WIDTH + 20,
  ...settings[type],

  // 고양이 쓰다듬기 여부
  collected: false,

  // 이미 충돌한 장애물인지 확인
  hasHit: false
};
}



function spawnObstacle() {

  // 모든 장애물이 한 번씩 등장했다면
  // 새로운 랜덤 순서 생성
  if (obstacleBag.length === 0) {
    obstacleBag = shuffleObstacles();
  }

  // 랜덤 순서에서 하나씩 꺼내기
  const type = obstacleBag.shift();

  // 장애물 생성
  obstacles.push(createObstacle(type));

  // 마지막 장애물 기록
  lastObstacleType = type;

  console.log(
    "LEVEL " + currentLevel +
    " 장애물 등장: " + type
  );
}




/* ===================================
   10. 장애물 픽셀아트
=================================== */

function drawObstacle(o) {
  const x = o.x;
  const y = o.y;

  switch (o.type) {

    case "rock":
      pixel(x + 5, y + 10, 35, 20, "#858d92");
      pixel(x + 12, y + 3, 22, 12, "#9fa8ad");
      pixel(x + 7, y + 20, 33, 10, "#68737b");
      break;

    case "log":
      pixel(x, y + 10, 70, 75, "#805637");
      pixel(x + 8, y, 54, 20, "#996b43");
      pixel(x + 8, y + 30, 54, 8, "#b08353");
      pixel(x + 10, y + 55, 50, 8, "#5e402d");
      pixel(x + 22, y + 15, 22, 20, "#c49868");
      break;

    case "cat":
      pixel(x + 4, y + 17, 30, 18, "#d89d65");
      pixel(x + 16, y + 7, 20, 20, "#d89d65");
      pixel(x + 17, y, 7, 12, "#d89d65");
      pixel(x + 29, y, 7, 12, "#d89d65");
      pixel(x + 30, y + 14, 3, 3, "#333333");
      pixel(x, y + 20, 8, 7, "#b77f4e");
      break;

    case "branch":
      pixel(x, y + 8, 75, 12, "#805637");
      pixel(x + 8, y, 25, 15, "#397a49");
      pixel(x + 35, y - 5, 30, 18, "#4b945d");
      pixel(x + 55, y + 3, 20, 18, "#347447");
      break;

    case "hole":
      pixel(x, y, 85, 15, "#303439");
      pixel(x, y, 85, 4, "#d5a16b");
      pixel(x + 5, y + 6, 75, 9, "#202428");
      break;

    case "pigeon":
      pixel(x + 5, y + 8, 30, 14, "#89959c");
      pixel(x + 14, y, 20, 12, "#a9b5bd");
      pixel(x + 32, y + 9, 10, 6, "#d7a45a");
      pixel(x + 26, y + 5, 3, 3, "#24282c");
      pixel(x, y + 13, 10, 7, "#687780");
      break;
  }
}


/* ===================================
   11. 충돌 판정
=================================== */

function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// 캐릭터 상태별 충돌 영역
function getPlayerHitbox() {

  if (player.isDucking) {
    return {
      x: player.x + 8,
      y: GROUND_Y - 60,
      width: 38,
      height: 60
    };
  }

  return {
    x: player.x + 8,
    y: player.y + 5,
    width: 34,
    height: 85
  };
}

// 공사 구간 판정용 발 위치
function getPlayerFeet() {
  return {
    left: player.x + 12,
    right: player.x + 38,
    bottom: player.y + player.height
  };
}


/* ===================================
   HP 표시 및 피해 처리
=================================== */

const hpText = document.getElementById("hp-text");
const hpFill = document.getElementById("hp-fill");

// HP 표시 업데이트
function updateHPDisplay() {
  hpText.textContent = hp + " / " + MAX_HP;

  hpFill.style.width =
    (hp / MAX_HP) * 100 + "%";

  hpFill.classList.remove("low", "danger");

  if (hp <= 30) {
    hpFill.classList.add("danger");
  } else if (hp <= 60) {
    hpFill.classList.add("low");
  }
}

// 장애물 충돌 시 HP 감소
function takeDamage(amount) {
  if (!gameRunning) return;

  hp = Math.max(0, hp - amount);

  updateHPDisplay();

  console.log("장애물 충돌! 현재 HP:", hp);

  // HP가 0일 때만 게임 종료
  if (hp <= 0) {
    endGame("목숨을 모두 잃었어!");
  }
}


function healHP(amount) {
  if (!gameRunning) return;

  hp = Math.min(MAX_HP, hp + amount);

  updateHPDisplay();
}


/* ===================================
   12. 고양이 쓰다듬기
=================================== */

function petCat() {
  if (!gameRunning || endingPlaying || player.isJumping) {
  return;
}

  for (const o of obstacles) {
    if (o.type !== "cat" || o.collected) {
      continue;
    }

    // 고양이가 가까이 있을 때만 가능
    const distance = Math.abs(
      (player.x + 25) - (o.x + 20)
    );

    if (distance < 65) {
      o.collected = true;

      healHP(5);

      heartEffects.push({
        x: o.x + 15,
        y: o.y - 15,
        life: 0.8
      });

      console.log("고양이 쓰다듬기 성공! HP +5");
      break;
    }
  }
}


/* ===================================
   13. 장애물 업데이트 및 충돌
=================================== */




/* ===================================
   장애물 이동 및 충돌 처리
=================================== */

function updateObstacles(dt) {
  obstacleTimer += dt;

  // 현재 레벨의 장애물 생성 간격
  const currentSetting =
    difficultySettings[currentLevel - 1];

  const spawnInterval =
    currentSetting.spawnInterval;

  // 장애물 생성
  
const nextSpawnInterval = firstObstacleSpawned
  ? spawnInterval
  : FIRST_OBSTACLE_DELAY;

if (obstacleTimer >= nextSpawnInterval) {
  obstacleTimer -= nextSpawnInterval;
  spawnObstacle();
  firstObstacleSpawned = true;
}


  // 캐릭터 충돌 영역
  const playerBox = getPlayerHitbox();

  // 모든 장애물 이동 및 충돌 검사
  for (const o of obstacles) {

    // 장애물 이동
    o.x -= gameSpeed * dt;

    // 고양이는 충돌 피해 없음
    if (o.type === "cat") {
      continue;
    }

    // 이미 피해를 준 장애물은 무시
    if (o.hasHit) {
      continue;
    }

    // 공사 구간 충돌
    if (o.type === "hole") {
      const feet = getPlayerFeet();

      const overHole =
        feet.left >= o.x &&
        feet.right <= o.x + o.width;

      const onGround =
        !player.isJumping &&
        feet.bottom >= GROUND_Y;

      if (overHole && onGround) {
        o.hasHit = true;

        // HP 20 감소
        takeDamage(20);

        // HP가 0이면 게임 종료
        if (!gameRunning) return;
      }

      continue;
    }

    // 일반 장애물 충돌
    const obstacleBox = {
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height
    };

    if (isColliding(playerBox, obstacleBox)) {
      o.hasHit = true;

      // HP 20 감소
      takeDamage(20);

      // HP가 0이면 게임 종료
      if (!gameRunning) return;
    }
  }

  // 화면 밖 장애물 삭제
  obstacles = obstacles.filter(
    o => o.x + o.width > -20
  );
}



/* ===================================
   14. 하트 효과
=================================== */

function updateHearts(dt) {
  for (const heart of heartEffects) {
    heart.y -= 35 * dt;
    heart.life -= dt;
  }

  heartEffects = heartEffects.filter(
    heart => heart.life > 0
  );
}

function drawHearts() {
  for (const heart of heartEffects) {
    const x = heart.x;
    const y = heart.y;

    pixel(x, y, 8, 8, "#f18da3");
    pixel(x + 10, y, 8, 8, "#f18da3");
    pixel(x - 2, y + 5, 22, 8, "#f18da3");
    pixel(x + 3, y + 13, 12, 6, "#f18da3");
    pixel(x + 7, y + 19, 4, 4, "#f18da3");
  }
}


/* ===================================
   15. 게임 화면 그리기
=================================== */

function drawGame() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  drawBackground();

  // 공사 구간은 도로 위에 먼저 그림
  for (const o of obstacles) {
    if (o.type === "hole") {
      drawObstacle(o);
    }
  }

  // 나머지 장애물
  for (const o of obstacles) {
    if (o.type !== "hole") {
      drawObstacle(o);
    }
  }

  drawPlayer();
  drawHearts();
}


/* ===================================
   16. 게임 종료
=================================== */


function endGame(message) {
  if (!gameRunning) return;

  gameRunning = false;

  // 실패 화면 스타일
  resultScreen.classList.add("fail");

  resultStatus.textContent = "GAME OVER";
  resultIcon.textContent = "✕";

  resultTitle.textContent = "지각 위기!";
  resultMessage.textContent = message;

  // 남은 HP 표시
  resultHP.textContent = hp + " / " + MAX_HP;

  // 학교 그림 숨기기
  ewhaScene.classList.add("hidden");

  restartButton.textContent = "↻ TRY AGAIN";

  playScreen.classList.add("hidden");
  resultScreen.classList.remove("hidden");
}


/* ===================================
   게임 성공
=================================== */



/* ===================================
   게임 성공
=================================== */

function winGame() {
  if (!gameRunning) return;

  // 게임 종료
  gameRunning = false;
  endingPlaying = false;

  // 성공 화면 스타일
  resultScreen.classList.remove("fail");

  resultStatus.textContent = "MISSION CLEAR!";
  resultIcon.textContent = "★";

  resultTitle.textContent = "이대 도착 성공!";

  resultMessage.textContent =
    "60초 동안 무사히 학교에 도착했어!";

  // 남은 HP 표시
  resultHP.textContent = hp + " / " + MAX_HP;

  // 별도의 학교 그림 영역은 숨기기
  // 학교 도착 장면은 이미 게임 화면에서 보여줬음
  ewhaScene.classList.add("hidden");

  // 재시작 버튼
  restartButton.textContent = "↻ PLAY AGAIN";

  // 플레이 화면 숨기기
  playScreen.classList.add("hidden");

  // 성공 결과 화면 표시
  resultScreen.classList.remove("hidden");

  console.log("MISSION CLEAR! 성공 화면 표시");
}



/* ===================================
   17. 게임 루프
=================================== */



function gameLoop(timestamp) {
  if (!gameRunning) return;

  // 프레임 시간 계산
  let dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  dt = Math.min(dt, 0.05);

  // 엔딩 애니메이션 진행 중
  if (endingPlaying) {
    updateEnding(dt);

    if (gameRunning) {
      animationId = requestAnimationFrame(gameLoop);
    }
    return;
  }

  // 게임 진행 시간
  elapsedTime += dt;

  // 60초가 지나면 엔딩 시작
  if (elapsedTime >= GAME_DURATION) {
    elapsedTime = GAME_DURATION;

    updateTimer();

    endingPlaying = true;
    endingTime = 0;

    // 엔딩 중에는 숙이기 해제
    downPressed = false;
    player.isDucking = false;

    drawEnding();

    animationId = requestAnimationFrame(gameLoop);
    return;
  }

  // 난이도 업데이트
  updateDifficulty();

  // 남은 시간 표시
  updateTimer();

  // 배경 이동
  backgroundX += gameSpeed * dt;

  // 캐릭터 움직임
  updatePlayer(dt);

  // 장애물 생성 및 충돌 판정
  updateObstacles(dt);

  // HP가 0이면 종료
  if (!gameRunning) return;

  // 하트 효과
  updateHearts(dt);

  // 화면 그리기
  drawGame();

  // 다음 프레임
  animationId = requestAnimationFrame(gameLoop);
}


/* ===================================
   18. 게임 시작 및 초기화
=================================== */

function startGame() {

  // 이전 애니메이션 취소
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  // 게임 상태 초기화
  gameRunning = true;

  lastTime = 0;
  elapsedTime = 0;

  currentLevel = 1;

  gameSpeed = 220;
  backgroundX = 0;

  // HP 초기화
  hp = MAX_HP;
  updateHPDisplay();

  // 장애물 초기화
  obstacles = [];
  obstacleTimer = 0;

  // 첫 장애물 생성 상태 초기화
  firstObstacleSpawned = false;

  // 장애물 랜덤 순서 초기화
  obstacleBag = [];
  lastObstacleType = null;

  // 엔딩 애니메이션 초기화
  endingPlaying = false;
  endingTime = 0;

  // 하트 및 키 입력 초기화
  heartEffects = [];
  downPressed = false;

  // 캐릭터 초기화
  player.x = 110;
  player.y = GROUND_Y - player.height;

  player.velocityY = 0;
  player.jumpCount = 0;

  player.isJumping = false;
  player.isDucking = false;
  player.animationTime = 0;

  // 타이머 초기화
  timer.textContent = "남은 시간: 60초";

  // 결과 화면 초기화
  resultScreen.classList.remove("fail");
  ewhaScene.classList.add("hidden");

  // 화면 전환
  startScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  playScreen.classList.remove("hidden");

  // 첫 화면 그리기
  drawGame();

  // 게임 루프 시작
  animationId = requestAnimationFrame(function(timestamp) {
    lastTime = timestamp;
    gameLoop(timestamp);
  });
}


/* ===================================
   19. 버튼 이벤트
=================================== */

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);


