// ==PREPROCESSOR==
// @name "Popup History Modoki"
// @version "1.1.0"
// @author "tomato111"
// ==/PREPROCESSOR==


//========
// properties
//========
var prop = new function () {

    this.Menu = {
        ItemName: window.GetProperty('Menu.ItemName', '%title%'),
        MaxSize: window.GetProperty('Menu.MaxSize', 25)
    };

    this.Style = {
        Color:
            {
                Background: eval(window.GetProperty('Style.Color.Background', 'RGBA(255,255,255,50)'))
            }
    };

};
//========


//============================================
//== function ================================
//============================================

function RGBA(r, g, b, a) {
    var res = 0xff000000 | (r << 16) | (g << 8) | (b);
    if (a != undefined) res = (res & 0x00ffffff) | (a << 24);
    return res;
}


//============================================
//== Popup History Modoki Object =============
//============================================
var PHM = new function () {
    var history_items, history_index_data, restoreHistory, buildHistoryMenu, _menu;

    var MF_STRING = 0x00000000;
    var MF_GRAYED = 0x00000001;
    var MF_CHECKED = 0x00000008;
    var MF_SEPARATOR = 0x00000800;


    this.on_paint = function (gr) {
        gr.FillSolidRect(-1, -1, window.Width + 2, window.Height + 2, prop.Style.Color.Background);
    };

    this.init = function () {
        history_items = [];
        history_index_data = [];
        restoreHistory();
        buildHistoryMenu(fb.IsPlaying && fb.GetNowPlaying());
    };

    this.add = function (metadb) {

        for (var i = 0; i < history_items.length; i++) {
            if (metadb.Compare(history_items[i].metadb)) {
                buildHistoryMenu(metadb);
                return;
            }
        }

        history_items.unshift(new Info(metadb, plman.PlayingPlaylist));
        history_index_data.unshift(
            [
                history_items[0].playlistIndex,
                Math.floor(history_items[0].metadb.Length * 1000)
            ]
        );

        history_items.length = Math.min(history_items.length, prop.Menu.MaxSize);
        history_index_data.length = history_items.length;

        window.SetProperty('SystemData', history_index_data.join('^'));
        buildHistoryMenu(metadb);
    };

    this.clear = function (x, y) {
        var ret =
            buildMenu([
                { Flag: MF_GRAYED, Caption: 'Clear list?' },
                { Flag: MF_SEPARATOR },
                { Flag: MF_STRING, Caption: 'OK' },
                { Flag: MF_STRING, Caption: 'Cancel' }
            ]).TrackPopupMenu(x, y);
        if (ret === 3) {
            history_items = [];
            history_index_data = [];
            window.SetProperty('SystemData', '');
            buildHistoryMenu();
        }
    };

    this.popup = function (x, y) {
        var ret = _menu.TrackPopupMenu(x, y);
        if (ret === history_items.length + 2)
            this.clear(x, y);
        else if (ret !== 0)
            history_items[ret - 1].doCommand();
    };


    restoreHistory = function () {
        var str = window.GetProperty('SystemData');
        if (!str) {
            return;
        }

        var playlistIndex, playbackLength, HandleList, metadb;

        history_index_data = str.split('^');
        for (var i = 0; i < history_index_data.length;) {
            history_index_data[i] = eval('[' + history_index_data[i] + ']');

            playlistIndex = history_index_data[i][0];
            playbackLength = history_index_data[i][1];

            HandleList = plman.GetPlaylistItems(playlistIndex);
            for (var j = 0; j < HandleList.Count; j++) {
                if (Math.floor(HandleList.Item(j).Length * 1000) === playbackLength)
                    break;
            }

            if (j !== HandleList.Count) {
                history_items.push(new Info(HandleList.Item(j), playlistIndex));
                i++;
            }
            else
                history_index_data.splice(i, 1);
        }

        history_items.length = Math.min(history_items.length, prop.Menu.MaxSize);
        history_index_data.length = history_items.length;

        window.SetProperty('SystemData', history_index_data.join('^'));
    };

    buildHistoryMenu = function (metadb) {

        var menu_items = [];
        if (history_items.length) {
            for (var i = 0; i < history_items.length; i++) {
                menu_items.push(
                    {
                        Flag: metadb ? (metadb.Compare(history_items[i].metadb) ? MF_CHECKED : MF_STRING) : MF_STRING,
                        Caption: history_items[i].name
                    }
                );
            }
            menu_items.push(
                {
                    Flag: MF_SEPARATOR
                },
                {
                    Flag: MF_STRING,
                    Caption: '(Clear)'
                }
            );
        }
        else {
            menu_items.push(
                {
                    Flag: MF_GRAYED,
                    Caption: '(Empty)'
                }
            );
        }

        _menu = buildMenu(menu_items);
    };

    function buildMenu(items) {
        var idx = 1;
        var _menu = window.CreatePopupMenu();
        for (var i = 0; i < items.length; i++) {
            _menu.AppendMenuItem(items[i].Flag, idx++, items[i].Caption);
        }
        return _menu;
    }

    // Constructor
    function Info(metadb, playlistIndex) {
        this.metadb = metadb;
        this.name = fb.TitleFormat(prop.Menu.ItemName).EvalWithMetadb(metadb);
        this.playlistIndex = playlistIndex;
    }
    Info.prototype.doCommand = function () {
        var metadb = this.metadb;
        var playlistIndex = this.playlistIndex;

        plman.SetPlaylistFocusItemByHandle(playlistIndex, metadb);

        var itemIndex = plman.GetPlaylistFocusItemIndex(playlistIndex);
        if (itemIndex !== -1) {
            plman.ActivePlaylist = playlistIndex;
            plman.ClearPlaylistSelection(playlistIndex);
            plman.SetPlaylistSelectionSingle(playlistIndex, itemIndex, true);
            plman.ExecutePlaylistDefaultAction(playlistIndex, itemIndex);
        }
        else
            fb.ShowPopupMessage('The item is not found in playlist.', "Popup History Modoki", 0);
    };
    // End Constructor

    this.init();
}();


//========================================
//== Callback function ===================
//========================================
function on_paint(gr) {
    PHM.on_paint(gr);
}

function on_playback_new_track(metadb) {
    PHM.add(metadb);
}

function on_mouse_lbtn_down(x, y, mask) {
    PHM.popup(x + 1, y);
}

function on_mouse_lbtn_dblclk(x, y, mask) {
    on_mouse_lbtn_down(x, y, mask);
}

//EOF