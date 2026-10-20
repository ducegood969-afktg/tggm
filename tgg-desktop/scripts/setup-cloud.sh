#!/usr/bin/env bash
set -euo pipefail
# Rootless Linux GUI prerequisites; APT verifies repository signatures and package hashes.
if [[ $(uname -s) != Linux ]]; then exit 0; fi
setup_root=/workspace/.tools/desktop-apt
gui_root=/workspace/.tools/desktop-gui
mkdir -p "$setup_root/lists/partial" "$setup_root/archives/partial" "$setup_root/config.d" "$setup_root/sources.list.d" "$gui_root"
touch "$setup_root/empty.conf"
cat > "$setup_root/apt.conf" <<CONF
Dir::Etc::parts "$setup_root/config.d";
Dir::Etc::main "$setup_root/empty.conf";
Dir::Etc::sourcelist "$setup_root/sources.list";
Dir::Etc::sourceparts "$setup_root/sources.list.d";
Dir::State::lists "$setup_root/lists";
Dir::State::status "/var/lib/dpkg/status";
Dir::Cache::archives "$setup_root/archives";
Debug::NoLocking "true";
APT::Sandbox::User "$(id -un)";
APT::Get::List-Cleanup "false";
CONF
cat > "$setup_root/sources.list" <<'SOURCES'
deb [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] https://deb.debian.org/debian trixie main
deb [signed-by=/usr/share/keyrings/debian-archive-keyring.gpg] https://deb.debian.org/debian-security trixie-security main
SOURCES
APT_CONFIG="$setup_root/apt.conf" /usr/bin/apt-get update
APT_CONFIG="$setup_root/apt.conf" /usr/bin/apt-get --download-only --yes --no-install-recommends install xvfb xauth gnome-keyring dbus-x11
for package_file in "$setup_root"/archives/*.deb; do dpkg-deb -x "$package_file" "$gui_root"; done
printf 'Rootless GUI prerequisites installed in %s\n' "$gui_root"
