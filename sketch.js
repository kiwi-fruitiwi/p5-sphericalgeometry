// noinspection NonAsciiCharacters

/*
@author Kiwi
@date 2021-10-14

 */
let font
const TOTAL = 100

function preload() {
    font = loadFont('fonts/Meiryo-01.ttf')
}

function setup() {
    createCanvas(640, 360, WEBGL)
    colorMode(HSB, 360, 100, 100, 100)
}

function draw() {
    background(234, 34, 24)

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
    let x, y, z, r

    for (let i=0; i<TOTAL; i++) {
        θ = map(i, 0, TOTAL, -PI, PI)
        for (let j=0; j<TOTAL; j++) {
            φ = map(j, 0, TOTAL, -HALF_PI, HALF_PI)
            x = r*sin(θ)*cos(φ)
            x = r*sin(θ)*sin(φ)
            z = r*cos(θ)

        }
    }
}