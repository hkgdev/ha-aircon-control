# Aircon Control - Home Assistant Add-on

A comprehensive web-based aircon control interface packaged as a Home Assistant add-on, featuring zone control, timers, and real-time synchronization.

## Features

### ✅ **Complete Aircon Control**
- **On/Off toggle** - Turn aircon on/off
- **Temperature control** - Set desired temperature with +/- buttons
- **Fan speed** - Low/Med/High settings
- **Mode selection** - Cool/Heat/Fan modes

### ✅ **Advanced Zone Control**
- **Individual zone toggles** - Turn zones on/off
- **Zone percentage sliders** - Control airflow per zone (0-100%)
- **Zone names** - Display custom zone names from server

### ✅ **Smart Timer System**
- **Countdown timers** - Set timers in 15-minute increments (:00, :15, :30, :45)
- **Timer synchronization** - Syncs with server timers automatically
- **Timer status display** - Shows active/inactive timer states
- **Quarter-hour precision** - All timer adjustments snap to quarter hours

### ✅ **Real-time Features**
- **Auto-refresh** - Updates every 3 seconds
- **Server sync** - Stays in sync with aircon controller
- **Mobile responsive** - Works on phones/tablets
- **Error handling** - Graceful failure recovery

## Installation

### Prerequisites
- Home Assistant (any version)
- Raspberry Pi 5 with HAOS (or any HA-supported hardware)
- Aircon controller accessible on your network

### Step 1: Add Repository
1. In Home Assistant, go to **Settings > Add-ons > Add-on Store**
2. Click the **⋮** menu (top right) and select **Repositories**
3. Add this repository URL: `https://github.com/your-username/ha-aircon-control`

### Step 2: Install Add-on
1. Search for "Aircon Control" in the Add-on Store
2. Click **Install**
3. Configure the options (see Configuration section)
4. Click **Start**

### Step 3: Access the App
1. The add-on will appear in your Home Assistant sidebar
2. Click **Aircon Control** to open the interface
3. Configure your aircon settings

## Configuration

### Add-on Configuration
```yaml
aircon_server_ip: "192.168.8.196"  # IP address of your aircon controller
aircon_server_port: 80             # Port of your aircon controller (usually 80)
```

### Finding Your Aircon Controller IP
1. Check your router's admin panel for connected devices
2. Look for a device with "aircon", "HVAC", or similar name
3. The default IP is often `192.168.8.196`

## Usage

### Basic Controls
- **Power**: Click the On/Off toggle
- **Temperature**: Use +/- buttons to adjust desired temperature
- **Fan Speed**: Click Low/Med/High buttons
- **Mode**: Click Cool/Heat/Fan buttons

### Zone Control
- **Zone Toggle**: Click zone name to turn on/off
- **Zone Percentage**: Use -/+ buttons to adjust airflow (0-100%)

### Timer Control
- **Set Timer**: Click timer toggle, adjust minutes with +/- buttons
- **Timer Precision**: All timers snap to quarter hours (:00, :15, :30, :45)
- **Timer Sync**: Automatically syncs with server timers

## Troubleshooting

### Can't Connect to Aircon Controller
1. Verify the IP address is correct
2. Check that the aircon controller is powered on
3. Ensure your HA device can reach the aircon controller network
4. Try accessing the aircon controller directly in a browser

### Timer Not Working
1. Check browser console for JavaScript errors
2. Verify server connection in Network tab
3. Ensure timer values are in quarter-hour increments

### Zones Not Showing
1. Check that zones are configured on the aircon controller
2. Verify server communication
3. Refresh the page

## Technical Details

### Architecture
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: PHP proxy for server communication
- **Container**: Docker with Apache/PHP
- **Integration**: Home Assistant add-on with ingress

### Security
- Runs in isolated Docker container
- No direct access to Home Assistant internals
- Secure communication through HA ingress
- CORS enabled for web app functionality

### Performance
- Lightweight web interface
- Minimal resource usage
- Real-time updates without polling overload
- Mobile-optimized for touch interfaces

## Development

### Local Development
```bash
# Clone repository
git clone https://github.com/your-username/ha-aircon-control.git

# Build Docker image
docker build -t aircon-control .

# Run locally
docker run -p 8099:8099 -e AIRCON_SERVER_IP=192.168.8.196 aircon-control
```

### File Structure
```
ha-addon/
├── config.yaml          # Add-on configuration
├── Dockerfile          # Container build instructions
├── README.md           # This file
└── rootfs/             # Container filesystem
    ├── etc/services.d/apache/run  # Startup script
    └── var/www/html/              # Web application files
        ├── index.html
        ├── script.js
        ├── style.css
        └── proxy.php
```

## Support

### Issues
- Check the [Issues](https://github.com/your-username/ha-aircon-control/issues) page
- Include browser console logs when reporting bugs
- Specify your HA version and hardware

### Feature Requests
- Open an [Issue](https://github.com/your-username/ha-aircon-control/issues) with the "enhancement" label
- Describe the use case and expected behavior

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Changelog

### v1.0.0
- Initial release
- Full aircon control interface
- Zone control and timers
- Home Assistant add-on packaging
- Mobile responsive design