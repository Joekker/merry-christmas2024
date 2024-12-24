<template>
  <div id="app">
    <div id="container"></div>
    <audio autoplay loop controls id="music" ref="music">
      <source src="img/875007460.mp3" />
    </audio>
  </div>
</template>

<script>
import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer";
import "@/assets/styles/animate.min.css"; // 引入 animate.min.css

export default {
  data() {
    return {
      camera: null,
      scene: null,
      renderer: null,
      controls: null,
      objects: [],
      targets: [],
      table: [],
    };
  },
  mounted() {
    this.generatePictures();
    this.init();
    this.animate();
    window.addEventListener("resize", this.onWindowResize);
  },
  methods: {
    generatePictures() {
      const picArr = [];
      for (let i = 0; i < 199; i++) {
        let yu = i % 16 || 16;
        picArr.push({ url: `img/${yu}.jpeg` });
      }

      for (let i = 0; i < picArr.length; i++) {
        this.table.push({
          ...picArr[i],
          p_x: i % 20 + 1,
          p_y: Math.floor(i / 20) + 1,
        });
      }
    },
    init() {
      // 初始化相机
      this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
      this.camera.position.z = 3000;

      // 初始化场景
      this.scene = new THREE.Scene();

      // 创建图片对象
      this.table.forEach((item) => {
        const dom = document.createElement("div");
        dom.className = "element animated fadeIn"; // 添加 animate.css 的类名
        const img = document.createElement("img");
        img.src = item.url;
        dom.appendChild(img);

        const object = new CSS3DObject(dom);
        object.position.x = Math.random() * 4000 - 2000;
        object.position.y = Math.random() * 4000 - 2000;
        object.position.z = Math.random() * 4000 - 2000;
        this.scene.add(object);
        this.objects.push(object);
      });

      // 设置球形目标
      const vector = new THREE.Vector3();
      const spherical = new THREE.Spherical();
      this.objects.forEach((_, i) => {
        const phi = Math.acos(-1 + (2 * i) / this.objects.length);
        const theta = Math.sqrt(this.objects.length * Math.PI) * phi;

        const object = new THREE.Object3D();
        spherical.set(800, phi, theta);
        object.position.setFromSpherical(spherical);
        vector.copy(object.position).multiplyScalar(2);
        object.lookAt(vector);
        this.targets.push(object);
      });

      // 初始化渲染器
      this.renderer = new CSS3DRenderer();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.domElement.style.position = "absolute";
      document.getElementById("container").appendChild(this.renderer.domElement);

      // 初始化控制器
      this.controls = new TrackballControls(this.camera, this.renderer.domElement);
      this.controls.rotateSpeed = 0.5;
      this.controls.minDistance = 500;
      this.controls.maxDistance = 6000;
      this.controls.addEventListener("change", this.render);

      // 开始变换
      this.transform();
    },
    transform() {
      const duration = 2000;
      TWEEN.removeAll();
      this.objects.forEach((object, i) => {
        const target = this.targets[i];

        new TWEEN.Tween(object.position)
          .to(
            { x: target.position.x, y: target.position.y, z: target.position.z },
            Math.random() * duration + duration
          )
          .easing(TWEEN.Easing.Exponential.InOut)
          .start();

        new TWEEN.Tween(object.rotation)
          .to(
            { x: target.rotation.x, y: target.rotation.y, z: target.rotation.z },
            Math.random() * duration + duration
          )
          .easing(TWEEN.Easing.Exponential.InOut)
          .start();
      });

      new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(this.render)
        .start();
    },
    onWindowResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.render();
    },
    animate() {
      requestAnimationFrame(this.animate);
      TWEEN.update();
      this.controls.update();
      this.scene.rotation.y += 0.001;
      this.render();
    },
    render() {
      this.renderer.render(this.scene, this.camera);
    },
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.onWindowResize);
  },
};
</script>

<style scoped>
html,
body {
  height: 100%;
}

body {
  background-color: #000000;
  margin: 0;
  overflow: hidden;
}

.element {
  width: 140px;
  height: 140px;
  cursor: pointer;
  box-shadow: 0px 0px 12px rgba(238, 196, 11, 0.5);
  border: 2px solid #fff;
  text-align: center;
}

.element:hover {
  box-shadow: 0px 0px 12px rgba(11, 250, 250, 0.85);
  border: 2px solid rgba(127, 255, 255, 0.85);
}

.element img {
  width: 140px;
  height: 140px;
  cursor: pointer;
}

#music {
  display: none;
}
</style>