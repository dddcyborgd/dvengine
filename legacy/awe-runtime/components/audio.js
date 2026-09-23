/*!
 * awe runtime component — audio
 * Mirrors awe AudioComponent (engine-src/space/components/audio): positional audio emitter. Clean-room
 * realization: a visible pulsing emitter sphere whose scale tracks a synthesized amplitude envelope
 * (Math.sin), representing the audio level — so the demo always shows "sound" with NO network and NO
 * AudioContext required. If THREE.AudioListener / THREE.PositionalAudio exist AND an AudioContext is
 * available, it optionally wires a silent oscillator buffer for fidelity, but never errors without it.
 * Props: { color, freq, position, range }. Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('audio.js: AweRuntime not loaded');

  global.AweRuntime.register('audio', function (props) {
    props = props || {};
    var root, geos = [], mats = [], emitter, ring, freq, listener = null, sound = null;

    return {
      type: 'audio',
      init: function (ctx) {
        var THREE = ctx.THREE;
        root = new THREE.Group();
        root.name = 'audio';
        var pos = props.position || { x: 0, y: 2.5, z: -4 };
        root.position.set(pos.x, pos.y, pos.z);
        freq = props.freq != null ? props.freq : 2.5;
        var color = props.color != null ? props.color : 0xffafcc;

        var egeo = new THREE.SphereGeometry(0.6, 24, 16);
        var emat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.4, roughness: 0.3 });
        geos.push(egeo); mats.push(emat);
        emitter = new THREE.Mesh(egeo, emat);
        emitter.name = 'audio-emitter';
        root.add(emitter);

        // range ring showing positional falloff
        var range = props.range || 6;
        var rgeo = new THREE.RingGeometry(range - 0.08, range, 48);
        var rmat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
        geos.push(rgeo); mats.push(rmat);
        ring = new THREE.Mesh(rgeo, rmat);
        ring.rotation.x = -Math.PI / 2;
        root.add(ring);

        // OPTIONAL real positional audio — guarded; silent oscillator, never required
        try {
          var hasAC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
          if (hasAC && THREE.AudioListener && THREE.PositionalAudio && ctx.camera) {
            listener = new THREE.AudioListener();
            ctx.camera.add(listener);
            sound = new THREE.PositionalAudio(listener);
            if (sound.setRefDistance) sound.setRefDistance(range);
            emitter.add(sound);   // no buffer set / not played -> silent, no network
          }
        } catch (e) { listener = null; sound = null; }

        return root;
      },
      update: function (dt, t) {
        if (!emitter) return;
        // synthesized amplitude envelope -> scale pulse
        var amp = 0.5 + 0.5 * Math.abs(Math.sin(t * freq)) * (0.6 + 0.4 * Math.sin(t * 0.7));
        var s = 0.8 + amp * 0.6;
        emitter.scale.setScalar(s);
        if (emitter.material) emitter.material.emissiveIntensity = 0.2 + amp * 0.8;
        if (ring) { ring.scale.setScalar(1 + amp * 0.15); if (ring.material) ring.material.opacity = 0.1 + amp * 0.25; }
      },
      dispose: function () {
        try { if (sound && sound.parent) sound.parent.remove(sound); } catch (e) {}
        try { if (listener && listener.parent) listener.parent.remove(listener); } catch (e) {}
        for (var i = 0; i < geos.length; i++) { geos[i].dispose(); mats[i].dispose(); }
        root = null; sound = null; listener = null;
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
