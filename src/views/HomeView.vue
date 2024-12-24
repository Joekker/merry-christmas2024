<template>
  <div class="home" ref="canvasContainer">

    <div v-if="buttonsVisible">
      <!-- <h1>请宝宝选择一个音乐！</h1> -->
      <el-button v-for="item in musicList" :key="item.id" @click="loadAudio(item.id)" type="primary">{{ item.name
        }}</el-button>
    </div>
  </div>
</template>

<script>

import * as THREE from 'three';
import music1 from '@/assets/thisisus.mp3'; // 使用别名导入资源，@ 通常指向 src
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
export default {
  name: 'HomeView',
  mounted() {
    this.initScene();

    // // 动画循环
    // const animate = () => {
    //   requestAnimationFrame(animate);
    //   this.uniforms.time.value += 0.05;
    //   this.renderer.render(this.scene, this.camera);
    // };

  },
  data() {
    return {
      loading: false,
      buttonsVisible: true,
      music: null,
      musicList: [
        {
          id: 1,
          name: 'music1',
          url: music1
        },
        {
          id: 2,
          name: 'music2',
          url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
        },
        {
          id: 3,
          name: 'music3',
          url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
        }
      ],
      PI: Math.PI,
      TAU: 2 * Math.PI,
      scene: null,
      camera: null,
      renderer: null,
      analyser: null,
      step: 0,
      uniforms: {
        time: { type: "f", value: 0.0 },
        step: { type: "f", value: 0.0 },
      },
      params: {
        exposure: 1,
        bloomStrength: 0.9,
        bloomThreshold: 0,
        bloomRadius: 0.5,
      },
      composer: null,
      fftSize: 2048,
      totalPoints: 4000,
      listener: null,
      audio: null,

    }
  },
  methods: {
    loadAudio(id) {
      console.log('loadAudio', id);

      // 确保 musicList 存在并且 id 合法
      const file = this.musicList[id - 1]?.url;
      if (!file) {
        console.error('Invalid audio ID:', id);
        return;
      }

      const loader = new THREE.AudioLoader();

      // 使用箭头函数保留 `this` 的上下文
      loader.load(
        file,
        (buffer) => {
          if (!this.audio) {
            console.error('Audio object not initialized!');
            return;
          }
          this.audio.setBuffer(buffer);
          this.audio.play();
          // 初始化 AudioAnalyser
          this.analyser = new THREE.AudioAnalyser(this.audio, this.fftSize);

          // 调用 init 方法
          this.init();
        },
        undefined, // onProgress 可选回调
        (error) => {
          console.error('Audio loading error:', error);
        }
      );
    },
    animate(time) {
      // 获取音频频率数据
      this.analyser.getFrequencyData();

      // 更新 uniforms 数据
      this.uniforms.tAudioData.value.needsUpdate = true;
      this.step = (this.step + 1) % 1000;
      this.uniforms.time.value = time;
      this.uniforms.step.value = this.step;

      // 渲染场景
      this.composer.render();

      // 请求下一帧
      requestAnimationFrame(this.animate);
    },
    addTree(scene, uniforms, totalPoints, treePosition) {
      const vertexShader = `
      attribute float mIndex;
      varying vec3 vColor;
      varying float opacity;
      uniform sampler2D tAudioData;

      float norm(float value, float min, float max ){
        return (value - min) / (max - min);
      }
      float lerp(float norm, float min, float max){
        return (max - min) * norm + min;
      }

      float map(float value, float sourceMin, float sourceMax, float destMin, float destMax){
        return lerp(norm(value, sourceMin, sourceMax), destMin, destMax);
      }

      void main() {
        vColor = color;
        vec3 p = position;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        float amplitude = texture2D(tAudioData, vec2(mIndex, 0.1)).r;
        float amplitudeClamped = clamp(amplitude - 0.4, 0.0, 0.6);
        float sizeMapped = map(amplitudeClamped, 0.0, 0.6, 1.0, 20.0);
        opacity = map(mvPosition.z, -200.0, 15.0, 0.0, 1.0);
        gl_PointSize = sizeMapped * (100.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

      const fragmentShader = `
      varying vec3 vColor;
      varying float opacity;
      uniform sampler2D pointTexture;

      void main() {
        gl_FragColor = vec4(vColor, opacity);
        gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);
      }
    `;

      const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
          ...uniforms,
          pointTexture: {
            value: new THREE.TextureLoader().load(
              `https://assets.codepen.io/3685267/spark1.png`
            ),
          },
        },
        vertexShader,
        fragmentShader,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        vertexColors: true,
      });

      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const colors = [];
      const sizes = [];
      const phases = [];
      const mIndexs = [];
      const color = new THREE.Color();

      for (let i = 0; i < totalPoints; i++) {
        const t = Math.random();
        const y = this.map(t, 0, 1, -8, 10);
        const ang = this.map(t, 0, 1, 0, 12 * Math.PI) + (Math.PI / 2) * (i % 2);
        const [z, x] = this.polar(ang, this.map(t, 0, 1, 5, 0));

        const modifier = this.map(t, 0, 1, 1, 0);
        positions.push(x + this.rand(-0.3 * modifier, 0.3 * modifier));
        positions.push(y + this.rand(-0.3 * modifier, 0.3 * modifier));
        positions.push(z + this.rand(-0.3 * modifier, 0.3 * modifier));

        color.setHSL(this.map(i, 0, totalPoints, 1.0, 0.0), 1.0, 0.5);
        colors.push(color.r, color.g, color.b);
        phases.push(this.rand(1000));
        sizes.push(1);
        mIndexs.push(this.map(i, 0, totalPoints, 1.0, 0.0));
      }

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3).setUsage(
          THREE.DynamicDrawUsage
        )
      );
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
      geometry.setAttribute("phase", new THREE.Float32BufferAttribute(phases, 1));
      geometry.setAttribute("mIndex", new THREE.Float32BufferAttribute(mIndexs, 1));

      const tree = new THREE.Points(geometry, shaderMaterial);

      const [px, py, pz] = treePosition;
      tree.position.set(px, py, pz);

      scene.add(tree);
    },
    addSnow(scene, uniforms) {
      const vertexShader = `
      attribute float size;
      attribute float phase;
      attribute float phaseSecondary;

      varying vec3 vColor;
      varying float opacity;

      uniform float time;
      uniform float step;

      float norm(float value, float min, float max ){
        return (value - min) / (max - min);
      }
      float lerp(float norm, float min, float max){
        return (max - min) * norm + min;
      }
      float map(float value, float sourceMin, float sourceMax, float destMin, float destMax){
        return lerp(norm(value, sourceMin, sourceMax), destMin, destMax);
      }
      void main() {
        float t = time * 0.0006;
        vColor = color;

        vec3 p = position;

        p.y = map(mod(phase + step, 1000.0), 0.0, 1000.0, 25.0, -8.0);

        p.x += sin(t + phase);
        p.z += sin(t + phaseSecondary);

        opacity = map(p.z, -150.0, 15.0, 0.0, 1.0);

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

        gl_PointSize = size * (100.0 / -mvPosition.z);

        gl_Position = projectionMatrix * mvPosition;
      }
    `;

      const fragmentShader = `
      uniform sampler2D pointTexture;
      varying vec3 vColor;
      varying float opacity;

      void main() {
        gl_FragColor = vec4(vColor, opacity);
        gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);
      }
    `;

      const createSnowSet = (sprite) => {
        const totalPoints = 300;
        const shaderMaterial = new THREE.ShaderMaterial({
          uniforms: {
            ...uniforms,
            pointTexture: {
              value: new THREE.TextureLoader().load(sprite),
            },
          },
          vertexShader,
          fragmentShader,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          transparent: true,
          vertexColors: true,
        });

        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];
        const phases = [];
        const phaseSecondaries = [];
        const color = new THREE.Color();

        for (let i = 0; i < totalPoints; i++) {
          const [x, y, z] = [this.rand(-25, 25), 0, this.rand(-150, 15)];
          positions.push(x, y, z);

          color.set(this.randChoice(["#f1d4d4", "#f1f6f9", "#eeeeee", "#f1f1e8"]));
          colors.push(color.r, color.g, color.b);

          phases.push(this.rand(1000));
          phaseSecondaries.push(this.rand(1000));
          sizes.push(this.rand(4, 2));
        }

        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3)
        );
        geometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(colors, 3)
        );
        geometry.setAttribute(
          "size",
          new THREE.Float32BufferAttribute(sizes, 1)
        );
        geometry.setAttribute(
          "phase",
          new THREE.Float32BufferAttribute(phases, 1)
        );
        geometry.setAttribute(
          "phaseSecondary",
          new THREE.Float32BufferAttribute(phaseSecondaries, 1)
        );

        const mesh = new THREE.Points(geometry, shaderMaterial);
        scene.add(mesh);
      };

      const sprites = [
        "https://assets.codepen.io/3685267/snowflake1.png",
        "https://assets.codepen.io/3685267/snowflake2.png",
        "https://assets.codepen.io/3685267/snowflake3.png",
        "https://assets.codepen.io/3685267/snowflake4.png",
        "https://assets.codepen.io/3685267/snowflake5.png",
      ];

      sprites.forEach((sprite) => {
        createSnowSet(sprite);
      });
    },
    init() {
      this.buttonsVisible = false
      this.scene = new THREE.Scene();
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      // 将渲染器的DOM元素添加到容器
      this.$refs.canvasContainer.appendChild(this.renderer.domElement);
      this.camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        1,
        1000
      );
      this.camera.position.set(
        -0.09397456774197047,
        -2.5597086635726947,
        24.420789670889008
      );
      this.camera.rotation.set(
        0.10443543723052419,
        -0.003827152981119352,
        0.0004011488708739715
      );

      const format = this.renderer.capabilities.isWebGL2
        ? THREE.RedFormat
        : THREE.LuminanceFormat;

      this.uniforms.tAudioData = {
        value: new THREE.DataTexture(this.analyser.data, this.fftSize / 2, 1, format),
      };

      this.addPlane(this.scene, this.uniforms, 3000);
      this.addSnow(this.scene, this.uniforms);

      Array.from({ length: 10 }).forEach((_, i) => {
        this.addTree(this.scene, this.uniforms, this.totalPoints, [20, 0, -20 * i]);
        this.addTree(this.scene, this.uniforms, this.totalPoints, [-20, 0, -20 * i]);
      });

      const renderScene = new RenderPass(this.scene, this.camera);

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        this.params.bloomStrength,
        this.params.bloomRadius,
        0.85
      );

      bloomPass.threshold = this.params.bloomThreshold;

      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(renderScene);
      this.composer.addPass(bloomPass);

      this.addListeners(this.camera, this.renderer, this.composer);
      this.animate();
    },
    addListeners(camera, renderer, composer) {
      // 监听键盘事件
      document.addEventListener("keydown", (e) => {
        const { x, y, z } = camera.position;
        console.log(`camera.position.set(${x}, ${y}, ${z})`);
        const { x: a, y: b, z: c } = camera.rotation;
        console.log(`camera.rotation.set(${a}, ${b}, ${c})`);
      });

      // 监听窗口大小变化事件
      window.addEventListener("resize", () => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
        composer.setSize(width, height);
      });
    },
    addPlane(scene, uniforms, totalPoints) {
      const vertexShader = `
      attribute float size;
      attribute vec3 customColor;
      varying vec3 vColor;

      void main() {
        vColor = customColor;
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        gl_PointSize = size * ( 300.0 / -mvPosition.z );
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

      const fragmentShader = `
      uniform vec3 color;
      uniform sampler2D pointTexture;
      varying vec3 vColor;

      void main() {
        gl_FragColor = vec4( vColor, 1.0 );
        gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
      }
    `;

      // 创建 ShaderMaterial
      const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
          ...uniforms,
          pointTexture: {
            value: new THREE.TextureLoader().load(
              `https://assets.codepen.io/3685267/spark1.png`
            ),
          },
        },
        vertexShader,
        fragmentShader,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        vertexColors: true,
      });

      // 创建 BufferGeometry
      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const colors = [];
      const sizes = [];
      const color = new THREE.Color();

      for (let i = 0; i < totalPoints; i++) {
        const [x, y, z] = [this.rand(-25, 25), 0, this.rand(-150, 15)];
        positions.push(x, y, z);

        color.set(this.randChoice(["#93abd3", "#f2f4c0", "#9ddfd3"]));
        colors.push(color.r, color.g, color.b);

        sizes.push(1);
      }

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3).setUsage(
          THREE.DynamicDrawUsage
        )
      );
      geometry.setAttribute(
        "customColor",
        new THREE.Float32BufferAttribute(colors, 3)
      );
      geometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));

      // 创建 Points 并添加到场景
      const plane = new THREE.Points(geometry, shaderMaterial);
      plane.position.y = -8;
      scene.add(plane);
    },
    rand(max, min = 0) {
      return min + Math.random() * (max - min);
    },
    randChoice(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    },
    // 映射函数
    map(value, sMin, sMax, dMin, dMax) {
      return dMin + ((value - sMin) / (sMax - sMin)) * (dMax - dMin);
    },
    // 生成范围数组
    range(n, m = 0) {
      return Array(n)
        .fill(m)
        .map((_, j) => m + j);
    },
    // 随机数生成器
    rand(max, min = 0) {
      return min + Math.random() * (max - min);
    },
    randInt(max, min = 0) {
      return Math.floor(min + Math.random() * (max - min));
    },
    randChoice(arr) {
      return arr[this.randInt(arr.length)];
    },
    // 极坐标转换
    polar(ang, r = 1) {
      return [r * Math.cos(ang), r * Math.sin(ang)];
    },
    // 初始化Three.js场景
    initScene() {
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      this.camera.position.z = 5;

      this.renderer = new THREE.WebGLRenderer({ canvas: this.$refs.canvas });
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      this.listener = new THREE.AudioListener();
      this.audio = new THREE.Audio(this.listener);
    }
  },
  components: {

  }
}
</script>
<style scoped>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #161616;
  color: #c5a880;
  font-family: sans-serif;
}

label {
  display: inline-block;
  background-color: #161616;
  padding: 16px;
  border-radius: 0.3rem;
  cursor: pointer;
  margin-top: 1rem;
  width: 300px;
  border-radius: 10px;
  border: 1px solid #c5a880;
  text-align: center;
}

ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.btn {
  background-color: #161616;
  border-radius: 10px;
  color: #c5a880;
  border: 1px solid #c5a880;
  padding: 16px;
  width: 300px;
  margin-bottom: 16px;
  line-height: 1.5;
  cursor: pointer;
}

.separator {
  font-weight: bold;
  text-align: center;
  width: 300px;
  margin: 16px 0px;
  color: #a07676;
}

.title {
  color: #a07676;
  font-weight: bold;
  font-size: 1.25rem;
  margin-bottom: 16px;
}

.text-loading {
  font-size: 2rem;
}
</style>
