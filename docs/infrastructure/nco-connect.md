---
title: nco-connect — Local Linux Server Spec
type: infrastructure
status: active
host: nco-connect
built: 2026-08-06
last-updated: 2026-08-06
---

# nco-connect — Local Linux Server

Lenovo ThinkPad P50 mobile workstation running Ubuntu Server, repurposed as an
always-on local compute node for Co.nnect background processes. Lives in the NAS
cabinet; the NAS stores, this box computes.

---

## 1. Identity & Access

| Field | Value |
|---|---|
| Hostname | `nco-connect` |
| OS | Ubuntu Server 24.04.4 LTS (noble) |
| Kernel | 6.8.0-100-generic, x86_64 |
| Primary user | `david` |
| Sudo | Yes (standard `sudo <cmd>`) |
| Interface | `enp0s31f6` (wired gigabit ethernet) |
| IP | `192.168.0.82` — **DHCP, not yet reserved** |

SSH target once verified: `ssh david@192.168.0.82`

---

## 2. Hardware

Confirmed 2026-08-06 via `lscpu`, `free -h`, `dmidecode`.

| Field | Value |
|---|---|
| Model | Lenovo ThinkPad P50 (mobile workstation) |
| Machine type | `20EN0013US` |
| CPU | Intel Core i7-6700HQ — 4 cores / 8 threads, 2.6 GHz base, 3.5 GHz max |
| RAM | **62 GiB usable** — 4 × 16 GB DDR4-2133, all four banks populated |
| Max RAM | 64 GB (fully populated — no upgrade headroom) |
| Swap | 8 GiB |
| GPU | NVIDIA Quadro (M1000M or M2000M) — **confirm with `lspci \| grep -iE 'vga\|3d'`** |
| Power | 170 W slim-tip adapter |

Serial number deliberately not recorded here. Look it up with
`sudo dmidecode -t system` if needed for warranty or support.

### What this hardware is good at

The specs are lopsided, and the lopsidedness determines what belongs here:

- **64 GB is the standout.** More RAM than most workstations. It makes this box
  uniquely good at holding many things resident — large in-memory working sets,
  high concurrency, tmpfs scratch, aggressive caching.
- **4C/8T Skylake mobile is the weak point.** A 2016 part; a current mid-range
  desktop chip does 3–4× the multithreaded throughput.

The practical rule: **I/O-bound and network-bound work runs excellently here;
CPU-bound work runs adequately and is thermally limited.** Jobs that spend their
time waiting on API responses or database round-trips can run at very high
concurrency because nothing contends for the scarce resource.

**Against the NAS, though, this is a large upgrade, not a marginal one.** A NAS
CPU is sized to serve files; this is likely 3–8× it, with roughly 10× the RAM.
Any compute currently running on the NAS should move here.

### Upgrade path

The OS drive is a SanDisk X400 — an **M.2 SATA** device. The P50 has two M.2
slots plus the 2.5" bay, so **there is very likely a free M.2 slot running at
full PCIe NVMe speed**. A 1–2 TB NVMe there is by far the best money available
for this machine. Confirm with `sudo nvme list` and `lspci`, or just take the
bottom cover off.

Note: RAM is already maxed at 64 GB across all four slots. There is no memory
upgrade available.

---

## 3. Storage Layout

Two internal drives. **Device letters shift if a USB drive is attached at boot** —
always confirm with `lsblk` before running destructive commands.

### `/dev/sdb` — SanDisk SD8TN8U2 (X400 M.2 SATA), 238.47 GiB — OS drive

| Partition | Size | Mount | Notes |
|---|---|---|---|
| `sdb1` | 1 G | `/boot/efi` | EFI System (fat32) |
| `sdb2` | 2 G | `/boot` | ext4 |
| `sdb3` | 235.4 G | — | LVM PV → `ubuntu-vg` |
| `ubuntu-vg/ubuntu-lv` | 235.42 G | `/` | ext4, full-size LV |

Root filesystem: 231 G total, ~209 G available.

### `/dev/sda` — WDC WD5000LPLX, 465.76 GiB 7200 rpm HDD — data drive

| Partition | Size | Mount | Notes |
|---|---|---|---|
| `sda1` | 458 G | `/data` | ext4, label `data`, owned `david:david`, 435 G free |

Wiped 2026-08-06 (was a decade-old Windows install). Nothing salvaged.

`/etc/fstab` entry:

```
LABEL=data /data ext4 defaults 0 2
```

### Where work should actually happen

**Scratch belongs in `tmpfs`, not on `/data`.** With 62 GiB of RAM, dedicate
16–24 GB to a RAM disk and intermediate files never touch a disk at all. This is
strictly better than either physical drive and removes the spinning disk from
every hot path.

```
tmpfs /scratch tmpfs rw,size=20G,mode=1777 0 0
```

Revised roles:

| Location | Use |
|---|---|
| `/scratch` (tmpfs) | All intermediate and working files |
| `/` (SSD) | OS, application code, anything needing persistence + speed |
| `/data` (HDD) | Archives, logs, staged inputs/outputs, exports |
| `/mnt/nas/*` | Transfer surface only — pull in, push out, never process in place |

`/data` is a decade-old spinning disk with no redundancy. Treat it as scratch
with persistence, not as storage of record.

---

## 4. Configuration Applied

### Lid behavior — machine stays running when closed

`/etc/systemd/logind.conf`:

```
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
```

Applied with `sudo systemctl restart systemd-logind`. This is what makes headless
operation possible.

### BIOS settings for headless cabinet operation

Set these while a screen is still attached. Both exist so the power button never
needs to be reached again:

- **Power on after AC loss** — a power cut shouldn't leave the box dark until
  someone opens the cabinet.
- **Wake on LAN** — then persist on the OS side with
  `sudo ethtool -s enp0s31f6 wol g`.

### Deliberately skipped at install

- **Ubuntu Pro** — skipped. Enable later with `sudo pro attach` if ESM coverage
  is wanted (free for personal use, up to 5 machines).
- **Featured server snaps** — none installed.

---

## 5. Physical Install — NAS Cabinet

> **Step-by-step execution:** see [`nco-connect-runbook.md`](./nco-connect-runbook.md).
> This section is the reference; the runbook is the order of operations.

The cabinet is the riskiest part of this deployment. A 45 W laptop CPU in an
enclosed space alongside drives that are already producing heat will throttle
unless the install is done deliberately.

### What's in the cabinet

Wooden built-in cupboard, floor intake fan, exhaust near the top.

| Unit | State | Disposition |
|---|---|---|
| **Synology DS220+** (2-bay) | Running — status, both LAN, both disks green | Stays. The live NAS. |
| **Synology DS1515+** (5-bay) | Dark — won't stay powered | **Remove.** Frees the P50's slot. |
| Floor intake fan | Running, heavily dust-clogged | Clean. Consider a second fan at the top exhaust. |

**The DS1515+ almost certainly has the Intel Atom C2000 bug** — LPC clock signal
degradation on the C2538 that bricked DS1515+/DS1815+/DS415+ units around 2017.
Synology's extended-warranty programme is long expired. A DIY 100 Ω resistor fix
exists but isn't worth it on a decade-old unit.

Critically, **that is a mainboard failure, not a disk failure** — the five drives
are almost certainly healthy. Synology stores volumes as standard `mdadm` + LVM
with ext4/btrfs, so the array is readable on Linux via a USB-SATA dock. Recovering
it makes a good first real job for the P50. Label the drives by bay before pulling
them.

Open question: what capacity was the 5-bay providing? A 2-bay DS220+ as the only
NAS is a constraint for an image-heavy pipeline.

### Revised thermal budget

Removing the DS1515+ frees **space, not heat** — it's already off and contributing
nothing. The real arithmetic:

| | Load |
|---|---|
| Cabinet today (DS220+ only) | ~15–25 W |
| Cabinet with P50 under sustained load | ~75–125 W |

That is roughly a **4× step change into a wooden enclosure**, on a fan sized for
the current load. It doesn't sink the plan, but it makes the in-situ burn-in the
real gate, and it argues for fitting a fan at the top exhaust if that vent is
currently passive.

The DS220+ is also relevant as a compute comparison: a dual-core Celeron J4025
with 2 GB stock. Against the P50's 4C/8T and 62 GiB, the gap is roughly 3–4× on
cores and ~30× on memory. Everything currently computing on the NAS should move.

### Orientation

**Vertical, standing on the front edge, hinge upward.**

The P50 exhausts behind the hinge and intakes through the bottom panel. On edge
with the hinge up, exhaust vents straight up and away; the intake panel faces
sideways and needs **3–5 cm of clear air** — not flush against a wall or another
chassis. In this orientation the lid can stay closed. Vertical uses about 30 mm
of shelf width.

### Cabinet airflow

The cabinet has an **intake and fan on the floor, exhaust near the top** — cool
air in low, warm out high, working with convection. This is the correct
configuration and it determines placement.

- **Place the P50 low, near the intake.** Anything high in this airflow breathes
  pre-warmed air from whatever sits below it. The P50 is both the largest heat
  producer under load and the component that throttles when starved — drives just
  age faster, the CPU loses performance immediately.
- **Don't sit it on the floor intake.** Offset it or raise it on standoffs so it
  isn't blocking the inlet it depends on.
- **Hinge-up vertical cooperates with the cabinet flow.** Exhaust from behind the
  hinge joins the rising column and leaves via the top vent.
- **Point the laptop's intake panel away from the NAS**, into open cabinet space
  or toward the intake side.
- **Filter the floor intake.** A floor-level inlet pulls dust; add it to the
  6–12 month clean.
- **If the fan is thermostatic, review its setpoint** now that there is a second
  heat source in the enclosure.

### Verify, don't assume

Run the burn-in **twice** — once on the desk for a baseline, once again after
installation with the cabinet door closed. The cabinet is the real operating
environment, and the question is not whether there is airflow but whether there
is enough for the added load.

```
# All-eight-thread burn, no extra packages required
for i in $(seq 8); do timeout 600 sha256sum /dev/zero & done

# In another session
watch -n2 'cat /sys/class/thermal/thermal_zone*/temp; grep "cpu MHz" /proc/cpuinfo | sort -u'
```

Temps are in millidegrees.

**Watch the NAS's drive temperatures too.** The NAS reports them, which makes it a
free in-cabinet thermometer — and heat-related drive failure is the expensive
outcome. Record a baseline before the P50 goes in, then again during the in-situ
burn-in.

| Reading | Good | Problem |
|---|---|---|
| P50 sustained all-core clock | 2.8–3.1 GHz | below 2.6 GHz |
| P50 package temp under load | under ~85 °C | pegged at 95–100 °C |
| NAS drive temps | under 45 °C | over 50 °C, or +5 °C vs. baseline |

A drive-temp delta beyond a few degrees means the fan was sized for one heat
source, not two — fit a larger fan or a second one before committing workloads.

### Power and cabling

- Ethernet and power only. **Skip the ThinkPad dock** — for a headless node it
  adds bulk, heat, and a failure point in exchange for ports that go unused.
- Share the NAS's UPS if there is one.
- Keep the 170 W brick outside the cabinet where possible; it's another heat
  source.
- Leave enough cable slack to slide the machine out without unplugging anything.

### Maintenance

- Thermal paste is ~10 years old and almost certainly dried out. A repaste is an
  hour of work and the highest-value maintenance available on this machine.
- Clean dust from the fans on install, then every 6–12 months. Cabinets
  accumulate dust and laptop fans are small.
- Check battery health (`cat /sys/class/power_supply/BAT0/*`). A decade-old cell
  on permanent AC can swell, which is worse in an enclosed cabinet next to other
  equipment. If it's healthy, keep it — it's a free UPS that lets jobs shut down
  gracefully on power loss. If it's degraded, remove it and rely on a real UPS.

---

## 6. Network & NAS Integration

### Placement on the network

Put the box on **the same switch as the NAS**, not merely the same subnet. Their
traffic pattern is pull-batch / push-results and shouldn't hairpin through the
router.

Gigabit gives roughly 110 MB/s in practice. If that becomes the ceiling once CPU
work is fast, a Thunderbolt 3 → 2.5GbE adapter is the cheap fix — the built-in
NIC is gigabit-only.

### Mounting NAS shares

Mounts are a **transfer surface only**. Pull a batch in, process in `/scratch`,
push results back. Processing in place across the mount is what currently
throttles the NAS.

```
nas:/volume1/assets /mnt/nas/assets nfs _netdev,nofail,noatime,soft,timeo=100,retrans=3 0 2
```

Three options carry the weight:

- `_netdev` and `nofail` — the box boots even when the NAS is down or slow.
- `soft` — jobs fail with an error rather than hanging forever if the NAS
  disappears mid-run.

Prefer NFS over SMB for Linux-to-NAS. Use a **dedicated NAS service account**
scoped to the asset shares only — not the admin login.

Test both states before trusting it: reboot with the NAS up, then reboot with the
NAS deliberately powered down.

### Remote access

- **DHCP reservation** for `192.168.0.82` so the address is stable.
- **SSH key auth**, then `PasswordAuthentication no` in `/etc/ssh/sshd_config`
  and `sudo systemctl restart ssh`. In that order — the reverse locks you out.
- **Tailscale** on this box and the workstation. Stable private address reachable
  from anywhere, no port forwarding, no exposed SSH. Highest-value single addition.

Claude Code installed on this box and run over SSH is the right shape for
agent-assisted work — it gets the machine's own shell and filesystem. For
scheduled jobs, headless print mode from a systemd timer.

---

## 7. Workload Architecture

### The bottleneck splits in two

The current bottleneck — mockups, listing generation, listing enrichment, PDP
content — is two different problems with opposite answers:

| Workload | Bound by | Where it runs |
|---|---|---|
| Mockups, image rendering, format conversion | **CPU** | This box's processor |
| Listing enrichment, PDP copy, attribute fill | **Network** (LLM API) | Anthropic's side; this box only marshals |
| Pulling/pushing assets, DB round-trips | **I/O** | Network and disk |

For the enrichment half, this box's CPU is nearly irrelevant — it holds
connections and shuffles JSON. That half is largely solved simply by moving it
off the NAS. Only the image half depends on the processor.

### Two queues, two concurrency settings

This is the core of the design. A single queue with a single concurrency setting
makes both halves slow — either the CPU pool starves waiting on API calls, or the
API pool is throttled to 8 because of image work.

| Pool | Concurrency | Notes |
|---|---|---|
| CPU pool | 6–8 | Matched to threads; tune against thermals |
| Network pool | 50–200 | Bounded by API rate limits, not by this box |

Queue backend: a Postgres-backed queue (`pg-boss` or Graphile Worker) against the
existing Supabase means no new infrastructure, jobs that survive reboots, and
visibility in a database already in use. The workstation and NAS can enqueue work
without knowing anything about this box.

### Image pipeline

- **Use libvips, not ImageMagick** (`sharp` in Node, `pyvips` in Python). It
  streams rather than loading whole images — several times faster and a fraction
  of the memory. Single biggest change available.
- Keep ImageMagick only for steps vips can't do, such as displacement warping for
  realistic fabric or curved-surface mockups.
- If mockups are HTML/CSS templates screenshotted with Playwright: **reuse browser
  contexts, never launch a browser per job.** Launch cost dominates. 8–12 resident
  Chromium instances fit comfortably in RAM; threads are the constraint, not memory.
- Hardware video encode is available if any of the work is video — QuickSync on the
  HD 530, plus NVENC on the Quadro.

### LLM enrichment

- **Batch API** — 50% off standard pricing, up to 100k requests per batch, most
  complete within an hour. Enrichment isn't latency-sensitive; a nightly sweep is
  the ideal fit and matches this box's role (queue the batch, sleep, collect).
- **Prompt caching** — cached prefix reads cost roughly a tenth of standard input
  price. Structure every prompt as `[stable taxonomy + rules + brand voice] →
  [this product's data]`, never the reverse; caching is a prefix match, so anything
  volatile at the front silently invalidates everything after it. Minimum cacheable
  prefix is 512 tokens on Opus 5. Verify with `usage.cache_read_input_tokens` —
  zero across repeated calls means something in the prefix is changing.
- These stack: batch pricing and caching apply together.
- Rate limits bind long before this box does.

### Reliability posture

**This box holds no unique state. Everything on it is reconstructible.**

One ten-year-old machine, a single non-redundant decade-old spinning disk, and
non-ECC memory. Supabase stays the source of truth for transactional data; the
NAS holds anything where loss hurts; this box does compute, orchestration, and
staging. Adopt that rule and the box can be wiped and rebuilt on a weekend
without a meeting. Violate it and it becomes a single point of failure built from
2016 hardware.

Non-ECC RAM running 24/7 will eventually see a bit flip. For reconciliation data,
checksum outputs and never let this box be the only place a number exists.

### Security posture for unattended jobs

Automated jobs get **their own scoped credentials** — a narrowly-scoped Supabase
role and a dedicated NAS service account, not personal logins. An agent running
unattended with pre-approved permissions and production credentials is a very
different risk profile from an interactive session approving each step. Logs to
`/data` so there's an audit trail.

### Local inference — evaluated option

Running models locally to reduce API spend is viable here for *some* of the work.
Status: **not yet decided — measure first.**

**Capability.** Local inference speed is bound by memory bandwidth, not cores.
DDR4-2133 dual channel gives ~25–30 GB/s in practice, and generation speed is
roughly bandwidth ÷ model size:

| Model class | Q4 size | Single-stream |
|---|---|---|
| 1–3B | 1–2 GB | 15–30 tok/s |
| 7–8B | ~4.5 GB | 5–7 tok/s |
| 13–14B | ~8 GB | 3–4 tok/s |
| 70B | ~40 GB | <1 tok/s — fits in RAM, unusable |

The Quadro does not help: 2–4 GB VRAM won't hold a useful model and Maxwell is at
end-of-life for current CUDA. **CPU-only inference box.** Practical ceiling is a
7B–14B model at Q4_K_M; continuous batching (llama.cpp serving many sequences per
weight read) lifts aggregate throughput to roughly 20–30 tok/s. The 62 GiB is a
real advantage — model, large KV cache for parallel sequences, and an embedding
model all stay resident.

**What local should and shouldn't do.** The tasks a 7B handles well and the tasks
that cost real money are not the same set — local-friendly work produces short
outputs, and output is what's billed.

| Local | Claude |
|---|---|
| Classification (category, supplier, template) | PDP copy and long-form descriptions |
| Attribute extraction from supplier text | Judgment across messy or contradictory input |
| Normalization (`Blk` → `Black`, units) | Genuine questions and inquiry |
| Triage — does this need the expensive path? | Anything customer-facing where quality is revenue |
| Validating generated output against schema | |

**Embeddings are the clearest win** and worth building regardless of what the cost
measurement says. They run fast on CPU with no meaningful quality compromise, and
**Supabase already ships pgvector** — no new infrastructure. They unlock semantic
dedup, product matching against the catalogue, classification by nearest neighbour
(often better and far faster than asking a 7B), and retrieval.

**Rosy AI architecture.** Not fine-tuning — retrieval. Knowledge base → local
embeddings → pgvector in Supabase → retrieval runs entirely local and free →
generation escalates to Claude. Retrieval is the expensive-to-scale part and it
never leaves the box. It also improves cache economics: retrieved chunks sit
*after* the stable taxonomy prefix, so the cached prefix stays intact.

**Escalation.** Do **not** route on the local model's self-reported confidence —
small models are badly calibrated and report high confidence on exactly the wrong
outputs. Use static routing by task type first (classification/extraction → local,
generation/inquiry → Claude), then validation-based escalation: local emits
structured output, plain code validates it against a schema or business rule, and
failures escalate. Deterministic and auditable.

**Thread contention is the constraint that bites.** Three workloads now compete for
eight threads. Local inference at full tilt takes every core available; run it
alongside mockup rendering and both crawl. Either schedule them in separate windows
(inference overnight, images during the day) or pin thread counts explicitly and
accept half speed on both. Sustained inference is also the hardest thermal case in
the whole workload — harder than image batches — so the in-situ burn-in gates this.

**Stack.** Ollama to prototype; llama.cpp server in production (continuous batching
matters and Ollama hides those knobs). fastembed or a llama.cpp embedding server
for embeddings. Target a current 7B–14B instruct model at Q4_K_M chosen for
structured-output and extraction scores. The NVMe upgrade matters more in this
world — model loading off the HDD is not tolerable.

**Order of work.** Measure the real API bill for one full enrichment pass with the
Batch API and prompt caching enabled *before* building any of this — batch is 50%
off and cached input reads at roughly a tenth of standard price, so the cost may
already be low enough that an inference stack isn't worth the engineering time or
the thread contention. Then: build embeddings regardless, add local classification
and extraction with static routing, and keep generation on Claude unless a real A/B
on live listings justifies the tradeoff. Product copy quality is revenue, not just
cost.

---

## 8. Deployment Plan

Organizing principle: **do all software work on the desk, before it goes in the
cabinet.** Once installed, there should be no reason to open the door.

### Phase 0 — Provision

Phone tether (USB or hotspot) — don't wait on the building line.

```
sudo apt update && sudo apt upgrade -y
sudo apt install -y openssh-server lm-sensors smartmontools htop tmux
```

Then Node, libvips, Tailscale.

### Phase 1 — Health and baseline

- `sudo smartctl -a /dev/sda` — check Reallocated_Sector_Ct,
  Current_Pending_Sector, Power_On_Hours on the decade-old HDD.
- Battery health.
- Thermal burn-in on the desk; record temps and sustained clocks.
- Open the bottom cover: confirm the free M.2 slot, clean the fans.

### Phase 2 — Lock down access

- Strong account password.
- SSH key auth → disable password auth → restart sshd.
- DHCP reservation.
- Tailscale up.
- BIOS: power-on-after-AC-loss, Wake-on-LAN. Persist WoL on the OS side.
- **Verify Tailscale reachability with the lid shut before it leaves the desk.**

### Phase 3 — Physical install

Vertical, hinge up, vents clear, out of the NAS exhaust. Re-run the burn-in with
the door closed and compare against Phase 1.

### Phase 4 — Storage wiring

NFS mounts with `_netdev,nofail,soft`. tmpfs scratch in fstab. Reboot twice — once
with the NAS up, once with it deliberately down — and confirm both come back clean.

### Phase 5 — Runtime

Two-pool queue. systemd timers rather than cron. `MemoryMax=` on units so the OOM
killer takes one job rather than the box. Logs to `/data`.

### Phase 6 — Migrate and measure

Move **mockup rendering first** — it's the CPU-bound half and gives the clearest
before/after against the NAS. That number also decides whether the NVMe upgrade is
worth buying. Enrichment second, with prompt caching and the Batch API.

---

## 9. Open Items

Build was done during a building-wide internet outage, so anything
network-dependent is unverified.

- [ ] `sudo apt update && sudo apt upgrade -y` — never completed; installer's apt
      stage failed DNS resolution throughout
- [ ] `systemctl status ssh` — OpenSSH was selected at install but may not have
      downloaded. If missing: `sudo apt install openssh-server`
- [ ] Confirm GPU model — `lspci | grep -iE 'vga|3d'`
- [ ] Confirm free M.2 NVMe slot — `sudo nvme list`, or open the bottom cover
- [ ] SMART check on `/dev/sda`
- [ ] Battery health check
- [ ] Thermal baseline (desk) and re-test (in cabinet), including NAS drive-temp
      before/after delta
- [ ] Filter on the cabinet floor intake; review fan setpoint if thermostatic
- [ ] Measure real API cost for one full enrichment pass (Batch API + prompt
      caching) before deciding on local inference
- [ ] DHCP reservation for `192.168.0.82`
- [ ] SSH key auth, then `PasswordAuthentication no`
- [ ] Stronger account password — current one is short, and a real concern while
      SSH password auth is still enabled
- [ ] Tailscale on this box and the workstation
- [ ] BIOS: power-on-after-AC-loss, Wake-on-LAN
- [ ] Repaste the CPU

Resolved: cabinet ventilation confirmed — floor intake with fan, top exhaust.

---

## 10. Build Notes & Gotchas

Recorded because they cost real time and will recur on the next box.

**Ubuntu 26.04 (`resolute`) subiquity hangs.** First install attempt sat for 40+
minutes after disk probe with zero progress. `ps aux | grep curtin` confirmed curtin
never launched — no installation was happening at all. Dropping to 24.04.4 LTS
resolved it completely. For utility boxes, prefer the mature LTS point release over
the newest LTS.

**The installer defaults to the wrong disk.** Guided storage pre-selected the WD
spinning drive, and at one point had the layout targeting the USB installer stick
itself. Always read the device name on the storage summary screen before confirming.
The USB was identifiable by its very long `USB_SanDisk_3.2Gen1_04015b1ec...` serial;
internal drives had short model names.

**Subiquity under-allocates the LVM logical volume.** It defaulted `ubuntu-lv` to
100 G inside a 235 G volume group, silently stranding 135 G. Edit the LV on the
storage summary screen and set it to max before proceeding.

**A network outage mid-install is survivable.** The base system, kernel, and
bootloader all come off the ISO. apt failures during `cmd-system-install` degrade to
`W: Some index files failed to download` and the install completes. The cost is
deferred updates and possibly-missing optional packages (like OpenSSH).
