// ==PREPROCESSOR==
// @name "External Player Modoki__delay"
// @version "1.0.0"
// @author "tomato111"
// ==/PREPROCESSOR==


//========
// properties
//========
var prop = new function () {
    var extArr;

    this.Panel = {
        Enable: window.GetProperty('Panel.Enable', true),
        Extension: window.GetProperty('Panel.Extension', 'avi,flv,mkv,mpg,mp4,wmv')
    };

    if (!this.Panel.Extension)
        window.SetProperty('Panel.Extension', this.Panel.Extension = 'avi,flv,mkv,mpg,mp4,wmv');


    this.Player = {
    };

    extArr = this.Panel.Extension.split(/[ 　]*,[ 　]*/);
    for (var i = 0; i < extArr.length; i++) {
        this.Player[extArr[i].toUpperCase()] = window.GetProperty('Player.' + extArr[i].toUpperCase(), '');
    }

};
//========

var sa = new ActiveXObject('Shell.Application');
var extensionRE = new RegExp(
    '\\.(?:'
    + prop.Panel.Extension.split(/[ 　]*,[ 　]*/).join('|').toLowerCase()
    + ')$'
    , 'i');  /* \.(?:avi|flv|mp4|wmv)$ */


function LaunchPlayer(ext, arg) {

    var ar = arg.charAt(0);
    if (ar !== '"') // 引数を括る
        arg = '"' + arg + '"';

    var player = prop.Player[ext];

    if (!player) {
        player = arg;
        arg = null;
    }

    sa.ShellExecute(player, arg, '', '', 1);
}

function RGB(r, g, b) { return (0xff000000 | (r << 16) | (g << 8) | (b)); }

//========================================
//== Callback function =========================
//========================================
function on_paint(gr) {

    var text = prop.Panel.Enable ? 'Enabled' : 'Disabled';
    var font = gdi.Font('Segoe UI', 13, 0);
    var color = prop.Panel.Enable ? RGB(0, 128, 0) : RGB(0, 0, 0);

    gr.GdiDrawText(text, font, color, 4, 2, window.Width, window.Height, 0x00000000);
}

function on_playback_new_track(metadb) {
    if (prop.Panel.Enable) {
        var current_ext = utils.FileTest(metadb.Path, 'split').toArray()[2].toUpperCase();
        if (extensionRE.test(current_ext)) {
            !fb.IsPaused && fb.Pause(); // 自動で次の曲に遷移する場合は on_playback_starting() が呼ばれない（一瞬再生されてしまう）
            LaunchPlayer(current_ext.slice(1), metadb.Path);
        }
        else if (fb.IsPaused) {
            window.setTimeout(function () { fb.IsPaused && fb.Pause(); }, 100);
        }
    }
}

function on_playback_starting(cmd, is_paused) {
    prop.Panel.Enable && !is_paused && fb.Pause();
}

function on_mouse_lbtn_down(x, y, mask) {
    window.SetProperty('Panel.Enable', prop.Panel.Enable = !prop.Panel.Enable);
    window.Repaint();
}

function on_mouse_lbtn_dblclk(x, y, mask) {
    on_mouse_lbtn_down(x, y, mask);
}

//EOF