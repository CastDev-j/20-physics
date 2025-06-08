import * as THREE from "three";
import CANNON from "cannon";
import GUI from "lil-gui";
import { Timer } from "three/examples/jsm/Addons.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * Debug
 */
const gui = new GUI();
gui.close();

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("#canvas") as HTMLCanvasElement;

// Scene
const scene = new THREE.Scene();

/**
 * Textures
 */
// const textureLoader = new THREE.TextureLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();

const environmentMapTexture = cubeTextureLoader.load([
  "/textures/environmentMaps/0/px.png",
  "/textures/environmentMaps/0/nx.png",
  "/textures/environmentMaps/0/py.png",
  "/textures/environmentMaps/0/ny.png",
  "/textures/environmentMaps/0/pz.png",
  "/textures/environmentMaps/0/nz.png",
]);

/**
 * Physics world
 */

const world = new CANNON.World();

world.gravity.set(0, -9.82, 0); // m/s²

/**
 * Physics interactions
 */

const defaultMaterial = new CANNON.Material("default");

const defaultContactMaterial = new CANNON.ContactMaterial(
  defaultMaterial,
  defaultMaterial,
  {
    friction: 0.1,
    restitution: 0.7,
  }
);

world.addContactMaterial(defaultContactMaterial);

/**
 * Physics body's
 */

const sphereShape = new CANNON.Sphere(0.5);

const sphereBody = new CANNON.Body({
  mass: 1, // kg
  position: new CANNON.Vec3(0, 3, 0), // m
  velocity: new CANNON.Vec3(0, 0, 0), // m/s
  shape: sphereShape,
  material: defaultMaterial,
});

sphereBody.applyLocalForce(
  new CANNON.Vec3(0, 0, 0), // Force vector in N (Newtons)
  sphereBody.position // Point of application of the force
);

const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body({
  mass: 0, // kg, static body
  position: new CANNON.Vec3(0, 0, 0), // m
  shape: floorShape,
  material: defaultMaterial,
  quaternion: new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0), // Rotate the plane to be horizontal
});

world.addBody(sphereBody);
world.addBody(floorBody);

/**
 * Test sphere
 */
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 32, 32),
  new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture,
    envMapIntensity: 0.5,
  })
);
sphere.castShadow = true;
sphere.position.y = 0.5;
scene.add(sphere);

/**
 * Floor
 */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({
    color: "#777777",
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture,
    envMapIntensity: 0.5,
  })
);
floor.receiveShadow = true;
floor.rotation.x = -Math.PI * 0.5;
scene.add(floor);

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = -7;
directionalLight.shadow.camera.top = 7;
directionalLight.shadow.camera.right = 7;
directionalLight.shadow.camera.bottom = -7;
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(-5, 5, 10);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Animate
 */
const timer = new Timer();

const tick = () => {
  timer.update();
  // const elapsedTime = timer.getElapsed();
  const deltaTime = timer.getDelta();

  // Update controls
  controls.update();

  // adding forces
  sphereBody.applyForce(
    new CANNON.Vec3(.1, 0, 0),
    sphereBody.position 
  );

  // Update physics world
  world.step(1 / 60, deltaTime, 3); // Step the physics world at 60 FPS
  sphere.position.copy(sphereBody.position as any);

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
