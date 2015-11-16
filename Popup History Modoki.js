// ==PREPROCESSOR==
// @name "Popup History Modoki"
// @version "1.0.0"
// @author "tomato111"
// ==/PREPROCESSOR==


//========
// properties
//========
var prop = new function () {

    this.Menu = {
        ItemName: window.GetProperty('Menu.ItemName', '%title%'),
        MaxSize: window.GetProperty('Menu.MaxSize', 10),
        PlayingMark: window.GetProperty('Menu.PlayingMark', '<play>')
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
//== function ==================================
//============================================

function RGBA(r, g, b, a) {
    var res = 0xff000000 | (r << 16) | (g << 8) | (b);
    if (a != undefined) res = (res & 0x00ffffff) | (a << 24);
    return res;
}


//============================================
//== Popup History Modoki Object ==========================
//============================================
var PHM = new function () {
    this.on_paint = function (gr) {
        gr.FillSolidRect(-1, -1, window.Width + 2, window.Height + 2, prop.Style.Color.Background);
    };

    this.init = function () {
        history_items = [];
        buildHistoryMenu();
    };

    this.add = function (metadb) {

        for (var i = 0; i < history_items.length; i++) {
            if (metadb.Compare(history_items[i].metadb)) {
                buildHistoryMenu(metadb);
                return;
            }
        }

        history_items.unshift(new Info(metadb));
        if (history_items.length > prop.Menu.MaxSize)
            history_items.pop();

        buildHistoryMenu(metadb);
    };

    this.popup = function (x, y) {
        var ret = _menu.TrackPopupMenu(x, y);
        if (ret !== 0)
            history_items[ret - 1].doCommand();
    };


    var history_items, _menu;

    var MF_SEPARATOR = 0x00000800;
    var MF_GRAYED = 0x00000001;
    var MF_STRING = 0x00000000;


    var buildHistoryMenu = function (metadb) {

        var menu_items = [];
        if (history_items.length) {
            for (var i = 0; i < history_items.length; i++) {
                menu_items.push(
                    {
                        Flag: MF_STRING,
                        Caption: history_items[i].name + (metadb.Compare(history_items[i].metadb) ? '\t' + prop.Menu.PlayingMark : '')
                    }
                );
            }
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
    function Info(metadb) {
        this.metadb = metadb;
        this.name = fb.TitleFormat(prop.Menu.ItemName).EvalWithMetadb(metadb);
        this.itemLocation = plman.GetPlayingItemLocation();
    }
    Info.prototype.doCommand = function () {
        var metadb = this.metadb;
        var playlistIndex = this.itemLocation.PlaylistIndex;

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
//== Callback function =========================
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