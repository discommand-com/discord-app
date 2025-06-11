# discord-app

A modern Discord.js app template supporting locales, events, and slash commands.

---

## Features

- **Easy command and event registration**: Just drop files in the right folders.
- **Locale support**: Add or edit language files in `src/locales/`.
- **Graceful shutdown and error handling**.
- **Winston-based logging**.
- **Environment-based configuration**.
- **Systemd service template for production deployment**.

---

## Getting Started

### 1. Fork this repository

It's recommended to [fork](https://github.com/rpurinton/discord-app/fork) this repo to your own GitHub account before making changes. This allows you to pull upstream updates easily.

### 2. Clone your fork

```sh
# Replace <your-username> and <your-repo> with your GitHub info
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 3. Rename for your project

- Rename `discord-app.mjs` to your app's main file name (e.g., `myapp.mjs`).
- Rename `discord-app.service` to match your app (e.g., `myapp.service`).
- Update `package.json` with your own project name, description, author, and repository info.

### 4. Install dependencies

```sh
npm install
```

### 5. Configure environment

Copy `.env.example` to `.env` if it exists, or create a `.env` file with your settings:

```sh
cp .env.example .env
```

Edit the `.env` file:

```env
DISCORD_TOKEN=your-app-token
DISCORD_CLIENT_ID=your-client-id
LOG_LEVEL=info
```

### 6. Run the app

```sh
node discord-app.mjs
# or, if renamed:
node myapp.mjs
```

---

## Customization

### Adding Commands

- Place a JSON definition (e.g., `help.json`) in `src/commands/`.
- Add a handler file with the same name and `.mjs` extension (e.g., `help.mjs`) in the same folder.
- The handler should export a default async function.

Example: `src/commands/ping.json`

```json
{
  "name": "ping",
  "description": "Replies with Pong!"
}
```

Example: `src/commands/ping.mjs`

```js
export default async (interaction) => {
  await interaction.reply('Pong!');
};
```

### Adding Events

- Place a file named after the Discord event (e.g., `messageCreate.mjs`) in `src/events/`.
- Export a default function that takes the event arguments.

Example: `src/events/messageCreate.mjs`

```js
export default (message) => {
  if (message.content === '!hello') {
    message.reply('Hello!');
  }
};
```

### Locales

- Add or edit JSON files in `src/locales/` (e.g., `en-US.json`, `fr.json`).
- Each file should export a flat object of key-value pairs.
- The app loads all locale files at startup and makes them available globally.

### Logging

- Logging is handled by Winston.
- Set `LOG_LEVEL` in your `.env` (`debug`, `info`, `warn`, `error`).

### Error Handling & Shutdown

- Uncaught exceptions and rejections are logged.
- Graceful shutdown on `SIGTERM`, `SIGINT`, or `SIGHUP`.
- The app will attempt to destroy the Discord client cleanly before exiting.

---

## Systemd Service Setup

To run your app as a service on Linux, use the provided `discord-app.service` file.

**Update the paths and names to match your project.**

Example `discord-app.service`:

```ini
[Unit]
Description=discord-app
After=network-online.target
Wants=network-online.target
StartLimitBurst=3
StartLimitIntervalSec=60

[Service]
User=appuser
Group=appgroup
RestartSec=5
Restart=on-failure
WorkingDirectory=/opt/discord-app
ExecStart=/usr/bin/node /opt/discord-app/discord-app.mjs
EnvironmentFile=/opt/discord-app/.env

[Install]
WantedBy=multi-user.target
```

**Instructions:**

1. Copy and rename the service file:

   ```sh
   sudo cp discord-app.service /etc/systemd/system/myapp.service
   ```

2. Edit the service file:
   - Set `WorkingDirectory` and `ExecStart` to your app's location and main file (use absolute paths).
   - Set `EnvironmentFile` to your `.env` location.
   - Change `User` and `Group` to a non-root user for security.

3. Reload systemd and enable the service:

   ```sh
   sudo systemctl daemon-reload
   sudo systemctl enable myapp.service
   sudo systemctl start myapp.service
   sudo systemctl status myapp.service
   ```

---

## Folder Structure

```text
src/
  commands/    # Command definitions and handlers
  events/      # Event handlers
  locales/     # Locale JSON files
  *.mjs       # Core logic (commands, events, logging, etc.)
```

---

## Best Practices & Tips

- **Keep your app token secret!** Never commit your `.env` file or token to version control.
- **Use a dedicated, non-root user** for running your app in production.
- **Regularly pull upstream changes** if you want to keep your fork up to date.
- **Write tests** for your command and event handlers if your app grows in complexity.
- **Check Discord.js documentation** for new features and event names: [https://discord.js.org/](https://discord.js.org/)

---

## License

MIT

## Developer Support

Email: <russell.purinton@gmail.com>
Discord: laozi101
