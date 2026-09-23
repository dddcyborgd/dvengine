# net/ — the cyborg/1 client (DVNet · DVPeer · DVHost)

One WebSocket to the **anchor** (cyborgd, `ws://host:8790/ws`), 20 Hz state, reconnect with backoff, repoint, snapshot interpolation for remote transforms, and the **triad** — every participant is a client, may be named host, and the daemon is the anchor. Protocol source of truth: cyborgd `daemon/protocol.mjs`; the interpolation is a port of awe `examples/multiplayer` (MIT).

| file | global | what |
|---|---|---|
| `index.js` | `DVNet` | `connect(url, { space, claim, name, avatar, on… })` → `conn` with `state(p,r,a,s,txt)` (throttled, deduped) · `cmd · event · msg · ping · send · on · close` · `sessionId · rung · rank · latency · jitter · triad` |
| `interp.js` | `DVNet.SnapshotBuffer` · `DVNet.TransformSync` | 200 ms buffer at 20 Hz, ≤100 ms extrapolation, offset smoothing, shortest-arc angles, teleport snap over distance² > 100 |
| `peer.js` | `DVPeer` | one RTCPeerConnection + one reliable ordered DataChannel `cyborg/1` per peer, signalled through the anchor (`rtc{to,kind,payload}`); `mesh(conn)` — the lower sessionId offers; ICE = `window.DV_ICE_SERVERS` or **none** (host candidates only — nothing reaches a third party unless the operator says so) |
| `host.js` | `DVHost` | when `host{sessionId}` names me: run `window.CyborgdCore.createRoom(doc)` (cyborgd `dist/cyborgd-core.js`, the daemon's own simulation core), feed peers' state/cmd/event from the data channels, broadcast `snap` to peers and `mirror{tick,snap}` to the anchor at 20 Hz; without the core → `unavailable`, everyone stays a client |

## Messages the client sends / handles

| direction | type | fields |
|---|---|---|
| → | `hello` | `v, space, claim?, name?, vrm?, avatar?` (re-sent on reconnect) |
| → | `state` | `p, r, a, s, txt?` — ≤ 20 Hz, identical frames not resent |
| → | `cmd` | `tick, seq, mx, my, sprint, jp, jr, jh, yaw` |
| → | `msg` · `event` · `ping` · `rtc` · `mirror` | `{to?,data}` · `{name,data}` (portal · gesture · reach) · `{t}` · `{to,kind,payload}` · `{tick,snap}` |
| ← | `welcome` | `sessionId, tick, rate, rung, rank, space, players, agents, insecure?` — **authoritative rung/rank** |
| ← | `denied` | `reason, minRole` (stops reconnecting) |
| ← | `joined` · `left` · `snap` · `ack` | `{sessionId,name,avatar}` · `{sessionId}` · `{tick,ts,players,agents}` · `{tick,seq,checkpoint}` |
| ← | `msg` · `say` · `voucher` · `pong` · `error` | `{from,data}` · `{agent,text,emotion}` · a voucher the participant redeems with their OWN wallet · `{t,serverT}` · `{code,message}` |
| ← | `peers` · `host` · `repoint` | `{list}` · `{sessionId}` · `{host}` (close, reconnect to the new anchor with the same hello) |

## The triad

```
      anchor (cyborgd daemon: rendezvous · claims · vouchers · canonical snapshot · failover host)
        ▲ ws                              ▲ ws (mirror)
   client ◄──── RTCDataChannel ────► host (a participant running CyborgdCore locally)
```

`DVNet.triad = { role:'client'|'host'|'anchor', host, peers }`; `dv:triad` fires on the connection and as a window CustomEvent whenever it changes.
