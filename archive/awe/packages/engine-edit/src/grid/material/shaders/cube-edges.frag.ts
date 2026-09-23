export default `
varying vec2 vUv;
uniform float thickness;

float edgeFactor(vec2 p){
    vec2 grid = abs(fract(p - 0.5) - 0.5) / fwidth(p) / thickness;
    return min(grid.x, grid.y);
}

float when_gt(float x, float y) {
  return max(sign(x - y), 0.0);
}

float when_fgt(float x, float y) {

    return max(sign(x - y), 0.0);
}



void main() {

    float a =  min(1.0, max(1.0 - edgeFactor(vUv), 0.0));

    // a = when_fgt(a, 0.02);

    vec3 color = vec3(a + 0.09);

    gl_FragColor = vec4(color, 1.0);

    // #include <colorspace_fragment>


}
`;
