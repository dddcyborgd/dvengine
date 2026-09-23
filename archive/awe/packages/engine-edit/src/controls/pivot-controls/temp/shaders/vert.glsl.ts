export default `
varying vec2 vUv;

varying vec2 vPosition;

uniform mat4 localMatrix;

void main ( ){

    vUv = uv;

    vPosition = (localMatrix * vec4(position, 1.0)).xy;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;
