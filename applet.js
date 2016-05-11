/*global imports*/

const Applet      = imports.ui.applet;
const Main        = imports.ui.main;
const Lang        = imports.lang;
const St          = imports.gi.St;

const THEME_LIGHT = 'theme-light';
const THEME_DARK  = 'theme-dark';

function MyApplet(orientation, panel_height, instance_id) {
  this._init(orientation, panel_height, instance_id);
}

MyApplet.prototype = {

  __proto__: Applet.Applet.prototype,

  _init: function (metadata, orientation, panel_height, instance_id) {
    Applet.Applet.prototype._init.call(
      this,
      orientation,
      panel_height,
      instance_id
    );

    this.metadata = metadata;

    this.windows  = [];
    this.handles  = [];

    // Instantiate themes to avoid re-loading a theme upon window maximize
    this.themes   = {};
    this.loadTheme(THEME_LIGHT);
    this.loadTheme(THEME_DARK);

    this.handles.push(global.window_manager.connect(
        'maximize',
        Lang.bind(this, this.update)
    ));
    this.handles.push(global.window_manager.connect(
        'unmaximize',
        Lang.bind(this, this.update)
    ));
    this.handles.push(global.window_manager.connect(
        'minimize',
        Lang.bind(this, this.refresh)
    ));
    this.refresh();
  },

  on_applet_clicked: function () {
    this.toggleTheme();
  },

  on_applet_removed_from_panel: function () {
    this.handles.forEach(function (handle) {
      global.window_manager.disconnect(handle);
    });
    this.windows.forEach(function (window) {
      window.release();
    });
    global.log('bye!');
  },

  onMaximize: function (cinnamonwm, actor) {
    if (actor.metaWindow.is_on_primary_monitor()) {
      this.setTheme(THEME_DARK);
    }
  },

  update: function () {
    // Go through each window to make sure there are no more maximized windows on
    // the primary display
    var i, maxWindowExists, wind;
    let windows = global.get_window_actors();

    for (i = 0, maxWindowExists = false; i < windows.length; i += 1) {
      wind = windows[i].metaWindow;
      if (
        wind.is_on_primary_monitor() &&
        wind.maximizedVertically &&
        !wind.minimized
      ) {
        maxWindowExists = true;
      }
    }
    if (!maxWindowExists) {
      this.setTheme(THEME_LIGHT);
    } else {
      this.setTheme(THEME_DARK);
    }
  },

  loadTheme: function (which) {
    let theme = this.themes[which] || new St.Theme({
      fallback_stylesheet: global.datadir + '/theme/cinnamon.css'
    });

    if (this.metadata[which] == null) {
      global.logError(which + ' must be defined in the metadata.json file');
      return;
    }

    theme.unload_stylesheet(this.metadata[which]);
    theme.load_stylesheet(this.metadata[which]);

    this.themes[which] = theme;
  },

  toggleTheme: function () {
    let themeContext = St.ThemeContext.get_for_stage(global.stage);

    if (themeContext.get_theme() === this.themes[THEME_LIGHT]) {
      this.setTheme(THEME_DARK);
    } else {
      this.setTheme(THEME_LIGHT);
    }
  },

  setTheme: function (which) {
    let themeContext = St.ThemeContext.get_for_stage(global.stage);

    if (this.themes[which] == null) {
      this.loadTheme(which);
    }

    themeContext.set_theme(this.themes[which]);
  },

  refresh: function () {
    let windows = global.get_window_actors();
    let that = this;

    this.windows.forEach(function (window) {
      window.release();
    });

    windows.forEach(function (window) {
      that.windows.push(new Window(
        window.metaWindow,
        Lang.bind(that, that.update)
      ));
    });
    this.update();
  }

};

function Window(metaWindow, focusCallback) {
  this.metaWindow = metaWindow;
  this.handleId   = metaWindow.connect('focus', focusCallback);
}

Window.prototype.release = function () {
  this.metaWindow.disconnect(this.handleId);
};


function main(metadata, orientation, panel_height, instance_id) {
  return new MyApplet(metadata, orientation, panel_height, instance_id);
}

