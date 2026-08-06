---
title: nco-connect — Build & Deployment Runbook
type: runbook
status: active
host: nco-connect
created: 2026-08-06
last-updated: 2026-08-06
---

# nco-connect — Build & Deployment Runbook

Step-by-step. Work top to bottom. Each stage has a **Done when** checkpoint —
don't move on until it's true.

Reference spec: [`nco-connect.md`](./nco-connect.md).

## The shape of this

**Stages 0–5 are plumbing.** One focused day. They produce no business value on
their own; they exist so that Stage 6 works and so you never have to open the
cabinet again.

**Stage 6 is the first throughput win** — moving image rendering off the NAS. This
is the one that shows up in listings-per-day. Get here fast.

**Stages 7–10 compound.** Cost, then capability, then the local-inference decision.

> **Organizing principle: do every software step on your desk, before the machine
> goes in the cabinet.** Once it's installed, there should be no reason to open
> the door.

---

## Stage 0 — Cabinet prep

**No internet needed. Do this while you're waiting.**

1. **Baseline the NAS drive temps.** In DSM: Storage Manager → HDD/SSD → temperature
   column. Write the numbers down. This is your only chance at a control reading —
   once the P50 is in there, you can't take it retroactively.
2. **Label the DS1515+ drives by bay** (the photo shows them ordered 1, 2, 4, 3, 5 —
   don't trust the sequence, label them). Masking tape and a marker.
3. **Pull the five drives** and set them aside somewhere static-safe. Recovery
   happens later, in the Appendix — don't block on it now.
4. **Remove the DS1515+ chassis.** That's the P50's slot.
5. **Clean the floor intake fan.** It's heavily dust-clogged. Compressed air, and
   wipe the grille. Free airflow.
6. **Check the top exhaust** — fanned or passive? If passive, order a fan. Given
   the load increase, plan on fitting one.
7. **Measure the freed space.** The P50 needs ~30 mm of width standing vertical,
   plus 3–5 cm clear on the intake-panel side.

**Done when:** drive temps recorded, 5-bay out, fan clean, and you know whether
you need a second fan.

---

## Stage 1 — Provision

**Needs internet. Don't wait for the building line — tether to your phone** (USB
tethering or hotspot). Twenty minutes on a phone connection gets you fully
provisioned; the wired link stays the production path.

Work on the desk, screen attached.

```bash
sudo apt update && sudo apt upgrade -y

sudo apt install -y \
  openssh-server lm-sensors smartmontools htop tmux \
  nfs-common ethtool git build-essential \
  libvips-tools libvips-dev

sudo sensors-detect --auto
```

Node (current LTS via NodeSource):

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
node --version
```

Tailscale:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Follow the URL it prints on your workstation to authenticate.

**Done when:** `apt upgrade` completes with no download errors, `systemctl status ssh`
is active, `node --version` prints, and `tailscale ip -4` returns an address.

---

## Stage 2 — Health check and open-machine work

Everything here is easier now than after installation.

### Read the health numbers

```bash
# The decade-old spinning disk — the numbers that matter
sudo smartctl -a /dev/sda | grep -E 'Reallocated_Sector_Ct|Current_Pending_Sector|Offline_Uncorrectable|Power_On_Hours|Temperature_Celsius'

# Confirm the GPU
lspci | grep -iE 'vga|3d'

# Confirm whether an M.2 NVMe slot is free
sudo nvme list
lsblk

# Battery health — energy_full vs energy_full_design is the real metric
grep . /sys/class/power_supply/BAT0/{energy_full,energy_full_design,cycle_count,status}
```

**Decision point — the HDD.** Non-zero `Reallocated_Sector_Ct` or any
`Current_Pending_Sector` means don't trust `/data` with anything you'd miss. That
also makes the NVMe upgrade less optional.

**Decision point — the battery.** If `energy_full` is far below `energy_full_design`,
or the pack is visibly swollen, remove it — a swelling cell in an enclosed wooden
cabinet is a genuine hazard. If it's healthy, keep it: it's a free UPS that lets
jobs shut down gracefully on power loss.

### Thermal baseline (desk)

Terminal 1:

```bash
for i in $(seq 8); do timeout 600 sha256sum /dev/zero & done
```

Terminal 2:

```bash
watch -n2 'sensors | grep -E "Package|Core"; grep "cpu MHz" /proc/cpuinfo | sort -u | tail -3'
```

Let it run the full ten minutes and record the settled numbers. All-core turbo on
a 6700HQ is ~3.1 GHz.

| Reading | Good | Problem |
|---|---|---|
| Sustained all-core clock | 2.8–3.1 GHz | below 2.6 GHz |
| Package temp | under ~85 °C | pegged 95–100 °C |

### Open the machine

Bottom cover off. While you're in there:

- **Blow out the fans and heatsink fins.** Ten years of dust.
- **Repaste the CPU.** The paste is a decade old and almost certainly dried out.
  Highest-value maintenance available on this machine, and you will not want to
  do it after it's in the cabinet.
- **Fit the NVMe** if you bought one. Confirm the free M.2 slot while the cover
  is off regardless.
- **Confirm the Quadro model** against the `lspci` output.

Re-run the thermal test after repasting. The delta tells you it worked.

**Done when:** SMART numbers recorded, battery decided, desk thermal baseline
recorded (ideally post-repaste), machine reassembled.

---

## Stage 3 — Lock down access

**This is the stage that determines whether you ever need to open the cabinet
again. Do not rush it.**

### Password and keys

```bash
passwd
```

From your **workstation**:

```bash
ssh-copy-id david@192.168.0.82
ssh david@192.168.0.82    # must succeed WITHOUT prompting for a password
```

Only once key auth demonstrably works, on the box:

```bash
sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sshd -t && sudo systemctl restart ssh
```

> ⚠️ **Order matters.** Verify the key works before disabling passwords. The
> reverse locks you out and means a trip to the console. `sshd -t` validates the
> config before the restart — if it errors, fix it before restarting.

### Network

- **Router:** add a DHCP reservation for `192.168.0.82` against the MAC of
  `enp0s31f6` (`ip link show enp0s31f6`).
- **Tailscale:** confirm you can reach the box over its Tailscale address, not
  just the LAN IP.

### BIOS

Reboot into BIOS (Enter → F1). Set both:

- **Power on after AC loss** — a power cut mustn't leave the box dark.
- **Wake on LAN** — so you can wake it without touching it.

Then persist WoL on the OS side:

```bash
sudo tee /etc/systemd/system/wol.service >/dev/null <<'EOF'
[Unit]
Description=Enable Wake-on-LAN
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/ethtool -s enp0s31f6 wol g

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now wol.service
sudo ethtool enp0s31f6 | grep Wake-on
```

### The final test

**Close the lid. Walk away. SSH in over Tailscale from your workstation.**

**Done when:** you can reach the box, lid shut, over Tailscale, with key auth,
and password auth is off. If any part of that fails, fix it before Stage 4 — this
is your last easy access.

---

## Stage 4 — Install in the cabinet

1. **Vertical, standing on the front edge, hinge upward.** Exhaust vents behind
   the hinge, so hinge-up sends it into the cabinet's rising air column.
2. **Low, near the floor intake** — but **offset, not sitting on the fan.** Raise
   it on standoffs or a small shelf so it doesn't block the inlet it depends on.
3. **Intake panel facing away from the DS220+**, into open space or toward the
   intake side. It needs 3–5 cm of clear air.
4. **Ethernet and power only.** Skip the ThinkPad dock.
5. **Same switch as the DS220+**, not just the same subnet.
6. **170 W brick outside the cabinet** if the cable reaches. It's another heat
   source.
7. **Leave cable slack** so you can slide the machine out without unplugging.
8. If the DS220+ is on a UPS, put the P50 on it too.

### Re-test in situ

Close the door. Run the same burn-in. Watch **both** the P50's numbers and the
DS220+'s drive temps.

| Reading | Good | Problem |
|---|---|---|
| P50 sustained all-core clock | 2.8–3.1 GHz | below 2.6 GHz |
| P50 package temp | under ~85 °C | pegged 95–100 °C |
| DS220+ drive temps | under 45 °C | over 50 °C, or +5 °C vs. Stage 0 baseline |

**If the drive delta is more than a few degrees, the fan is undersized for two
heat sources.** Fit the top-exhaust fan before committing workloads. That's a
fix, not a failure.

**Done when:** door closed, ten-minute burn-in passes on all three readings, and
you're still connected over Tailscale throughout.

---

## Stage 5 — Storage wiring

### tmpfs scratch

```bash
sudo mkdir -p /scratch
echo 'tmpfs /scratch tmpfs rw,size=20G,mode=1777,noatime 0 0' | sudo tee -a /etc/fstab
sudo mount /scratch
df -h /scratch
```

20 GB of RAM disk, leaving ~40 GB working memory. This is where all intermediate
files go — never `/data`, never the NAS mount.

### NFS from the DS220+

**On the NAS (DSM):**

1. Control Panel → File Services → NFS → **Enable NFS**, set max protocol to NFSv4.1
2. Control Panel → Shared Folder → select the assets share → Edit → NFS Permissions
   → Create:
   - Hostname/IP: `192.168.0.82`
   - Privilege: Read/Write
   - Squash: *Map all users to admin* (simplest) or *No mapping* with matching UIDs
3. Note the mount path it shows you (e.g. `/volume1/assets`)

Also create a **dedicated service account** on the NAS with access to the asset
shares only — not your admin login.

**On the P50:**

```bash
sudo mkdir -p /mnt/nas/assets

echo 'nas:/volume1/assets /mnt/nas/assets nfs _netdev,nofail,noatime,soft,timeo=100,retrans=3 0 0' \
  | sudo tee -a /etc/fstab

sudo mount -a
ls /mnt/nas/assets
```

Replace `nas` with the DS220+'s hostname or IP. The three load-bearing options:

- `_netdev` + `nofail` — the box boots even when the NAS is down or slow
- `soft` — jobs fail with an error instead of hanging forever if the NAS vanishes

### Test both states

```bash
sudo reboot            # with the NAS up
# ...then power the NAS down and reboot the P50 again
```

**Done when:** the P50 boots cleanly in both states, and `/scratch` and
`/mnt/nas/assets` are present when the NAS is up.

> **Rule from here on:** the NAS mount is a *transfer surface*. Pull a batch in,
> process in `/scratch`, push results back. Never process in place across the
> mount — that's what's throttling the NAS today.

---

## Stage 6 — First throughput win: the image pipeline

**This is the stage that shows up in listings-per-day.** Everything before it was
plumbing.

### Benchmark first, so you know what you gained

Time your **current** NAS-based process over a representative batch — say 100
source images. Write the number down.

Then on the P50, with libvips:

```bash
mkdir -p /scratch/in /scratch/out
cp /mnt/nas/assets/sample-batch/*.jpg /scratch/in/

time (ls /scratch/in/*.jpg | xargs -P 8 -I{} \
  vipsthumbnail {} -s 2000 -o '/scratch/out/%s.webp[Q=82]')
```

`-P 8` is the concurrency; tune it. Expect a large multiple over the NAS — you're
going from a dual-core Celeron with ImageMagick to 4C/8T with libvips streaming
into a RAM disk.

### Build the real pipeline

- **libvips, not ImageMagick.** `sharp` in Node, `pyvips` in Python. It streams
  rather than loading whole images — several times faster, a fraction of the memory.
- Keep ImageMagick **only** for steps vips can't do, such as displacement warping
  for fabric or curved-surface mockups. Hybrid is fine.
- **If mockups are HTML/CSS screenshotted with Playwright: reuse browser contexts.**
  Never launch a browser per job — launch cost dominates everything else. Keep a
  pool of 8–12 warm contexts; you have the RAM for it.
- **Pattern:** pull batch from NAS → process in `/scratch` → write results back →
  clear scratch.

### Wrap it in systemd

```ini
# /etc/systemd/system/nco-render.service
[Unit]
Description=NCo image render worker
After=network-online.target

[Service]
Type=simple
User=david
WorkingDirectory=/opt/nco
ExecStart=/usr/bin/node /opt/nco/render-worker.js
MemoryMax=24G
Nice=5
Restart=on-failure
StandardOutput=append:/data/logs/render.log
StandardError=append:/data/logs/render.log

[Install]
WantedBy=multi-user.target
```

`MemoryMax` means a runaway job gets killed instead of taking the box down. Use
**systemd timers, not cron** — better logging and dependency handling.

**Done when:** you have a before/after number and the render worker runs
unattended. That number also decides whether the NVMe upgrade is worth buying.

---

## Stage 7 — Enrichment: cut the API bill

Two changes, both large, neither touching output quality.

### Restructure prompts for caching

Caching is a **prefix match** — put stable content first, volatile content last.

```
system:   [ taxonomy + attribute schema + brand voice + rules ]  ← cache_control here
messages: [ this product's data ]                                ← varies per call
```

Anything volatile at the front — a timestamp, a SKU in the system prompt —
silently invalidates the whole cache. Minimum cacheable prefix is 512 tokens on
Opus 5.

**Verify it's working:** check `usage.cache_read_input_tokens` on the response.
Zero across repeated calls means something in your prefix is changing. Cached
reads cost roughly a tenth of standard input price.

### Move the nightly sweep to the Batch API

Enrichment isn't latency-sensitive — nobody waits on a PDP description in real
time. Batch gives **50% off**, accepts up to 100,000 requests per batch, and most
complete within an hour.

Shape: the P50 assembles the batch, submits it, sleeps, collects results, writes
back to Supabase. That's exactly the job this box is for — its CPU is nearly
irrelevant here.

**These stack.** Batch pricing and prompt caching apply together.

### Measure

Record cost per listing for one full run with both enabled. **This number is the
gate on Stage 10** — if it's already low, a local inference stack isn't worth the
engineering time or the thread contention.

**Done when:** `cache_read_input_tokens` is non-zero, the nightly sweep runs
through Batch, and you have a cost-per-listing figure.

---

## Stage 8 — Two-pool concurrency

The core runtime design. **One queue with one concurrency setting makes both
halves slow** — the CPU pool starves waiting on API calls, or the API pool is
throttled to 8 because of image work.

| Pool | Concurrency | Bound by |
|---|---|---|
| CPU (render, convert) | 6–8 | Threads, thermals |
| Network (LLM, DB, NAS I/O) | 50–200 | API rate limits, not this box |

**Queue backend:** `pg-boss` or Graphile Worker against the existing Supabase.
No new infrastructure, jobs survive reboots, and the queue is visible in a
database you already use. Your workstation and the NAS can enqueue work without
knowing anything about the P50.

**Scheduling note:** if Stage 10 adds local inference, you'll have *three*
workloads on eight threads. Plan the split now — inference overnight, image
rendering during the day. That suits the workloads anyway: enrichment batches
aren't latency-sensitive, mockups often are.

**Done when:** both pools run under systemd with independent concurrency, and
saturating one doesn't stall the other.

---

## Stage 9 — Embeddings and pgvector

**Build this regardless of what Stage 7's cost number says.** Embeddings run fast
on CPU with no meaningful quality compromise, and Supabase already ships pgvector —
no new infrastructure.

What it unlocks:

- **Semantic dedup** of near-identical listings
- **Product matching** against the existing catalogue
- **Classification by nearest neighbour** against labelled examples — often better
  and far faster than asking a small model
- **Retrieval** — the foundation Rosy needs

Stack: `fastembed` (ONNX, very quick on CPU) or a llama.cpp embedding server.

### Rosy AI

Not fine-tuning — **retrieval**:

```
knowledge base → local embeddings → pgvector in Supabase
              → retrieval runs entirely local and free
              → generation escalates to Claude
```

Retrieval is the expensive-to-scale part and it never leaves the box. It also
improves cache economics: retrieved chunks sit *after* the stable prefix, so the
cached prefix stays intact.

**Done when:** the catalogue is embedded, dedup and matching run locally, and
retrieval returns sensible context.

---

## Stage 10 — Decide on local inference

**Gated on Stage 7's cost number.** Only build this if the measured API spend
justifies the engineering time and the thread contention.

If you do:

- **Target a 7B–14B instruct model at Q4_K_M.** Speed is bound by memory bandwidth
  (~25–30 GB/s here), so expect ~5–7 tok/s single-stream on a 7B, 20–30 tok/s
  aggregate with continuous batching. The Quadro doesn't help — 2–4 GB VRAM and
  end-of-life CUDA support. CPU only.
- **Ollama to prototype, llama.cpp server in production** — you want continuous
  batching, and Ollama hides those knobs.
- **Route statically by task type**, not by the model's self-reported confidence.
  Small models are badly calibrated and report high confidence on exactly the
  wrong outputs.

| Local | Claude |
|---|---|
| Classification, extraction, normalization | PDP copy, long-form descriptions |
| Triage — does this need the expensive path? | Judgment on messy input |
| Schema validation | Genuine questions and inquiry |

- **Then validation-based escalation:** local emits structured output, plain code
  validates it against a schema or business rule, failures escalate to Claude.
  Deterministic and auditable.
- **A/B on real listings before switching any generation to local.** Product copy
  quality is revenue, not just cost.

**Thermal note:** sustained inference is the hardest case in the whole workload —
harder than image batches. Stage 4's in-situ burn-in gates this.

---

## Appendix — The DS1515+ drives

**Decision: the five drives are shelved pending a replacement NAS.** They'll be
inserted and read there rather than recovered now.

The DS1515+ failure is almost certainly the **Intel Atom C2000 LPC clock bug** —
a mainboard failure, not a disk failure, so the drives are very likely intact.

### Storage

Label by bay, antistatic bags, cushioned and not stacked bare, somewhere cool and
dry. Unpowered HDDs hold data for decades; the real risk is physical handling, not
decay.

### Constraints on the replacement NAS

Three things to check **before ordering**, because each can block reading the array
in place:

| Constraint | Why |
|---|---|
| **At least 5 bays** | The array won't assemble with four of five drives present. |
| **Drive compatibility policy** | Synology's 2025+ Plus series introduced restrictions around non-Synology-branded drives for pool creation and full support. Verify on the product page. |
| **DSM version gap** | These volumes were written by a much older DSM. A large version jump can mean the new unit offers to reformat rather than import. |

### Optional: verify now, cheaply

A single USB-SATA dock (~£20) checks the drives **one at a time** — no assembly
required:

```bash
sudo apt install -y mdadm smartmontools

sudo smartctl -a /dev/sdX | grep -E 'Reallocated_Sector_Ct|Current_Pending_Sector|Power_On_Hours'
sudo mdadm --examine /dev/sdX
```

`--examine` reads each drive's array metadata individually. Five healthy SMART
reports plus consistent metadata means the array will almost certainly come up in
a new NAS.

**Why it's worth an evening:** the array was most likely SHR-1, which survives one
drive failure. If one of the five is already dead there is **no redundancy left** —
and discovering that mid-migration in a year, with no fallback, is far worse than
discovering it now. It also makes a good first real job for the P50.

### If reading them in-place fails

Synology uses standard `mdadm` + LVM with ext4/btrfs, so Linux reads the array
natively via dock(s):

```bash
sudo mdadm --assemble --scan
cat /proc/mdstat
sudo vgscan && sudo vgchange -ay
sudo lvs

sudo mkdir -p /mnt/recover
sudo mount -o ro /dev/vg1/volume_1 /mnt/recover    # READ-ONLY first
```

### Two open items

**These are recovery media, not the storage plan.** Contemporaneous with the
DS1515+, so roughly a decade of power-on hours. Budget for new drives in the new
unit and use the old ones only to move data across.

**Work out what capacity the 5-bay was providing.** A 2-bay DS220+ as the only live
NAS is a real constraint once the render pipeline starts pushing volume back at it.
That figure should drive the bay count and drive size you buy.

---

## Quick reference — the whole thing

| Stage | What | Needs internet | Rough time |
|---|---|---|---|
| 0 | Cabinet prep, drive temps, remove 5-bay, clean fan | No | 1 h |
| 1 | Provision (tether) | Yes | 45 min |
| 2 | Health check, repaste, thermal baseline | No | 2 h |
| 3 | Lock down access | Yes (Tailscale) | 45 min |
| 4 | Install in cabinet, in-situ burn-in | No | 1 h |
| 5 | tmpfs + NFS mounts | No | 45 min |
| 6 | **Image pipeline — first throughput win** | Yes | Half day |
| 7 | Batch API + prompt caching | Yes | Half day |
| 8 | Two-pool concurrency | Yes | Half day |
| 9 | Embeddings + pgvector | Yes | Half day |
| 10 | Local inference decision | — | Gated on Stage 7 |
| A | DS1515+ recovery | No | 1–2 h |

Stages 0–5 in one day gets you a working node. Stage 6 the next day is where the
listings throughput changes.
