# RANGGACRYZHACK — Dual Control

A small Termux/Node.js project for opening an installed third-party app on a second Android phone over the same Wi-Fi or hotspot.

## Important

- Use this only between devices you own or where the other device's owner has explicitly agreed.
- The receiver displays a one-time six-digit PIN and asks for local approval before accepting a controller.
- Keep the PIN private. Do not post device IP addresses or PINs publicly.
- The receiver accepts only app-package launch requests from its detected third-party app list. It does not provide remote shell access, file access, screen viewing, or hidden control.
- This version uses manual IP entry; automatic device discovery and Bluetooth are not implemented.

## Requirements

- Android with Termux and Node.js.
- Both phones connected to the same Wi-Fi network or one phone's hotspot.
- The receiver phone's owner must approve the pairing prompt locally.

## Install on the receiver phone

\`\`\`sh
pkg update
pkg install nodejs git
git clone https://github.com/julliansyahrangga-sketch/ranggacryzhack-dual-control.git
cd ranggacryzhack-dual-control
bash install-receiver.sh
node receiver.js
\`\`\`

Note the receiver's local IP address using \`ip route\` or Android Wi-Fi details. Do not share the PIN publicly.

## Install on the controller phone

\`\`\`sh
pkg update
pkg install nodejs git
git clone https://github.com/julliansyahrangga-sketch/ranggacryzhack-dual-control.git
cd ranggacryzhack-dual-control
bash install-controller.sh
node controller.js
\`\`\`

Enter the receiver phone's local IP and the six-digit PIN shown by the receiver. The receiver owner must type \`y\` at the approval prompt.

## Use

- Enter an app number to request that app to open on the receiver.
- \`n\` and \`p\` move between pages.
- \`r\` refreshes the app list.
- \`0\` disconnects.

## Network

TCP port: \`47831\`. The connection is intended for a trusted local Wi-Fi/hotspot network only. Stop the receiver with Ctrl+C when finished.

## Compatibility note

Android vendors differ in package visibility and app-launch behavior. If the app list is empty or an app does not open, check Termux permissions and Android restrictions. This repository's scripts are a basic baseline, not a guarantee of compatibility on every Android device.
