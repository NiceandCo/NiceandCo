# Spectrum Cutover & Remote Access Plan

**Owner:** David · **Install date:** 2026-11-28 · **Status:** Ready for install day

## Purpose
Move the apartment office off the building's shared network onto a dedicated Spectrum line. Then lock down the router, give the NAS and P50 fixed addresses, and confirm remote access through **Tailscale**, which is already installed and in use.

## Scope
| Device | Role | Notes |
|---|---|---|
| Spectrum modem | Internet connection (WAN) | Installed by Spectrum tech |
| Wi-Fi router | LAN, Wi-Fi, firewall | Model TBD: read it from the bottom sticker |
| NAS | File storage, backups | Brand/model TBD |
| Lenovo P50 | Workstation or always-on server | Windows edition TBD (Home or Pro) |
| ReBirth | Admin PC | Used to run network checks with Claude |

---

## Phase 0: Night before (5 min)
- [ ] Confirm Tailscale is **logged in and up to date** on the NAS and P50.
- [ ] Check the NAS network settings. If it has a **static IP** from the building network, switch it to **DHCP**. Otherwise it will be unreachable after the switch.
- [ ] Note the NAS and P50 **MAC addresses**. They're needed for the fixed-address reservations in Phase 3.

## Phase 1: Before the tech leaves
Ask the tech:
1. **Is this a modem-only box or a modem/router combo?** If it's a combo and we use our own router, ask for **bridge mode**.
2. **What is the upload speed on this plan?** Upload speed caps how fast remote access to the NAS feels.
3. **Is it a public IPv4 address (not shared)?** Tailscale works either way, but confirm.

Verify:
- [ ] Wired speed test. Record download and upload: ______ / ______ Mbps
- [ ] The router shows a public WAN address, not `10.x` or `100.64.x`.

## Phase 2: Give Claude visibility (optional, recommended)
On **ReBirth**:
1. Update the Claude desktop app.
2. Go to **Settings → Claude Code → Remote Control**.
3. Add a normal folder, e.g. `Documents\Network`. Don't use hidden folders or the home folder itself.
4. Connect ReBirth to the new network.

Claude can then list the devices on the network, identify the router model and firmware, check open ports, and test Tailscale paths.

If you skip this phase, send the **router model** and screenshots of the admin pages instead.

## Phase 3: Router hardening
**Security**
- [ ] Change the router admin password, and turn on 2FA for the admin login if the router supports it.
- [ ] Update the firmware and turn on automatic updates.
- [ ] Wi-Fi security: **WPA3**, or WPA2/WPA3 mixed mode if older devices need it.
- [ ] Turn off **WPS**, **UPnP**, and **remote admin from the internet (WAN)**.
- [ ] Reuse the old Wi-Fi name and password so devices reconnect on their own.
- [ ] Create a **guest network** for visitors.
- [ ] If the router supports it, put smart devices (TVs, speakers, smart plugs) on their own isolated network.

**Addressing**
- [ ] Use a local network range that won't clash with anything: `192.168.50.0/24`.
- [ ] Fixed address (DHCP reservation) for the NAS: `192.168.50.10`
- [ ] Fixed address for the P50: `192.168.50.20`
- [ ] Optional: set the router's DNS to a filtering service (Quad9 `9.9.9.9`, or Cloudflare `1.1.1.2`).

**Performance**
- [ ] Connect the **NAS to the router by cable**. The P50 should be wired too if it's acting as a server.
- [ ] Set traffic priority (QoS) so calls and video meetings go ahead of NAS backups and big downloads.
- [ ] Let the router pick Wi-Fi channels automatically, or have Claude recommend channels after a scan.

## Phase 4: NAS & P50
**NAS**
- [ ] Update the firmware.
- [ ] Disable the default `admin` account and turn on 2FA for every user.
- [ ] Turn off QuickConnect / myQNAPcloud. Tailscale replaces them.
- [ ] Turn on **snapshots** for the main shares. This is the ransomware protection.
- [ ] Re-point mapped drives and backup jobs to the NAS **hostname**, not its IP address.

**P50**
- [ ] Power settings: never sleep on AC power.
- [ ] In BIOS, turn on **Power on after AC loss**, so it restarts by itself after an outage.
- [ ] Remote desktop: Windows Pro has built-in Remote Desktop (RDP). On Home, use Chrome Remote Desktop or RustDesk, or upgrade to Pro.

## Phase 5: Tailscale verification
- [ ] In the Tailscale admin console, turn off **key expiry** for the NAS and P50.
- [ ] From a phone on **cellular data with Wi-Fi off**:
  - NAS web page loads ☐
  - File share opens ☐
  - Remote desktop to the P50 connects ☐
- [ ] Run `tailscale ping <nas>` from an outside network. A **direct** result is good; **via DERP** means traffic is going through Tailscale's relay servers, which is slower.
- [ ] Optional: make the NAS a Tailscale **subnet router** so remote users can reach the whole office network.
- [ ] **Never** port-forward the NAS admin page or remote desktop to the internet.

## Phase 6: Resilience
- [ ] Put the modem, router, NAS and P50 on a **UPS**.
- [ ] Set up a backup way in: a smart plug on the modem/router, or a person on-site who can power-cycle things.
- [ ] Restart the backup and sync jobs, then run one by hand to confirm it works.

## Open items to fill in
| Item | Value |
|---|---|
| Router make/model | |
| NAS make/model | |
| P50 Windows edition | |
| Spectrum plan (down / up) | |
| Who needs remote access | |
