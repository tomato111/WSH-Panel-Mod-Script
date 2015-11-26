// 某所に貼ったもの。StopAfterCurrent をON/OFFするとプロファイルフォルダにファイルを作成/削除する
// おそらくAutoHotkeyのFileExist()で状態を取得する場合くらいしか使い所はない
// ==PREPROCESSOR==
// @name "StopAfterCurrentの何か"
// @version "1.0.0"
// @author "tomato111"
// ==/PREPROCESSOR==

var fso = new ActiveXObject('Scripting.FileSystemObject');
var file = fso.BuildPath(fb.ProfilePath, 'StopAfterCurrent');
var font = gdi.Font('meiryo', 12, 1);
var text, color;

on_playlist_stop_after_current_changed(fb.StopAfterCurrent);

// callback
function on_playlist_stop_after_current_changed(state) {
    if (state) {
        !fso.FileExists(file) && fso.CreateTextFile(file).Close();
        text = 'ON';
        color = 0xffbb0000;
    }
    else {
        fso.FileExists(file) && fso.DeleteFile(file);
        text = 'OFF';
        color = 0xff000000;
    }
    window.Repaint();
}

function on_paint(gr) {
    gr.DrawString(text, font, color, 2, 1, window.Width, window.Height, 0x00000000);
}

function on_mouse_lbtn_up(x, y, mask) {
    fb.StopAfterCurrent = !fb.StopAfterCurrent;
}

//EOF