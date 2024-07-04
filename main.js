import { color } from 'three/examples/jsm/nodes/Nodes.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js'; 
import { degToRad } from 'three/src/math/MathUtils.js';

class InputController {
  constructor() {
    this.initialize_();
  }

  initialize_() {
    this.current_ = {
      leftButton: false,
      rightButton: false,
      mouseX: 0,
      mouseY: 0
    };
    this.previous_ = null;
    this.keys_ = {};
    this.previousKeys_ = {};

    document.addEventListener('mousedown', (e) => this.onMouseDown_(e), false);
    document.addEventListener('mouseup', (e) => this.onMouseUp_(e), false);
    document.addEventListener('keydown', (e) => this.onKeyDown_(e), false);
    document.addEventListener('keyup', (e) => this.onKeyUp_(e), false);
  }

  onMouseDown_(e) {
    switch (e.button) {
      case 0: {
        this.current_.leftButton = true;
        break;
      }
      case 2: {
        this.current_.rightButton = true;
        break;
      }
    }
  }

  onMouseUp_(e) {
    switch (e.button) {
      case 0: {
        this.current_.leftButton = false;
        break;
      }
      case 2: {
        this.current_.rightButton = false;
        break;
      }
    }
  }

  onKeyDown_(e) {
    this.keys_[e.keyCode] = true;
  }

  onKeyUp_(e) {
    this.keys_[e.keyCode] = false;
  }

  update() {
    this.previous_ = { ...this.current_ };
  }
}

function checkCollision(position) {
  const cameraBox = new THREE.Box3().setFromCenterAndSize(position, new THREE.Vector3(1, 1, 1));
  for (const box of boundingBoxes) {
    if (cameraBox.intersectsBox(box)) {
      return true;
    }
  }
  return false;
}
class FirstPersonCamera {
  
  constructor(camera) {
    this.camera_ = camera;
    this.input_ = new InputController();
    this.rotation_ = new THREE.Quaternion();
    this.translation_ = new THREE.Vector3().copy(this.camera_.position);
    this.phi_ = 0;
    this.theta_ = 0;
    this.omega_=0;
    this.zoomFactor_ = 1;
    this.spawnPosition_ = new THREE.Vector3().copy(this.camera_.position);
  }

  update(timeElapsedS) {
    this.updateRotation_(timeElapsedS);
    this.updateCamera_(timeElapsedS);
    this.updateTranslation_(timeElapsedS*8);
    this.handleKeyInputs_(timeElapsedS);
    this.input_.update(timeElapsedS);
  }

  updateCamera_(_) {
    this.camera_.quaternion.copy(this.rotation_);
    this.camera_.position.copy(this.translation_);
  }

  updateTranslation_(timeElapsedS) {
    const forwardVelocity = (this.input_.keys_[87] ? 1 : 0) + (this.input_.keys_[83] ? -1 : 0); // W/S 
    const strafeVelocity = (this.input_.keys_[65] ? 1 : 0) + (this.input_.keys_[68] ? -1 : 0); // A/D 
    const elevateVelocity = (this.input_.keys_[81] ? 1 : 0) + (this.input_.keys_[69] ? -1 : 0); // E/Q 

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(qx);
    forward.multiplyScalar(forwardVelocity * timeElapsedS * 10);

    const left = new THREE.Vector3(-1, 0, 0);
    left.applyQuaternion(qx);
    left.multiplyScalar(strafeVelocity * timeElapsedS * 10);

    const elevate = new THREE.Vector3(0, -1, 0);
    elevate.applyQuaternion(qx);
    elevate.multiplyScalar(elevateVelocity * timeElapsedS * 10);



    this.translation_.add(forward);
    this.translation_.add(left);
    this.translation_.add(elevate);

    if (checkCollision(this.translation_)) {
      this.translation_.sub(forward);
      this.translation_.sub(left);
      this.translation_.sub(elevate);

    }

  }

  updateRotation_(timeElapsedS) {
    const leftRight = (this.input_.keys_[39] ? 1 : 0) + (this.input_.keys_[37] ? -1 : 0);
    const upDown = (this.input_.keys_[40] ? 1 : 0) + (this.input_.keys_[38] ? -1 : 0); 
    const spin = (this.input_.keys_[78] ? 1 : 0) + (this.input_.keys_[77] ? -1 : 0); 

    this.phi_ += -leftRight * timeElapsedS * 2;
    this.theta_ += -upDown * timeElapsedS * 2;
    this.omega_ += -spin * timeElapsedS * 2;

    const qy = new THREE.Quaternion();
    qy.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);
    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.theta_);
    const qz = new THREE.Quaternion();
    qz.setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.omega_);

    const q = new THREE.Quaternion();
    q.multiply(qy);
    q.multiply(qx);
    q.multiply(qz);
    this.rotation_.copy(q);
  }

  clamp_(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  zoomIn() {
    this.zoomFactor_ = 0.999;
    const focalLength = this.camera_.getFocalLength();
    const newFocalLength = focalLength * this.zoomFactor_;
    this.camera_.setFocalLength(newFocalLength);
  }

  zoomOut() {
    this.zoomFactor_ = 1.001;
    const focalLength = this.camera_.getFocalLength();
    const newFocalLength = focalLength * this.zoomFactor_;
    this.camera_.setFocalLength(newFocalLength);
  }

  // Rotate Tilt (Roll, Pitch, Yaw)
  rotateTilt(roll, pitch, yaw) {
    const qx = new THREE.Quaternion();
    const qy = new THREE.Quaternion();
    const qz = new THREE.Quaternion();

    qx.setFromAxisAngle(new THREE.Vector3(1, 0, 0), roll);
    qy.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pitch);
    qz.setFromAxisAngle(new THREE.Vector3(0, 0, 1), yaw);

    const q = new THREE.Quaternion();
    q.multiply(qx);
    q.multiply(qy);
    q.multiply(qz);
    this.rotation_.copy(q);
  }

  // Orbit Rotate
  startOrbitRotate() {
    this.orbitStartTime_ = performance.now();
    this.orbitDuration_ = 10000; 
  }

  performOrbitRotation_() {
    const elapsed = performance.now() - this.orbitStartTime_;
    if (elapsed >= this.orbitDuration_) {
      this.orbitStartTime_ = null;
      return;
    }

    const radius = this.spawnPosition_.distanceTo(this.camera_.position);
    const angle = (2 * Math.PI * (elapsed / this.orbitDuration_));
    const theta = Math.atan2(this.camera_.position.z - this.spawnPosition_.z, this.camera_.position.x - this.spawnPosition_.x);

    this.camera_.position.x = this.spawnPosition_.x + radius * Math.cos(theta + angle);
    this.camera_.position.z = this.spawnPosition_.z + radius * Math.sin(theta + angle);
    this.camera_.lookAt(this.spawnPosition_);
  }

  handleKeyInputs_(timeElapsedS) {
    if (this.input_.keys_[90]) {
      this.zoomIn();
    }
    if (this.input_.keys_[88]) {
      this.zoomOut();
    }
    if (this.input_.keys_[79]) {
      this.startOrbitRotate();
    }
    if (this.input_.keys_[39]) { 
      this.rotateTilt(0, 0.1 * timeElapsedS, 0);
    }
    if (this.input_.keys_[37]) { 
      this.rotateTilt(0, -0.1 * timeElapsedS, 0);
    }
    if (this.input_.keys_[40]) { 
      this.rotateTilt(0.1 * timeElapsedS, 0, 0);
    }
    if (this.input_.keys_[38]) { 
      this.rotateTilt(-0.1 * timeElapsedS, 0, 0);
    }
    if (this.input_.keys_[77]) { 
      this.rotateTilt( 0, 0,0.1 * timeElapsedS);
    }
    if (this.input_.keys_[78]) { 
      this.rotateTilt( 0, 0,-0.1 * timeElapsedS);
    }
    if (this.orbitStartTime_ != null) {
      this.performOrbitRotation_();
    }
  }
}

const renderer = new THREE.WebGLRenderer();
const clock = new THREE.Clock();

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(90, 240, -130);

const fpCamera = new FirstPersonCamera(camera);
const controls = new FirstPersonControls(camera, renderer.domElement); 
controls.lookSpeed = 0.1;
controls.movementSpeed = 5;


var directionalLight = new THREE.DirectionalLight(0xffffff, 4);
directionalLight.castShadow = true;
directionalLight.position.set(100, 900, 0);

directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 2000;
directionalLight.shadow.camera.left = -550;
directionalLight.shadow.camera.right = 550;
directionalLight.shadow.camera.top = 550;
directionalLight.shadow.camera.bottom = -550;

var directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight);
// scene.add(directionalLightHelper);
scene.add(directionalLight);

var hemiLight = new THREE.HemisphereLight(0xB1E1FF, 0xB97A20, 0.5);
scene.add(hemiLight);

var pointLight = new THREE.PointLight(0xFFFF00, 50);
pointLight.position.set(0, 10, 0);
scene.add(pointLight);

var spotLight = new THREE.SpotLight(0xFF0000, 50);
spotLight.position.set(10, 10, 0);
scene.add(spotLight);

const objects = [];
let mixernaga, mixergriffin;




const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(40, 100, 100),
  new THREE.MeshPhysicalMaterial({
    roughness: 0,
    metalness: 0,
    transmission: 1
  })
);
scene.add(sphere);
sphere.position.set(10, 100, 100);

let boundingBoxes = [];

const loader = new GLTFLoader().setPath('resources/');
loader.load('Pulau.glb', function (gltf) {
  const model = gltf.scene;
  model.position.set(0, 0, 0);
  model.scale.set(1, 1, 1);

  renderer.compileAsync(model, camera, scene);
  scene.add(model);

  model.traverse(function (node) {
    if (node.isMesh) {
        node.castShadow = true;
      node.receiveShadow = true;
      node.geometry.computeBoundingBox();
      const box = new THREE.Box3().setFromObject(node);
      boundingBoxes.push(box);
    }
  });
});


new GLTFLoader()
  .setPath('resources/Naga Bonar/')
  .load('ANIM_MOUNTAIN_DRAGON_takeOffToFlyStationary.gltf', function (gltf) {
    var model = gltf.scene;
    model.position.set(90, 230, -130);
    model.scale.set(3, 3, 3);

    mixernaga = new THREE.AnimationMixer(model);
    var action = mixernaga.clipAction(gltf.animations[0]);
    action.play();

    model.traverse(function (node) {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    scene.add(model);
  });


  new GLTFLoader()
  .setPath('resources/Griffin SLum/')
  .load('ANIM_Griffon_FlyStationary.gltf', function (gltf) {
    var model = gltf.scene;
    model.position.set(-65, 120, 280);
    model.scale.set(3, 3, 3);
    model.rotation.y = degToRad(180);

    mixergriffin = new THREE.AnimationMixer(model);
    var action = mixergriffin.clipAction(gltf.animations[0]);
    action.play();

    model.traverse(function (node) {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    scene.add(model);
  });



  new GLTFLoader()
  .setPath('resources/Dagger/')
  .load('SM_Dagger_2.gltf', function (gltf) {
    var model = gltf.scene;
    model.position.set(-58, 70,75 );
    model.scale.set(20, 20, 20);

    model.traverse(function (node) {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true; 
            node.material.color = new THREE.Color(0xffffff); // Diffuse color
            node.material.specular = new THREE.Color(0xffffff); // Specular color
            node.material.shininess = 300000;
            node.material.side = THREE.DoubleSide;

            node.material.metalness = 5;
            node.material.roughness = 0.3;
            node.material.needsUpdate = true;
          }
    });

    scene.add(model);
  });

  loader.load('Bottle_v1.glb', function (gltf) {
    const model = gltf.scene;
    model.position.set(20, 82.5, 0);
    model.scale.set(2,1,2);

    model.traverse(function (node) {
      if (node.isMesh) {
        node.material.transparent = true;
        node.material.opacity = 0.3;
    }
    });

    renderer.compileAsync(model, camera, scene);
    scene.add(model);
});

loader.load('Bottle_v1.glb', function (gltf) {
  const model = gltf.scene;
  model.position.set(20, 82.5, 3);
  model.scale.set(2,1,2);
  model.traverse(function (node) {
    if (node.isMesh) {
      node.material.transparent = true;
      node.material.opacity = 0.3;
  }
  });

  renderer.compileAsync(model, camera, scene);
  scene.add(model);
});


let sky, sun;
function initSky() {
  sky = new Sky();
  sky.scale.setScalar(250000);
  scene.add(sky);

  sun = new THREE.Vector3();

  const effectController = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 2,
    azimuth: 180,
    exposure: renderer.toneMappingExposure
  };
  
  
  function guiChanged() {
    const uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = effectController.turbidity;
    uniforms['rayleigh'].value = effectController.rayleigh;
    uniforms['mieCoefficient'].value = effectController.mieCoefficient;
    uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

    const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
    const theta = THREE.MathUtils.degToRad(effectController.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);
    uniforms['sunPosition'].value.copy(sun);
    renderer.toneMappingExposure = effectController.exposure;
    renderer.render(scene, camera);
  }

  const gui = new GUI();
  gui.add(effectController, 'turbidity', 0.0, 20.0, 0.1).onChange(guiChanged);
  gui.add(effectController, 'rayleigh', 0.0, 4, 0.001).onChange(guiChanged);
  gui.add(effectController, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(guiChanged);
  gui.add(effectController, 'mieDirectionalG', 0.0, 1, 0.001).onChange(guiChanged);
  gui.add(effectController, 'elevation', 0, 90, 0.1).onChange(guiChanged);
  gui.add(effectController, 'azimuth', -180, 180, 0.1).onChange(guiChanged);
  gui.add(effectController, 'exposure', 0, 1, 0.0001).onChange(guiChanged);

  guiChanged();
}

initSky();

function transitionToNight() {
  let duration = 30;
  let steps = duration * 10;
  let step = 0;
  let interval = setInterval(() => {
    step++;
    let progress = step / steps;
    effectController.turbidity = 10 * (1 - progress);
    effectController.rayleigh = 3 * (1 - progress);
    effectController.mieCoefficient = 0.005 + 0.05 * progress;
    effectController.elevation = 2 - 2 * progress;
    effectController.exposure = 1 - progress * 0.5;
    effectController.azimuth = 90 + 180 * progress;
    directionalLight.intensity = 1.5 - progress;
    guiChanged();

    if (step >= steps) {
      clearInterval(interval);
    }
  }, 100);
}

function transitionToDay() {
  let duration = 30;
  let steps = duration * 10;
  let step = 0;
  let interval = setInterval(() => {
    step++;
    let progress = step / steps;
    effectController.turbidity = 10 * progress;
    effectController.rayleigh = 3 * progress;
    effectController.mieCoefficient = 0.055 - 0.05 * progress;
    effectController.elevation = progress * 2;
    effectController.exposure = 0.5 + progress * 0.5;
    effectController.azimuth = -90 + 180 * progress;
    directionalLight.intensity = 3.5;
    guiChanged();

    if (step >= steps) {
      clearInterval(interval);
    }
  }, 100);
}

let isDay = true;

function startTransitions() {
  setInterval(() => {
    if (isDay) {
      transitionToNight();
    } else {
      transitionToDay();
    }
    isDay = !isDay;
  }, 30000);
}

startTransitions();

let orbitStartTime_ = performance.now();
const orbitDuration_ = 10000;

function performOrbitRotationSun_() {
  const elapsed = performance.now() - orbitStartTime_;
  if (elapsed >= orbitDuration_) {
    orbitStartTime_ = performance.now();
    return;
  }

  const progress = (elapsed / orbitDuration_);
  const angle = Math.PI * progress;  
  const radius = 900;  
  const height = 300; 

  directionalLight.position.x = radius * Math.cos(angle);
  directionalLight.position.z = 0; 
  directionalLight.position.y = height * Math.sin(angle); 
  directionalLight.target.position.set(0, 0, 0); 
  directionalLight.target.updateMatrixWorld();
}



var time_prev = 0;
function animate(time) {
    controls.update();
    var dt = time - time_prev;
  dt *= 0.1;
  var delta = clock.getDelta();
  fpCamera.update(delta);


  // performOrbitRotationSun_();
  renderer.render(scene, camera);
  if (mixernaga) mixernaga.update(delta);
  if (mixergriffin) mixergriffin.update(delta);


  time_prev = time;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
