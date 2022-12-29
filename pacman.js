// Citations: Basic Pacman movement layout/design adapted from https://phaser.io/tutorials/coding-tips-005
// Movement not exactly copied (except for getting tiles to left/right/up/down and fuzzy comparison), but helped establish the basics and foundation

// Had help implementing objects from: https://medium.com/@alizah.lalani/collecting-objects-in-phaser-3-platformer-games-using-tiled-4e9298cbfc85

// Not really a citation, but this website was crucial in understanding and implementing the ghost AI: https://gameinternals.com/understanding-pac-man-ghost-behavior

// And of course, the sprites and sounds are not owned by me and are owned by NAMCO. This is meant as an *educational* project to see how closely I can mimic
// the original arcade game. *None of the game's sprites and sounds will be redistributed outside of this project being turned in for a grade.*
// (I believe this is OK because I noted I would be trying to make the game look and sound just like the original in my project proposal; and other projects/works for CS50, like
// Ivy's Hardest Game, contain copyrighted works).
var config = {
    type: Phaser.AUTO,
    width: 28 * 8,
    height: 34 * 8 + (8 * 3),
    render: {
        pixelArt: true,
        antialias: false,
        autoResize: false
    },

    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Initialize a bunch of variables -- if I were to do this again, I would have put them all in an object,
// but alas.

const BLINKY = "blinky";
const PINKY = "pinky";
const INKY = "inky";
const CLYDE = "clyde";

const MAP_BEGIN = 24;
const MAZE_OFFSET = 12.5;
const ANIM_FRAMES = 20;
const TILE_SIZE = 8;
const START_X = 112.5;
const START_Y = 188.5 + MAP_BEGIN;
const MAP_BOUND = 216;
const TURN_BONUS = 30;

const BLINKY_SCATTER_X = 25;
const BLINKY_SCATTER_Y = -3;

const PINKY_SCATTER_X = 2;
const PINKY_SCATTER_Y = -3;

const INKY_SCATTER_X = 27;
const INKY_SCATTER_Y = 31;

const CLYDE_SCATTER_X = 0;
const CLYDE_SCATTER_Y = 31;

const WARP_TILE_Y = 14;
const WARP_LEFT_TILE_X = 3;
const WARP_RIGHT_TILE_X = 22;

const FRIGHTENED_SPEED_PENALTY = 15;

const X_Y_OFFSET = 4.5;

const START_LIVES = 3;

const SCORE_COOKIE_NAME = "pacHighestScore";

const NUM_DOTS = 244;

const MAP_DEPTH = -10;

const DEFAULT_GHOST_THRESHOLD = 0.66;

const P_TIMER_INDEX = 7;

const EATEN_SPEED_MULT = 3;
const EATEN_TP_THRESHOLD_MULT = 2;

const SCATTER = 0;
const CHASE = 1;

const SCORE_X = TILE_SIZE * 5;

const HIGH_SCORE_X = TILE_SIZE * 17;

const EATEN_TARGET_X = 13;

const EATEN_TARGET_Y = 11;

const WARP_LEFT_X = -16;
const WARP_RIGHT_X = 230;

const TURN_BONUS_DELAY = 50;

const FRIGHTENED_DURATION = 3;

const WARP_SPEED_PENALTY = 15;

const CAGE_SPEED_DELTA = 15;

const GHOST_SIZE = 14;

let combo = 0;

let dots;

let power_pellets;

let waka_sound = [];

let waka_count = 0;

let resetting = false;

let siren_sound = [];

let curr_siren = 0;

let frightened_sound;

let ghost_eat_sound;

let ghost_eyes_sound;

let jingle;

let death_sound;

let new_life_sound;

let ghosts = [];

let ghost_mode = SCATTER;

let show_targets = false;

let pause_sounds = false;

let player;
let blinky;
let pinky;
let inky;
let clyde;
var game = new Phaser.Game(config);

let lives_display = [];

let disallow_control = false;

let blinky_target;
let inky_target;
let pinky_target;
let clyde_target;

let timers = [];
let pellet_timer = null;

let ready_text;


let score = {
    disp: null,
    value: null,
    updateDisp: function() {
        // The player gains a single extra life when the score reaches 10000.
        // Never again can you get another extra life. Harsh.
        if (this.value >= 10000 && !player.attrs.gotExtraLife) {
            lives_display[player.attrs.lives].setVisible(true);
            player.attrs.lives++;
            player.attrs.gotExtraLife = true;
            new_life_sound.play();
        }

        let str_score = this.value.toString();

        this.disp.setText(str_score);
        this.disp.setX(SCORE_X - TILE_SIZE * (str_score.length - 2) - 4)
    }
}
let high_score = {
    disp: null,
    value: null,
    updateDisp: function() {
        if (score.value > this.value) {
            this.value = score.value;
        }

        let str_score = this.value.toString();

        this.disp.setText(str_score);
        this.disp.setX(HIGH_SCORE_X - TILE_SIZE * (str_score.length - 1) - str_score.length / 2)

    }
}

let pellet_anim_timer = null;

// end variable declarations

// Classes for the attributes of pacman and the ghosts respectively
class PlayerAttrs {
    constructor() {
        this.speed = 58;
        this.turnThreshold = 0.75;
        this.currTileX = 0;
        this.currTileY = 0;
        this.turnpoint = [{
            x: -1,
            y: -1
        }];
        this.storedDirection = Phaser.LEFT;
        this.currentDirection = Phaser.LEFT;
        this.directions = [];
        this.animKeys = {
            "left": "left",
            "right": "right",
            "up": "up",
            "down": "down"
        }
    }
}

class GhostAttrs extends PlayerAttrs {
    constructor(scatterTileX, scatterTileY, spawnX, spawnY, name) {
        super();
        this.name = name;
        this.scatterTile = {
            x: scatterTileX,
            y: scatterTileY + MAP_BEGIN / 8
        }
        this.storedDirection = 0;
        this.turnThreshold = 0.66;
        this.spawning = false;
        this.eaten = false;
        this.isFrightened = false;
        this.enteringCage = false;
        this.exitingCage = false;
        this.waiting = true;
        if (name === BLINKY || name === PINKY)
            this.waiting = false;
        this.spawn = {
            x: spawnX,
            y: spawnY
        }

        this.target = {
            x: 50,
            y: 0
        }
        this.collider = null;
        this.wallCollider = null;
        this.waitTimer = 10;
        this.speed = 55;
        this.isInWarp = false;

        this.animKeys['left'] = name + '_left';
        this.animKeys['right'] = name + '_right';
        this.animKeys['down'] = name + '_down';
        this.animKeys['up'] = name + '_up';

        this.chase = function() {};
    }



    scatter() {
        this.target.x = this.scatterTile.x;
        this.target.y = this.scatterTile.y;
    }
}

// Make all the timers.
function make_timers(canvas) {
    ghost_mode = SCATTER;

    let scatter_count = 0;
    let scatter_threshold = 7;
    let chase_count = 0;
    let chase_threshold = 20;
    let cycle_count = 0;

    // Scatter 7 seconds, then chase 20, scatter 7 seconds, then chase 20, scatter 5 seconds, then chase 20,
    // scatter 5 seconds, chase forever.

    // Both timers update every second (if unpaused) and pause themselves after a certain duration (5/7/20 seconds),
    // producing the effect above ^
    let scatter_timer = canvas.time.addEvent({
        delay: 1000,
        callback: function() {
            scatter_count++;
            if (scatter_count >= scatter_threshold) {
                ghost_mode = CHASE;
                scatter_timer.paused = true;
                scatter_count = 0;
                chase_timer.paused = false;
            }
        },
        callbackScope: this,
        loop: true
    })

    let chase_timer = canvas.time.addEvent({
        delay: 1000,
        callback: function() {
            chase_count++;
            if (chase_count >= chase_threshold) {
                ghost_mode = SCATTER;
                chase_timer.paused = true;
                cycle_count++;
                chase_count = 0;
                if (cycle_count > 3)
                    return;
                if (cycle_count > 1)
                    scatter_threshold = 5;
                scatter_timer.paused = false;
            }
        },
        callbackScope: this,
        loop: true
    });

    chase_timer.paused = true;

    let pellet_switch = false;

    if (pellet_anim_timer === null) {
        // Timer for pellet blinking. Toggle every 1/4th of a second.
        pellet_anim_timer = canvas.time.addEvent({
            delay: 250,
            callback: function() {
                power_pellets.children.entries.forEach(pellet => {
                    pellet.visible = pellet_switch;
                });
                pellet_switch = !pellet_switch;
            },
            callbackScope: this,
            loop: true
        });
    }

    // timers is a holder for all the timers, except the pellet animation timer, since that is normally never paused.
    timers = [scatter_timer, chase_timer, pellet_timer];
}

// Set each ghost's direction to the opposite (for changing modes), unless they are frightened.
function reverse_ghosts() {
    ghosts.forEach(enemy => {
        if (!enemy.attrs.isFrightened) {
            enemy.attrs.currentDirection = getOppositeDirection(enemy.attrs.currentDirection);
            enemy.attrs.turnpoint.x = -1;
            enemy.attrs.turnpoint.y = -1;
        }
    });
}

// Load all the assets.
function preload() {

    this.load.spritesheet('pacman', 'assets/images/pacman_normal2.png', {
        frameWidth: 13,
        frameHeight: 13,
        margin: 0
    });

    this.load.image('tiles', 'assets/images/stage_sprites_split.png');

    this.load.image('pac_life', 'assets/images/pac_life.png');

    this.load.tilemapTiledJSON('map', 'assets/pac.json');

    this.load.tilemapTiledJSON('map_blink', 'assets/map_blink.json');

    this.load.image("dot", "assets/images/dot.png");

    this.load.spritesheet('blinky', 'assets/images/blinky.png', {
        frameWidth: GHOST_SIZE,
        frameHeight: GHOST_SIZE,
        margin: 0
    });

    this.load.spritesheet('pinky', 'assets/images/pinky.png', {
        frameWidth: GHOST_SIZE,
        frameHeight: GHOST_SIZE,
        margin: 0
    });

    this.load.spritesheet('inky', 'assets/images/inky.png', {
        frameWidth: GHOST_SIZE,
        frameHeight: GHOST_SIZE,
        margin: 0
    });

    this.load.spritesheet('clyde', 'assets/images/clyde.png', {
        frameWidth: GHOST_SIZE,
        frameHeight: GHOST_SIZE,
        margin: 0
    });

    this.load.spritesheet('pac_death', 'assets/images/pac_death.png', {
        frameWidth: 15,
        frameHeight: 13,
        spacing: 1
    });

    this.load.spritesheet('frightened', 'assets/images/frightened.png', {
        frameWidth: GHOST_SIZE,
        frameHeight: GHOST_SIZE,
        margin: 0
    });

    this.load.spritesheet('eaten_ghost', 'assets/images/eaten_ghost.png', {
        frameWidth: GHOST_SIZE,
        frameHeight: GHOST_SIZE,
        margin: 0
    });

    this.load.spritesheet('ghost_eat_combos', 'assets/images/ghost_eat_combos.png', {
        frameWidth: 16,
        frameHeight: 7,
        margin: 0
    })

    this.load.spritesheet('numbers', 'assets/images/numbers.png', {
        frameWidth: 7,
        frameHeight: 7,
        spacing: 1
    })

    this.load.image('power_pellet', 'assets/images/power_pellet.png');
    this.load.image('cage_gate', 'assets/images/cage_gate.png');

    this.load.audio('waka1', 'assets/sounds/waka1.mp3');
    this.load.audio('waka2', 'assets/sounds/waka2.mp3');

    this.load.audio('death', 'assets/sounds/death.mp3');
    this.load.audio('ghost_eat', 'assets/sounds/ghost_eat.mp3');

    this.load.audio('siren1', 'assets/sounds/siren1.mp3');
    this.load.audio('siren2', 'assets/sounds/siren2.mp3');

    this.load.audio('frightened', 'assets/sounds/frightened.mp3');
    this.load.audio('ghost_eyes', 'assets/sounds/ghost_eyes.mp3');

    this.load.audio('jingle', 'assets/sounds/jingle.mp3');
    this.load.audio('new_life', 'assets/sounds/new_life.mp3');

}


// Now create every sound, object, animation. Lots of this is Phaser-specific and/or self-explanatory,
// so there are not many comments here.
// This takes up a massive bulk of the project, unfortunately, due to the abundance of each.
// Then, begin the startup animation and let the game begin
function create() {

    let waka1 = this.sound.add('waka1', {
        volume: 0.5
    });
    let waka2 = this.sound.add('waka2', {
        volume: 0.5
    });
    waka_sound = [waka1, waka2];
    death_sound = this.sound.add('death');

    ghost_eat_sound = this.sound.add('ghost_eat');
    ghost_eyes_sound = this.sound.add('ghost_eyes');
    ghost_eyes_sound.setLoop(true);

    frightened_sound = this.sound.add('frightened');
    frightened_sound.setLoop(true);

    jingle = this.sound.add('jingle');
    new_life_sound = this.sound.add('new_life');

    let siren1 = this.sound.add('siren1');
    siren1.setLoop(true);

    let siren2 = this.sound.add('siren2');
    siren2.setLoop(true);

    siren_sound = [siren1, siren2];

    this.map = this.make.tilemap({
        key: "map"
    });

    this.map_blink = this.make.tilemap({
        key: "map_blink"
    });

    const tileset = this.map.addTilesetImage('stage sprites', 'tiles');

    this.walls = this.map.createStaticLayer("walls", tileset, 0, MAP_BEGIN);

    this.blink_walls = this.map_blink.createStaticLayer("walls", tileset, 0, MAP_BEGIN);

    this.blink_walls.setVisible(false);

    this.walls.setDepth(MAP_DEPTH);
    this.blink_walls.setDepth(MAP_DEPTH);

    this.emptyTiles = this.map.createStaticLayer("empty", tileset, 0, MAP_BEGIN);

    this.emptyTiles.setDepth(MAP_DEPTH);

    this.dotLayer = this.map.getObjectLayer('dots')['objects'];

    this.powerPelletLayer = this.map.getObjectLayer('powerPellets')['objects'];

    dots = this.physics.add.staticGroup();

    power_pellets = this.physics.add.staticGroup();

    // Initialize dots and pellets
    this.dotLayer.forEach(object => {
        let obj = dots.create(object.x, object.y - TILE_SIZE + MAP_BEGIN, "dot");
        obj.setScale(object.width / TILE_SIZE, object.height / TILE_SIZE);
        obj.setOrigin(0);
        obj.body.setOffset(TILE_SIZE - 1, TILE_SIZE - 1);
        obj.body.width = TILE_SIZE / 4;
        obj.body.height = TILE_SIZE / 4;
    });

    this.powerPelletLayer.forEach(object => {
        let obj = power_pellets.create(object.x, object.y - TILE_SIZE + MAP_BEGIN, "power_pellet");
        obj.setScale(object.width / TILE_SIZE, object.height / TILE_SIZE);
        obj.setOrigin(0);
        obj.body.setOffset(TILE_SIZE - 1, TILE_SIZE - 1);
        obj.body.width = TILE_SIZE / 4;
        obj.body.height = TILE_SIZE / 4;
    });

    this.walls.setCollisionBetween(0, 144);

    this.cageGate = this.add.image(START_X, START_Y - TILE_SIZE * 11 + TILE_SIZE / 4, 'cage_gate');

    player = this.physics.add.sprite(START_X, START_Y, 'pacman', 11);
    player.setCollideWorldBounds(false);
    player.attrs = new PlayerAttrs();

    player.attrs.lives = START_LIVES;
    player.attrs.gotExtraLife = false;

    player.setScale(1);
    player.setSize(TILE_SIZE, TILE_SIZE, true);
    player.setBounce(0, 0);
    player.setImmovable();

    for (let i = 0; i <= player.attrs.lives; i++) {
        let life = this.add.image(TILE_SIZE * (2 + 2 * i), TILE_SIZE * 36 - 4, 'pac_life');
        lives_display.push(life);
    }
    lives_display[lives_display.length - 1].setVisible(false);

    blinky = this.physics.add.sprite(START_X, START_Y - TILE_SIZE * 12, BLINKY, 3);

    blinky.attrs = new GhostAttrs(BLINKY_SCATTER_X, BLINKY_SCATTER_Y, START_X, START_Y - TILE_SIZE * 12, BLINKY);
    blinky.attrs.spawning = false;
    blinky.setCollideWorldBounds(false);


    blinky.setScale(1);
    blinky.setSize(1, 1, true);
    blinky.setBounce(0, 0);
    blinky.setImmovable();

    // Blinky's chase function is simple. He targets pacman's current position. Nothing super special.
    blinky.attrs.chase = function() {
        blinky.attrs.target.x = player.attrs.currTileX;
        blinky.attrs.target.y = player.attrs.currTileY + MAP_BEGIN / 8;
    }

    pinky = this.physics.add.sprite(START_X, START_Y - TILE_SIZE * 9, PINKY, 3);
    pinky.setCollideWorldBounds(false);
    pinky.attrs = new GhostAttrs(PINKY_SCATTER_X, PINKY_SCATTER_Y, START_X, START_Y - TILE_SIZE * 9, PINKY);
    pinky.setScale(1);
    pinky.setSize(1, 1, true);
    pinky.setBounce(0, 0);
    pinky.setImmovable();

    // Pinky's chase function is simple. She targets 4 tiles in front of where pacman is headed.
    // However, an overflow bug in the original game causes her to target 4 tiles to the left and up from pacman
    // if he faces up. I have replicated that here.
    pinky.attrs.chase = function() {
        switch (player.attrs.currentDirection) {
            case Phaser.LEFT:
                pinky.attrs.target.x = player.attrs.currTileX - 4;
                pinky.attrs.target.y = player.attrs.currTileY + MAP_BEGIN / TILE_SIZE;
                break;
            case Phaser.RIGHT:
                pinky.attrs.target.x = player.attrs.currTileX + 4;
                pinky.attrs.target.y = player.attrs.currTileY + MAP_BEGIN / TILE_SIZE;
                break;
            case Phaser.UP:
                // Replicating overflow bug in original game AI
                pinky.attrs.target.x = player.attrs.currTileX - 4;
                pinky.attrs.target.y = player.attrs.currTileY - 4 + MAP_BEGIN / TILE_SIZE;
                break;
            case Phaser.DOWN:
                pinky.attrs.target.x = player.attrs.currTileX;
                pinky.attrs.target.y = player.attrs.currTileY + 4 + MAP_BEGIN / TILE_SIZE;
                break;
        }
    }

    inky = this.physics.add.sprite(START_X - TILE_SIZE * 2, START_Y - TILE_SIZE * 9, INKY, 3);
    inky.setCollideWorldBounds(false);
    inky.attrs = new GhostAttrs(INKY_SCATTER_X, INKY_SCATTER_Y, START_X - TILE_SIZE * 2, START_Y - TILE_SIZE * 9, INKY);

    inky.setScale(1);
    inky.setSize(GHOST_SIZE, GHOST_SIZE, true);
    inky.setBounce(0, 0);
    inky.setImmovable();
    inky.attrs.waitTimer = 20;

    // Inky's chase function is the most complex. First, he chooses the tile 2 tiles ahead of where
    // Pacman is headed (has the same bug as pinky though -- if facing up, he chooses two tiles up and
    // to the left of Pacman). Then, he draws a line between Blinky (the red ghost) and this tile. He then
    // doubles that line's distance; wherever it ends up, even if off the map, is his new target tile.
    inky.attrs.chase = function() {
        let tileX;
        let tileY;
        switch (player.attrs.currentDirection) {
            case Phaser.LEFT:
                tileY = player.attrs.currTileY;
                tileX = player.attrs.currTileX - 2;
                break;
            case Phaser.RIGHT:
                tileY = player.attrs.currTileY;
                tileX = player.attrs.currTileX + 2;
                break;
            case Phaser.UP:
                // Replicating bug in original game due to overflow
                tileY = player.attrs.currTileY - 2;
                tileX = player.attrs.currTileX - 2;
                break;
            case Phaser.DOWN:
                tileY = player.attrs.currTileY + 2;
                tileX = player.attrs.currTileX;
                break;
        }

        let vecX = (tileX - blinky.attrs.currTileX) * 2;
        let vecY = (tileY - blinky.attrs.currTileY) * 2;

        inky.attrs.target.x = blinky.attrs.currTileX + vecX;
        inky.attrs.target.y = blinky.attrs.currTileY + vecY + MAP_BEGIN / TILE_SIZE;

    }

    clyde = this.physics.add.sprite(START_X + TILE_SIZE * 2, START_Y - TILE_SIZE * 9, CLYDE, 3);
    clyde.setCollideWorldBounds(false);
    clyde.attrs = new GhostAttrs(CLYDE_SCATTER_X, CLYDE_SCATTER_Y, START_X + TILE_SIZE * 2, START_Y - TILE_SIZE * 9, CLYDE);

    clyde.setScale(1);
    clyde.setSize(GHOST_SIZE, GHOST_SIZE, true);
    clyde.setBounce(0, 0);
    clyde.setImmovable();
    clyde.attrs.waitTimer = 35;

    // Clyde's chase function is also pretty simple. If farther than 8 tiles away from Pacman, his target is Pacman's current tile.
    // However, when closer than 8 tiles to Pacman, he targets his scatter tile instead.
    clyde.attrs.chase = function() {
        if (distance(clyde.attrs.currTileX, clyde.attrs.currTileY, player.attrs.currTileX, player.attrs.currTileY) > 8) {
            clyde.attrs.target.x = player.attrs.currTileX;
            clyde.attrs.target.y = player.attrs.currTileY + MAP_BEGIN / TILE_SIZE;
            return;
        }

        clyde.attrs.target.x = clyde.attrs.scatterTile.x;
        clyde.attrs.target.y = clyde.attrs.scatterTile.y;
    }


    ghosts.push(pinky);
    ghosts.push(blinky);
    ghosts.push(inky);
    ghosts.push(clyde);


    this.physics.add.collider(player, this.walls, wallStop, null, this);

    ghosts.forEach(enemy => {
        enemy.attrs.wallCollider = this.physics.add.collider(enemy, this.walls, ghostBounce, null, this);
        enemy.setFriction(0);
        enemy.setMass(0);
        enemy.attrs.collider = this.physics.add.overlap(player, enemy, ghostCollide, null, this);
        enemy.attrs.currentDirection = Phaser.UP;
    });

    pinky.attrs.currentDirection = Phaser.DOWN;
    pinky.attrs.spawning = true;

    blinky.attrs.wallCollider.active = false;
    pinky.attrs.wallCollider.active = false;
    blinky.attrs.currentDirection = Phaser.LEFT;

    this.physics.add.overlap(player, dots, collectDot, null, this);
    this.physics.add.overlap(player, power_pellets, collectPellet, null, this);

    this.anims.create({
        key: 'frightened1',
        frames: this.anims.generateFrameNumbers('frightened', {
            frames: [1, 0]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'frightened2',
        frames: this.anims.generateFrameNumbers('frightened', {
            frames: [2, 0, 3, 1]
        }),
        frameRate: ANIM_FRAMES / 4,
        repeat: -1
    });

    this.anims.create({
        key: 'blinky_right',
        frames: this.anims.generateFrameNumbers('blinky', {
            frames: [1, 0]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'blinky_left',
        frames: this.anims.generateFrameNumbers('blinky', {
            frames: [3, 2]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'blinky_up',
        frames: this.anims.generateFrameNumbers('blinky', {
            frames: [5, 4]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'blinky_down',
        frames: this.anims.generateFrameNumbers('blinky', {
            frames: [7, 6]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'pinky_right',
        frames: this.anims.generateFrameNumbers('pinky', {
            frames: [1, 0]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'pinky_left',
        frames: this.anims.generateFrameNumbers('pinky', {
            frames: [3, 2]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'pinky_up',
        frames: this.anims.generateFrameNumbers('pinky', {
            frames: [5, 4]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'pinky_down',
        frames: this.anims.generateFrameNumbers('pinky', {
            frames: [7, 6]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'inky_right',
        frames: this.anims.generateFrameNumbers('inky', {
            frames: [1, 0]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'inky_left',
        frames: this.anims.generateFrameNumbers('inky', {
            frames: [3, 2]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'inky_up',
        frames: this.anims.generateFrameNumbers('inky', {
            frames: [5, 4]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'inky_down',
        frames: this.anims.generateFrameNumbers('inky', {
            frames: [7, 6]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'clyde_right',
        frames: this.anims.generateFrameNumbers('clyde', {
            frames: [1, 0]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'clyde_left',
        frames: this.anims.generateFrameNumbers('clyde', {
            frames: [3, 2]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'clyde_up',
        frames: this.anims.generateFrameNumbers('clyde', {
            frames: [5, 4]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'clyde_down',
        frames: this.anims.generateFrameNumbers('clyde', {
            frames: [7, 6]
        }),
        frameRate: ANIM_FRAMES / 2,
        repeat: -1
    });

    this.anims.create({
        key: 'eaten_right',
        frames: this.anims.generateFrameNumbers('eaten_ghost', {
            frames: [0]
        }),
        frameRate: 1,
        repeat: 0
    });

    this.anims.create({
        key: 'eaten_left',
        frames: this.anims.generateFrameNumbers('eaten_ghost', {
            frames: [1]
        }),
        frameRate: 1,
        repeat: 0
    });

    this.anims.create({
        key: 'eaten_up',
        frames: this.anims.generateFrameNumbers('eaten_ghost', {
            frames: [2]
        }),
        frameRate: 1,
        repeat: 0
    });

    this.anims.create({
        key: 'eaten_down',
        frames: this.anims.generateFrameNumbers('eaten_ghost', {
            frames: [3]
        }),
        frameRate: 1,
        repeat: 0
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('pacman', {
            frames: [0, 1, 11]
        }),
        frameRate: ANIM_FRAMES,
        repeat: -1
    });

    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('pacman', {
            frames: [3, 4, 11]
        }),
        frameRate: ANIM_FRAMES,
        repeat: -1
    });

    this.anims.create({
        key: 'down',
        frames: this.anims.generateFrameNumbers('pacman', {
            frames: [9, 10, 11]
        }),
        frameRate: ANIM_FRAMES,
        repeat: -1
    });

    this.anims.create({
        key: 'up',
        frames: this.anims.generateFrameNumbers('pacman', {
            frames: [6, 7, 11]
        }),
        frameRate: ANIM_FRAMES,
        repeat: -1
    });

    this.anims.create({
        key: 'death',
        frames: this.anims.generateFrameNumbers('pac_death'),
        frameRate: 8,
        repeat: 0
    });

    this.anims.create({
        key: 'ghost_eat_combos',
        frames: this.anims.generateFrameNumbers('ghost_eat_combos'),
        frameRate: 0,
        repeat: 0
    });


    cursors = this.input.keyboard.createCursorKeys();

    // debug showcase, made hastily and not for the actual game
    blinky_target = this.add.rectangle(blinky.attrs.target.x * 8, blinky.attrs.target.y * 8, 8, 8, 0xff0000, 0.5);
    blinky_target.setOrigin(0);

    pinky_target = this.add.rectangle(pinky.attrs.target.x * 8, pinky.attrs.target.y * 8, 8, 8, 0xF83BFC, 0.5);
    pinky_target.setOrigin(0);

    inky_target = this.add.rectangle(inky.attrs.target.x * 8, inky.attrs.target.y * 8, 8, 8, 0x1EFFFB, 0.5);
    inky_target.setOrigin(0);

    clyde_target = this.add.rectangle(clyde.attrs.target.x * 8, clyde.attrs.target.y * 8, 8, 8, 0xFF8B1E, 0.5);
    clyde_target.setOrigin(0);
    // end debug showcase


    // Add UI and startup text ("HIGH SCORE", "1UP", "PLAYER ONE", "READY!")
    // Note that each word has to be created separately because using spaces makes the text blurry for some reason that I am still not sure of.
    this.add.text(TILE_SIZE * 10 - 4, -TILE_SIZE * 5, 'HIGH', {
        fontFamily: 'font1',
        color: "#FFFFFF",
        fontSize: "7px",
        resolution: 3
    });

    this.add.text(TILE_SIZE * 15 - 3, -TILE_SIZE * 5, 'SCORE', {
        fontFamily: 'font1',
        color: "#FFFFFF",
        fontSize: "7px",
        resolution: 3
    });

    this.add.text(TILE_SIZE * 3 - 3, -TILE_SIZE * 5, "1UP", {
        fontFamily: 'font1',
        color: "#FFFFFF",
        fontSize: "7px",
        resolution: 3
    });

    high_score.disp = this.add.text(TILE_SIZE * 17, TILE_SIZE - TILE_SIZE * 5, '0', {
        fontFamily: 'font1',
        color: "#FFFFFF",
        fontSize: "7px",
        resolution: 3
    });

    score.disp = this.add.text(TILE_SIZE * 5 - 2, TILE_SIZE - TILE_SIZE * 5, '00', {
        fontFamily: 'font1',
        color: '#FFFFFF',
        fontSize: "7px",
        resolution: 3
    });

    score.value = 0;

    ready_text = this.add.text(START_X - TILE_SIZE * 2 - 5, START_Y - TILE_SIZE * 7 - TILE_SIZE * 5, 'READY!', {
        fontFamily: 'font1',
        color: "#FDEF29",
        fontSize: "7px",
        resolution: 3
    });

    this.startup_text = this.add.text(START_X - TILE_SIZE * 4 - 5, START_Y - TILE_SIZE * 13 - TILE_SIZE * 5, 'PLAYER', {
        fontFamily: 'font1',
        color: "#00E8FF",
        fontSize: "7px",
        resolution: 3
    })

    this.startup_text2 = this.add.text(START_X + TILE_SIZE * 3 - 8, START_Y - TILE_SIZE * 13 - TILE_SIZE * 5, 'ONE', {
        fontFamily: 'font1',
        color: "#00E8FF",
        fontSize: "7px",
        resolution: 3
    });

    // Get the high score stored in cookies.
    let cookie_score = getCookie(SCORE_COOKIE_NAME);

    if (!cookie_score)
        high_score.value = 0;
    else {
        high_score.value = parseInt(cookie_score);
        high_score.updateDisp();
    }

    // Finally, ready for the startup sequence
    disallow_control = true;
    pause_sounds = true;
    player.setVisible(false);
    ghosts.forEach(enemy => {
        enemy.setVisible(false);
    });

    // Check if the sound is locked (if the browser is not allowing sound to play, because the user has not
    // interacted with the page yet). If not, wait for it to be unlocked and play the startup sequence.
    if (!this.sound.locked) {
        startup.call(this);
    } else {
        this.sound.on('unlocked', startup, this);
    }
}

// The startup sequence. Set every entity's velocity to 0 and hide them. Wait ~2 seconds,
// destroy the "PLAYER ONE" text, set each entity to visible, then wait ~2 more seconds
// and let the game start.
function startup() {
    disallow_control = true;
    player.setVisible(false);
    player.setVelocityX(0);
    player.setVelocityY(0);
    pause_sounds = true;

    pinky.anims.play('pinky_down');
    inky.anims.play('inky_up');
    clyde.anims.play('clyde_up');
    blinky.anims.play('blinky_left');

    ghosts.forEach(enemy => {
        enemy.setVelocityX(0);
        enemy.setVelocityY(0);
        enemy.anims.stop();
    });

    jingle.play();

    let timer1 = this.time.delayedCall(2200, function() {
        player.setVisible(true);
        player.attrs.lives--;
        lives_display[player.attrs.lives].setVisible(false);
        ghosts.forEach(enemy => {
            enemy.setVisible(true);
        })
        this.startup_text.destroy();
        this.startup_text2.destroy();
    }, null, this);

    let timer2 = this.time.delayedCall(4200, function() {
        player.setVelocityX(-player.attrs.speed);
        blinky.setVelocityX(-blinky.attrs.speed);
        clyde.setVelocityY(-clyde.attrs.speed);
        inky.setVelocityY(-inky.attrs.speed);
        pinky.setVelocityY(-pinky.attrs.speed);
        player.anims.play('left');
        pinky.anims.play('pinky_up');
        make_timers(this);
        pause_sounds = false;
        disallow_control = false;
        ready_text.setVisible(false);
    }, null, this);
}

function update() {
    // debug showcase, made hastily and not for the actual game
    if (show_targets) {
        clyde_target.x = clyde.attrs.target.x * TILE_SIZE;
        clyde_target.y = clyde.attrs.target.y * TILE_SIZE;
        blinky_target.x = blinky.attrs.target.x * TILE_SIZE;
        blinky_target.y = blinky.attrs.target.y * TILE_SIZE;
        inky_target.x = inky.attrs.target.x * TILE_SIZE;
        inky_target.y = inky.attrs.target.y * TILE_SIZE;
        pinky_target.x = pinky.attrs.target.x * TILE_SIZE;
        pinky_target.y = pinky.attrs.target.y * TILE_SIZE;

        clyde_target.setVisible(true);
        inky_target.setVisible(true);
        pinky_target.setVisible(true);
        blinky_target.setVisible(true);

    } else {
        clyde_target.setVisible(false);
        inky_target.setVisible(false);
        pinky_target.setVisible(false);
        blinky_target.setVisible(false);
    }
    // end debug showcase

    updateBGSounds();

    if (!disallow_control) {
        // Update the player's current tile and get the attributes of the tiles surrounding them.
        player.attrs.currTileX = Phaser.Math.Snap.Floor(Math.floor(player.x), TILE_SIZE, 0, true);
        player.attrs.currTileY = Phaser.Math.Snap.Floor(Math.floor(player.y - MAP_BEGIN), TILE_SIZE, 0, true);

        let x = player.attrs.currTileX;
        let y = player.attrs.currTileY;

        player.attrs.directions[Phaser.LEFT] = this.map.getTileAt(x - 1, y, false, "walls");
        player.attrs.directions[Phaser.RIGHT] = this.map.getTileAt(x + 1, y, false, "walls");
        player.attrs.directions[Phaser.UP] = this.map.getTileAt(x, y - 1, false, "walls");
        player.attrs.directions[Phaser.DOWN] = this.map.getTileAt(x, y + 1, false, "walls");


        if (cursors.right.isDown) {
            player.attrs.storedDirection = Phaser.RIGHT;
        } else if (cursors.left.isDown) {
            player.attrs.storedDirection = Phaser.LEFT;
        } else if (cursors.up.isDown) {
            player.attrs.storedDirection = Phaser.UP;
        } else if (cursors.down.isDown) {
            player.attrs.storedDirection = Phaser.DOWN;
        }

        // Normally, this would not be here -- this is just for debug so that I and any curious people/graders can see the ghost's targets.
        if (cursors.shift.isDown) {
            show_targets = true;
        } else if (cursors.shift.isUp) {
            show_targets = false;
        }

        checkTurnpoint(player, true, this);

        if (ghost_mode === SCATTER) {
            ghosts.forEach(enemy => {
                enemy.attrs.scatter();
            });
        } else if (ghost_mode === CHASE) {
            ghosts.forEach(enemy => {
                enemy.attrs.chase();
            });
        }

        ghosts.forEach(enemy => {
            if (enemy.attrs.isEaten) {
                enemy.attrs.target.x = EATEN_TARGET_X;
                enemy.attrs.target.y = EATEN_TARGET_Y + MAP_BEGIN / TILE_SIZE;
            }
        })


        ghosts.forEach(enemy => {
            if (!enemy.attrs.isInWarp && !enemy.attrs.isFrightened) {
                // Warp tiles.
                // These tiles will always be the same in any pacman game, so there is magic number use.
                if ((enemy.attrs.currTileX <= WARP_LEFT_TILE_X && enemy.attrs.currTileY === WARP_TILE_Y) ||
                    (enemy.attrs.currTileX >= WARP_RIGHT_TILE_X && enemy.attrs.currTileY === WARP_TILE_Y)) {
                    enemy.attrs.isInWarp = true;
                    enemy.attrs.speed -= WARP_SPEED_PENALTY;
                }

            }

            // If the enemy is in a warp but then became frightened, remove the additional speed penalty.
            else if (enemy.attrs.isInWarp && enemy.attrs.isFrightened) {
                enemy.attrs.isInWarp = false;
                enemy.attrs.speed += WARP_SPEED_PENALTY;
            }

            // Once the enemy is out of the warp, get rid of the speed penalty.
            else if (enemy.attrs.isInWarp) {
                if (!(enemy.attrs.currTileX <= WARP_LEFT_TILE_X && enemy.attrs.currTileY === WARP_TILE_Y) &&
                    !(enemy.attrs.currTileX >= WARP_RIGHT_TILE_X && enemy.attrs.currTileY === WARP_TILE_Y)) {
                    enemy.attrs.isInWarp = false;
                    enemy.attrs.speed += WARP_SPEED_PENALTY;
                }
            }

        })

        ghosts.forEach(enemy => {
            if (!enemy.attrs.waiting) {
                checkPath(enemy, this);
                checkTurnpoint(enemy, false);
            }
        });


        if (player.body.x < WARP_LEFT_X) {
            player.x = MAP_BOUND + TILE_SIZE * 2;
        } else if (player.body.x > WARP_RIGHT_X) {
            player.x = WARP_LEFT_X + X_Y_OFFSET;
        }

        ghosts.forEach(enemy => {
            if (enemy.body.x < WARP_LEFT_X - TILE_SIZE / 2) {
                enemy.x = MAP_BOUND + TILE_SIZE * 2;
            } else if (enemy.body.x > WARP_RIGHT_X + TILE_SIZE / 2) {
                enemy.x = WARP_LEFT_X + X_Y_OFFSET;
            }

        });

    }


    // Processes that run if the game updating is paused (ie: when Pacman eats a ghost.)
    else {
        ghosts.forEach(enemy => {
            if (enemy.attrs.isEaten) {
                enemy.attrs.target.x = EATEN_TARGET_X;
                enemy.attrs.target.y = EATEN_TARGET_Y + MAP_BEGIN / TILE_SIZE;
                checkPath(enemy, this);
                checkTurnpoint(enemy, false);
            } else if (enemy.attrs.spawning) {
                enemy.setVelocityX(0);
                enemy.setVelocityY(0);
            }
        })

    }

}

// Checks where each ghost will go.
function checkPath(ghost, canvas) {
    // Update the current tile of the ghost.
    ghost.attrs.currTileX = Phaser.Math.Snap.Floor(Math.floor(ghost.x), TILE_SIZE, 0, true);
    ghost.attrs.currTileY = Phaser.Math.Snap.Floor(Math.floor(ghost.y - MAP_BEGIN), TILE_SIZE, 0, true);

    // What follows is a series of checks to see if the ghost is in a special situation (like spawning)
    // that means they don't follow their usual path.

    // If the ghost is spawning and reaches the spawn tile (where blinky starts), then remove their spawning
    // flag and let them move again.
    if (ghost.attrs.spawning && Phaser.Math.Fuzzy.Equal(ghost.y, blinky.attrs.spawn.y, 0.5)) {
        ghost.setVelocityY(0);
        ghost.setVelocityX(-ghost.attrs.speed);
        ghost.attrs.spawning = false;
        if (!disallow_control && !ghost.attrs.isFrightened)
            ghost.anims.play(ghost.attrs.animKeys['left']);

    }

    // If just regularly spawning, play the spawning animation (until they reach that tile)
    else if (ghost.attrs.spawning) {
        ghost.setSize(1, 1, true);
        ghost.attrs.wallCollider.active = false;
        ghost.setVelocityX(0);
        ghost.setVelocityY(-ghost.attrs.speed + CAGE_SPEED_DELTA);
        if (!disallow_control && !ghost.attrs.isFrightened) {
            ghost.anims.play(ghost.attrs.animKeys['up'], true);
        }
    }

    // If the ghost is exiting the cage (when spawning the first time) or entering the cage (when they have been eaten),
    // and they have reached the bottom of the middle of the cage, make them go up to exit and set their spawning flag to true.
    else if ((ghost.attrs.enteringCage && Phaser.Math.Fuzzy.Equal(ghost.attrs.currTileY, EATEN_TARGET_Y + 4, 1)) ||
        ghost.attrs.exitingCage && Phaser.Math.Fuzzy.Equal(ghost.x, blinky.attrs.spawn.x, 0.5)) {

        ghost.x = START_X;
        ghost.attrs.isEaten = false;
        ghost.attrs.collider.active = true;
        ghost.attrs.spawning = true;
        if (ghost.attrs.enteringCage)
            ghost.attrs.speed /= EATEN_SPEED_MULT;
        ghost.attrs.enteringCage = false;
        ghost.attrs.exitingCage = false;
        if (!disallow_control && !ghost.attrs.isFrightened) {
            ghost.anims.play(ghost.attrs.animKeys['up'], true);
        }
        ghost.attrs.storedDirection = Phaser.UP;
        ghost.setVelocityY(-ghost.attrs.speed + CAGE_SPEED_DELTA);

        return;
    }

    // If just entering the cage (as ghost eyes), set their x to the middle of the cage and make them go down (to enter).
    else if (ghost.attrs.enteringCage) {
        ghost.x = START_X;
        ghost.setVelocityY(ghost.attrs.speed);
        return;
    }

    // Final check: if the ghost is eaten and they have reached the cage's entrance, force them downward into the cage.
    else if (ghost.attrs.isEaten && ghost.attrs.currTileX === EATEN_TARGET_X && ghost.attrs.currTileY === EATEN_TARGET_Y) {
        ghost.attrs.turnThreshold /= EATEN_TP_THRESHOLD_MULT;
        ghost.attrs.storedDirection = Phaser.DOWN;
        ghost.setVelocityX(0);
        ghost.attrs.turnpoint.x = (ghost.attrs.currTileX - 1) * TILE_SIZE + MAZE_OFFSET;
        ghost.attrs.turnpoint.y = (ghost.attrs.currTileY - 1) * TILE_SIZE + MAZE_OFFSET + MAP_BEGIN;
        ghost.attrs.enteringCage = true;
        ghost.anims.play("eaten_down");
        return;
    }
    // End checks.

    let x = ghost.attrs.currTileX;
    let y = ghost.attrs.currTileY;

    // Get the tiles surrounding the ghost.
    ghost.attrs.directions[Phaser.LEFT] = canvas.map.getTileAt(x - 1, y, false, "walls");
    ghost.attrs.directions[Phaser.RIGHT] = canvas.map.getTileAt(x + 1, y, false, "walls");
    ghost.attrs.directions[Phaser.UP] = canvas.map.getTileAt(x, y - 1, false, "walls");
    ghost.attrs.directions[Phaser.DOWN] = canvas.map.getTileAt(x, y + 1, false, "walls");

    // Get the valid tiles surrounding the ghost (which tiles they can choose as their next move).
    let choices = getValidTiles(ghost);

    // If they only have 1 move, then obviously they can only choose that move. End the procedure.
    if (choices.length === 1) {
        ghost.attrs.storedDirection = choices[0].direction;
        return;
    }

    // If the ghost is frightened (blue), they pick a random tile to go on.
    if (ghost.attrs.isFrightened) {
        let random_tile = choices[Math.floor(Math.random() * choices.length)];
        if (random_tile)
            ghost.attrs.storedDirection = random_tile.direction;
        return;
    }

    let leastDistance = 99;
    let nextMove = -1;

    // Find the least amount of distance to the ghost's target from each choice.
    for (let i = 0; i < choices.length; i++) {
        let check = distance(ghost.attrs.target.x, ghost.attrs.target.y, choices[i].x, choices[i].y);

        // Ghosts follow a priority of following UP > LEFT > DOWN > RIGHT if the distances between the target
        // and a given tile are the same. (Because of floating point weirdness, if they are roughly the same and within 0.25 of each other).
        if (Phaser.Math.Fuzzy.Equal(check, leastDistance, 0.25)) {
            let dir1 = choices[nextMove].direction;
            let dir2 = choices[i].direction;

            if (dir2 === Phaser.UP) {
                nextMove = i;
            } else if (dir2 === Phaser.LEFT && (dir1 === Phaser.DOWN || dir1 === Phaser.RIGHT)) {
                nextMove = i;
            } else if (dir2 === Phaser.DOWN && dir1 === Phaser.RIGHT) {
                nextMove = i;
            }
        } else if (check < leastDistance) {
            leastDistance = check;
            nextMove = i;
        }
    }

    // If a next move was found (should always happen), their stored direction is the next move's direction.
    if (nextMove != -1) {
        ghost.attrs.storedDirection = choices[nextMove].direction;
    }
}

// Distance math formula -- nothing special here.
function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Checks each tile around the ghost to see if they are able to go in that direction.
// If so, gather the position and direction of that tile into an array and return with all valid tiles
// Note that ghosts cannot turn around unless their movement mode changes (ie: scatter -> chase,
// or respawning -> chase)
function getValidTiles(ghost) {
    let open_tiles = []

    for (let i = Phaser.UP; i <= Phaser.RIGHT; i++) {
        if (ghost.attrs.directions[i] === null && i != getOppositeDirection(ghost.attrs.currentDirection)) {
            if (i === Phaser.UP) {
                // Special, hardcoded tiles that ghosts cannot go up on, from original game.
                // Located around the ghost cage, for reference.
                // Not located in consts, because this is the only place they are ever referred to, and
                // it would genuinely be more inconvenient to use consts rather than using them directly.
                if (ghost.attrs.currTileX === 15 && ghost.attrs.currTileY === 11 ||
                    ghost.attrs.currTileX === 12 && ghost.attrs.currTileY === 11 ||
                    ghost.attrs.currTileX === 12 && ghost.attrs.currTileY === 23 ||
                    ghost.attrs.currTileX === 15 && ghost.attrs.currTileY === 23) {
                    continue;
                }

                open_tiles.push({
                    x: ghost.attrs.currTileX,
                    y: ghost.attrs.currTileY - 1,
                    direction: Phaser.UP
                });
            } else if (i === Phaser.DOWN) {
                open_tiles.push({
                    x: ghost.attrs.currTileX,
                    y: ghost.attrs.currTileY + 1,
                    direction: Phaser.DOWN
                });
            } else if (i === Phaser.LEFT) {
                open_tiles.push({
                    x: ghost.attrs.currTileX - 1,
                    y: ghost.attrs.currTileY,
                    direction: Phaser.LEFT
                });
            } else if (i === Phaser.RIGHT) {
                open_tiles.push({
                    x: ghost.attrs.currTileX + 1,
                    y: ghost.attrs.currTileY,
                    direction: Phaser.RIGHT
                });
            }
        }
    }

    return open_tiles;

}

// Simple function that does what it says on the box: returns the opposite direction value
// given a direction.
function getOppositeDirection(direction) {
    switch (direction) {
        case Phaser.RIGHT:
            return Phaser.LEFT;
        case Phaser.UP:
            return Phaser.DOWN;
        case Phaser.DOWN:
            return Phaser.UP;
        case Phaser.LEFT:
            return Phaser.RIGHT;
        default:
            return 0;
    }
}

// Stop function for when the player bumps into a wall.
// If they are on the last frame (pacman as a full circle) it skips to the next frame like the original game.
function wallStop() {
    if (player.anims.currentFrame.isLast) {
        player.anims.setCurrentFrame(player.anims.currentFrame.nextFrame);
    }
    player.anims.stop();
}

// A function for all entities that allows them to turn.
// First checks if the direction the entity wants to go in is valid, then checks
// if the entity has a turnpoint and if the entity is not outside the bounds (warping using the warp pipe).
// Then, it finally checks if the entity is within a certain range of their turnpoint. If so, it
// changes their velocity to their desired direction and changes their animations.
function checkTurnpoint(entity, isPlayer, canvas) {
    if (!valid_direction(entity)) {
        return false;
    }
    if (entity.attrs.turnpoint.x != -1 && entity.x > 0 && entity.x < MAP_BOUND) {
        if (Phaser.Math.Fuzzy.Equal(entity.x, entity.attrs.turnpoint.x, entity.attrs.turnThreshold) &&
            Phaser.Math.Fuzzy.Equal(entity.y, entity.attrs.turnpoint.y, entity.attrs.turnThreshold)) {
            entity.setVelocityY(0);
            entity.setVelocityX(0);

            entity.x = entity.attrs.turnpoint.x;
            entity.y = entity.attrs.turnpoint.y;


            entity.attrs.turnpoint.x = entity.attrs.turnpoint.y = -1;

            let stored = entity.attrs.storedDirection;
            // The turn bonus speed is a holdover from the original game. Pacman gains a little speed at the corners in the original;
            // here is my attempt to replicate it by giving pacman a sizable boost for less than 1/10th of a second.
            let turnBonus = 0;
            if (isPlayer && stored != getOppositeDirection(entity.attrs.currentDirection) && stored != entity.attrs
                .currentDirection) {
                turnBonus = TURN_BONUS;
            }

            entity.attrs.currentDirection = stored;
            let dir = 'up';
            switch (stored) {
                case Phaser.UP:
                    entity.setVelocityY(-entity.attrs.speed - turnBonus);
                    if (isPlayer) {
                        let timer = canvas.time.delayedCall(TURN_BONUS_DELAY, function() {
                            if (!disallow_control)
                                entity.setVelocityY(-entity.attrs.speed);
                        }, null, this);
                    }

                    dir = 'up';
                    break;

                case Phaser.DOWN:
                    entity.setVelocityY(entity.attrs.speed + turnBonus);
                    if (isPlayer) {
                        let timer = canvas.time.delayedCall(TURN_BONUS_DELAY, function() {
                            if (!disallow_control)
                                entity.setVelocityY(entity.attrs.speed);
                        }, null, this);
                    }
                    dir = 'down';
                    break;

                case Phaser.RIGHT:
                    entity.setVelocityX(entity.attrs.speed + turnBonus);
                    if (isPlayer) {
                        let timer = canvas.time.delayedCall(TURN_BONUS_DELAY, function() {
                            if (!disallow_control)
                                entity.setVelocityX(entity.attrs.speed);
                        }, null, this);
                    }
                    dir = 'right';
                    break;

                case Phaser.LEFT:
                    entity.setVelocityX(-entity.attrs.speed - turnBonus);
                    if (isPlayer) {
                        let timer = canvas.time.delayedCall(TURN_BONUS_DELAY, function() {
                            if (!disallow_control)
                                entity.setVelocityX(-entity.attrs.speed);
                        }, null, this);
                    }
                    dir = 'left';
                    break;
            }
            if (!entity.attrs.isFrightened) {
                if (!entity.attrs.isEaten) {
                    entity.anims.play(entity.attrs.animKeys[dir], true);
                } else {
                    entity.anims.play("eaten_" + dir, true);
                }
            }
            entity.attrs.storedDirection = 0;
            return true;
        }
        return false;
    }
}

// Function for when the player collides into a ghost. Depending on if the ghosts are blue (frightened)
// or not, it will either play the animation for a ghost being eaten and set the ghost's state to the eaten state,
// or it will play the animation for pacman dying, remove a life from pacman, and respawn every entity.
function ghostCollide(player, ghost) {
    disallow_control = true;

    ghostVels = []

    timers.forEach(timer => {
        if (timer != null)
            timer.paused = true;
    });

    ghosts.forEach(enemy => {
        enemy.attrs.collider.active = false;
        let signX = Math.sign(enemy.body.velocity.x);
        let signY = Math.sign(enemy.body.velocity.y);

        let apply = !enemy.attrs.isEaten;

        ghostVels.push({
            x: enemy.attrs.speed * signX,
            y: enemy.attrs.speed * signY,
            apply: apply
        });
        if (!enemy.attrs.isEaten || enemy.attrs.spawning) {
            enemy.setVelocityX(0);
            enemy.setVelocityY(0);
            enemy.anims.pause();
        }
    });

    let signX = Math.sign(player.body.velocity.x);
    let signY = Math.sign(player.body.velocity.y);

    player.setVelocityX(0);
    player.setVelocityY(0);
    wallStop();

    // If the ghost is frightened (blue), increase score and play the animations for a ghost being eaten.
    if (ghost.attrs.isFrightened) {
        ghost_eat_sound.play();
        ghost.setVisible(false);
        score.value += (200 * Math.pow(2, combo));

        score.updateDisp();

        high_score.updateDisp();

        let currentAnim = player.anims.currentAnim.key;
        let isPlaying = !(signX === 0 && signY === 0);

        // In the animation for eating a blue ghost, the player is replaced by a score display (200, 400, 800, or 1600)
        // for a short period of time.
        player.anims.play('ghost_eat_combos', true, combo);

        // After a second, allow the ghosts and player to move again, and show the eaten ghost.
        let delay = this.time.delayedCall(1000, function() {
            combo += 1;
            disallow_control = false;
            ghost.attrs.isFrightened = false;
            ghost.setVisible(true);
            ghost.anims.play("eaten_up");
            ghost.attrs.isEaten = true;
            ghost.attrs.turnThreshold *= EATEN_TP_THRESHOLD_MULT;

            ghost.attrs.speed += FRIGHTENED_SPEED_PENALTY;
            ghost.attrs.speed *= EATEN_SPEED_MULT;

            player.setVelocityX(signX * player.attrs.speed);
            player.setVelocityY(signY * player.attrs.speed);

            player.anims.play(currentAnim);

            if (!isPlaying)
                player.anims.stop();

            let i = 0;
            ghosts.forEach(enemy => {
                enemy.anims.resume();
                // Check if we should "apply" the velocities again (if the ghosts weren't eaten/not moving when this was called, then we apply it)
                if (ghostVels[i].apply) {
                    if (!checkTurnpoint.call(this, enemy)) {
                        enemy.setVelocityX(ghostVels[i].x);
                        enemy.setVelocityY(ghostVels[i].y);
                    } else  {
                        console.log("strange things are happening");
                    }
                }
                if (!enemy.attrs.isEaten)
                    enemy.attrs.collider.active = true;
                i++;
            });

            // Make sure that the pellet timer unpauses after the animation finishes playing.
            // The rest of the timers will be unpaused when the power pellet timer finishes.
            if (timers[P_TIMER_INDEX] != null)
                timers[P_TIMER_INDEX].paused = false;
        }, null, this);
        return;
    }

    // If the ghost isn't frightened, play the death animation and reset the game.

    // Pacman faces up first
    pause_sounds = true;

    let timer1 = this.time.delayedCall(500, function() {
        player.anims.play('death', false);
        player.anims.stop();
        ghosts.forEach(enemy => {
            enemy.setVisible(false);
        });
        player.x += 1;
        player.y += 4;
    }, null, this);

    // Play death animation
    let timer2 = this.time.delayedCall(1000, function() {
        death_sound.play();
        player.anims.play('death', false);
    }, null, this);

    // Reset
    let timer3 = this.time.delayedCall(3000, function() {
        player.attrs.lives--;
        if (player.attrs.lives < 0)
            gameOver(this);
        else {
            lives_display[player.attrs.lives].setVisible(false);
            resetEntities.call(this);
        }
        timers.forEach(timer => {
            if (timer != null)
                timer.paused = false;
        });
    }, null, this);
}


function valid_direction(entity) {
    let tile = entity.attrs.directions[entity.attrs.storedDirection];

    if (tile === null) {
        entity.attrs.turnpoint.x = (entity.attrs.currTileX - 1) * TILE_SIZE + MAZE_OFFSET;
        entity.attrs.turnpoint.y = (entity.attrs.currTileY - 1) * TILE_SIZE + MAZE_OFFSET + MAP_BEGIN;
        return true;
    }

    return false;
}

// Update the background sound playing based on the ghost state.
// If at least one ghost is eaten, play the ghost eye sound and stop other sounds; if at least one ghost is frightened,
// play the frightened sound and stop other sounds, otherwise play the regular ghost siren sound.
function updateBGSounds() {
    if (pause_sounds) {
        ghost_eyes_sound.stop();
        frightened_sound.stop();
        siren_sound[curr_siren].stop();
        return;
    }

    let updated = false;

    ghosts.forEach(enemy => {
        if (enemy.attrs.isEaten) {
            if (ghost_eyes_sound.isPaused)
                ghost_eyes_sound.resume();
            else if (!ghost_eyes_sound.isPlaying)
                ghost_eyes_sound.play();

            frightened_sound.stop();
            siren_sound[curr_siren].stop();
            updated = true;
            return;
        }
    });

    if (updated)
        return;

    ghosts.forEach(enemy => {
        if (enemy.attrs.isFrightened) {
            if (frightened_sound.isPaused)
                frightened_sound.resume();
            else if (!frightened_sound.isPlaying)
                frightened_sound.play();
            ghost_eyes_sound.stop();
            siren_sound[curr_siren].stop();
            updated = true;
            return;
        }
    })

    if (updated)
        return;

    if (siren_sound[curr_siren].isPaused)
        siren_sound[curr_siren].resume();
    else if (!siren_sound[curr_siren].isPlaying)
        siren_sound[curr_siren].play();

    frightened_sound.stop();
    ghost_eyes_sound.stop();
}

// When the player collects a dot, destroy the dot, increment score by 10,
// and check if there are less than half the dots left. If so, play the
// next ghost siren sound. Finally, check if there are no dots and power pellets
// left (if so, go to next level) and run the procedure for playing the "waka"
// sound (alternate between two sounds).
function collectDot(player, dot) {
    dot.destroy(dot.x, dot.y);

    if (dots.children.entries.length < NUM_DOTS / 2 && curr_siren < 1) {
        siren_sound[curr_siren].stop();
        curr_siren = 1;
    }

    score.value += 10;

    score.updateDisp();

    high_score.updateDisp();

    if (dots.children.entries.length < 1 && power_pellets.children.entries.length < 1) {
        newLevel.call(this);
        return;
    }

    if (!waka_sound[waka_count].isPlaying) {
        waka_sound[waka_count].play();
        waka_count = (waka_count + 1) % 2;
    }

}

// Stops everything, plays the new level animatiom (blinking stage), and then resets everything.
function newLevel() {
    disallow_control = true;
    resetting = true;
    pause_sounds = true;

    timers.forEach(timer => {
        if (timer != null)
            timer.paused = true;
    });

    ghosts.forEach(enemy => {
        enemy.anims.stop();
        enemy.setVelocityX(0);
        enemy.setVelocityY(0);
    });

    player.anims.play('left', false, 2);
    player.setVelocityX(0);
    player.setVelocityY(0);
    player.anims.stop();

    let pause1 = this.time.delayedCall(2000, function() {
        ghosts.forEach(enemy => {
            enemy.setVisible(false);
        })
        pause2.paused = false;
    })

    let toggle = false;

    let pause2 = this.time.addEvent({
        delay: 250,
        callbackScope: this,
        repeat: 5,
        startAt: 240,
        callback: function() {
            this.walls.setVisible(toggle);
            this.blink_walls.setVisible(!toggle);
            toggle = !toggle;
        }
    });

    pause2.paused = true;

    let reset = this.time.delayedCall(4000, function() {

        // Reset dots and power pellets
        this.dotLayer.forEach(object => {
            let obj = dots.create(object.x, object.y - TILE_SIZE + MAP_BEGIN, "dot");
            obj.setDepth(-1);
            obj.setScale(object.width / TILE_SIZE, object.height / TILE_SIZE);
            obj.setOrigin(0);
            obj.body.setOffset(TILE_SIZE - 1, TILE_SIZE - 1);
            obj.body.width = TILE_SIZE / 4;
            obj.body.height = TILE_SIZE / 4;
        });

        this.powerPelletLayer.forEach(object => {
            let obj = power_pellets.create(object.x, object.y - TILE_SIZE + MAP_BEGIN, "power_pellet");
            obj.setDepth(-1);
            obj.setScale(object.width / TILE_SIZE, object.height / TILE_SIZE);
            obj.setOrigin(0);
            obj.body.setOffset(TILE_SIZE - 1, TILE_SIZE - 1);
            obj.body.width = TILE_SIZE / 4;
            obj.body.height = TILE_SIZE / 4;
        });

        // Reset entities, and reset the timers, set the siren to the first siren, and save the current high score value.
        resetEntities.call(this);
        make_timers(this);
        curr_siren = 0;
        setCookie(SCORE_COOKIE_NAME, high_score.value.toString(), 7);
    }, null, this);

}

// Stop everything, save the current high score value, and add game over text.
function gameOver(canvas) {
    resetting = true;
    disallow_control = true;
    timers.forEach(timer => {
        if (timer != null)
            timer.paused = true;
    });
    pellet_anim_timer.paused = true;
    setCookie(SCORE_COOKIE_NAME, high_score.value.toString(), 7);


    // Note that the text here had to be separated; using spaces in text makes the text very blurry for some unknown reason.
    canvas.add.text(START_X - TILE_SIZE * 5, START_Y - TILE_SIZE * 5 - TILE_SIZE * 7, 'GAME', {
        fontFamily: 'font1',
        color: "#FF0000",
        fontSize: "7px",
        resolution: 3
    });

    canvas.add.text(START_X + TILE_SIZE, START_Y - TILE_SIZE * 5 - TILE_SIZE * 7, 'OVER', {
        fontFamily: 'font1',
        color: "#FF0000",
        fontSize: "7px",
        resolution: 3
    });
}

function collectPellet(player, pellets) {
    // If the number of dots and pellets is zero, call a new level and ignore turning every ghost blue.
    if (dots.children.entries.length < 1 && power_pellets.children.entries.length < 1) {
        newLevel.call(this);
        return;
    }

    // Reverse ghosts, reset pellet combo, add 50 to score, update scores.
    combo = 0;
    pellets.destroy(pellets.x, pellets.y);
    reverse_ghosts();

    score.value += 50;
    score.updateDisp();

    high_score.updateDisp();

    // If the ghost is not blue already or if they are immune to being turned blue (when they are eaten), then
    // reduce their speed by the speed penalty. If they are not eaten, also play the frightened animation.
    ghosts.forEach(enemy => {
        if (!enemy.attrs.isFrightened && !enemy.attrs.isEaten)
            enemy.attrs.speed -= FRIGHTENED_SPEED_PENALTY;

        if (!enemy.attrs.isEaten) {
            enemy.anims.play('frightened1');
            enemy.attrs.isFrightened = true;
        }
    });

    // Pause every timer.
    timers.forEach(timer => {
        if (timer != null)
            timer.paused = true;
    });

    // Destroy the current timer for the pellet duration if it already exists, so we can reset it.
    if (pellet_timer != null)
        pellet_timer.destroy();

    let counter = FRIGHTENED_DURATION;

    // Every two seconds, decrement the counter. When the counter reaches 1, play the blinking frightened animation.
    // When it equals zero, make sure all the frightened ghosts are returned to normal and resume all timers.
    pellet_timer = this.time.addEvent({
        delay: 2000,
        callback: function() {
            if (counter === 1) {
                ghosts.forEach(enemy => {
                    if (enemy.attrs.isFrightened && !resetting)
                        enemy.anims.play('frightened2');
                });
            }

            if (counter === 0) {
                combo = 0;
                timers.forEach(timer => {
                    if (timer != null)
                        timer.paused = false;
                });

                frightened_sound.stop();
                ghosts.forEach(enemy => {
                    if (enemy.attrs.isFrightened && !resetting) {
                        enemy.attrs.currentDirection = getOppositeDirection(enemy.attrs.currentDirection);
                        enemy.anims.play(enemy.attrs.animKeys['up']);
                        enemy.attrs.speed += FRIGHTENED_SPEED_PENALTY;
                        enemy.attrs.isFrightened = false;
                    }
                });
            }

            counter--;
        },
        callbackScope: this,
        repeat: FRIGHTENED_DURATION + 1
    });

    // Update the timer holder with the new pellet timer.
    timers[P_TIMER_INDEX] = pellet_timer;

}

// The animation that plays when the ghosts are "bouncing" in the spawn area at the beginning of each life.
// Each bounce decrements their wait timer by one. If their wait timer reaches 0, they stop waiting and play their spawn exit animation.
// If not, just reverse the ghost's direction and continue waiting.
function ghostBounce(ghost, wall) {
    ghost.attrs.waitTimer--;

    // If the ghost wait timer is up and the game is not currently resetting, then let them out and begin playing their exit animation.
    // Remove their wall collider so that they no longer bounce off walls.
    if (ghost.attrs.waitTimer <= 0 && !resetting) {
        ghost.attrs.waiting = false;
        ghost.attrs.exitingCage = true;
        ghost.attrs.wallCollider.active = false;
        ghost.setVelocityY(0);
        ghost.setSize(1, 1, true);

        if (ghost.attrs.name === CLYDE) {
            ghost.setVelocityX(-ghost.attrs.speed + CAGE_SPEED_DELTA);
            if (!ghost.attrs.isFrightened)
                ghost.anims.play(ghost.attrs.animKeys['left']);
        } else if (ghost.attrs.name === INKY) {
            ghost.setVelocityX(ghost.attrs.speed - CAGE_SPEED_DELTA);
            if (!ghost.attrs.isFrightened)
                ghost.anims.play(ghost.attrs.animKeys['right']);
        }
        return;
    }

    // If not ready to leave yet, then the ghosts "bounce" by continually reversing their vertical position.
    if (ghost.attrs.currentDirection === Phaser.DOWN) {
        ghost.attrs.currentDirection = Phaser.UP;
        ghost.setVelocityY(-ghost.attrs.speed + CAGE_SPEED_DELTA);
        if (!ghost.attrs.isFrightened)
            ghost.anims.play(ghost.attrs.animKeys['up']);
    } else {
        ghost.attrs.currentDirection = Phaser.DOWN;
        ghost.setVelocityY(ghost.attrs.speed - CAGE_SPEED_DELTA);
        if (!ghost.attrs.isFrightened)
            ghost.anims.play(ghost.attrs.animKeys['down']);
    }

}

// Does what it says on the box: resets all entities, either after a life is lost or for a new level.
// Follows a very specific procedure to try and mimic the original game as closely as possible.
function resetEntities() {
    resetting = true;

    // Makes sure the ghosts are looking in the right directions for when they are reset.
    blinky.anims.play('blinky_left');
    pinky.anims.play('pinky_up');
    clyde.anims.play('clyde_down');
    inky.anims.play('inky_down');

    ghosts.forEach(enemy => {
        enemy.setVisible(true);
        enemy.x = enemy.attrs.spawn.x;
        enemy.y = enemy.attrs.spawn.y;
        enemy.anims.stop();
    })

    player.x = START_X;
    player.y = START_Y;
    player.setVisible(true);
    player.anims.play('left', false, 2);
    player.anims.stop();
    ready_text.setVisible(true);

    let ready_timer = this.time.delayedCall(2000, function() {
        ready_text.setVisible(false);
        pause_sounds = false;
        resetting = false;
        disallow_control = false;
        player.anims.play('left');
        player.setVelocityX(-player.attrs.speed);
        ghosts.forEach(enemy => {
            let chase = enemy.attrs.chase;
            let collider = enemy.attrs.collider;
            let wallCollider = enemy.attrs.wallCollider;
            enemy.attrs = new GhostAttrs(enemy.attrs.scatterTile.x, enemy.attrs.scatterTile.y - MAP_BEGIN /
                TILE_SIZE, enemy.attrs.spawn.x, enemy.attrs.spawn.y, enemy.attrs.name)
            enemy.attrs.waiting = true;
            enemy.attrs.chase = chase;
            enemy.attrs.collider = collider;
            enemy.attrs.wallCollider = wallCollider;
            enemy.attrs.wallCollider.active = true;
            enemy.attrs.collider.active = true;
            enemy.setSize(GHOST_SIZE, GHOST_SIZE, true);
            enemy.setVelocityX(0);
            enemy.anims.resume();
        });
        blinky.setVelocityX(-blinky.attrs.speed);
        blinky.attrs.wallCollider.active = false;
        blinky.setSize(1, 1, true);
        blinky.attrs.waiting = false;

        pinky.attrs.waitTimer = 5;
        clyde.attrs.waitTimer = 15;
        clyde.setVelocityY(clyde.attrs.speed - CAGE_SPEED_DELTA);
        inky.setVelocityY(inky.attrs.speed - CAGE_SPEED_DELTA)
        pinky.setVelocityY(-pinky.attrs.speed + CAGE_SPEED_DELTA);
    }, null, this);
}

// Cookie setter functions to save the high score. Credit to: http://www.quirksmode.org/js/cookies.html
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}
/*
function eraseCookie(name) {
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}
*/
// End cookie setter functions
