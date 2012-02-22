// ==PREPROCESSOR==
// @name "Lyrics Downloader (Miku Hatsune wiki)"
// @version "1.09"
// @author "Tomato"
// ==/PREPROCESSOR==

var scriptName = "Lyrics Downloader (Miku Hatsune wiki)";

//== Prototype ==================================

String.prototype.replaceEach = function () { //e.g.) "abc*Bc".replaceEach("b", "e", "c", "f", "\\*", "_", "ig")  /* aef_ef */
    var str = this;
    var flag = arguments[arguments.length - 1];
    if (!(arguments.length % 2))
        throw new Error("Wrong number of arguments");
    if (/[^igm]/.test(flag))
        throw new Error("Unknown  flag: \"" + flag + "\"");

    for (var i = 0; i < arguments.length; i += 2) {
        var re = new RegExp(arguments[i], flag);
        str = str.replace(re, arguments[i + 1]);
    }
    return str;
};

//==Global variable=========================

onLoaded.debug = false; // for debug

var fs = new ActiveXObject("Scripting.FileSystemObject");
var ws = new ActiveXObject("WScript.Shell");
var sa = new ActiveXObject("Shell.Application");

var Properties = {
    AddInfo: window.GetProperty("Add Information", true),
    DrawRoundRect: window.GetProperty("DrawRoundRect", "RGBA(193, 193, 193, 88)"),
    FollowCursor: window.GetProperty("Follow Cursor", false),
    Overwrite: window.GetProperty("Overwrite", false),
    PutLyricsIn: window.GetProperty("Put Lyrics In", ""),
    RunAfterDownload: window.GetProperty("Run After Download", ""),
    ShowCompleteDialog: window.GetProperty("Show Complete Dialog", true),
    ShowSaveDialog: window.GetProperty("Show Save Dialog", true),
    CharacterCode: window.GetProperty("Set Character Code", "Unicode"),
    LineFeedCode: window.GetProperty("Set Line Feed Code", "CR+LF"),
    AutoSearchMode: window.GetProperty("Auto Search Mode", false),
    AutoSearchCond: window.GetProperty("Auto Search Conditions", ""),
    AutoSearchModeDialog: window.GetProperty("Auto Search Mode Dialog", 15),
    AutoSearchDelay: window.GetProperty("Auto Search Delay", 2000)
}
if (!Properties.PutLyricsIn)
    window.SetProperty("Put Lyrics In", Properties.PutLyricsIn = ws.SpecialFolders.item("Desktop") + "\\$replace(%artist% - %title%,*,＊,?,？,/,／,:,：).txt");

if (!codeBoolean(Properties.CharacterCode, 1))
    window.SetProperty("Set Character Code", Properties.CharacterCode = "Unicode");

if (!codeBoolean(Properties.LineFeedCode, 2))
    window.SetProperty("Set Line Feed Code", Properties.LineFeedCode = "CR+LF");

var ASMD = {
    Overwrite: 1,
    Not_found: 2,
    Save: 4,
    Complete: 8
}

var TFInfo = {
    title: "%title%",
    artist: "%artist%",
    savepath: Properties.PutLyricsIn
}

var mio = null;
var ldown = false, mover = false, mdown = false;
var opacity = 0, step = 40;
var timer = null, ASTimer = null, meta = null;
var LineFeedCode = Properties.LineFeedCode.replace(/CR/i, "\r").replace(/LF/i, "\n").replace(/\+/i, "");
var RoundRectColor = eval(Properties.DrawRoundRect);
var first = true;
if (Properties.RunAfterDownload)
    Properties.RunAfterDownload = Properties.RunAfterDownload.split("||");

//==function====================================

function RGBA(r, g, b, a) {
    var res = 0xff000000 | (r << 16) | (g << 8) | (b);
    if (a != undefined) res = (res & 0x00ffffff) | (a << 24);
    return res;
}

function prompt(text, title, defaultText) {
    var sc = new ActiveXObject("ScriptControl");
    var code = 'Function fn(text, title, defaultText)\n'
    + 'fn = InputBox(text, title, defaultText)\n'
    + 'End Function'
    sc.Language = "VBScript";
    sc.AddCode(code);
    return sc.Run("fn", text, title, defaultText);
}

function codeBoolean(code, n) {
    if (n == 1) // CharacterCode mode
        if (!code || !code.match(/^(?:Unicode|Shift_JIS|EUC-JP|UTF-8)$/i))
            return false;
    if (n == 2) // LineFeedCode mode
        if (!code || !code.match(/^(?:CR\+LF|CR|LF)$/i))
            return false;
    return true;
}

function createMusicInfoObject(MetadbHandle) {
    mio = {};
    for (var key in TFInfo) {
        mio[key] = fb.TitleFormat(TFInfo[key]).EvalWithMetadb(MetadbHandle);
    }
}

function createQuery(word) {
    return "http://www5.atwiki.jp/hmiku/?cmd=search&keyword=" + encodeURI(word).replace(/\+/g, "%2B") + "&andor=and&ignore=1";
}

function getFile(data, method, fileName, async, type, found) { // type= 1:txt  2:xml
    onLoaded.debug && fb.trace("\nOpen#" + found + ": " + fileName + "\n");
    var request = new ActiveXObject("Msxml2.XMLHTTP");
    getFile.PRESENT = fileName;

    request.open(method, fileName, async);

    request.onreadystatechange = function () {
        if (request.readyState == 4 && request.status == 200) {
            onLoaded(request, type, found);
        }
    }

    request.setRequestHeader("content-type", "application/x-www-form-urlencoded");
    request.send(data);
}

function onLoaded(request, type, found) {
    if (type == 1) {
        var res = request.responseText;
        var resArray = res.split('\n');
        var Page = new AnalyzePage(resArray, found);

        if (Page.FoundPage) {
            getFile(null, "GET", Page.FoundPage, true, 1, true);
        }
        else if (found == -1) {
            getFile(null, "GET", createQuery(mio.title + " " + mio.artist), true, 1, -2);
        }

        Page.errorMes && (!Properties.AutoSearchMode || Properties.AutoSearchModeDialog & ASMD.Not_found) && Page.errorMes();
        Page.FoundLyrics && outputText(Page.Lyrics, Page.Info);
    }

    if (type == 2) {
        //        res = request.responseXML;
        //        var objXML = new ActiveXObject("MSXML2.DOMDocument");
        //        objXML.load(res);
        //        var objNodes = objXML.childNodes;
        //        fb.trace(objNodes(0));
    }
}

function AnalyzePage(resArray, found) {
    var re = new RegExp(found !== true ? '<a href="(.*?)" +?title="(' + mio.title.replaceEach("\\*", "\\*", "\\?", "\\?", "g") + '.*?)">' : 'id_[a-z0-9]{8}|^作詞|^作曲|^編曲|^唄');
    var lyricsFlag = false, id = null, intButton = null, foundPage = null;
    var aimai = false, mat = false, isCD = false;

    if (found !== true) {
        for (var i = 0; i < resArray.length; i++)
            if (re.test(resArray[i])) {
                onLoaded.debug && fb.trace("TITLE: " + RegExp.$2 + " URL: " + RegExp.$1);
                if (RegExp.$2 == mio.title)
                    foundPage = RegExp.$1.replace(/amp;/g, "");
                if (RegExp.$2.indexOf(mio.title + "/") == 0 && RegExp.$2.indexOf(mio.title + "/過去ログ") != 0 && RegExp.$2.indexOf(mio.title + "/CD") != 0)
                    !aimai && (aimai = true) && onLoaded.debug && fb.trace("aimai turn true");
                if (RegExp.$2 == mio.title + "/" + mio.artist) {
                    foundPage = RegExp.$1.replace(/amp;/g, "");
                    mat = true;
                    onLoaded.debug && fb.trace("match and break");
                    break;
                }
            }

        if (foundPage && !aimai || foundPage && mat)
            this.FoundPage = foundPage;
        else if (found == -2) {
            this.errorMes = function () {
                var mes = aimai ? "ページが取得出来ませんでした。\nアーティスト名が間違っていないか確認してください。" : "ページが見つかりませんでした。";
                var intButton = ws.Popup(mes + "\n\ブラウザで開きますか？", 0, "確認", 36);
                if (intButton == 6)
                    sa.ShellExecute('"' + getFile.PRESENT + '"', "", "", "open", 1);
            }
            fb.trace(aimai ? "ページが取得出来ませんでした。\nアーティスト名が間違っていないか確認してください。(Lyrics Downloader)" : "ページが見つかりませんでした。(Lyrics Downloader)");
        }
    }

    else {
        this.Info = mio.title + LineFeedCode + LineFeedCode;
        this.Lyrics = "";
        for (i = 0; i < resArray.length; i++) {
            id = resArray[i].match(re);
            onLoaded.debug && id && fb.trace(i + 1 + "行目: " + id);
            if (id) {
                if (id == "id_0a172479") {
                    lyricsFlag = true;
                    continue;
                }
                else if (id.toString().indexOf("id_") != 0)
                    this.Info += resArray[i].replace(/<a href.+?>|<\/a>|<\/a>.*?<\/a>|<span.+?>|<\/span>/g, "") + LineFeedCode;
                else if (lyricsFlag)
                    break;
                else if (id == "id_738ae0ba") {
                    isCD = true;
                    break;
                }
            }
            if (lyricsFlag)
                this.Lyrics += resArray[i].replace(/<br ?\/>|<\/div>/g, LineFeedCode);
        }

        if (!lyricsFlag) {
            this.errorMes = function () {
                var intButton = ws.Popup((isCD ? "ページがありません" : "ページ内に歌詞が記載されていません") + "\nブラウザで開きますか？", 0, "確認", 36);
                if (intButton == 6)
                    sa.ShellExecute('"' + getFile.PRESENT + '"', "", "", "open", 1);
            }
            fb.trace(isCD ? "ページがありません。(Lyrics Downloader)" : "ページ内に歌詞が記載されていません。(Lyrics Downloader)");
        }
        else {
            this.Lyrics = this.Lyrics.replace(/<.+?>|\t/g, "").replace(/&quot;/g, "\"").replace(/&nbsp;/g, " ");
            this.FoundLyrics = true;
        }
    }

}

function outputText(lyrics, info) {
    var text = (Properties.AddInfo ? info + LineFeedCode : "") + lyrics.replace(/\s{1,}$/, LineFeedCode);
    var intButton = null, file = null;
    var c = Properties.RunAfterDownload;
    onLoaded.debug && fb.trace("\n" + text + "\n===End debug=============");
    if (Properties.ShowSaveDialog && (!Properties.AutoSearchMode || Properties.AutoSearchModeDialog & ASMD.Save))
        intButton = ws.Popup(text
                                            + "\n\n==============================================\n"
                                            + "                                                                           この歌詞を保存しますか？", 0, "確認", 4);
    if (intButton != 7) {
        file = new ActiveXObject('ADODB.Stream');
        file.type = 2;
        file.charset = Properties.CharacterCode;
        file.open();
        file.writeText(text);
        file.saveToFile(mio.savepath, 2);
        file.close();
        if (!Properties.AutoSearchMode || Properties.AutoSearchModeDialog & ASMD.Complete)
            Properties.ShowCompleteDialog && ws.Popup("保存が完了しました\n" + mio.savepath, 5, "情報", 64);
        fb.trace("保存が完了しました。 " + mio.savepath + " (Lyrics Downloader)");
        if (c) {
            if (c instanceof Array) {
                for (var i = 0; i < c.length; i++)
                    if (c[i].charAt(0) == "<")
                        window.NotifyOthers(c[i].slice(1, -1), "");
                    else
                        FuncCommand(fb.TitleFormat(c[i]).EvalWithMetadb(Properties.FollowCursor ? fb.GetFocusItem() : fb.GetNowPlaying()));
            }
            else
                if (c.charAt(0) == "<")
                    window.NotifyOthers(c.slice(1, -1), "");
                else
                    FuncCommand(fb.TitleFormat(c).EvalWithMetadb(Properties.FollowCursor ? fb.GetFocusItem() : fb.GetNowPlaying()));
        }

    }
}

function AutoSearch(metadb) {
    var FileInfo = metadb.GetFileInfo();
    var query = Properties.AutoSearchCond;
    var searchArr = query.split(",");

    for (var i = 0; i < searchArr.length; i++) {
        if (!searchArr[i].match(/(.+?)!(.+)/)) continue;
        if (RegExp.$1.indexOf("%") == 0)
            var str = fb.TitleFormat(RegExp.$1).Eval();
        else {
            var idx = FileInfo.MetaFind(RegExp.$1);
            str = FileInfo.MetaValue(idx, 0);
        }
        if (str == RegExp.$2) return;
    }

    for (i = 0; i < searchArr.length; i++) {
        if (!searchArr[i].match(/(.+?):(.+)/)) continue;
        if (RegExp.$1.indexOf("%") == 0)
            str = fb.TitleFormat(RegExp.$1).Eval();
        else {
            idx = FileInfo.MetaFind(RegExp.$1);
            str = FileInfo.MetaValue(idx, 0);
        }
        if (str == RegExp.$2) {
            createMusicInfoObject(fb.GetNowPlaying());
            mio.savepath.match(/(.+\\)(.+)\./);
            if (!fs.FileExists(mio.savepath) && !fs.FileExists(RegExp.$1 + RegExp.$2 + ".lrc") || Properties.Overwrite) {
                onLoaded.debug && fb.trace("\n===Start debug=============");
                getFile(null, "GET", createQuery(mio.title), true, 1, -1);
            }
            else if (Properties.AutoSearchModeDialog & ASMD.Overwrite)
                ws.Popup("歌詞ファイルが既に存在します", 0, "処理の中止", 64);
            else
                fb.trace("歌詞ファイルが既に存在します。(Lyrics Downloader)");
            break;
        }
    }
}

function FuncCommand(path) {
    if (!path.match(/(?:\\|:\/\/)/))
        fb.RunMainMenuCommand(path);
    else {
        var ar, arg = null;
        if (path.match(/(.*?\.\w{2,4})\s(.*)/)) {
            path = RegExp.$1;
            ar = RegExp.$2.charAt(0);
            arg = (ar != '"' && ar != "/") ? '"' + RegExp.$2 + '"' : RegExp.$2;
        }
        sa.ShellExecute(path, arg, "", "open", 1);
    }
}

//==Create "menu" Object====================

var menu = new function () {
    var MF_SEPARATOR = 0x00000800;
    var MF_ENABLED = 0x00000000;
    var MF_GRAYED = 0x00000001;
    var MF_DISABLED = 0x00000002;
    var MF_UNCHECKED = 0x00000000;
    var MF_CHECKED = 0x00000008;
    var MF_STRING = 0x00000000;
    var MF_POPUP = 0x00000010;
    var MF_RIGHTJUSTIFY = 0x00004000;

    var _menu;
    var item_list = {}, idx = 1;
    var scm = window.GetProperty("Show Config Menu", true);

    this.menu_sub_ASMD = [
        {
            Caption: "Show Overwrite Dialog",
            Func: function () {
                Properties.AutoSearchModeDialog ^= ASMD.Overwrite;
                window.SetProperty("Auto Search Mode Dialog", Properties.AutoSearchModeDialog);
                menu.buildMenu(-1);
            }
        },
        {
            Caption: "Show Not Found Dialog",
            Func: function () {
                Properties.AutoSearchModeDialog ^= ASMD.Not_found;
                window.SetProperty("Auto Search Mode Dialog", Properties.AutoSearchModeDialog);
                menu.buildMenu(-2);
            }
        },
        {
            Caption: "Show Save Dialog",
            Func: function () {
                Properties.AutoSearchModeDialog ^= ASMD.Save;
                window.SetProperty("Auto Search Mode Dialog", Properties.AutoSearchModeDialog);
                menu.buildMenu(-3);
            }
        },
        {
            Caption: "Show Complete Dialog",
            Func: function () {
                Properties.AutoSearchModeDialog ^= ASMD.Complete;
                window.SetProperty("Auto Search Mode Dialog", Properties.AutoSearchModeDialog);
                menu.buildMenu(-4);
            }
        }
    ];

    this.menu_items = [
        {
            Caption: "Auto Search Mode",
            Func: function () {
                window.SetProperty("Auto Search Mode", !Properties.AutoSearchMode);
                Properties.AutoSearchMode = window.GetProperty("Auto Search Mode");
                menu.buildMenu(0);
            }
        },
        {
            Flag: MF_POPUP,
            Caption: "Auto Search Mode Dialog",
            Sub: this.menu_sub_ASMD
        },
        {
            Flag: MF_SEPARATOR
        },
        {
            Caption: "Follow Cursor",
            Func: function () {
                window.SetProperty("Follow Cursor", !Properties.FollowCursor);
                Properties.FollowCursor = window.GetProperty("Follow Cursor");
                menu.buildMenu(3);
            }
        },
        {
            Caption: "Overwrite",
            Func: function () {
                window.SetProperty("Overwrite", !Properties.Overwrite);
                Properties.Overwrite = window.GetProperty("Overwrite");
                menu.buildMenu(4);
            }
        },
        {
            Flag: MF_SEPARATOR
        },
        {
            Caption: "Add Information",
            Func: function () {
                window.SetProperty("Add Information", !Properties.AddInfo);
                Properties.AddInfo = window.GetProperty("Add Information");
                menu.buildMenu(6);
            }
        },
        {
            Caption: "Show Save Dialog",
            Func: function () {
                window.SetProperty("Show Save Dialog", !Properties.ShowSaveDialog);
                Properties.ShowSaveDialog = window.GetProperty("Show Save Dialog");
                menu.buildMenu(7);
            }
        },
        {
            Caption: "Show Complete Dialog",
            Func: function () {
                window.SetProperty("Show Complete Dialog", !Properties.ShowCompleteDialog);
                Properties.ShowCompleteDialog = window.GetProperty("Show Complete Dialog");
                menu.buildMenu(8);
            }
        },
        {
            Flag: MF_SEPARATOR
        },
        {
            Flag: MF_STRING,
            Caption: "Manual Search... ",
            Func: function () {
                ldown = true;
                on_mouse_lbtn_up("Change");
            }
        },
        {
            Flag: MF_SEPARATOR
        },
		{
		    Flag: MF_STRING,
		    Caption: "Properties...",
		    Func: function () { window.ShowProperties(); }
		},
        {
            Flag: MF_STRING,
            Caption: "Help...",
            Func: function () { FuncCommand("http://ashiato1.blog62.fc2.com/blog-entry-51.html"); }
        }
    ];

    if (scm) {
        var h = this.menu_items.pop();
        this.menu_items.push(
            {
                Flag: MF_STRING,
                Caption: "Configure...",
                Func: function () { window.ShowConfigure(); }
            }
        );
        this.menu_items.push(h);
    }

    this.refreshInfo = function (n) {
        switch (n) {
            case -4:
                this.menu_sub_ASMD[3].Flag ^= MF_CHECKED;
                break;
            case -3:
                this.menu_sub_ASMD[2].Flag ^= MF_CHECKED;
                break;
            case -2:
                this.menu_sub_ASMD[1].Flag ^= MF_CHECKED;
                break;
            case -1:
                this.menu_sub_ASMD[0].Flag ^= MF_CHECKED;
                break;
            case 0:
                this.menu_items[0].Flag ^= MF_CHECKED;
                break;
            case 3:
                this.menu_items[3].Flag ^= MF_CHECKED;
                break;
            case 4:
                this.menu_items[4].Flag ^= MF_CHECKED;
                break;
            case 6:
                this.menu_items[6].Flag ^= MF_CHECKED;
                break;
            case 7:
                this.menu_items[7].Flag ^= MF_CHECKED;
                break;
            case 8:
                this.menu_items[8].Flag ^= MF_CHECKED;
                break;
            default:
                this.menu_sub_ASMD[3].Flag = (Properties.AutoSearchModeDialog & ASMD.Complete) ? MF_CHECKED : MF_UNCHECKED;
                this.menu_sub_ASMD[2].Flag = (Properties.AutoSearchModeDialog & ASMD.Save) ? MF_CHECKED : MF_UNCHECKED;
                this.menu_sub_ASMD[1].Flag = (Properties.AutoSearchModeDialog & ASMD.Not_found) ? MF_CHECKED : MF_UNCHECKED;
                this.menu_sub_ASMD[0].Flag = (Properties.AutoSearchModeDialog & ASMD.Overwrite) ? MF_CHECKED : MF_UNCHECKED;
                this.menu_items[0].Flag = Properties.AutoSearchMode ? MF_CHECKED : MF_UNCHECKED;
                this.menu_items[3].Flag = Properties.FollowCursor ? MF_CHECKED : MF_UNCHECKED;
                this.menu_items[6].Flag = Properties.AddInfo ? MF_CHECKED : MF_UNCHECKED;
                this.menu_items[4].Flag = Properties.Overwrite ? MF_CHECKED : MF_UNCHECKED;
                this.menu_items[7].Flag = Properties.ShowSaveDialog ? MF_CHECKED : MF_UNCHECKED;
                this.menu_items[8].Flag = Properties.ShowCompleteDialog ? MF_CHECKED : MF_UNCHECKED;
        }
    };

    this.buildSubMenu = function (items) {
        var sub_menu = window.CreatePopupMenu();
        for (var i = 0; i < items.length; i++) {
            sub_menu.AppendMenuItem(items[i].Flag, idx, items[i].Caption);
            item_list[idx++] = items[i];
        }
        return sub_menu;
    };

    this.buildMenu = function (n) {
        this.refreshInfo(n);
        _menu = window.CreatePopupMenu();
        for (var i = 0; i < this.menu_items.length; i++) {
            if (this.menu_items[i].Sub) {
                this.menu_items[i].menu = this.buildSubMenu(this.menu_items[i].Sub);
                id = this.menu_items[i].menu.ID;
            } else id = idx;
            _menu.AppendMenuItem(this.menu_items[i].Flag, id, this.menu_items[i].Caption);
            item_list[idx++] = this.menu_items[i];
        }
        idx = 1;
    };

    this.show = function (x, y) {
        ret = _menu.TrackPopupMenu(x, y);
        if (ret != 0)
            item_list[ret].Func();
    };

};

menu.buildMenu();

//==Callback function==========================

function on_paint(gr) {
    Properties.DrawRoundRect && gr.DrawRoundRect(0, 0, window.Width - 1, window.Height - 1, 0.1, 0.1, 1, RoundRectColor);
    gr.FillSolidRect(0, 0, window.Width, window.Height, RGBA(193, 219, 252, opacity));
}

function on_playback_new_track(metadb) {
    if (Properties.AutoSearchMode) {
        meta = metadb;
        if (ASTimer) {
            window.KillTimer(ASTimer);
            ASTimer.Dispose();
        }
        ASTimer = window.CreateTimerTimeout(Properties.AutoSearchDelay);
    }
}

function on_playback_stop(reason) {
    if (ASTimer && reason == 0) {
        window.KillTimer(ASTimer);
        ASTimer.Dispose();
        ASTimer = null;
        CollectGarbage();
    }
}

function on_mouse_move(x, y, mask) {
    !mover && (mover = true);
    if (first) {
        if (!timer) timer = window.CreateTimerInterval(50);
        first = false;
    }
}

function on_mouse_leave() {
    mover = false;
    first = true;
    !timer && (timer = window.CreateTimerInterval(50));
}

function on_mouse_lbtn_down(x, y, mask) {
    ldown = true;
}

function on_mouse_lbtn_up(x, y, mask) {
    if (ldown && (Properties.FollowCursor || fb.IsPlaying)) {
        createMusicInfoObject(Properties.FollowCursor ? fb.GetFocusItem() : fb.GetNowPlaying());
        mio.savepath.match(/(.+\\)(.+)\./);
        if (!fs.FileExists(mio.savepath) && !fs.FileExists(RegExp.$1 + RegExp.$2 + ".lrc") || Properties.Overwrite) {
            if (x == "Change") {
                var title = prompt("Please input TITLE", "Lyrics Downloader", mio.title);
                if (!title) return;
                var artist = prompt("Please input ARTIST", "Lyrics Downloader", mio.artist);
                if (!artist) return;
                mio.title = title;
                mio.artist = artist;
            }
            onLoaded.debug && fb.trace("\n===Start debug=============");
            getFile(null, "GET", createQuery(mio.title), true, 1, -1); // GETなのでnull
        }
        else
            ws.Popup("歌詞ファイルが既に存在します", 0, "処理の中止", 64);
    }
    else
        ws.Popup("曲を再生していないため検索できません", 0, "情報", 64);
    ldown = false;
}

function on_mouse_mbtn_down(x, y, mask) {
    mdown = true;
}

function on_mouse_mbtn_up(x, y, mask) {
    if (mdown && getFile.PRESENT)
        sa.ShellExecute('"' + getFile.PRESENT + '"', "", "", "open", 1);
    mdown = false;
}

function on_mouse_rbtn_down(x, y, mask) {
    if (mask == 6)
        return;
    else {
        menu.show(x, y);
        return true;
    }
}

function on_timer(id) {
    if (timer && id == timer.ID) {
        if (mover && opacity < 160)
            opacity += step;
        else if (!mover && opacity > 0)
            opacity -= step;
        else {
            window.KillTimer(timer);
            timer.Dispose();
            timer = null;
            CollectGarbage();
        }
        window.Repaint();
    }

    if (ASTimer && id == ASTimer.ID) {
        window.KillTimer(ASTimer);
        ASTimer.Dispose();
        ASTimer = null;
        AutoSearch(meta);
        CollectGarbage();
    }
}

function on_notify_data(name, info) {
    if (name == scriptName) {
        ldown = true;
        on_mouse_lbtn_up();
    }
}

//EOF