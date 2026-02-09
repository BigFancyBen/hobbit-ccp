```space-style
/* Hobbit Atari Theme — pixel-art dark theme matching the React SPA */
/* priority: 10 */
/* Colors derived from packages/ui/src/styles/theme.css oklch palette */

@import url("https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap");

/* Force dark mode */
html[data-theme="dark"] {
  /* Core UI — primary oklch(0.5 0.2 60) = #ae3500 */
  --ui-accent-color: #ae3500;
  --ui-accent-text-color: #fff;
  --ui-accent-contrast-color: #d56f2c;
  --highlight-color: rgba(174, 53, 0, 0.3);

  /* Root — background oklch(0.2 0 0) = #161616 */
  --root-background-color: #161616;
  --root-color: #dedede;

  /* Top bar */
  --top-background-color: #0f0f0f;
  --top-color: #dedede;
  --top-border-color: #ae3500;

  /* Panels */
  --panel-background-color: #0f0f0f;
  --panel-border-color: #3a3a3a;
  --bhs-background-color: #0f0f0f;
  --bhs-border-color: #3a3a3a;

  /* Links — brighter accent for readability */
  --link-color: #d05500;
  --link-missing-color: #b50000;
  --link-invalid-color: #b50000;

  /* Meta */
  --meta-color: #9e9e9e;
  --meta-subtle-color: #555;
  --subtle-color: #666;
  --subtle-background-color: #2e2e2e;

  /* Modal */
  --modal-color: #dedede;
  --modal-background-color: #0f0f0f;
  --modal-border-color: #ae3500;
  --modal-header-label-color: #d05500;
  --modal-help-background-color: #1a1a1a;
  --modal-help-color: #9e9e9e;
  --modal-selected-option-background-color: #ae3500;
  --modal-selected-option-color: #fff;
  --modal-hint-background-color: #3a3a3a;
  --modal-hint-color: #dedede;
  --modal-hint-inactive-background-color: #1a1a1a;
  --modal-hint-inactive-color: #666;
  --modal-description-color: #9e9e9e;
  --modal-selected-option-description-color: #dedede;

  /* Buttons */
  --button-background-color: #3a3a3a;
  --button-hover-background-color: #484848;
  --button-color: #dedede;
  --button-border-color: #484848;
  --primary-button-background-color: #ae3500;
  --primary-button-hover-background-color: #c04600;
  --primary-button-color: #fff;
  --primary-button-border-color: #d05500;
  --action-button-background-color: transparent;
  --action-button-color: #9e9e9e;
  --action-button-hover-color: #dedede;
  --action-button-active-color: #d05500;

  /* Notifications */
  --notifications-background-color: #0f0f0f;
  --notifications-border-color: #3a3a3a;
  --notification-info-background-color: #08152c;
  --notification-error-background-color: #290b0c;

  /* Text fields */
  --text-field-background-color: #2e2e2e;

  /* Progress */
  --progress-background-color: #2e2e2e;
  --progress-sync-color: #ae3500;
  --progress-index-color: #d05500;

  /* Editor */
  --editor-caret-color: #d05500;
  --editor-selection-background-color: rgba(174, 53, 0, 0.25);
  --editor-heading-color: #d05500;
  --editor-heading-meta-color: #555;
  --editor-ruler-color: #3a3a3a;
  --editor-list-bullet-color: #ae3500;

  /* Editor: links */
  --editor-naked-url-color: #ae3500;
  --editor-link-color: #d05500;
  --editor-link-url-color: #9e9e9e;
  --editor-link-meta-color: #555;
  --editor-wiki-link-page-background-color: rgba(174, 53, 0, 0.15);
  --editor-wiki-link-page-color: #d05500;
  --editor-wiki-link-page-missing-color: #b50000;
  --editor-wiki-link-page-invalid-color: #b50000;
  --editor-wiki-link-color: #666;

  /* Editor: code / syntax */
  --editor-code-color: #dedede;
  --editor-code-background-color: #0c0c0c;
  --editor-code-comment-color: #666;
  --editor-code-variable-color: #c967ac;
  --editor-code-typename-color: #5194d5;
  --editor-code-string-color: #53a367;
  --editor-code-number-color: #bf6600;
  --editor-code-operator-color: #d05500;
  --editor-code-atom-color: #bf6600;
  --editor-code-info-color: #9e9e9e;

  /* Editor: hashtags */
  --editor-hashtag-background-color: rgba(174, 53, 0, 0.2);
  --editor-hashtag-color: #d05500;
  --editor-hashtag-border-color: #ae3500;

  /* Editor: directives */
  --editor-directive-mark-color: #555;
  --editor-directive-color: #9e9e9e;
  --editor-directive-background-color: #0c0c0c;

  /* Editor: tables */
  --editor-table-head-background-color: #2e2e2e;
  --editor-table-head-color: #d05500;
  --editor-table-even-background-color: #1a1a1a;

  /* Editor: blockquotes */
  --editor-blockquote-background-color: #0f0f0f;
  --editor-blockquote-color: #9e9e9e;
  --editor-blockquote-border-color: #ae3500;

  /* Editor: buttons & widgets */
  --editor-command-button-color: #dedede;
  --editor-command-button-background-color: #3a3a3a;
  --editor-command-button-hover-background-color: #484848;
  --editor-command-button-meta-color: #9e9e9e;
  --editor-command-button-border-color: #484848;
  --editor-widget-background-color: #0c0c0c;

  /* Editor: misc */
  --editor-line-meta-color: #555;
  --editor-meta-color: #666;
  --editor-struct-color: #9e9e9e;
  --editor-highlight-background-color: rgba(174, 53, 0, 0.2);
  --editor-frontmatter-background-color: #0c0c0c;
  --editor-frontmatter-color: #9e9e9e;
  --editor-frontmatter-marker-color: #555;
  --editor-task-marker-color: #ae3500;
  --editor-task-state-color: #d05500;

  /* Bottom panels */
  --editor-panels-bottom-color: #dedede;
  --editor-panels-bottom-background-color: #0f0f0f;
  --editor-panels-bottom-border-color: #3a3a3a;
  --editor-panels-bottom-input-background-color: #2e2e2e;

  /* Typography */
  --ui-font: "Press Start 2P", system-ui, -apple-system, sans-serif;
  --editor-font: system-ui, -apple-system, sans-serif;
  --editor-width: 800px;
}

/* Light mode fallback */
html {
  --ui-accent-color: #ae3500;
  --ui-accent-text-color: #fff;
  --ui-accent-contrast-color: #6e2200;
  --root-background-color: #b3b3b3;
  --root-color: #111;
  --top-background-color: #a0a0a0;
  --top-color: #111;
  --top-border-color: #ae3500;
  --ui-font: "Press Start 2P", system-ui, -apple-system, sans-serif;
  --editor-font: system-ui, -apple-system, sans-serif;
  --editor-width: 800px;
}

/* Scale down Press Start 2P globally — it renders ~2x larger than normal fonts */
#sb-root {
  font-size: 10px;
}

/* Zero border-radius everywhere for pixel-art feel */
* {
  border-radius: 0 !important;
}

/* Retro font for headings */
.cm-heading-1 { font-family: "Press Start 2P", monospace; font-size: 0.95em; }
.cm-heading-2 { font-family: "Press Start 2P", monospace; font-size: 0.8em; }
.cm-heading-3 { font-family: "Press Start 2P", monospace; font-size: 0.7em; }

/* Retro font for top bar page title */
.sb-top .main span {
  font-family: "Press Start 2P", monospace;
  font-size: 0.55em;
}

/* Selection */
::selection {
  background: rgba(174, 53, 0, 0.4) !important;
}

/* Scrollbar */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #161616; }
::-webkit-scrollbar-thumb { background: #ae3500; }
```
