# Leaf VPN Desktop Client

![Leaf VPN](src-tauri/icons/icon.png)

## Download

| Platform               | Architecture  | Download                                                                                                                           |
|------------------------|---------------|------------------------------------------------------------------------------------------------------------------------------------|
| Windows                | x64 (64-bit)  | [Download Installer (.exe)](https://github.com/shiroedev2024/leaf-desktop/releases/latest/download/Leaf.VPN_1.6.1_x64-setup.exe)   |
| Windows                | x86 (32-bit)  | [Download Installer (.exe)](https://github.com/shiroedev2024/leaf-desktop/releases/latest/download/Leaf.VPN_1.6.1_x86-setup.exe)   |
| Windows                | ARM64         | [Download Installer (.exe)](https://github.com/shiroedev2024/leaf-desktop/releases/latest/download/Leaf.VPN_1.6.1_arm64-setup.exe) |
| macOS                  | Intel         | [Download App (.tar.gz)](https://github.com/shiroedev2024/leaf-desktop/releases/latest/download/Leaf_VPN_1.6.1_x64.app.tar.gz)     |
| macOS                  | Apple Silicon | [Download App (.tar.gz)](https://github.com/shiroedev2024/leaf-desktop/releases/latest/download/Leaf_VPN_1.6.1_arm64.app.tar.gz)   |
| Linux (Debian/Ubuntu)  | x64           | [Download Package (.deb)](https://github.com/shiroedev2024/leaf-desktop/releases/latest/download/Leaf.VPN_1.6.1_amd64.deb)         |
| Linux (Debian/Ubuntu)  | ARM64         | [Download Package (.deb)](https://github.com/shiroedev2024/leaf-desktop/releases/latest/download/Leaf.VPN_1.6.1_arm64.deb)         |
| Linux (Red Hat/Fedora) | x64           | [Download Package (.rpm)](https://github.com/shiroedev2024/leaf-desktop/releases/latest/download/Leaf.VPN-1.6.1-1.x86_64.rpm)      |
| Linux (Red Hat/Fedora) | ARM64         | [Download Package (.rpm)](https://github.com/shiroedev2024/leaf-desktop/releases/latest/download/Leaf.VPN-1.6.1-1.aarch64.rpm)     |

[View all releases →](https://github.com/shiroedev2024/leaf-desktop/releases)

Leaf VPN is a cross-platform desktop VPN client built with Tauri, Vue 3, and the leaf-sdk for secure and private
internet access. This application provides a user-friendly interface for managing VPN connections through the powerful
Leaf proxy engine.

## Features

- **Simple, Intuitive Interface** - Easy-to-use dashboard for managing your VPN connections
- **Cross-Platform Support** - Works on Windows, macOS, and Linux
- **Subscription Management** - Easily update and manage your VPN subscription
- **Multiple Outbound Connections** - Choose from available outbound servers
- **Auto-Reload Capability** - Automatically reconnect when network changes
- **Deep Linking Support** - Direct subscription integration via `leafvpn://` protocol
- **Automatic Updates** - Stay current with the latest features and security patches
- **Traffic Monitoring** - Track your VPN usage
- **IPv6 Support** - Full IPv6 compatibility with toggle options
- **Customizable Settings** - Adjust network preferences, logging options, and more

## System Requirements

- **Windows**: Windows 10 or newer
- **macOS**: macOS 10.15 (Catalina) or newer
- **Linux**: Most modern distributions with `libwebkit2gtk` support

## Development

This project is built using the following technologies:

- **[Tauri](https://tauri.app/)** - Lightweight, secure desktop application framework
- **[Vue 3](https://vuejs.org/)** - Progressive JavaScript framework
- **[TypeScript](https://www.typescriptlang.org/)** - Typed JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Rust](https://www.rust-lang.org/)** - Backend implementation language
- **Leaf SDK** - VPN client implementation

### Project Structure

- `src/` - Vue frontend application
    - `api/` - API client interfaces
    - `components/` - Reusable Vue components
    - `page/` - Main application screens
    - `store/` - State management using Pinia
    - `types/` - TypeScript type definitions
- `src-tauri/` - Rust backend application
    - `src/` - Rust source code
    - `bin/` - Binary executables for the Leaf IPC service

## Setup for Development

### Prerequisites

- Node.js (v16 or newer)
- Yarn
- Rust toolchain (rustc, cargo)
- Platform-specific build dependencies for Tauri

### Cargo Registry Configuration

This project uses a custom Cargo registry for accessing leaf-sdk and other dependencies. Create a `config.toml` file in
your Cargo directory with:

```toml
[registries.kellnr]
index = "sparse+https://cargo.surfshield.org/api/v1/crates/"
credential-provider = ["cargo:token"]
```

### Installation Steps

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Run the development server:
   ```bash
   yarn tauri dev
   ```

### Building for Production

To create a production build:

```bash
yarn tauri build
```

This will generate platform-specific installers in the `src-tauri/target/release/bundle` directory.

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

Copyright (c) 2025 Shiroe Dev <shiroedev@proton.me> and the Apache Software Foundation

## Acknowledgements

- [Leaf Proxy](https://github.com/eycorsican/leaf) - The underlying proxy engine
- [Tauri](https://tauri.app/) - For providing a secure, lightweight desktop application framework
- All the amazing open-source libraries that make this project possible
