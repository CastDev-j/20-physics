import * as THREE from "three";
import * as CANNON from "cannon-es";
import GUI from "lil-gui";
import { Timer } from "three/examples/jsm/Addons.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 *  Sounds
 */

const hitSound = new Audio("/sounds/hit.mp3");

interface CollisionContact {
  getImpactVelocityAlongNormal(): number;
}

interface CollisionEvent {
  contact: CollisionContact;
}

const playHitSound = (collision: CollisionEvent): void => {
  const impactStrength = collision.contact.getImpactVelocityAlongNormal();

  if (impactStrength < 1.5) return;

  hitSound.currentTime = 0;
  hitSound.volume = Math.min(impactStrength / 10, 1);
  hitSound.play().catch((error: unknown) => {
    console.error("Error playing sound:", error);
  });
};

/**
 * Debug
 */
const gui = new GUI();
gui.close();

/**
 * Debug reste
 */

const debugObject = {
  clear: () => {
    objectsToUpdate.forEach((object) => {
      object.body.removeEventListener("collide", playHitSound);
      world.removeBody(object.body);

      scene.remove(object.mesh);
    });

    objectsToUpdate.length = 0; // Clear the array
  },
  generateRandomBox: () => {
    const size = Math.random() * 0.5 + 0.5; // Random size between 0.5 and 1
    const position = new CANNON.Vec3(
      (Math.random() - 0.5) * 5,
      Math.random() * 5 + 1,
      (Math.random() - 0.5) * 5
    );

    createBoxGeometry(size, position);
  },
  generateRandomSphere: () => {
    const radius = Math.random() * 0.5 + 0.5; // Random radius between 0.5 and 1
    const position = new CANNON.Vec3(
      (Math.random() - 0.5) * 5,
      Math.random() * 5 + 1,
      (Math.random() - 0.5) * 5
    );

    createSphereGeometry(radius, position);
  },
};

gui.add(debugObject, "clear").name("Clear Scene");
gui.add(debugObject, "generateRandomBox").name("Generate Random Box");
gui.add(debugObject, "generateRandomSphere").name("Generate Random Sphere");

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

world.defaultContactMaterial = defaultContactMaterial;
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
/**
 * Physics body's
 */

const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body({
  mass: 0, // kg, static body
  position: new CANNON.Vec3(0, 0, 0), // m
  shape: floorShape,
  // material: defaultMaterial,
  quaternion: new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0), // Rotate the plane to be horizontal
});

world.addBody(floorBody);

/**
 * Test geometryes
 */
interface ObjectsToUpdate {
  mesh: THREE.Mesh;
  body: CANNON.Body;
}

const objectsToUpdate: ObjectsToUpdate[] = [];

const sphereBaseGeometries = {
  three: new THREE.SphereGeometry(1, 32, 32),
  cannon: new CANNON.Sphere(1),
};

const sphereMaterial = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  metalness: 0.3,
  roughness: 0.4,
  envMap: environmentMapTexture,
  envMapIntensity: 0.5,
});

const createSphereGeometry = (radius: number, position: CANNON.Vec3) => {
  // Three.js mesh

  const mesh = new THREE.Mesh(
    sphereBaseGeometries.three.clone(),
    sphereMaterial.clone()
  );

  mesh.scale.setScalar(radius);
  mesh.castShadow = true;
  mesh.position.copy(position as any);
  scene.add(mesh);

  // physics body
  const shape = new CANNON.Sphere(radius);
  const body = new CANNON.Body({
    mass: 1, // kg
    position: position, // m
    shape: shape,
  });

  body.addEventListener("collide", playHitSound);

  world.addBody(body);
  // Add to the array
  objectsToUpdate.push({ mesh, body });
};

/**
 * Creating spheres
 */
const sideLength = 2;
for (let i = 0; i < Math.pow(sideLength, 3); i++) {
  const x = (i % sideLength) - Math.floor(sideLength / 2);
  const y = Math.floor(i / sideLength ** 2) + 1;
  const z =
    Math.floor((i % sideLength ** 2) / sideLength) - Math.floor(sideLength / 2);

  createSphereGeometry(0.5, new CANNON.Vec3(x, y, z));
}

/**
 * Boxes geometries
 */

const boxBaseGeometry = new THREE.BoxGeometry(1, 1, 1);
const boxMaterial = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  metalness: 0.3,
  roughness: 0.4,
  envMap: environmentMapTexture,
  envMapIntensity: 0.5,
});

const createBoxGeometry = (size: number, position: CANNON.Vec3) => {
  // Three.js mesh
  const mesh = new THREE.Mesh(boxBaseGeometry.clone(), boxMaterial.clone());

  mesh.scale.setScalar(size);
  mesh.castShadow = true;
  mesh.position.copy(position as any);
  scene.add(mesh);

  // Physics body

  const shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2));
  const body = new CANNON.Body({
    mass: 1, // kg
    position: position, // m
    shape: shape,
  });

  body.addEventListener("collide", playHitSound);

  world.addBody(body);

  // Add to the array

  objectsToUpdate.push({ mesh, body });
};

/**
 * Creating boxes
 */

const boxSideLength = 2;
for (let i = 0; i < Math.pow(boxSideLength, 3); i++) {
  const x = (i % boxSideLength) - Math.floor(boxSideLength / 2);
  const y = Math.floor(i / boxSideLength ** 2) + 1;
  const z =
    Math.floor((i % boxSideLength ** 2) / boxSideLength) -
    Math.floor(boxSideLength / 2);

  createBoxGeometry(1, new CANNON.Vec3(x, y, z));
}

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

  // Update physics bodies

  objectsToUpdate.forEach((object) => {
    object.mesh.position.copy(object.body.position as any);
    object.mesh.quaternion.copy(object.body.quaternion as any);
  });

  // Update physics world
  world.step(1 / 60, deltaTime, 3); // Step the physics world at 60 FPS

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
