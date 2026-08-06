---
title: nco-connect — Local Linux Server Spec
type: infrastructure
status: active
host: nco-connect
built: 2026-08-06
last-updated: 2026-08-06
---

# nco-connect — Local Linux Server

Repurposed Lenovo ThinkPad running Ubuntu Server. Intended as an always-on local
compute node for Co.nnect background processes, alongside the NAS.

---

## 1. Identity & Access

| Field | Value |
|---|---|
| Hostname | `nco-connect` |
| OS | Ubuntu Server 24.04.4 LTS (noble) |
| Kernel | 6.8.0-100-generic, x86_64 |
| Primary user | `david` |
| Sudo | Yes (standard `sudo <cmd>`) |
| Interface | `enp0s31f6` (wired ethernet) |
| IP | `192.168.0.82` — **DHCP, not yet reserved** |
| Chassis | Lenovo ThinkPad (dual-drive, 2.5" + M.2/SATA bays) |

SSH target once verified: `ssh david@192.168.0.82`

---

## 2. Storage Layout

Two internal drives. **Device letters shift if a USB drive is attached at boot** —
always confirm with `lsblk` before running destructive commands.

### `/dev/sdb` — SanDisk SD8TN8U2, 238.47 GiB SSD — OS drive

| Partition | Size | Mount | Notes |
|---|---|---|---|
| `sdb1` | 1 G | `/boot/efi` | EFI System (fat32) |
| `sdb2` | 2 G | `/boot` | ext4 |
| `sdb3` | 235.4 G | — | LVM PV → `ubuntu-vg` |
| `ubuntu-vg/ubuntu-lv` | 235.42 G | `/` | ext4, full-size LV |

Root filesystem: 231 G total, ~209 G available.

### `/dev/sda` — WDC WD5000LPLX, 465.76 GiB HDD — data drive

| Partition | Size | Mount | Notes |
|---|---|---|---|
| `sda1` | 458 G | `/data` | ext4, label `data`, owned `david:david` |

Wiped 2026-08-06 (was a decade-old Windows install — NTFS C: drive, recovery
partition, MSR). Nothing salvaged; contents were confirmed obsolete.

`/etc/fstab` entry:

```
LABEL=data /data ext4 defaults 0 2
```

**Design intent:** OS and system on the SSD, bulk/scratch/working data on `/data`.
Spinning disk, so it's fine for archives, exports, logs, and staged files — not for
anything latency-sensitive.

---

## 3. Configuration Applied

### Lid behavior — machine stays running when closed

`/etc/systemd/logind.conf`:

```
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
```

Applied with `sudo systemctl restart systemd-logind`. This is what makes headless
operation possible — without it the box suspends the moment the lid shuts.

### Deliberately skipped at install

- **Ubuntu Pro** — skipped. Enable later with `sudo pro attach` if ESM coverage is
  wanted (free for personal use, up to 5 machines).
- **Featured server snaps** — none installed. Add as needed via `sudo snap install`.

---

## 4. Open Items

Building was done during a building-wide internet outage (utility line crew on the
poles), so anything network-dependent is unverified.

- [ ] `sudo apt update && sudo apt upgrade -y` — never completed; installer's apt
      stage failed DNS resolution throughout
- [ ] `systemctl status ssh` — OpenSSH was selected at install but may not have
      downloaded. If missing: `sudo apt install openssh-server`
- [ ] DHCP reservation for `192.168.0.82` in the router, so the address is stable
- [ ] SSH key auth: `ssh-copy-id david@192.168.0.82` from the workstation, then
      disable password auth in `/etc/ssh/sshd_config`
      (`PasswordAuthentication no`) and `sudo systemctl restart ssh`
- [ ] Consider a stronger account password — the current one is short, which is a
      real concern while SSH password auth is still enabled

---

## 5. Build Notes & Gotchas

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

---

## 6. Intended Role

Placeholder — to be filled in as the architecture firms up.

Candidate workloads for this node vs. the NAS:

- Scheduled Co.nnect jobs that don't need to live in Supabase (reconciliation
  sweeps, PO polling, remittance ingestion)
- Local MCP server hosting, if the Obsidian vault or transactional data ends up
  reachable from here
- Staging area for file-based pipelines — `/data` has 435 G free
- Long-running scripts that shouldn't tie up the workstation

Open question: division of labor between this box and the NAS. The NAS is the better
home for the vault and anything needing redundancy; this box has actual CPU and is
the better home for anything that computes.
