// noinspection NonAsciiCharacters

/*
@author Kiwi
@date 2021-10-14

create initial points on sphere
add easycam, the p5.js fork of peasycam
disable context menu
add total slider
draw axes to help visualize
? mouseX, mouseY constrain
draw colored axes

TODO
    add 2D HUD for axis colors

 */
let font
let cam
let total = 12

// define the hue and saturation for all 3 axes
const X_HUE=0, X_SAT=80, Y_HUE=90, Y_SAT=80, Z_HUE=210, Z_SAT=80
const DIM = 40
const BRIGHT = 75


// quick function
let array2D = (r,c) => [...Array(r)].map(x=>Array(c).fill(new p5.Vector()))
let globe = array2D(total+1, total+1)


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

    // cam = new Dw.EasyCam(p5.RendererGL, {distance: 500, center: [0, 0, 0]})
    cam = new Dw.EasyCam(this._renderer, {distance:240})

    // TODO find out how to place slider properly
    // total = createSlider(1, 80, 20, 2)
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


// TODO why does alpha not work in WEBGL
function draw() {
    background(234, 34, 24)
    strokeWeight(2)
    lights()
    drawBlenderAxes()

    // TODO why doesn't this work?
    // mouseX = constrain(mouseX, 0, width)
    // mouseY = constrain(mouseY, 0, height)

    /*
        we want to convert (r, lat, lon) ➜ (x, y, z) in 3D; this is
        analogous to (r, θ) ➜ (r*cos(θ), r*sin(θ)) in 2D

        θ is longitude,
        φ is latitude,
        r is radial distance, commonly distance to origin

        azimuthal angle. angle of rotation from meridian plane
        polar angle. angle wrt polar axis, x
    */
    let θ, φ
    let x, y, z, r=100
    stroke(0, 0, 60, 20)

    const TOTAL = total

    /*
        according to wikipedia, spherical coordinates are done as (r, θ, φ)
        where θ is positive counterclockwise on the xy plane and φ is
        positive clockwise on the zx plane.

        this is not the case in p5.js :P
            θ is clockwise on the xy plane
            φ is clockwise on the zx/zy plane
     */

    // populate the globe 2D array
    // remember, angles start at 0 and are positive clockwise in p5!
    for (let i=0; i<TOTAL+1; i++) {
        // θ is the angle along x-y plane. LHR thumb points to z+
        // θ is clockwise positive and starts at 1,0

        // if we go for a full 2π radians, we get the entire xy plane circle
        // this loop traverses quadrants 4, 3, 2, 1 in order on the xy plane
        θ = map(i, 0, TOTAL, 0, TAU)
        for (let j=0; j<TOTAL+1; j++) {
            /*
                φ is the angle from z+, positive clockwise
                axis orientations in default easycam view:
                    x axis: left- to right+
                    y axis: top- to bottom+
                    z+ axis comes out of the page
             */

            φ = map(j, 0, TOTAL, 0, PI) // this loop makes meridians
            x = r*sin(φ)*cos(θ) // r*sin(φ) is a projection(?) on the x-y plane
            y = r*sin(φ)*sin(θ)
            z = r*cos(φ)

            globe[i][j] = new p5.Vector(x, y, z)
        }
    }

    strokeWeight(1)
    noFill()
    // display globe using points or shapes!!
    beginShape(QUAD_STRIP)
    for (let i=0; i<TOTAL; i++) {
        for (let j=0; j<TOTAL; j++) {
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
    }
    endShape()

    // pyramid with lines https://editor.p5js.org/kchung/sketches/B17wokMUX
    //     beginShape()
    //     strokeWeight(1)
    //     let i = 5
    //     let pyramid = [globe[i][i], globe[i+1][i], globe[i+1][i+1], globe[i][i+1], globe[i][i]]
    //     for (let v of pyramid) {
    //         vertex(v.x, v.y, v.z)
    //     }
    //
    //     vertex(0, 0, 0)
    //     endShape(CLOSE)

    displayHUD()
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