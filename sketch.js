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
    mouseX, mouseY constrain; not possible with easycam I think
.   draw colored axes using beginHUD
.   movable pyramid with WASD keys
    .   wrap around the sphere when encountering a boundary
.   dynamically vary the sphere detail
.   adam sine wave based on distance
        make this distance based on projection of avg point to the plane
.   draw circle for background color
.   don't draw extra pyramids for points on sphere that don't move
.   have quads do some seeking of noise instead of strictly following sine wave
.       this might get rid of the concentric circles

BUGS
    when both θ and φ go from 0 to 2π, we actually set up two sets of
    overlapping points for our sphere. this is required if we want easy
    wrapping for WASD though

TODO


 */
let font
let cam // easycam!
let SPHERE_DETAIL = 24 // number of segments per θ and φ

// define the hue and saturation for all 3 axes
const X_HUE = 0, X_SAT = 80, Y_HUE = 90, Y_SAT = 80, Z_HUE = 210, Z_SAT = 80
const DIM = 40 // brightness value for the dimmer negative axis
const BRIGHT = 75 // brightness value for the brighter positive axis

let globe // an n by n 2D array of points on a sphere in (r, θ, φ) triples
let angle = 0 // we use this as a phase variable to vary our sine waves

// read the amplitude of our voice from the mic
let voice


// prevent the context menu from showing up :3 nya~
document.oncontextmenu = function() {
    return false;
}


function preload() {
    font = loadFont('fonts/Meiryo-01.ttf')
}


/* Fixes: sound being blocked https://talonendm.github.io/2020-11-16-JStips/
   Errors messages (CTRL SHIFT i) Chrome Developer Tools:
   The AudioContext was not allowed to start. It must be resumed (or
   created)  after a user gesture on the page. https://goo.gl/7K7WLu

   Possibly unrelated: maybe we need to add sound.js.map too.
   DevTools failed to load SourceMap: Could not load content for
   https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.1.9/addons/p5.sound.min.js.map
   : HTTP error: status code 404, net::ERR_HTTP_RESPONSE_CODE_FAILURE
 */
function touchStarted() {
    if (getAudioContext().state !== 'running') {
        getAudioContext().resume().then(r => {});
    }
}


function setup() {
    createCanvas(640, 360, WEBGL)
    colorMode(HSB, 360, 100, 100, 100)
    textFont(font, 16)

    cam = new Dw.EasyCam(this._renderer,
        {
            distance:240
        });

    voice = new p5.AudioIn()
    voice.start()
}


// TODO why does alpha not work in WEBGL 3D
function draw() {
    background(234, 34, 24)

    ambientLight(200);
    directionalLight(0, 0, 10, .5, 1, 0); // z axis seems inverted

    // drawQuadrantOneBoundingBox()
    drawBlenderAxes()
    populateGlobeArray()
    displayGlobe()
    // displayHUD()
}


function drawQuadrantOneBoundingBox() {
    push()
    translate(-100, 100, 100)
    sphere(25)
    pop()

    stroke(0, 0, 100)
    strokeWeight(1)
    point(100, 100, 100)
    point(100, 0, 0)
    point(0, 100, 0)
    point(0, 0, 100)


    // line(100, 0, 0, 100, 100, 100)
    // line(0, 100, 0, 100, 100, 100)
    // line(0, 0, 100, 100, 100, 100)

    strokeWeight(0.1)
    stroke(0, 0, 100)
    line(100, 100, 0, 100, 100, 100)
    line(100, 0, 100, 100, 100, 100)
    line(0, 100, 100, 100, 100, 100)

    line(100, 100, 0, 100, 0, 0)
    line(100, 100, 0, 0, 100, 0)
    line(0, 100, 0, 0, 100, 100)
    line(0, 0, 100, 0, 100, 100)


    line(0, 100, 0, 0, 100, 100)
    line(0, 0, 100, 100, 0, 100)
    line(100, 0, 0, 100, 0, 100)
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

            if we go for a full 2π radians, we get the entire xy plane circle
            this loop traverses quadrants 4, 3, 2, 1 in order on the xy plane
         */
        θ = map(i, 0, SPHERE_DETAIL, 0, PI)
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





let lastAmp=0, voiceAmp, currentAmp

function displayGlobe() {
    strokeWeight(0.1)
    noFill()
    stroke(0, 0, 60)

    // display globe using vertices
    let focus = new p5.Vector(0, 100, 0)
    let origin = new p5.Vector(0, 0, 0)

    // draw a circle for background color
    fill(181, 96, 96, 96)
    push()
    rotateX(PI/2)
    circle(0, 0, 100*2)

    // image(backgroundImage, -width/2, -height/2, width, height)
    pop()

    strokeWeight(5)

    /* flips ADAM to face the default camera, but needs rotateZ(π/2) above */
    // rotateZ(PI/2)
    // rotateX(PI/2)
    // lights()


    for (let i = 0; i < globe.length-1; i++)
        for (let j = 0; j < globe[i].length-1; j++) {

            let vertices = []
            vertices.push(globe[i][j])
            vertices.push(globe[i+1][j])
            vertices.push(globe[i+1][j+1])
            vertices.push(globe[i][j+1])

            // average vector of the 4 quad corners :D should be their center
            let avg = new p5.Vector()
            for (let v of vertices) {
                avg.add(v)
            }
            avg.div(vertices.length)

            // slightly offset the x,z coordinates so the center 4 squares
            // don't oscillate at the exact same frequency
            avg.x += 0.5
            avg.z += 0.5

            // distance from the y axis
            let distance = sqrt(avg.z**2 + avg.x**2)

            noStroke()

            // TODO map to bigger amplitude near center
            let amp = 0.2*map(distance, 0, 100, -1, 1)

            // our oscillation amplitude varies from -0.05 to 0.01; we
            // should add a large negative amp to our voice

            /*
                we want some sort of smoothing here to average out with the
                last n values so there are less jumps. maybe an array of 30.

                we want to modify the amplitude with two sine waves: one
                that performs small oscillations and another that gives
                large negative scaling values closer to the center based on
                voice amplitude.
             */
            const RADIUS = 66 // only render pyramids within a certain radius

            currentAmp = voice.getLevel()
            voiceAmp = (currentAmp + lastAmp) / 2
            lastAmp = voiceAmp

            // we want the voice amp to have the greatest effect in the center
            // this function is designed to be positive in its domain, since
            // cos(RADIUS/4), the quarter period, will give zero
            // voiceAmp = map(voice.getLevel(), 0, 0.5, 0, 1) /
            //     tan(TAU / (RADIUS * 4) * distance)

            voiceAmp = 50*map(voice.getLevel(), 0, 0.25, 0, 1) / (distance**(1.9))

            // TODO find out about switch:case in js, fix sine wave.
            // TODO try offset distance sine wave for each pyramid

            // amp += (1-voiceAmp)

            // we want our quad surfaces to be oscillating close to the surface
            let psf = amp * abs(sin(distance / 20 + angle)) + (1.025-voiceAmp)



            // remember, psf is a scaling factor that should hover from 0 to 1
            // let psf = amp

            /*  sin(distance / 10) makes obvious concentric circles but * n
                makes it appear more random
             */

            // only render pyramids within a certain radius

            let fromColor = color(185, 12, 98)
            let toColor = color(184, 57, 95)
            let c = lerpColor(fromColor, toColor, distance/RADIUS)
            if (distance < RADIUS) {
                fill(c)

                // draw 4 points to close off a quadrilateral
                beginShape(TRIANGLE_STRIP)
                for (let v of vertices) {
                    vertex(v.x*psf, v.y*psf, v.z*psf)
                    vertex(0, 0, 0)
                }
                endShape()
            } else {
                // don't render oscillations if we're outside of the radius
                psf = 1
            }

            // fill(223, 34, 24, 100)
            // see https://p5js.org/examples/3d-materials.html
            specularMaterial(223, 34, 24)
            shininess(100) // ? doesn't seem to work. maybe specularMaterial
            // draw 4 points to close off a quadrilateral
            beginShape()
            for (let v of vertices)
                vertex(v.x * psf, v.y * psf, v.z * psf)
            endShape()

            // fill in the missing line between vertex 1 and 4
            // let v1 = vertices[0]
            // let v4 = vertices[3]
            // line(v1.x * psf, v1.y * psf, v1.z * psf,
            //     v4.x * psf, v4.y * psf, v4.z * psf)
        }
    angle -= 0.03
}


// draw our pyramid with rectangular base centered at the origin
function drawPyramid(scale_factor) {
    // this draws the rectangle pyramid
    // pyramid with lines https://editor.p5js.org/kchung/sketches/B17wokMUX
    beginShape(TRIANGLE_STRIP)
    strokeWeight(1)
    fill(0, 0, 30, 50)

    // how do we keep track of our current square pyramid indices? it's top
    // left corner

    let i = projection_x // this counts increments of θ
    let j = projection_y // this counts increments of φ

    let pyramid = [         // these are all 3D p5.Vector objects
        globe[i][j],        // top left corner
        globe[i+1][j],      // top right corner
        globe[i+1][j+1],    // bottom right corner
        globe[i][j+1],      // bottom left corner
        globe[i][j]]

    for (let v of pyramid) {
        vertex(
            v.x * scale_factor,
            v.y * scale_factor,
            v.z * scale_factor)
        vertex(0, 0, 0)
    }
    endShape()


    // draw the quad at the surface
    beginShape()
    fill(0, 0, 100, 80)
    for (let v of pyramid)
        vertex(
            v.x * scale_factor,
            v.y * scale_factor,
            v.z * scale_factor)
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

    // have Q and E shrink and grow the pyramid :o
    if (keyIsDown(81))
        projection_scale_factor += 0.1
    if (keyIsDown(69))
        projection_scale_factor -= 0.1


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
    strokeWeight(1)

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

    strokeWeight(15)
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

