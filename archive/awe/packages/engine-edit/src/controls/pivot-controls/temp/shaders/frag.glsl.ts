export default `
varying vec2 vUv;

#define ALPHA_TEST 0.1

uniform vec3 color;

uniform float opacity;



float when_gt(float x, float y) {
  return max(sign(x - y), 0.0);
}


varying vec2 vPosition;


#define DIV ((3.1415926535897932384626433832795 * 2.0) ) * 2.0

#define INV_DIV (1.0 / DIV)

void main(){

    vec2 nUv = vUv - vec2(0.5, 0.5);

    float ll = length(nUv);

    vec2 delta = vPosition - vec2(0.0);

    float ang = atan(delta.y, delta.x);

    float pattern = when_gt( mod( ang, INV_DIV ) * DIV, 0.25);

    float alpha = when_gt(ll, 0.4) * pattern;

    if( alpha < ALPHA_TEST ) {

        discard;
    }

    gl_FragColor = vec4(color, alpha * opacity);
}
`;
