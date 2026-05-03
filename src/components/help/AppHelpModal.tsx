import { BookOpen, Search, X } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import './AppHelpModal.css';

interface ShortcutEntry { keys: string; action: string }

interface HelpSection {
  heading: string;
  intro?: string;
  items?: string[];
  shortcuts?: ShortcutEntry[];
  notes?: string[];
}

interface HelpTopic {
  id: string;
  title: string;
  summary: string;
  sections: HelpSection[];
}

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'start',
    title: 'Getting started',
    summary: 'A tour of the workspaces, the top bar, and the menus you reach for most often.',
    sections: [
      {
        heading: 'Workspaces',
        intro: 'DesignCAD splits work into three workspaces. Use the workspace selector at the top-left to switch.',
        items: [
          'Design — the CAD modeller. Sketch, build solid features, assemble components, and inspect geometry.',
          'Prepare — the slicer. Lay parts out on a build plate, choose printer + material profiles, slice, preview, and export G-code.',
          '3D Printer — the fleet console. Manage printers, watch live cameras, send G-code, view job progress, manage files and macros, and configure each printer.',
        ],
      },
      {
        heading: 'Top bar',
        intro: 'The top bar is the same on every page. From left to right:',
        items: [
          'Workspace selector — jump between Design, Prepare, and 3D Printer.',
          'Ribbon — context-sensitive tools for the active workspace.',
          'File menu — open, save, import, export, and settings-bundle actions.',
          'Quick access bar (right side) — gear (global settings), bell (notifications + site updates), question mark (this help guide), and the theme toggle.',
        ],
      },
      {
        heading: 'Files',
        intro: 'Documents and settings move through the same File menu.',
        items: [
          'Open Design / Save Design — read or write a CAD design file.',
          'Save Settings — write the active workspace section to the current bundle.',
          'Save Settings As — branch into a new bundle so you can keep variations.',
          'Load Settings — restore a saved bundle. Bundles are portable across machines.',
        ],
      },
      {
        heading: 'Theme',
        items: [
          'Light/dark theme toggle lives in the top bar. Your choice persists per browser.',
          'Most colours are driven by CSS custom properties so switching themes is instant.',
        ],
      },
    ],
  },

  {
    id: 'design',
    title: 'Design workspace',
    summary: 'Sketches, solid features, components, the timeline, and viewport navigation.',
    sections: [
      {
        heading: 'Modeling flow',
        intro: 'A typical part starts as a sketch on a plane or planar face, then is built up with solid features.',
        items: [
          'Pick a plane (XY, XZ, YZ) or click an existing flat face, then start a sketch.',
          'Draw 2D geometry, add constraints to lock intent, and dimension to drive size.',
          'Finish the sketch, then create a feature: Extrude, Revolve, Sweep, Loft, Rib, Web, Emboss, or Patch.',
          'Use Modify to refine: Fillet, Chamfer, Shell, Draft, Scale, Combine (boolean), Offset Face, Replace Face, Direct Edit, Split Face/Body.',
          'Use Construct to add reference geometry: planes (offset, angle, tangent, midplane, perpendicular), axes, and points.',
        ],
      },
      {
        heading: 'Components and the tree',
        items: [
          'The component tree on the left lists bodies, sketches, components, and reference geometry.',
          'Right-click any node for show/hide, isolate, rename, duplicate, and delete.',
          'Multi-select with Shift / Ctrl to operate on several nodes at once.',
        ],
      },
      {
        heading: 'Timeline',
        items: [
          'The timeline at the bottom is the feature history in creation order.',
          'Roll back to inspect or edit an earlier feature; the model rebuilds when you return.',
          'Right-click a feature to suppress, delete, or edit the parameters that created it.',
        ],
      },
      {
        heading: 'Viewport navigation',
        items: [
          'Orbit — middle-mouse drag (or right-mouse drag depending on input mapping).',
          'Pan — Shift + middle-mouse drag.',
          'Zoom — mouse wheel, or pinch on a trackpad.',
          'View cube (top-right of the viewport) snaps to standard orthographic views.',
          'Selection filters narrow picks when bodies, faces, edges, sketches, or profiles overlap.',
          'The status bar at the bottom shows the active command and the next expected pick.',
        ],
      },
      {
        heading: 'Inspection',
        intro: 'The Inspect ribbon contains analysis tools that don\'t modify geometry.',
        items: [
          'Measure — distance, angle, position between picks; live preview while picking.',
          'Interference — find overlapping bodies in an assembly.',
          'Curvature / Zebra / Draft / Accessibility — surface analysis overlays.',
          'Section — slice the model with a plane to see internal geometry.',
        ],
      },
    ],
  },

  {
    id: 'sketch',
    title: 'Sketching and dimensions',
    summary: 'Tools, constraints, dimensions, and the exit-and-feature workflow.',
    sections: [
      {
        heading: 'Sketch tools',
        items: [
          'Line — chained line segments. Click to add, Esc to end the chain.',
          'Rectangle — two-corner or center-and-corner.',
          'Circle — center+radius, or 3-point.',
          'Arc — 3-point or center+radius.',
          'Spline — control-point curve.',
          'Project — pull edges from existing geometry into the active sketch.',
          'Fillet / Trim / Offset / Move — refine 2D geometry without leaving the sketch.',
          'Text — typographic profile that closed-fills for engraving or embossing.',
        ],
      },
      {
        heading: 'Constraints',
        intro: 'Constraints lock geometric intent so dimensions become the only driver.',
        items: [
          'Horizontal, Vertical, Parallel, Perpendicular, Tangent, Coincident, Equal, Concentric, Symmetric, Fix.',
          'Apply a constraint by selecting the entities and clicking the constraint button.',
          'Over-constrained sketches turn red. Remove the conflicting constraint or dimension to recover.',
          'Under-constrained entities show in a different colour — they will move freely if a feature drives them.',
        ],
      },
      {
        heading: 'Dimensions',
        items: [
          'Linear, aligned, radial, diameter, and angular dimensions.',
          'Pick points, edges, circles, arcs, or centers depending on the dimension type.',
          'Edit a dimension value to resize the underlying geometry; the sketch updates immediately.',
          'A fully constrained sketch shows in a single colour and is ready for use as a feature profile.',
        ],
      },
      {
        heading: 'Finishing a sketch',
        items: [
          'Finish Sketch returns to the Design ribbon. Closed profiles become available to feature commands.',
          'Open profiles can still be used as paths for Sweep, Pipe, or Rib.',
          'You can re-edit a sketch later from the tree or the timeline; downstream features rebuild on save.',
        ],
      },
    ],
  },

  {
    id: 'prepare',
    title: 'Prepare and slicing',
    summary: 'Build plates, printer + material profiles, slicing, preview, and G-code export.',
    sections: [
      {
        heading: 'Build plate',
        items: [
          'Import meshes (STL/OBJ/3MF) or send geometry into Prepare directly from Design.',
          'Move, Rotate, Scale, and Duplicate parts on the plate. Arrange auto-packs the plate.',
          'Validate flags overhangs, parts off the bed, and parts intersecting the build volume.',
          'Each part is independent — translate one without disturbing the rest.',
        ],
      },
      {
        heading: 'Profiles',
        items: [
          'Printer profile — build volume, kinematics, max feedrates and accelerations.',
          'Material profile — hotend / bed temperatures, fan, retraction, flow.',
          'The active filament profile (set in 3D Printer → Settings → Filaments) seeds the temperatures the slicer commands.',
          'Profiles are independent: you can pair any printer with any material profile.',
        ],
      },
      {
        heading: 'Slicing',
        items: [
          'Slice generates layer-by-layer toolpaths from the plate and the active profile.',
          'Progress shows in the bottom status bar; the workspace stays usable while it runs.',
          'When slicing finishes, the preview opens automatically with the timeline.',
        ],
      },
      {
        heading: 'Preview modes',
        items: [
          'Model — the original geometry overlay.',
          'Travel — non-extruding moves, useful for spotting stringing risks.',
          'Extrusion — only extruding moves, color-coded by feature type (outer/inner wall, infill, top/bottom, bridge, support).',
          'Layers — scrub one layer at a time with the slider.',
          'Estimates show print time and material length once the preview is loaded.',
        ],
      },
      {
        heading: 'Export',
        items: [
          'Export G-code writes a standard text file you can hand to any printer.',
          'OrcaSlicer-style ;TYPE: markers are emitted alongside the existing comments so third-party tools (Octoprint plugins, Klipper preview) parse correctly.',
        ],
      },
    ],
  },

  {
    id: 'printer',
    title: '3D Printer workspace',
    summary: 'Fleet view, monitor, and per-printer tabs for everything from console to height maps.',
    sections: [
      {
        heading: 'Printers page',
        items: [
          'Use Printers in the 3D Printer ribbon to see all saved printers and their camera previews.',
          'Each printer keeps its own connection config, preferences, filament profiles, and camera settings.',
          'Click Monitor on a card to open that printer\'s dashboard without losing the fleet view.',
        ],
      },
      {
        heading: 'Per-printer tabs',
        intro: 'Once a printer is selected, the side rail exposes:',
        items: [
          'Dashboard — heaters, axes, current job, and quick controls.',
          'Camera — live feed (works with the per-printer camera config).',
          'Status / Console — board status and a G-code console with command history.',
          'Job — file, layer, time-remaining details for the active print.',
          'History / Analytics — past prints and aggregated stats.',
          'Files — browse, upload, download, delete files on the printer.',
          'Filaments — stock library on the board (separate from the app-side Filament Profiles).',
          'Macros — saved G-code macros you can run with one click.',
          'Height Map — bed mesh probes and visualisation.',
          'Model / Config — object-model browser and config.g editor (Duet).',
          'Network / Plugins — board network status and DSF plugin manager (Duet+SBC).',
          'Settings — connection, presets, behaviour, safety, filaments, etc.',
        ],
      },
      {
        heading: 'Connection lifecycle',
        items: [
          'Test Connection probes the board without committing; it reads firmware identity and returns.',
          'Connect opens the persistent session: polling, websocket, or serial reader depending on transport.',
          'Disconnect closes the session cleanly; auto-reconnect (when enabled) takes over on transient drops.',
        ],
      },
    ],
  },

  {
    id: 'connection',
    title: 'Connecting your printer',
    summary: 'Pick the right transport, fill the right fields, and verify with Test Connection.',
    sections: [
      {
        heading: 'Pick a connection type',
        intro: 'Settings → Connection has a transport toggle:',
        items: [
          'Network — talk to the board over Wi-Fi / Ethernet using the firmware\'s HTTP API.',
          'USB — talk to the board over Web Serial. Pairs the browser directly with a USB-connected printer (no network needed).',
        ],
      },
      {
        heading: 'Printer presets',
        intro: 'A preset patches the connection + machine config in one click. Pick Custom to leave settings alone.',
        items: [
          'Creality Ender 3 / V2 — Marlin, 220×220×250 (V2: 235×235×250), 115200 baud.',
          'Voron 2.4 (350) — Klipper, 350×350×350, CoreXY, 250000 baud.',
          'Prusa MK3S+ / MK4 — Marlin, 250×210×210/220, 115200 baud.',
          'Bambu A1 — CoreXY, 256×256×256.',
          'Duet 3 MB6HC — RepRapFirmware reference profile.',
          'FLSUN Q5 Delta — Marlin, 200×200×200, delta kinematics, 250000 baud.',
        ],
      },
      {
        heading: 'Network mode fields',
        items: [
          'Hostname / IP — the board address. Use either an IP (192.168.1.100) or a .local name (myprinter.local). Leave the http:// prefix off.',
          'Board Password — only required if the firmware has one set (RepRapFirmware uses M551 to set it).',
          'Connection Mode (Duet only) — Standalone uses the board\'s built-in HTTP/WS; SBC uses DuetSoftwareFramework on a Raspberry Pi running alongside the board.',
        ],
      },
      {
        heading: 'Auto-reconnect',
        items: [
          'When on, the app retries on the configured interval if the connection drops.',
          'Tune Reconnect Interval and Max Retries underneath.',
          'Auto-reconnect works for both Network and USB transports.',
        ],
      },
    ],
  },

  {
    id: 'usb',
    title: 'USB connection (Web Serial)',
    summary: 'Plug the printer into the computer running DesignCAD. No network required.',
    sections: [
      {
        heading: 'Browser support',
        items: [
          'Web Serial works in Chromium-based browsers (Chrome, Edge, Opera, Brave, Arc) over HTTPS or http://localhost.',
          'Firefox and Safari do not implement Web Serial. The Connection tab will warn you when the API is unavailable.',
        ],
      },
      {
        heading: 'Picking a port',
        intro: 'Browsers only expose USB ports the user explicitly grants. The first time you click Select USB Port, the browser shows a chooser; pick the one your printer is on.',
        items: [
          'After the grant, the app remembers the port across sessions by USB vendor / product ID.',
          'If you swap printers, click Change Port and pick the new one. Clear releases the saved permission entirely.',
          'Baud rate must match the firmware. Marlin defaults to 115200 or 250000; RepRapFirmware uses 115200; Klipper-USB usually 250000.',
        ],
      },
      {
        heading: 'Diagnostic console',
        intro: 'Below the port row, the Diagnostic Console lets you open a temporary connection to verify the port and baud before committing to Connect.',
        items: [
          'Click Open Port to attach. The console logs system events and any banner the firmware prints.',
          'Type a G-code in the input bar and press Enter. > shows what you sent, < shows the reply, ! marks errors, · marks system messages.',
          'Useful first commands: M115 (firmware identity), M105 (temperatures), M119 (endstop status).',
          'Close Port releases the connection so the main Connect can claim it.',
        ],
      },
      {
        heading: 'Caveats',
        items: [
          'Browser permissions are origin-scoped: a port you granted on http://localhost:5173 won\'t be visible at a different port.',
          'Object-model based features (file lists, the live dashboard graphs) are network-only — USB mode focuses on G-code transport.',
          'Closing the browser tab closes the serial connection. Reopen the tab and Connect again.',
        ],
      },
    ],
  },

  {
    id: 'camera',
    title: 'Camera setup',
    summary: 'Wire a network or USB camera to a printer card, the dashboard, and the job view.',
    sections: [
      {
        heading: 'Camera source',
        items: [
          'Network — IP / Wi-Fi camera reachable over HTTP / RTSP.',
          'Browser USB — webcam plugged into the computer viewing the app. Browser asks for camera permission.',
          'Server USB — webcam plugged into the host running DesignCAD on (e.g.) an Orange Pi.',
        ],
      },
      {
        heading: 'Discovery',
        items: [
          'Enter just the camera IP / hostname in Camera Address / IP, then click Test Connection.',
          'The app probes common MJPEG and snapshot paths and fills Sub Stream URL when one works.',
          'Pick Amcrest / Dahua-compatible paths in Camera Path Preset to bias the probe toward those defaults.',
          'Credentials are optional and only used when the camera requires HTTP basic auth.',
        ],
      },
      {
        heading: 'Streams',
        items: [
          'Sub stream — the MJPEG feed used in dashboard previews and the printer card.',
          'Main stream — high-resolution RTSP/HLS feed used by the standalone Camera page.',
          'Browsers cannot play RTSP directly; the app bridges RTSP to HLS where supported.',
        ],
      },
      {
        heading: 'Saving',
        items: [
          'Save Camera Settings persists the discovered URLs and credentials per printer.',
          'If the browser can open a stream URL but DesignCAD cannot, paste the same URL into Sub Stream URL and re-test.',
        ],
      },
    ],
  },

  {
    id: 'filaments',
    title: 'Filament profiles',
    summary: 'Per-printer profiles that store the temps, fan, retraction, and flow you reach for most often.',
    sections: [
      {
        heading: 'What a profile holds',
        items: [
          'Material — PLA, PETG, ABS, TPU, PC, Nylon, ASA, or Other.',
          'Color — used as a swatch on the dashboard and the printer card.',
          'Nozzle / bed / chamber temperature setpoints.',
          'Fan speed (%), retraction distance (mm), retraction speed (mm/s), and flow (%).',
          'Free-text notes — drying time, brand, batch, anything else worth remembering.',
        ],
      },
      {
        heading: 'Material defaults',
        intro: 'Picking a material seeds typical temps and retraction so you don\'t have to start from scratch:',
        items: [
          'PLA — 210/60, fan 100%, retraction 0.8 mm.',
          'PETG — 235/75, fan 50%, retraction 1.2 mm.',
          'ABS — 245/100, chamber 45, fan 20%, retraction 1.0 mm.',
          'TPU — 225/50, fan 60%, retraction 0.4 mm.',
          'PC — 280/110, chamber 60, fan off, retraction 1.0 mm.',
        ],
      },
      {
        heading: 'Default profile',
        items: [
          'The starred profile loads by default when changing filament from the dashboard.',
          'Click the star on any profile card to make it the default.',
          'Two starter profiles (Generic PLA and Generic PETG) ship out of the box; replace or rename them as needed.',
        ],
      },
    ],
  },

  {
    id: 'safety',
    title: 'Safety limits',
    summary: 'Guard rails on temperature and emergency commands.',
    sections: [
      {
        heading: 'Temperature caps',
        intro: 'Settings → Behaviour → Safety Limits hard-caps setpoints sent to the firmware.',
        items: [
          'Max Nozzle Temperature — defaults to 280 °C; raise it for high-temp hotends.',
          'Max Bed Temperature — defaults to 120 °C.',
          'Max Chamber Temperature — defaults to 60 °C.',
          'Setpoints above the cap are blocked before they leave the app.',
        ],
      },
      {
        heading: 'High-temperature warning',
        items: [
          'Toggle "Warn before high-temperature setpoints" to require a confirm above a soft threshold.',
          'Adjust the threshold below the toggle. Defaults to 250 °C — anything at or above that needs confirmation.',
          'Useful when you frequently print PLA but occasionally swap to ABS / PC.',
        ],
      },
      {
        heading: 'Runaway and E-stop',
        items: [
          '"Surface thermal-runaway alerts" elevates firmware-reported runaway / heater-fault events to a high-priority toast.',
          '"Confirm emergency stop" requires a confirm dialog before sending M112 / E-stop, which prevents accidental clicks.',
          'Both are recommended for shared shop printers.',
        ],
      },
    ],
  },

  {
    id: 'files',
    title: 'Files and settings bundles',
    summary: 'Documents, settings, and how they\'re saved.',
    sections: [
      {
        heading: 'Documents',
        items: [
          'Open Design / Save Design read and write CAD design files in the Design workspace.',
          'Documents include the feature timeline; rolling back and saving keeps history intact.',
        ],
      },
      {
        heading: 'Settings bundles',
        items: [
          'Save Settings writes the active workspace section to the current bundle.',
          'Save Settings As branches into a new bundle so variations can coexist.',
          'Load Settings restores a saved bundle. Bundles travel cleanly across machines and OSes.',
          'Settings → Backup also exports/imports the entire app state as JSON when you want a portable archive.',
        ],
      },
      {
        heading: 'Per-printer vs global',
        items: [
          'Each printer has its own connection, preferences, filament profiles, and camera settings.',
          'Global preferences (theme, units, notifications) live under the gear in the top bar.',
        ],
      },
    ],
  },

  {
    id: 'updates',
    title: 'Notifications and updates',
    summary: 'The bell aggregates printer alerts and site update status.',
    sections: [
      {
        heading: 'Notifications',
        items: [
          'Printer messages, status changes, heater faults, and connection changes appear as alerts.',
          'A dot on the bell means there\'s an unread alert or a pending update.',
          'Severity (info / warning / error) is filtered by Settings → Notifications → Minimum Severity.',
          'Toast duration and beep / sound preferences live in the same panel.',
        ],
      },
      {
        heading: 'Site updates',
        items: [
          'The bell also shows site update status so update controls don\'t float over the workspace.',
          'Check refreshes update status from the server.',
          'Install applies an available release — only enabled when an asset is ready.',
          'The updater key is required only on protected deployments; most installs leave it blank.',
        ],
      },
    ],
  },

  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    summary: 'A consolidated list of the keys the menus assign in each workspace.',
    sections: [
      {
        heading: 'Design — Create',
        shortcuts: [
          { keys: 'S', action: 'Sketch' },
          { keys: 'E', action: 'Extrude' },
          { keys: 'H', action: 'Hole' },
        ],
      },
      {
        heading: 'Design — Modify',
        shortcuts: [
          { keys: 'Q', action: 'Press Pull' },
          { keys: 'F', action: 'Fillet' },
          { keys: 'M', action: 'Move / Copy' },
          { keys: 'Del', action: 'Delete' },
          { keys: 'A', action: 'Appearance' },
          { keys: 'Ctrl+B', action: 'Change Parameters' },
        ],
      },
      {
        heading: 'Design — Assemble',
        shortcuts: [
          { keys: 'J', action: 'Joint' },
          { keys: 'Shift+J', action: 'As-Built Joint' },
        ],
      },
      {
        heading: 'Design — Inspect',
        shortcuts: [
          { keys: 'I', action: 'Measure' },
          { keys: 'Shift+N', action: 'Display Component Colors' },
        ],
      },
      {
        heading: 'Sketch — Selection',
        shortcuts: [
          { keys: '1', action: 'Window select' },
          { keys: '2', action: 'Freeform select' },
          { keys: '3', action: 'Paint select' },
        ],
      },
      {
        heading: 'Sketch — Tools',
        shortcuts: [
          { keys: 'L', action: 'Line' },
          { keys: 'R', action: 'Rectangle' },
          { keys: 'C', action: 'Circle' },
          { keys: 'P', action: 'Project' },
          { keys: 'F', action: 'Sketch Fillet' },
          { keys: 'T', action: 'Trim' },
          { keys: 'O', action: 'Offset' },
          { keys: 'M', action: 'Move' },
          { keys: 'D', action: 'Dimension' },
        ],
      },
      {
        heading: 'Universal',
        intro: 'Standard browser shortcuts apply on top of the workspace bindings:',
        shortcuts: [
          { keys: 'Esc', action: 'Cancel the current command / close the open dialog' },
          { keys: 'Ctrl+Z', action: 'Undo' },
          { keys: 'Ctrl+Y', action: 'Redo (Ctrl+Shift+Z also works)' },
          { keys: 'Ctrl+S', action: 'Save (browser fallback if the workspace doesn\'t intercept)' },
          { keys: 'F11', action: 'Toggle browser fullscreen' },
        ],
      },
    ],
  },

  {
    id: 'tips',
    title: 'Tips and tricks',
    summary: 'Habits that pay off on real projects.',
    sections: [
      {
        heading: 'Modeling',
        items: [
          'Constrain sketches fully before adding features. Under-constrained sketches that drive features are the #1 source of ghost-rebuild surprises.',
          'Name bodies and components as you go. The tree gets unreadable fast otherwise.',
          'Use Construct planes liberally — they\'re cheap and they make later sketches easier to place.',
          'Roll back the timeline before doing exploratory edits; you can always roll forward without losing work.',
        ],
      },
      {
        heading: 'Slicing',
        items: [
          'Pick a printer preset before drawing — build volume + kinematics drive default constraints in Prepare.',
          'Use the layer slider in preview mode to scrub critical layers (first layer, transitions, bridging).',
          'Save settings bundles per filament so you don\'t lose temperature tuning when switching materials.',
        ],
      },
      {
        heading: 'Fleet',
        items: [
          'Star a default filament profile per printer — the dashboard\'s change-filament action picks it up.',
          'Set max-temp safety caps before connecting a new printer; prevents accidents during board commissioning.',
          'For USB printers, open the diagnostic console first and try M115 — that confirms baud / port / power are all fine before committing.',
        ],
      },
    ],
  },

  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    summary: 'First-pass fixes when something doesn\'t work.',
    sections: [
      {
        heading: 'General',
        items: [
          'Reload the tab if a dev build changed while a page was already open.',
          'Check the bottom status bar for command hints before assuming a tool is stuck.',
          'If a button is disabled, the current selection or workspace likely doesn\'t meet that tool\'s requirement — read the tooltip.',
          'Settings → Backup → Export gives a copyable snapshot to help diagnose state-related bugs.',
        ],
      },
      {
        heading: 'Network printer won\'t connect',
        items: [
          'Open the board\'s web UI (Duet Web Control / Mainsail / Fluidd) directly in a browser tab and confirm it loads.',
          'If the IP works but DesignCAD says "Connection refused", clear the password field and try again — boards return err=2 when the password is wrong.',
          'Reach the board over .local? Some networks block multicast DNS; try the raw IP.',
          'For Duet SBC mode, confirm DSF is running on the Pi and reachable on port 80 + 8181.',
        ],
      },
      {
        heading: 'USB printer won\'t connect',
        items: [
          'The browser must be Chromium-based and the page must be on HTTPS or http://localhost.',
          'Click Select USB Port and pick the device — the browser requires that grant per-origin per-session.',
          'If "Open Port" fails, another app probably holds the port (close OctoPrint / PrusaSlicer / Cura / pronterface).',
          'Try a different baud rate. Marlin firmware compiled with BAUDRATE 250000 won\'t answer at 115200 and vice versa.',
          'Some 8-bit boards (Mega 2560 with CH340) reset on port open — wait the 1.5 s the app holds before sending; that\'s normal.',
        ],
      },
      {
        heading: 'Camera',
        items: [
          'Confirm the camera URL opens in the browser first; if it doesn\'t, no app fix will help.',
          'Test the same base IP in Camera Address / IP, then run Test Connection — the probe fills Sub Stream URL when it finds a working path.',
          'For Amcrest / Dahua, click Fill Amcrest Defaults to seed the vendor-specific paths.',
          'If the test passes but the dashboard preview is empty, save the camera settings — preview reads from saved values, not draft input.',
        ],
      },
      {
        heading: 'Slice / preview',
        items: [
          'A slice that fails on a complex part is usually a non-manifold mesh — repair the model in Design before sending it to Prepare.',
          'Preview Travel mode shows long jumps; if the part is full of them, retraction or sequence settings are off.',
          'If estimates look wildly wrong, the active material profile likely has a flow / speed mismatch.',
        ],
      },
    ],
  },
];

function renderShortcutKeys(keys: string) {
  return keys.split('+').map((key, idx, arr) => (
    <Fragment key={`${key}-${idx}`}>
      <kbd>{key}</kbd>
      {idx < arr.length - 1 && <span className="app-help-kbd-sep">+</span>}
    </Fragment>
  ));
}

export function AppHelpModal({ onClose }: { onClose: () => void }) {
  const [activeTopicId, setActiveTopicId] = useState(HELP_TOPICS[0].id);
  const [query, setQuery] = useState('');

  const filteredTopics = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return HELP_TOPICS;
    return HELP_TOPICS.filter((topic) => {
      const haystack = [
        topic.title,
        topic.summary,
        ...topic.sections.flatMap((section) => [
          section.heading,
          section.intro ?? '',
          ...(section.items ?? []),
          ...(section.shortcuts ?? []).flatMap((s) => [s.keys, s.action]),
          ...(section.notes ?? []),
        ]),
      ].join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }, [query]);

  const activeTopic = filteredTopics.find((topic) => topic.id === activeTopicId) ?? filteredTopics[0] ?? HELP_TOPICS[0];

  return (
    <div className="app-help-overlay" role="presentation" onMouseDown={onClose}>
      <div className="app-help-modal" role="dialog" aria-modal="true" aria-label="Help documentation" onMouseDown={(event) => event.stopPropagation()}>
        <header className="app-help-header">
          <div className="app-help-title">
            <BookOpen size={18} />
            <div>
              <h2>DesignCAD Help</h2>
              <p>Reference guide for modelling, slicing, printer fleets, cameras, USB connections, and updates.</p>
            </div>
          </div>
          <button className="app-help-close" onClick={onClose} aria-label="Close help">
            <X size={16} />
          </button>
        </header>

        <div className="app-help-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search help"
            autoFocus
          />
        </div>

        <div className="app-help-body">
          <nav className="app-help-nav" aria-label="Help topics">
            {filteredTopics.map((topic) => (
              <button
                key={topic.id}
                className={`app-help-topic-btn${topic.id === activeTopic.id ? ' active' : ''}`}
                onClick={() => setActiveTopicId(topic.id)}
              >
                <span>{topic.title}</span>
                <small>{topic.summary}</small>
              </button>
            ))}
            {filteredTopics.length === 0 && (
              <div className="app-help-empty">No help topics match that search.</div>
            )}
          </nav>

          <article className="app-help-content">
            <h3>{activeTopic.title}</h3>
            <p className="app-help-summary">{activeTopic.summary}</p>
            {activeTopic.sections.map((section) => (
              <section key={section.heading} className="app-help-section">
                <h4>{section.heading}</h4>
                {section.intro && <p className="app-help-intro">{section.intro}</p>}
                {section.items && section.items.length > 0 && (
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.shortcuts && section.shortcuts.length > 0 && (
                  <table className="app-help-shortcuts">
                    <thead>
                      <tr>
                        <th>Keys</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.shortcuts.map((s) => (
                        <tr key={`${s.keys}-${s.action}`}>
                          <td>{renderShortcutKeys(s.keys)}</td>
                          <td>{s.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {section.notes && section.notes.length > 0 && (
                  <div className="app-help-notes">
                    {section.notes.map((note) => (
                      <p key={note} className="app-help-note">{note}</p>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
}
