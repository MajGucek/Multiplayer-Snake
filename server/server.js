const io = require("socket.io")(3000, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true
    }
});
const badwordsArray = require('badwords/array');

let rooms = [];
const MIN_ROOM_NAME_LENGTH = 4;
const MAX_PLAYER_NAME_LENGTH = 10;

io.on('connection', socket => {
  //
  socket.on('connect-user-to-room', (arg) => {
    if (arg.user.length >= MAX_PLAYER_NAME_LENGTH) {
      socket.emit('connect-user-to-room-failed', "Username too long, Maximum length is " + MAX_PLAYER_NAME_LENGTH);
    } else if (arg.user !== arg.user.trim()) {
      socket.emit('connect-user-to-room-failed', "Username invalid");
    } else if (arg.user.includes(' ')) {
      // LMAOOO
      socket.emit('connect-user-to-room-failed', "Oh, you think putting whitespace in player names for error codes displayed to users is a great idea? Brilliant! Let’s confuse everyone by adding invisible chaos to the mix. Players love deciphering broken error messages like “Player Not Found” because “John Doe” secretly has an extra space! Debugging? Enjoy combing through logs riddled with mismatched spacing. Sure, URLs and APIs will choke—what’s a little chaos among friends? User experience? Overrated! Who needs clean, readable, searchable names? Underscores or camelCase are for boring people who hate problems. By all means, let’s champion confusion. Innovating user frustration? You’re a true pioneer. Bravo!");
      //
    } else if (badwordsArray.includes(arg.user)) {
      socket.emit('connect-user-to-room-failed', "Naughty Naughty!");
    } else {
      let found_room = false;
      rooms.forEach(room => {
        if (room.room_name === arg.room) {
          found_room = true;
          let player_attributes = room.getNewEntitySpace();
          if (typeof player_attributes === 'string') {
            socket.emit('connect-user-to-room-failed', "Room is too crowded!");
          }  else {
            room.subscribe(new Entity(arg.user, arg.id, player_attributes));
            socket.emit('connect-user-to-room-success', {room: room, player: player_attributes});
            socket.join(room.room_name);
          }
        }
      });
      if (found_room === false) {
        socket.emit('connect-user-to-room-failed', "Room not found");
        console.log("Failed to find room: " + arg.room);
      }
    }
  }); 
  //
  socket.on('create-room', (arg) => {
    if (arg.room_speed === '' || parseInt(arg.room_speed) === NaN) {
      arg.room_speed = 1;
    }
    if (arg.length <= MIN_ROOM_NAME_LENGTH) {
      socket.emit('create-room-failed', "Room name too small, Minimum length is " + MIN_ROOM_NAME_LENGTH);
    } else {
      let found_room = false;
      rooms.forEach(room => {
        if (room.room_name === arg.room_name) {
          found_room = true;
        }
      });
      if (found_room) {
        console.log("Requsted room: " + arg.room_name + ", already exists!");
        socket.emit('create-room-failed', "Room already exists.");
      } else {
        console.log("Created room: " + arg.room_name);
        rooms.push(new Room(arg.room_name, arg.room_speed));
        socket.emit('create-room-success', arg.room_name);
      }
    }
  });
  //
  socket.on("movement-event", (data) => {
    /* deprecated
    let found_room = false;
    rooms.forEach(_room => {
      if (_room.room_name === data.room) {
        found_room = true;
        _room.addEvent(socket.id, "movement-event", data.event);
      }
    });
    if (!found_room) {
      //console.log("Room: " + data.room + ", couldn't be found?");
    }
      */
  });
  socket.on("change-direction-event", (data) => {
    let found_room = false;
    rooms.forEach(_room => {
      if (_room.room_name === data.room) {
        found_room = true;
        _room.addEvent(socket.id, "change-direction-event", data.event);
      }
      if (!found_room) {
        //console.log("Room: " + data.room + ", couldn't be found?");
      }
    });
  });
  socket.on("connected-to-room", (_room_name) => {
    rooms.forEach(room => {
      if (room.room_name === _room_name) {
        room.toggleUserConnection(socket.id);
      }
    });
  });
});

// handle rooms
setInterval( () => {
  rooms.forEach(room => {
    room.handleRoom();
    io.to(room.room_name).emit("render", room);
  });
}, 10);
// handle connection
setInterval(() => {
  rooms.forEach(room => {
    room.handleConnectionTest();
  });
}, 10000);

//
class EntityComponent {
  constructor(size = 3, direction = 'Right') {
    this.body = [{ x: 0, y: 0 }];
    this.size = size;
    this.direction = direction;
  }

  addPoints(bonus) {
    for (let i = 0; i < bonus; i++) {
      const lastSegment = this.body[this.body.length - 1];
      let newSegment;

      switch (this.direction) {
        case 'Up':
          // y offset down
          newSegment = { x: lastSegment.x, y: lastSegment.y + this.size };
          break;
        case 'Down':
          // y offset up
          newSegment = { x: lastSegment.x, y: lastSegment.y - this.size };
          break;
        case 'Left':
          // x offset left
          newSegment = { x: lastSegment.x + this.size, y: lastSegment.y };
          break;
        case 'Right':
          // y offset right
          newSegment = { x: lastSegment.x - this.size, y: lastSegment.y };
          break;
      }
      // add the new segment to the end
      this.body.push(newSegment);
    }
  }

  getHead() {
    return this.body[0];
  }

  getSize() {
    return this.size;
  }

  move(direction, velocity, room_width, room_height) {
    // Logic with opposite direction change restriction
    const isOpposite =
      (this.direction === 'Up' && direction === 'Down') ||
      (this.direction === 'Down' && direction === 'Up') ||
      (this.direction === 'Left' && direction === 'Right') ||
      (this.direction === 'Right' && direction === 'Left');

    if (!isOpposite) {
      this.direction = direction;
    }
    // */
    //this.direction = direction;
      

    const head = structuredClone(this.body[0]);
    switch (this.direction) {
      case 'Up':
        head.y -= velocity;
        break;
      case 'Down':
        head.y += velocity;
        break;
      case 'Left':
        head.x -= velocity;
        break;
      case 'Right':
        head.x += velocity;
        break;
    }
    // is withing game boundaries, logic for collapsing
    //head.x = Math.max(0, Math.min(head.x, room_width - this.size));
    //head.y = Math.max(0, Math.min(head.y, room_height - this.size));
    const isOutside = 
    (
    (head.x < 0) ||
    (head.x >= (room_width - this.size)) ||
    (head.y < 0) ||
    (head.y >= (room_height - this.size))
    );
    if (!isOutside) {
      // push new head
      this.body.unshift(head);
      // rm-rf tail
      this.body.pop();
    }
    
  }
}

class Entity {
  constructor(name, id, entity_component = {}) {
    this.name = name;
    this.id = id;
    this.entity_component = entity_component;
    this.event_type = "";
    this.event = {};
    this.connected = true;
  }
};

class Room {
  constructor(room, speed = 1) {
      this.VELOCITY = 0.4 * speed;
      this.MAX_DENSITY = 100;
      this.MAX_POINT_COUNT = 100;
      //
      this.room_name = room;
      this.entities = []; 
      this.width = 100;
      this.height = 100;
      this.point_counter = 0;
      this.point_bonus = 2;
  }
  // Connections
  handleConnectionTest() {
    io.to(this.room_name).emit("connection-test");
    setTimeout(() => {
      this.kickInactive();
      this.resetConnections(); 
    }, 5000); 
  }
  kickInactive() {
    this.entities.forEach(entity => {
      if (!entity.connected && entity.id !== 'point') {
        this.unsubscribe(entity);
      }
    });
  }
  resetConnections() {
    this.entities.forEach(entity => {
      entity.connected = false;
    });
  }
  toggleUserConnection(socket_id) {
    this.entities.forEach(entity => {
      if (entity.id === socket_id) {
        entity.connected = true;
      }
    });
  }
  //
  addPoints(point_count) {
    for (let i = 0; i < point_count; i++) {
      let point_component = this.getNewEntitySpace(1);
      if (typeof point_component === 'string') {
        return;
      } else {
        let point = new Entity('', 'point', point_component);
        this.point_counter++;
        this.subscribe(point);
      }
    }
  }
  //
  checkHeadOnCollision(player) {
    const head = new EntityComponent();
    head.body = [player.entity_component.body[0]];
    let collided = false;
  
    this.entities.forEach(entity => {
      if (entity.id !== player.id && !collided) {
        if (areIntersectingHead(head, entity.entity_component)) {
          entity.entity_component.addPoints(player.entity_component.getSize());
          this.unsubscribe(player);
          collided = true; 
        }
      }
    });
  
    return collided;
  }
  //
  handleRoom() {
    this.entities.forEach(player => {
      if (player.event_type === "change-direction-event") {
        player.entity_component.move(player.event.new_direction, this.VELOCITY, this.width, this.height);
        if (this.checkHeadOnCollision(player)) {
          return;
        }
        // add points
        let bonus = this.handlePointCollision(player);
        if (bonus > 0) {
          player.entity_component.addPoints(bonus);
        }
      }
    });
    if (this.point_counter < this.MAX_POINT_COUNT) {
      this.addPoints(this.MAX_POINT_COUNT - this.point_counter);
    }
  }
  

  handlePointCollision(player) {
    let rm = [];
    this.entities.forEach(entity => {
      if (entity.id === 'point') {
        // its a point
        if (areIntersecting(player.entity_component, entity.entity_component)) {
          rm.push(entity);
        }
      }
    });
    let bonus = rm.length;
    rm.forEach(entity => {
      this.point_counter--;
      this.unsubscribe(entity);
    });
    return bonus;
  }

  addEvent(player_socket_id, type, event) {
    let found_player = false;
    this.entities.forEach(player => {
      if (player.id === player_socket_id) {
        found_player = true;
        player.event_type = type;
        player.event = event;
      }
    });
    if (!found_player) { 
      console.log("Entity was not found within the room!");
    }
  }

  getNewEntitySpace(size = 3) {
    let found_space = false;
    let new_entity_space = new EntityComponent(size);
    let counter = 0;
    while (!found_space) {
      if (counter === this.MAX_DENSITY) {
        return "too crowded!";
      }
      counter++;
      new_entity_space.body[0].x = Math.floor(Math.random() * (this.width));
      new_entity_space.body[0].y = Math.floor(Math.random() * (this.width));
      let intersects = false;
      this.entities.forEach(entity => {
        if (areIntersecting(new_entity_space, entity.entity_component)) {
          intersects = true;
        }
      });
      
      if (!intersects) {
        found_space = true;
      }
    }
    return new_entity_space;
  }

  subscribe(entity) {
    this.entities.push(entity);
  }

  unsubscribe(entity) {
    this.entities = this.entities.filter((_entity) => _entity !== entity);
  }
}

function areIntersectingHead(entity_1, entity_2) {
  let collision = false;
  entity_1.body.forEach(part_1 => {
    entity_2.body.slice(1).forEach(part_2 => {
      if (
        part_1.x < part_2.x + entity_2.size &&
        part_1.x + entity_1.size > part_2.x &&
        part_1.y < part_2.y + entity_2.size &&
        part_1.y + entity_1.size > part_2.y
      ) {
        // Collision 
        collision = true;
      }
    });
  });
  return collision;
}

function areIntersecting(entity_1, entity_2) {
  let collision = false;
  entity_1.body.forEach(part_1 => {
    entity_2.body.forEach(part_2 => {
      if (
        part_1.x < part_2.x + entity_2.size &&
        part_1.x + entity_1.size > part_2.x &&
        part_1.y < part_2.y + entity_2.size &&
        part_1.y + entity_1.size > part_2.y
      ) {
        // Collision 
        collision = true;
      }
    });
  });
  return collision;
}

// Create a single global room
rooms.push(new Room('FFA'));