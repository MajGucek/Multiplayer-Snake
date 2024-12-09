const socket = io("http://localhost:3000", {
  withCredentials: true,
});

let units = "vh";

/* 
  @Source: https://stackoverflow.com/questions/72502079/how-can-i-check-if-the-device-which-is-using-my-website-is-a-mobile-user-or-no
*/
const isUserUsingMobile = () => {
  // User agent string method
  let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  // Screen resolution method
  if (!isMobile) {
      let screenWidth = window.screen.width;
      let screenHeight = window.screen.height;
      isMobile = (screenWidth < 768 || screenHeight < 768);
  }
  // CSS media queries method
  if (!isMobile) {
      let bodyElement = document.getElementsByTagName('body')[0];
      isMobile = window.getComputedStyle(bodyElement).getPropertyValue('content').indexOf('mobile') !== -1;
  }
      
  return isMobile;
}

if (isUserUsingMobile()) {
  units = "vw";
}
console.log(units);


const minimap = document.getElementById("minimap");
const game_screen = document.getElementById("game-screen");
const server_response = document.getElementById("server-response");

let room_name = "";
let is_playing = false;
let my_socket_id = "";
let client_player = {body: [{x: 0, y: 0}], size: 3};

socket.on('connect', () => {
  my_socket_id = socket.id;
});

socket.on("connection-test", () => {
  if (room_name !== "") {
    socket.emit("connected-to-room", room_name);
  }
});

socket.on("create-room-success", (arg) => {
  acceptAnimation("create-button");
});
socket.on("create-room-failed", (arg) => {
  denyAnimation("create-button");
  serverResponseAnimation(arg);
});
socket.on('connect-user-to-room-failed', (arg) => {
  denyAnimation("connect-button");
  serverResponseAnimation(arg);
});
socket.on('connect-user-to-room-success', (data) => {
  if (data.player != undefined) {
    client_player = data.player;
  }
  is_playing = true;
  room_name = data.room.room_name;
  acceptAnimation("connect-button");
  // change scene
  document.getElementById("start-screen").style.display = 'none';
  document.getElementById("game-screen").style.display = 'var(--default-display)';
});

document.getElementById("connect-button").onclick = () => {
  let user_name = document.getElementById("name-input").value;
  let room_name = document.getElementById("room-input").value;
  req_addUserToRoom(user_name, room_name);
};
document.getElementById("FFA-connect-button").onclick = () => {
  let user_name = document.getElementById("name-input").value;
  req_addUserToRoom(user_name, 'FFA');
};
document.getElementById("create-button").onclick = () => {
  let new_room_name = document.getElementById("new-room-name-input").value;
  let new_room_speed = document.getElementById("new-room-speed-input").value;
  req_CreateRoom({room_name: new_room_name, room_speed: new_room_speed});
}


function renderPlayer(player, type = "enemy", name = "") {
  player.body.forEach((part, index) => {
    let render = document.createElement("div");
    if (index === 0 && type !== 'point') {
      render.style.zIndex = 5;
      render.style.backgroundColor = "grey";
    }
    render.classList = "player " + type;
    render.style.left = part.x + units;
    render.style.top = part.y + units;
    render.style.width = player.size + units;
    render.style.height = player.size + units;
    game_screen.appendChild(render);
  });
}

function renderGameOver() {
  document.getElementById("start-screen").style.display = 'none';
  document.getElementById("game-screen").style.display = 'none';
  document.getElementById("game-over-screen").style.display = 'var(--default-display)';
  setTimeout(() => {
    location.reload();
  }, 5000);
}

socket.on('render', (room) => {
  game_screen.replaceChildren();

  if (room.VELOCITY != undefined) {
    VELOCITY = room.VELOCITY;
  }
  let found_myself = false;
  room.entities.forEach(entity => {
    if (entity.id === my_socket_id) {
      // found myself
      found_myself = true;
      renderPlayer(entity.entity_component, "self");
    } else if (entity.id !== 'point') {
      renderPlayer(entity.entity_component, "enemy", entity.name);
    } else if (entity.id === 'point') {
      renderPlayer(entity.entity_component, "point");
    }
  });
  if (!found_myself) {
    renderGameOver();
  }
});



if (!isUserUsingMobile()) {
  window.addEventListener('keydown', (e) => {
    let interested_input = false;
    let key = "";
      if (e.code == "KeyW") {
        interested_input = true;
        key = "Up";
      }  
      if (e.code == "KeyS") {
        interested_input = true;
        key = "Down";
      }
      if (e.code == "KeyA") {
        interested_input = true;
        key = "Left";
      }
      if (e.code == "KeyD") {
        interested_input = true;
        key = "Right";
      }
    if (interested_input && is_playing) {
      socket.emit("change-direction-event", {room: room_name, event: {new_direction: key}});
    }
  });
} else {
  document.addEventListener('touchstart', (e) => {
    if (is_playing) {
      const touch = e.touches[0];
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      let key = "";
      
      const x = touch.clientX;
      const y = touch.clientY;
      // convert user click location to key press
      if (x < screenWidth / 3) {
        key = "Left";
      } else if (x > (2 * screenWidth) / 3) {
        key = "Right";
      } else if (y < screenHeight / 2) {
        key = "Up";
      } else {
        key = "Down";
      }
    
      if (key) {
        socket.emit("change-direction-event", {room: room_name, event: {new_direction: key}});
      }
    }
  });
}









function req_addUserToRoom(username, room) {
  socket.emit("connect-user-to-room", {user: username, id: socket.id, room: room});
}

function req_CreateRoom(room) {
  socket.emit('create-room', room);
}

function serverResponseAnimation(arg) {
  server_response.innerHTML = arg;
  setTimeout(() => {
    server_response.innerHTML = '';
  }, 1000);
}


function denyAnimation(button) {
  document.getElementById(button).style.animationName = "denyAnimation";
  document.getElementById(button).style.backgroundColor = "red";
  document.getElementById(button).style.borderColor = "red";
  setTimeout(() => {
    document.getElementById(button).style.animationName = "";
    document.getElementById(button).style.backgroundColor = "rgb(55, 147, 183)";
  document.getElementById(button).style.borderColor = "";
  }, 250);
}
function acceptAnimation(button) {
  document.getElementById(button).style.backgroundColor = "lightgreen";
  document.getElementById(button).style.borderColor = "lightgreen";
  setTimeout(() => {
    document.getElementById(button).style.backgroundColor = "rgb(55, 147, 183)";
  document.getElementById(button).style.borderColor = "";
  }, 250);
}

function scale (number, inMin, inMax, outMin, outMax) {
  return (number - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}