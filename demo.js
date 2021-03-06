const count = 1024 * 32;

let bd;
WebAssembly.instantiateStreaming(fetch('ball2d.wasm'), { env: { memory: new WebAssembly.Memory({initial: 1}), STACKTOP: 0, } })
.then(obj =>
{
    bd = obj.instance.exports
    bd.bd_reset();
    //for (let i = 0; i < count; ++i)
       // bd.bd_spawn_random();
});

import * as THREE from 'https://unpkg.com/three@0.126.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.126.0/examples/jsm/loaders/GLTFLoader.js';
import { MapControls } from 'https://unpkg.com/three@0.126.0/examples/jsm/controls/OrbitControls.js'
import{ KTX2Loader } from 'https://unpkg.com/three@0.126.0/examples/jsm/loaders/KTX2Loader.js';
import Stats from 'https://unpkg.com/three@0.126.0/examples/jsm/libs/stats.module.js';
const e_fps = document.getElementById('fps');
const e_count = document.getElementById('count');

e_count.textContent = 0;

let camera, scene, renderer, stats;
let then = performance.now();
let fleet, scale = 1;
let pause = false;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(1, 1);
const color = new THREE.Color();

function xyz(a, b, c) { return { x:a, y:b, z:c } };

let then_spawn = performance.now();

init();
animate();

function init()
{
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(-35, 15, 40);
    camera.lookAt(xyz(0, 0, 0));

    const bkg = 0x005050;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(bkg);
    //scene.fog = new THREE.Fog(bkg, 40, 100);
    scene.fog = new THREE.FogExp2(bkg, 0.008);

    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
    hemiLight.position.set( 0, 20, 0 );
    scene.add( hemiLight );

    const light1 = new THREE.HemisphereLight(0xffffff, 0x000088);
    light1.position.set(-1, 1.5, 1);
    scene.add(light1);

    const light2 = new THREE.HemisphereLight(0xffffff, 0x880000, 0.5);
    light2.position.set(-1, -1.5, -1);
    scene.add(light2);

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

    const grid = new THREE.GridHelper(512, 256, 0xffffff, 0x404040);
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
    controls.minDistance = 10;
    controls.maxDistance = 200;
    controls.maxPolarAngle = Math.PI * 13 / 32;
    controls.update();

    var ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath('https://unpkg.com/three@0.126.0/examples/js/libs/basis/');
    ktx2Loader.detectSupport(renderer);

    const loader = new GLTFLoader();
    loader.setKTX2Loader(ktx2Loader);

    loader.load('yeti.glb', 
    (gltf) =>
    {
        console.log(gltf);
        let model = gltf.scene;

        let tie = model.children[0];
        //let tie = model.children[0].children[0];
        scale = 1. / 120 * tie.scale.x;
        //let tie = model.children[0].children[0].children[0].children[0];// .children[0];
        //scale = 1. / 256 * tie.scale.x;

        const geometry = new THREE.IcosahedronGeometry(64, 3);
        const material = new THREE.MeshPhongMaterial();

        fleet = new THREE.InstancedMesh(tie.geometry, tie.material, count);
        fleet.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        
        for (let i = 0; i < count; ++i)
        {
            fleet.setColorAt(i, color.setHex(Math.random() * 0xffffff));
        }
        scene.add(fleet);
        fleet.count = 0;
        spawn();

    }, undefined, function ( error ) { console.error( error ); } );

    window.addEventListener('resize', onWindowResize);

    stats = new Stats();
    //document.body.appendChild(stats.dom);

    document.getElementById("pause").onclick = function()
    {
        pause = !pause;
    };
    document.getElementById("reset").onclick = function()
    {
        bd.bd_reset();
        fleet.count = 0;
        then_spawn = performance.now();
    };

    document.getElementById("spawn").onclick = spawn;

    document.getElementById("movez").onclick = function()
    {
        bd.move_to(fleet.count, bd.bd_get(0), 0, 0);
    };

    document.addEventListener('mousemove', onMouseMove);

    window.addEventListener("keydown", 
        function(event)
        {
            if (event.defaultPrevented) {
                return; // Do nothing if the event was already processed
            }

            console.log(event);
            switch (event.key) {
            case "z":
                raycaster.setFromCamera(mouse, camera);
                const intersection = raycaster.intersectObject(fleet);
                if (intersection.length > 0)
                {
                    console.log(intersection[0].instanceId);
                    const instanceId = intersection[0].instanceId;
                    bd.move_to(1, bd.bd_get(instanceId), 0, 0);
                }
                break;

            default:
                return; // Quit when this doesn't handle the key event.
            }

            // Cancel the default action to avoid it being handled twice
            event.preventDefault();
        }, true);
}

function spawn()
{
    var j = fleet.count;
    var i = j + 512;
    i = Math.min(i, count);

    while (j < i)
    {
        const x = bd.random_float() - 0.5;
        const y = bd.random_float() - 0.5;

        if (bd.bd_spawn(x * 48, y * 48, 0))
            fleet.count += 1;
        j += 1;
    }

};

function onMouseMove(event)
{
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize()
{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function my_pause()
{
    console.log(pause);
    if (pause)
        pause = false;
    else
        pause = true;
}

function animate()
{
    requestAnimationFrame( animate );

    if (bd && fleet)
    {
        if (pause)
        {
            then_spawn = performance.now();
        }
        else
        {
            if (fleet.count < count)
            {
                const time = performance.now();
                if (false)
                    //if (time > then_spawn)
                {
                    var j = fleet.count;
                    var i = time - then_spawn + j;
                    i = Math.min(i, count);

                    while (j < i)
                    {
                        const x = bd.random_float() - 0.5;
                        const y = bd.random_float() - 0.5;

                        if (bd.bd_spawn(x * 48, y * 48, 0))
                            fleet.count += 1;
                        j += 1;
                    }
                    then_spawn = time;
                }
            }

            bd.bd_tick();
        }

        let scl = new THREE.Vector3(scale, scale, scale);
        let rot = new THREE.Quaternion();
        let m = new THREE.Matrix4();
        for (let i = 0; i < fleet.count; ++i)
        {
            const body = bd.bd_get(i);
            let p = { x: bd.bd_x(body), y : 0, z : bd.bd_y(body) };
            m.compose(p, rot, scl);
            fleet.setMatrixAt(i, m);                
        }
        fleet.instanceMatrix.needsUpdate = true;

        e_count.textContent = fleet.count;
    }

    render();
    stats.update();
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
