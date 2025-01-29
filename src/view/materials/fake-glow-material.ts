import type { DoubleSide } from "three";
import { AdditiveBlending, Color, ShaderMaterial, Uniform } from "three";
/**
 * FakeGlow material by Anderson Mancini - Fec 2024.
 */
import { FrontSide, type BackSide } from "three";

export type FakeGlowMaterialProps = {
  falloff?: number;
  glowInternalRadius?: number;
  glowColor?: Color;
  glowSharpness?: number;
  opacity?: number;
  side?: typeof FrontSide | typeof BackSide | typeof DoubleSide;
  depthTest?: boolean;
};

export class FakeGlowMaterial extends ShaderMaterial {
  public constructor(props: FakeGlowMaterialProps = {}) {
    super();

    const {
      falloff = 0.1,
      glowInternalRadius = 6.0,
      glowColor = new Color("#00d5ff"),
      glowSharpness = 0.5,
      opacity = 1.0,
      side = FrontSide,
      depthTest = false,
    } = props;

    this.vertexShader =
      /*GLSL */
      `
      varying vec3 vPosition;
      varying vec3 vNormal;

      void main() {
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * modelPosition;
        vec4 modelNormal = modelMatrix * vec4(normal, 0.0);
        vPosition = modelPosition.xyz;
        vNormal = modelNormal.xyz;

      }
    `;

    this.fragmentShader =
      /*GLSL */
      `
      uniform vec3 glowColor;
      uniform float falloff;
      uniform float glowSharpness;
      uniform float glowInternalRadius;
      uniform float opacity;

      varying vec3 vPosition;
      varying vec3 vNormal;

      void main()
      {
        // Normal
        vec3 normal = normalize(vNormal);
        if(!gl_FrontFacing)
            normal *= - 1.0;
        vec3 viewDirection = normalize(cameraPosition - vPosition);
        float fresnel = dot(viewDirection, normal);
        fresnel = pow(fresnel, glowInternalRadius + 0.1);
        float falloffAmount = smoothstep(0., falloff, fresnel);
        float fakeGlow = fresnel;
        fakeGlow += fresnel * glowSharpness;
        fakeGlow *= falloff;
        gl_FragColor = vec4(clamp(glowColor * fresnel, 0., 1.0), fakeGlow) * vec4(opacity);

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      } 
      `;

    // Set default values or modify existing properties if needed
    this.uniforms = {
      /**
       * The opacity for the glow effect.
       * @type {Uniform<number>}
       * @default 1.0
       */
      opacity: new Uniform(opacity),

      /**
       * The strength of the glowInternalRadius.
       * @type {Uniform<number>}
       * @default 6.0
       */
      glowInternalRadius: new Uniform(glowInternalRadius),

      /**
       * The glowSharpness.
       * @type {Uniform<number>}
       * @default 0.5
       */
      glowSharpness: new Uniform(glowSharpness),

      /**
       * The falloff.
       * @type {Uniform<number>}
       * @default 0.1
       */
      falloff: new Uniform(falloff),

      /**
       * The color of the glow.
       * @type {Uniform<Color>}
       * @default new Color(#00d5ff)
       */
      glowColor: new Uniform(glowColor),
    };

    // this.setValues(props);
    this.depthTest = depthTest;
    this.blending = AdditiveBlending;
    this.transparent = true;
    this.side = side;
  }
}

export default FakeGlowMaterial;
