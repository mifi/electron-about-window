/// <reference path="../typings/main.d.ts" />
/// <reference path="./lib.d.ts" />

import {app, BrowserWindow} from 'electron';
import * as path from 'path';
import {statSync} from 'fs';
import assign = require('object-assign');

function loadPackageJson(pkg_path: string): PackageJson {
    'use strict';
    try {
        return require(pkg_path);
    } catch (e) {
        return null;
    }
}

function detectPackageJson(specified_dir: string) {
    'use strict';

    if (specified_dir) {
        const pkg = loadPackageJson(path.join(specified_dir, 'package.json'));
        if (pkg !== null) {
            return pkg;
        } else {
            console.warn('about-window: package.json is not found in specified directory path: ' + specified_dir);
        }
    }

    const app_name = app.getName();

    for (let mod_path of (module as any).paths) {
        if (!path.isAbsolute(mod_path)) {
            continue;
        }

        const p = path.join(mod_path, '..', 'package.json');
        try {
            const stats = statSync(p);
            if (stats.isFile()) {
                const pkg = loadPackageJson(p);
                if (pkg !== null && pkg.productName === app_name) {
                    return pkg;
                }
            }
        } catch (e) {
            // File not found.  Ignored.
        }
    }

    // Note: Not found.
    return null;
}

function injectInfoFromPackageJson(info: AboutWindowInfo) {
    'use strict';

    const pkg = detectPackageJson(info.package_json_dir);
    if (pkg === null) {
        // Note: Give up.
        return info;
    }

    if (!info.description) {
        info.description = pkg.description;
    }
    if (!info.license && pkg.license) {
        const l = pkg.license;
        info.license = typeof l === 'string' ? l : l.type;
    }
    if (!info.homepage) {
        info.homepage = pkg.homepage;
    }
    if (!info.bug_report_url && typeof(pkg.bugs) === 'object') {
        info.bug_report_url = pkg.bugs.url;
    }

    return info;
}

export default function openAboutWindow(info: AboutWindowInfo) {
    'use strict';

    const index_html = 'file://' + path.join(__dirname, 'about.html');

    const options = assign(
        {
            width: 400,
            height: 400,
            useContentSize: true,
            titleBarStyle: 'hidden-inset',
            show: !info.adjust_window_size,
        },
        info.win_options || {}
    );

    let win = new BrowserWindow(options);
    win.once('closed', () => {
        win = null;
    });
    win.loadURL(index_html);

    win.webContents.once('dom-ready', () => {
        delete info.win_options;
        win.webContents.send('about-window:info', info);
        if (info.open_devtools) {
            win.webContents.openDevTools({detach: true});
        }
    });
    win.setMenu(null);

    info = injectInfoFromPackageJson(info);

    return win;
}

