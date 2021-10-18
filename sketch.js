// noinspection NonAsciiCharacters

/*
@author Kiwi
@date 2021-10-14

coding plan
.   create initial points on sphere
.   add easycam, the p5.js fork of peasycam
.   disable context menu
.   add total slider
.   draw axes to help visualize
    mouseX, mouseY constrain
.   draw colored axes using beginHUD
.   movable pyramid with WASD keys
    .   wrap around the sphere when encountering a boundary
.   dynamically vary the sphere detail

BUGS
    when both θ and φ go from 0 to 2π, we actually set up two sets of
    overlapping points for our sphere. this is required if we want easy
    wrapping for WASD though

TODO
    make a second globe with larger r and store coordinates in setup
        toggle to make pyramid jump to second globe coordinates
        try more globes at 0.01 radius increments around r from 50-150
            later sine wave will be amp < 50!

 */
let font
let cam
let SPHERE_DETAIL = 5 // number of segments per θ and φ

// define the hue and saturation for all 3 axes
const X_HUE = 0, X_SAT = 80, Y_HUE = 90, Y_SAT = 80, Z_HUE = 210, Z_SAT = 80
const DIM = 40
const BRIGHT = 75

// an n by n 2D array of points on a sphere in (r, θ, φ) triples
let globe


// these keep track of the top left corner of the quad projection to the
// sphere's surface from the origin. unsure if projection is the correct word
let projection_x = 0
let projection_y = 0


// prevent the context menu from showing up :3 nya~
document.oncontextmenu = function() {
    return false;
}


function preload() {
    font = loadFont('fonts/Meiryo-01.ttf')
}


function setup() {
    createCanvas(640, 360, WEBGL)
    colorMode(HSB, 360, 100, 100, 100)
    textFont(font, 16)

    cam = new Dw.EasyCam(this._renderer, {distance:240});
}


// TODO why does alpha not work in WEBGL 3D
function draw() {
    background(234, 34, 24)
    lights()

    drawBlenderAxes()
    populateGlobeArray()
    displayGlobe()
    drawPyramid()
    displayHUD()
    checkKeysHeld()

    // randomly assign indices for our pyramid emanating from the origin
    // watch out! if you decrement the sphere detail in checkKeysHeld, there
    // might be a concurrency error leading to an arrayOutOfBounds type error
    if (frameCount % (144/2) === 0) {
        projection_x = round(random(0, SPHERE_DETAIL-1))
        projection_y = round(random(0, SPHERE_DETAIL-1))
        console.log([projection_x, projection_y])
    }
}


// add spherical coordinates to our globe array
function populateGlobeArray() {
    /*
        according to wikipedia, spherical coordinates are done as (r, θ, φ)
        where θ is positive counterclockwise on the xy plane and φ is
        positive clockwise on the zx plane.

        this is not the case in p5.js :P
            θ is clockwise on the xy plane
            φ is clockwise on the zx/zy plane
     */

    /*  we need to add 1 to account for fence posts! if we want 8 sections,
        i.e. a sphere detail level of 8, we have to end up were we started,
        so we need 9 vertex "fence posts". otherwise, there will be a gap.

        since sine wraps at 2π, the 9th vertex will always be equal to the
        1st, i.e. the value at index 0 will equal the value at index 8 or TOTAL
     */
    globe = Array(SPHERE_DETAIL + 1)
    for (let i = 0; i < globe.length; i++) {
        globe[i] = Array(SPHERE_DETAIL + 1)
    }

    /*
        we want to convert (r, lat, lon) ➜ (x, y, z) in 3D; this is
        analogous to (r, θ) ➜ (r*cos(θ), r*sin(θ)) in 2D

        θ is the polar angle, or angle on the x-y plane
        φ is the zenith angle, or angle to the z-axis
        r is radial distance, commonly distance to origin
    */
    let θ, φ
    let x, y, z, r = 100

    // populate the globe 2D array
    // remember, angles start at 0 and are positive clockwise in p5!
    for (let i = 0; i < globe.length; i++) {
        /*
            θ is the polar angle along x-y plane. LHR thumb points to z+
            θ is clockwise positive and starts at 1,0
         */

        /*
            if we go for a full 2π radians, we get the entire xy plane circle
            this loop traverses quadrants 4, 3, 2, 1 in order on the xy plane
         */
        θ = map(i, 0, SPHERE_DETAIL, 0, TAU)
        for (let j = 0; j < globe[i].length; j++) {
            /*
                φ is the angle from z+, positive clockwise
                axis orientations in default easycam view:
                    x axis: left- to right+
                    y axis: top- to bottom+
                    z+ axis comes out of the page
             */

            // should go from 0 to PI, but can go to TAU to generate extra
            // set of points for wrapping. however this necessitates adding
            // 2 at a time to the i length in globe[i][j], which maps θ
            φ = map(j, 0, SPHERE_DETAIL, 0, PI) // this loop makes meridians
            // r*sin(φ) is a projection of r on the x-y plane
            x = r*sin(φ)*cos(θ)
            y = r*sin(φ)*sin(θ)
            z = r*cos(φ)

            globe[i][j] = new p5.Vector(x, y, z)
        }
    }
}


function displayGlobe() {
    strokeWeight(0.1)
    noFill()
    stroke(0, 0, 60, 20)

    // display globe using vertices
    beginShape()
    for (let i = 0; i < globe.length-1; i++)
        for (let j = 0; j < globe[i].length-1; j++) {
            let v1 = globe[i][j]
            let v2 = globe[i+1][j]
            let v3 = globe[i+1][j+1]
            let v4 = globe[i][j+1]

            stroke(0, 0, 60, 20)

            // draw 4 points to close off a quadrilateral
            vertex(v1.x, v1.y, v1.z)
            vertex(v2.x, v2.y, v2.z)
            vertex(v3.x, v3.y, v3.z)
            vertex(v4.x, v4.y, v4.z)
        }

    endShape(CLOSE)
}


// draw our pyramid with rectangular base centered at the origin
function drawPyramid() {
    // this draws the rectangle pyramid
    // pyramid with lines https://editor.p5js.org/kchung/sketches/B17wokMUX
    beginShape(TRIANGLE_STRIP)
    strokeWeight(1)
    fill(0, 0, 30, 50)

    // how do we keep track of our current square pyramid indices? it's top
    // left corner

    let i = projection_x // this counts increments of θ
    let j = projection_y // this counts increments of φ

    let pyramid = [
        globe[i][j],        // top left corner
        globe[i+1][j],      // top right corner
        globe[i+1][j+1],    // bottom right corner
        globe[i][j+1],      // bottom left corner
        globe[i][j]]

    for (let v of pyramid) {
        vertex(v.x, v.y, v.z)
        vertex(0, 0, 0)
    }
    endShape()


    // draw the quad at the surface
    beginShape()
    fill(0, 0, 100, 80)
    for (let v of pyramid)
        vertex(v.x, v.y, v.z)
    endShape()

}


// use the direction keys and WASD to move the projection around the sphere
function checkKeysHeld() {
    // test for keyCodes with this! https://p5js.org/reference/#p5/keyCode
    if (keyIsDown(UP_ARROW) || keyIsDown(87)) { // w
        projection_y -= 1
        if (projection_y === -1)
            projection_y = SPHERE_DETAIL - 1
    }

    if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) { // s
        projection_y += 1
        if (projection_y === SPHERE_DETAIL)
            projection_y = 0
    }

    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { // a
        projection_x += 1
        if (projection_x === SPHERE_DETAIL)
            projection_x = 0
    }

    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { // d
        projection_x -= 1
        if (projection_x === -1)
            projection_x = SPHERE_DETAIL - 1
    }
}


function displayHUD() {
    cam.beginHUD(this._renderer, width, height)
    const PADDING = 10
    const LETTER_HEIGHT = textAscent()

    // display the colors of the axes
    fill(X_HUE, X_SAT, BRIGHT)
    text("x axis", PADDING, height-LETTER_HEIGHT*3)

    // green y axis
    fill(Y_HUE, Y_SAT, BRIGHT)
    text("y axis", PADDING, height-LETTER_HEIGHT*2)

    // blue z axis
    fill(Z_HUE, Z_SAT, BRIGHT)
    text("z axis", PADDING, height-LETTER_HEIGHT)
    cam.endHUD()
}


// draw axes in blender colors, with negative parts less bright
function drawBlenderAxes() {
    const ENDPOINT = 10000

    // red x axis
    stroke(X_HUE, X_SAT, DIM)
    line(-ENDPOINT, 0, 0, 0, 0, 0)
    stroke(X_HUE, X_SAT, BRIGHT)
    line(0, 0, 0, ENDPOINT, 0, 0)

    // green y axis
    stroke(Y_HUE, Y_SAT, DIM)
    line(0, -ENDPOINT, 0, 0, 0, 0)
    stroke(Y_HUE, Y_SAT, BRIGHT)
    line(0, 0, 0, 0, ENDPOINT, 0)

    // blue z axis
    stroke(Z_HUE, Z_SAT, DIM)
    line(0, 0, -ENDPOINT, 0, 0, 0)
    stroke(Z_HUE, Z_SAT, BRIGHT)
    line(0, 0, 0, 0, 0, ENDPOINT)
}


function keyPressed() {
    // let projection_x and projection_y values wrap around
    if (key === 'c') {
        SPHERE_DETAIL += 1
    }

    if (key === 'z') {
        SPHERE_DETAIL -= 1
    }

    // TODO try to make our arrow key methods functions so we can use both
    //  isKeyDown as well as keyPressed to access them "once at a time" vs
    //  "rapidfire"

    /*  trying to fix the wrapping problem of φ only going from 0 to PI
        but it turns out it's sort of okay to generate a duplicate set of points
        in our globe so we have a second set of indices to access the same
        vertices. wrapping is messy anyway because our up and down
         directions would invert.
       */


}

