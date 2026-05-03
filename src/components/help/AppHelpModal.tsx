import { BookOpen, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import './AppHelpModal.css';

interface HelpTopic {
  id: string;
  title: string;
  summary: string;
  sections: Array<{
    heading: string;
    items: string[];
  }>;
}

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'start',
    title: 'Getting started',
    summary: 'Move between Design, Prepare, and 3D Printer from the workspace selector.',
    sections: [
      {
        heading: 'Workspaces',
        items: [
          'Design is for CAD modeling, sketches, bodies, features, assemblies, and inspection tools.',
          'Prepare is for build plates, print profiles, slicing, previewing toolpaths, and exporting G-code.',
          '3D Printer is for printer fleet monitoring, Duet connection settings, files, console, camera feeds, and live jobs.',
        ],
      },
      {
        heading: 'Top bar',
        items: [
          'File opens document and settings bundle actions.',
          'The bell opens notifications and site update status.',
          'The gear opens global app settings.',
          'The question mark opens this help guide from any page.',
        ],
      },
    ],
  },
  {
    id: 'design',
    title: 'Design workspace',
    summary: 'Create sketches, add solid features, inspect geometry, and manage components.',
    sections: [
      {
        heading: 'Modeling flow',
        items: [
          'Start with a sketch on a plane or planar face, then use solid tools such as Extrude, Revolve, Sweep, Loft, Rib, or Patch.',
          'Use the component tree to select, rename, show, hide, and manage bodies, sketches, and components.',
          'Use the timeline to inspect feature history and understand the order that created the model.',
        ],
      },
      {
        heading: 'Navigation',
        items: [
          'Use the view cube and mouse controls to orbit, pan, and zoom around the model.',
          'Selection filters help narrow picks when bodies, faces, edges, sketches, or profiles overlap.',
          'Status messages at the bottom describe the active command and the next expected pick.',
        ],
      },
    ],
  },
  {
    id: 'sketch',
    title: 'Sketching and dimensions',
    summary: 'Draw precise 2D geometry, constrain it, and drive it with dimensions.',
    sections: [
      {
        heading: 'Sketch tools',
        items: [
          'Use Line, Rectangle, Circle, Arc, Spline, Text, and Project tools from the Sketch ribbon.',
          'Add constraints to lock intent: horizontal, vertical, parallel, perpendicular, tangent, coincident, equal, and more.',
          'Finish Sketch returns to the Design ribbon and makes closed profiles available for features.',
        ],
      },
      {
        heading: 'Dimensions',
        items: [
          'Use linear, aligned, radial, diameter, and angular dimensions to control sketch size.',
          'Select points, edges, circles, arcs, or centers depending on the dimension type.',
          'Edit an existing dimension value to resize the underlying sketch geometry.',
        ],
      },
    ],
  },
  {
    id: 'prepare',
    title: 'Prepare and slicing',
    summary: 'Arrange models, choose profiles, slice, preview, and export G-code.',
    sections: [
      {
        heading: 'Build plate',
        items: [
          'Import printable meshes or send design geometry into the Prepare workspace.',
          'Move, rotate, scale, duplicate, arrange, and validate models against the active printer volume.',
          'Use profiles for printer, material, and print settings so repeated jobs stay consistent.',
        ],
      },
      {
        heading: 'Slicing',
        items: [
          'Slice generates toolpaths from the active plate and profile settings.',
          'Preview modes show the model, travel moves, extrusion paths, layers, time, and material estimates.',
          'Export G-code when the preview looks correct for your machine and material.',
        ],
      },
    ],
  },
  {
    id: 'printer',
    title: 'Printer fleet',
    summary: 'Manage printers, connect to Duet boards, monitor jobs, and open live camera feeds.',
    sections: [
      {
        heading: 'Printers page',
        items: [
          'Use Printers in the 3D Printer ribbon to see all saved printers and their camera cards.',
          'Each printer keeps its own hostname, connection mode, preferences, and camera settings.',
          'Monitor opens the selected printer dashboard without losing the fleet view setup.',
        ],
      },
      {
        heading: 'Printer settings',
        items: [
          'Connection stores the Duet board hostname or IP address and optional board password.',
          'Camera stores the camera address, discovered stream URL, and optional camera username/password.',
          'Firmware and PanelDue tabs handle update checks and board-specific maintenance tools.',
        ],
      },
    ],
  },
  {
    id: 'camera',
    title: 'Camera setup',
    summary: 'Add a Wi-Fi or IP camera feed to a printer card and job view.',
    sections: [
      {
        heading: 'Discovery',
        items: [
          'Enter only the camera IP or hostname in Camera Address / IP, then click Test Connection.',
          'The app tries common MJPEG and snapshot paths and fills Stream URL when one works.',
          'For Amcrest and similar cameras, the app can use the local camera proxy for authenticated MJPEG streams.',
        ],
      },
      {
        heading: 'Credentials',
        items: [
          'Use Camera Username and Camera Password only for the camera account, not the Duet board account.',
          'Save Camera Settings after a successful test so the fleet dashboard and job view use the discovered feed.',
          'If the browser can open a camera URL but the app cannot, test with the same URL in Stream URL and check credentials.',
        ],
      },
    ],
  },
  {
    id: 'files',
    title: 'Files and settings',
    summary: 'Open/save designs and move settings between workspaces.',
    sections: [
      {
        heading: 'File menu',
        items: [
          'Open Design and Save Design handle CAD design files in the Design workspace.',
          'Load Settings imports saved app settings bundles.',
          'Save Settings writes the current workspace settings section, while Save Settings As creates a new bundle.',
        ],
      },
      {
        heading: 'Global settings',
        items: [
          'The gear menu contains app-wide settings and settings-bundle shortcuts.',
          'Theme can be changed from the top bar or Global Settings menu.',
          'Printer-specific preferences still live in each printer Settings page.',
        ],
      },
    ],
  },
  {
    id: 'updates',
    title: 'Notifications and updates',
    summary: 'Use the bell for alerts, printer notifications, and site update status.',
    sections: [
      {
        heading: 'Notifications',
        items: [
          'Printer messages, status changes, heater faults, and connection changes appear as alerts.',
          'The bell also contains site update status so update controls do not float over the workspace.',
          'A dot on the bell means there is an update or alert that needs attention.',
        ],
      },
      {
        heading: 'Updates',
        items: [
          'Check refreshes update status from the server.',
          'Install is enabled only when a release asset is available.',
          'The updater key is required only for protected update installs on configured deployments.',
        ],
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    summary: 'Common fixes when a view, printer, camera, or slice does not behave as expected.',
    sections: [
      {
        heading: 'General',
        items: [
          'Reload the app if a dev build changed while a page was already open.',
          'Check the status bar for command hints before assuming a tool is stuck.',
          'If a button is disabled, the current workspace or selection likely does not meet that tool requirement.',
        ],
      },
      {
        heading: 'Printer and camera',
        items: [
          'Confirm the Duet board IP separately from the camera IP.',
          'For camera feeds, verify the URL opens in the browser, then use the same base IP in Camera Address / IP.',
          'If camera testing fails, try username/password, subtype 0 vs subtype 1, or a snapshot URL.',
        ],
      },
    ],
  },
];

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
        ...topic.sections.flatMap((section) => [section.heading, ...section.items]),
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
              <p>Reference guide for modeling, slicing, printer setup, cameras, and updates.</p>
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
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
}
