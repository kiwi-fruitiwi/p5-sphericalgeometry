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


 */
let font
let cam
let total = 40
// let total
let array2D = (r,c) => [...Array(r)].map(x=>Array(c).fill(0))
let globe = array2D(total, total)


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

    // cam = new Dw.EasyCam(p5.RendererGL, {distance: 500, center: [0, 0, 0]})
    cam = new Dw.EasyCam(this._renderer, {distance:240})

    // TODO find out how to place slider properly
    // total = createSlider(1, 80, 20, 2)
}

function drawBlenderAxes() {

    // red x axis
    stroke(0, 80, 50)
    line(-10000, 0, 0, 0, 0, 0)
    stroke(0, 80, 80)
    line(0, 0, 0, 10000, 0, 0)

    // green y axis
    stroke(90, 80, 50)
    line(0, -10000, 0, 0, 0, 0)
    stroke(90, 80, 80)
    line(0, 0, 0, 0, 10000, 0)

    // blue z axis
    stroke(210, 80, 50)
    line(0, 0, -10000, 0, 0, 0)
    stroke(210, 80, 80)
    line(0, 0, 0, 0, 0, 10000)
}


// TODO why does alpha not work in WEBGL
function draw() {
    background(234, 34, 24)
    strokeWeight(0.99)
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

    // const TOTAL = total.value()
    const TOTAL = total

    /*
        according to wikipedia, spherical coordinates are done as (r, θ, φ)
        where θ is positive counterclockwise on the xy plane and φ is
        positive clockwise on the z-x plane.

        θφ
     */


    // populate the globe 2D array
    // remember, angles start at 0 and are positive clockwise in p5!
    for (let i=0; i<TOTAL; i++) {
        // θ is the angle along x-y plane. RHR thumb points to z+
        // θ is clockwise positive and starts at 1,0
        θ = map(i, 0, TOTAL, 0, TAU)
        for (let j=0; j<TOTAL; j++) {

            // φ is the angle from z+, positive clockwise?
            // in default easycam view, x axis is left- to right+
            // z+ axis comes out of the page; y top- to bottom+
            φ = map(j, 0, TOTAL, 0, PI) // this loop makes meridians
            x = r*sin(φ)*cos(θ) // r*sin(φ) is a projection(?) on the x-y plane
            y = r*sin(φ)*sin(θ)
            z = r*cos(φ)

            globe[i][j] = new p5.Vector(x, y, z)

            // point(x, y, z)
        }
    }

    let v
    // display globe points
    for (let i=0; i<TOTAL; i++) {
        for (let j=0; j<TOTAL; j++) {
            v = globe[i][j]
            point(v.x, v.y, v.z)
        }
    }
}