/*! dvengine — DVVerse.rung (verse/rung.js) · the login333 claim → rung/rank (decoded, NOT verified — the anchor verifies), the ladder, the role theme, the veil · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
/*
 * A login333 tier claim is  base64url(JSON) + '.' + signature. The CLIENT only decodes the JSON before the
 * last '.' to know which rung to dress the space for; it never verifies (there is no trusted issuer key in a
 * browser) — the daemon (cyborgd daemon/claim.mjs, an exact port of DeltaVerse/server/login333.mjs) does,
 * and its `welcome{rung,rank}` is authoritative. `rung` is the NUMERIC rank 0..8 and `rank` the rung NAME,
 * the daemon's vocabulary. The ladder is copied from DeltaVerse/deploy/privilege-tiers.json.
 *
 *   DVVerse.rung.parseClaim(token) → claim | null        DVVerse.rung.identify(token) → { rung, rank, name, sub, claim, expired }
 *   DVVerse.rung.rankOf('overseer') → 6 · rungName(6) → 'overseer' · atLeast(rung, minRole) → bool
 *   DVVerse.rung.theme(rung, docTheme) → the emerged theme (DVThemeSynth when present; a table otherwise) — and applies it
 *   DVVerse.rung.veil(doc, rung) → { zones:{id:locked}, portals:{to:locked} }   what this rung may not enter
 */
(function (global) {
  'use strict';
  var LADDER = [
    { rung: 'participant', rank: 0, source: 'presence' }, { rung: 'recognized-participant', rank: 1, source: 'signature' },
    { rung: 'member', rank: 2, source: 'signature' }, { rung: 'player', rank: 3, source: 'holdings' }, { rung: 'trader', rank: 4, source: 'holdings' },
    { rung: 'owner', rank: 5, source: 'ens' }, { rung: 'overseer', rank: 6, source: 'appointment' }, { rung: 'overlord', rank: 7, source: 'ens' },
    { rung: 'mastermind', rank: 8, source: 'creation', position: '+1' }
  ];
  var RANK = {}, NAME = {}; LADDER.forEach(function (r) { RANK[r.rung] = r.rank; NAME[r.rank] = r.rung; });
  RANK['public'] = 0;   // DVScene's zone vocabulary: `public` = everyone
  var TIER_FALLBACK = { overlord: 7, deployer: 5, member: 2 };
  var ROLE_THEME = { 0: 'default-dark', 1: 'aurora', 2: 'aurora', 3: 'quantum-foam', 4: 'automindx', 5: 'ultraviolet', 6: 'ultraviolet', 7: 'obsidian-gold', 8: 'obsidian-gold' };

  function rankOf(r) { if (typeof r === 'number') return isFinite(r) ? Math.max(0, Math.min(8, r | 0)) : 0; var v = RANK[String(r || '').toLowerCase()]; return v == null ? 0 : v; }
  function rungName(rank) { return NAME[rankOf(rank)] || 'participant'; }
  function atLeast(rung, minRole) { return rankOf(rung) >= rankOf(minRole); }

  function unb64u(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    if (typeof atob === 'function') { var bin = atob(s), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(out) : bin; }
    return Buffer.from(s, 'base64').toString('utf8');
  }
  /** The JSON before the LAST '.' (a base64url body never contains '.'; the signature follows it). null when malformed. */
  function parseClaim(token) {
    if (!token || typeof token !== 'string') return null;
    var i = token.lastIndexOf('.'), body = i >= 0 ? token.slice(0, i) : token;
    if (!body) return null;
    try { var c = JSON.parse(unb64u(body)); return c && typeof c === 'object' ? c : null; } catch (e) { return null; }
  }
  function rungOfClaim(c) {
    if (!c) return 0;
    if (c.rung != null && RANK[String(c.rung).toLowerCase()] != null) return RANK[String(c.rung).toLowerCase()];
    if (c.tier && TIER_FALLBACK[String(c.tier).toLowerCase()] != null) return TIER_FALLBACK[String(c.tier).toLowerCase()];
    return c.sub ? 2 : 0;
  }
  function identify(token, nowSec) {
    var c = parseClaim(token);
    if (!c) return { rung: 0, rank: 'participant', name: null, sub: null, claim: null, expired: false, verified: false };
    var expired = !!(c.exp && (nowSec || Math.floor(Date.now() / 1000)) > c.exp);
    var rung = expired ? 0 : rungOfClaim(c);
    return { rung: rung, rank: rungName(rung), name: c.name || null, sub: c.sub || null, claim: c, expired: expired, verified: false };
  }
  /** Emerge the theme for a rung over the document's theme, and apply it when DVThemeSynth is present. */
  function theme(rung, docTheme, opts) {
    opts = opts || {};
    var rank = rankOf(rung), S = global.DVThemeSynth;
    var base = S && S.roleTheme ? S.roleTheme(rungName(rank)) : ROLE_THEME[rank];
    if (S && S.emerge) {
      try { var th = S.emerge({ base: base, overlay: docTheme || base, t: opts.t == null ? 0.5 : opts.t, id: 'synth:verse-' + rungName(rank), name: 'Verse · ' + rungName(rank) }); if (opts.apply !== false && S.apply) S.apply(th); return th; } catch (e) {}
    }
    return { id: base, base: base, overlay: docTheme || null, synthesized: false };
  }
  /** Which zones / portals this rung may not enter. */
  function veil(doc, rung) {
    var out = { zones: {}, portals: {} }, rank = rankOf(rung), zones = (doc && doc.zones) || [];
    zones.forEach(function (z) { out.zones[z.id] = !atLeast(rank, z.minRole || 'public'); });
    zones.forEach(function (z) { if (z.portalTo) { var t = null; for (var i = 0; i < zones.length; i++) if (zones[i].id === z.portalTo) t = zones[i]; out.portals[z.id + '→' + z.portalTo] = t ? !atLeast(rank, t.minRole || 'public') : false; } });
    return out;
  }

  var api = { LADDER: LADDER, RANK: RANK, ROLE_THEME: ROLE_THEME, TIER_FALLBACK: TIER_FALLBACK, parseClaim: parseClaim, rungOfClaim: rungOfClaim, identify: identify, rankOf: rankOf, rungName: rungName, atLeast: atLeast, theme: theme, veil: veil, unb64u: unb64u };
  var NS = global.DVVerse = global.DVVerse || {}; NS.rung = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
