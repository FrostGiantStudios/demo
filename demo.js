const count = 1000;

let bd;
WebAssembly.instantiateStreaming(fetch('ball2d.wasm'), { env: { memory: new WebAssembly.Memory({initial: 1}), STACKTOP: 0, } })
.then(obj =>
{
    bd = obj.instance.exports
    bd.bd_reset();
    for (let i = 0; i < count; ++i)
        bd.bd_spawn_random();
});

import * as THREE from 'https://unpkg.com/three@0.126.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.126.0/examples/jsm/loaders/GLTFLoader.js';
import { MapControls } from 'https://unpkg.com/three@0.126.0/examples/jsm/controls/OrbitControls.js'

const e_fps = document.getElementById('fps');
const e_count = document.getElementById('count');

e_count.textContent = count;

let camera, scene, renderer;
let then = 0;
let fleet;

function xyz(a, b, c) { return { x:a, y:b, z:c } };

init();
animate();

function init() {
camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(-35, 15, 40);
camera.lookAt(xyz(0, 0, 0));

const bkg = 0x000000;

scene = new THREE.Scene();
scene.background = new THREE.Color(bkg);
//scene.fog = new THREE.Fog(bkg, 40, 100);
scene.fog = new THREE.FogExp2(bkg, 0.007);

const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
hemiLight.position.set( 0, 20, 0 );
scene.add( hemiLight );

const dirLight = new THREE.DirectionalLight( 0xffffff );
dirLight.position.set( 1, 2, 1 );
//dirLight.castShadow = true;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -2;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 40;
scene.add( dirLight );

//const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 512, 512 ), new THREE.MeshPhongMaterial( { color: 0x004040, depthWrite: false } ) );
//mesh.rotation.x = - Math.PI / 2; // flip upside down...
//mesh.receiveShadow = true;
//scene.add(mesh);

const grid = new THREE.GridHelper(512, 256, 0xffffff, 0x707070);
grid.material.opacity = 0.2;
grid.material.transparent = true;
scene.add(grid);

renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
//renderer.shadowMap.enabled = true;
document.body.appendChild( renderer.domElement );

const controls = new MapControls( camera, renderer.domElement );

controls.screenSpacePanning = false;
controls.minDistance = 20;
controls.maxDistance = 100;
controls.maxPolarAngle = Math.PI * 6 / 16;
controls.update();

const loader = new GLTFLoader()
loader.load('tie.glb', 
(gltf) =>
{
console.log(gltf);
let model = gltf.scene;

let tie = model.children[0].children[2];

fleet = new THREE.InstancedMesh(tie.geometry, tie.material, count);
fleet.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(fleet);

}, undefined, function ( error ) { console.error( error ); } );

window.addEventListener( 'resize', onWindowResize );
}

function onWindowResize()
{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate()
{
    requestAnimationFrame( animate );

    if (bd && fleet)
    {
        bd.bd_tick();
        let scl = new THREE.Vector3(0.125, 0.125, 0.125);
        let rot = new THREE.Quaternion();
        let m = new THREE.Matrix4();
        for (let i = 0; i < fleet.count; ++i)
        {
            let px = bd.bd_get_x(i);
            let py = bd.bd_get_y(i);
            let p = { x: px * 2, y:0, z:py * 2 };
            m.compose(p, rot, scl);
            fleet.setMatrixAt(i, m);
        }
        fleet.instanceMatrix.needsUpdate = true;
    }

    render();
}

function render()
{
    renderer.render( scene, camera );
    const time = performance.now();
    const ms = time - then;
    then = time;
    let fps = 1000 / ms;
    if (fps > 59 && fps < 61)
    fps = 60;

    e_fps.textContent = fps.toFixed(0);
}
