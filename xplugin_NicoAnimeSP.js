pl = {
    name: 'xplugin_NicoAnimeSP',
    label: 'Nico Anime SP',
    author: 'tomato111',
    onStartUp: function () { // 最初に一度だけ呼び出される
        this.menuitem.Flag = MF_DISABLED;
        var _this = this;

        this.prop = {
            x: 15,
            y: 0,
            width: 10,
            height: 10,
            Color: {
                Ellipse_normal: setAlpha(prop.Style.Color.Text, 40),
                Ellipse_hover: setAlpha(prop.Style.Color.PlayingText, 96)
            }
        };


        //============================================
        //== Nico Anime SP Object ====================
        //============================================
        this.NAS = new function () {
            var _menu, _item_list;

            this.onPaint = function (gr) {
                gr.FillEllipse(_this.prop.x, _this.prop.y, _this.prop.width, _this.prop.height, this.hover ? _this.prop.Color.Ellipse_hover : _this.prop.Color.Ellipse_normal);
            };

            this.repaint = function () {
                window.RepaintRect(_this.prop.x - 1, _this.prop.y - 1, _this.prop.width + 2, _this.prop.height + 2);
            };

            this.refresh = function (x, y) {

                var menu_items = [ // header
                    {
                        Flag: MF_STRING,
                        Caption: '(Refresh)',
                        Func: function () { _this.NAS.refresh(x, y); }
                    },
                    {
                        Flag: MF_SEPARATOR
                    }
                ];

                var requestHeader = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0',
                    'If-Modified-Since': 'Thu, 01 Jun 1970 00:00:00 GMT' // キャッシュが邪魔をするので、強制的に最新データを取りに行く
                }

                // 放送中
                getHTML(null, 'GET', 'https://live.nicovideo.jp/search?keyword=%E3%83%8B%E3%82%B3%E3%83%8B%E3%82%B3%E3%82%A2%E3%83%8B%E3%83%A1%E3%82%B9%E3%83%9A%E3%82%B7%E3%83%A3%E3%83%AB&status=onair&sortOrder=recentDesc&providerTypes=official&providerTypes=channel',
                    !ASYNC, 0, extractLiveInfo, requestHeader);
                // 放送予定
                getHTML(null, 'GET', 'https://live.nicovideo.jp/search?keyword=%E3%83%8B%E3%82%B3%E3%83%8B%E3%82%B3%E3%82%A2%E3%83%8B%E3%83%A1%E3%82%B9%E3%83%9A%E3%82%B7%E3%83%A3%E3%83%AB&status=reserved&sortOrder=recentDesc&providerTypes=official&providerTypes=channel',
                    !ASYNC, 0, extractLiveInfo, requestHeader);
                // タイムシフト
                getHTML(null, 'GET', 'https://live.nicovideo.jp/search?keyword=%E3%83%8B%E3%82%B3%E3%83%8B%E3%82%B3%E3%82%A2%E3%83%8B%E3%83%A1%E3%82%B9%E3%83%9A%E3%82%B7%E3%83%A3%E3%83%AB&status=past&sortOrder=recentDesc&providerTypes=official&providerTypes=channel',
                    !ASYNC, 0, extractLiveInfo, requestHeader);



                menu_items.push( // footer
                    {
                        Flag: MF_SEPARATOR
                    },
                    {
                        Flag: MF_STRING,
                        Caption: 'ニコニコアニメスペシャル',
                        Func: function () { FuncCommand('https://live.nicovideo.jp/search?keyword=%E3%83%8B%E3%82%B3%E3%83%8B%E3%82%B3%E3%82%A2%E3%83%8B%E3%83%A1%E3%82%B9%E3%83%9A%E3%82%B7%E3%83%A3%E3%83%AB&status=onair&sortOrder=recentDesc&providerTypes=official&providerTypes=channel'); }
                    }
                );

                _menu = buildMenu(menu_items);
                _item_list = buildMenu.item_list;

                _this.NAS.popup(x, y);


                function extractLiveInfo(request, depth, file) {

                    var mode = file.match(/status=(\w+)/)[1].replace('onair', 'live').replace('reserved', 'future').replace('past', 'timeshift');
                    var res = request.responseText;
                    //console2(res);

                    res = res.replace(/[\t ]*(?:\r\n|\r|\n)[\t ]*/g, '');
                    var CutoutRE = new RegExp('<li class="searchPage-ProgramList_Item">.+?<div class="searchPage-ProgramList_User">', 'ig');
                    var SearchRE = new RegExp(
                        '<div class="searchPage-ProgramList_StatusLabel-(\\w+)".+?' // $1:状態(live, future, timeshift)
                        + '<a class="searchPage-ProgramList_TitleLink" href="watch/(.+?)".+?>(.+?)</a>.+?' // $2:放送ID, $3:放送タイトル
                        + '<span class="searchPage-ProgramList_DataText">([\\d/ :時間]+).+?(?:（(.+?)）)?</span>.+?' // $4:放送時刻(not unixtime), $5:放送時間の長さ（for timeshift)
                        + '<span class="searchPage-ProgramList_DataIcon-timeshift"></span><span class="searchPage-ProgramList_DataText">(\\d+)</span>' // $6:タイムシフト予約数
                        , 'i'
                    );
                    while (CutoutRE.test(res)) {
                        //console2(RegExp.lastMatch);
                        if (SearchRE.test(RegExp.lastMatch)) {
                            //console2(RegExp.lastMatch);
                            var item = {
                                status: RegExp.$1,
                                air_id: RegExp.$2,
                                air_title: RegExp.$3,
                                start_date: RegExp.$1 === 'live' ? RegExp.$4 : new Date(RegExp.$4),
                                air_length: RegExp.$5,
                                timeshift_count: RegExp.$6.replace(/^0$/, '※タイムシフトなし')
                            };
                            if (item.status === mode) {
                                item = createLiveMenuItem(item);
                                menu_items.push(item);
                            }
                        }
                    }
                }

                function createLiveMenuItem(item) {
                    //console2("//--Item--"); for (var key in item) { console2(key + ": " + item[key]); }
                    var url = 'https://live2.nicovideo.jp/watch/' + item.air_id;
                    var time_to_start;

                    switch (item.status) {
                        case 'live':
                            var m;
                            var temp = item.start_date.split('時間'); // status=liveだと経過時間しか取得できないので逆算して開始時刻を求める
                            if (temp.length === 2)
                                m = temp[0] * 60 + Number(temp[1]);
                            else
                                m = temp[0];
                            item.start_date = new Date();
                            item.start_date.setMinutes(item.start_date.getMinutes() - m);
                            time_to_start = '+' + m + 'm';
                            break;
                        case 'future':
                            time_to_start = (item.start_date - new Date()) / 1000 / 60;
                            if (time_to_start < 60)
                                time_to_start = '-' + Math.floor(time_to_start) + 'm';
                            else if (time_to_start < 60 * 24)
                                time_to_start = Math.floor(time_to_start / 60) + 'h';
                            else if (time_to_start < 60 * 24 * 7)
                                time_to_start = Math.floor(time_to_start / 60 / 24) + 'd';
                            else
                                time_to_start = Math.round(time_to_start / 60 / 24 / 7) + 'w'; break;
                        case 'timeshift':
                            time_to_start = ''; break;
                    }

                    var caption = time_to_start
                        + ': ' + item.air_title.decodeHTMLEntities().replace(/&/g, '&&')
                        + ' (' + item.timeshift_count + ')'
                        + '\t' + ('0' + (item.start_date.getMonth() + 1)).slice(-2)
                        + '/' + ('0' + item.start_date.getDate()).slice(-2)
                        + ' (' + ['日', '月', '火', '水', '木', '金', '土'][item.start_date.getDay()]
                        + ') ' + ('0' + item.start_date.getHours()).slice(-2)
                        + ':' + ('0' + item.start_date.getMinutes()).slice(-2)
                        + (item.air_length ? ' (' + item.air_length + ')' : '');

                    return {
                        Flag: time_to_start.indexOf('+') === 0 ? MF_CHECKED : MF_STRING,
                        Caption: caption,
                        Func: function () { FuncCommand(url); }
                    };
                }

            };

            this.popup = function (x, y) {
                if (!_item_list) {
                    this.refresh(x, y);
                }
                else {
                    Menu.isShown = true;
                    var ret = _menu.TrackPopupMenu(x, y);
                    if (ret !== 0)
                        _item_list[ret].Func();
                    (function () { Menu.isShown = false; _this.onLeave(); }).timeout(10);
                }
            };

        };

    },
    onClick: function (x, y, mask) { // パネルクリック時に呼び出される // trueを返すと本体のクリックイベントをキャンセル
        if (this.NAS.hover) {
            this.NAS.popup(x + 1, y);
            return true;
        }
    },
    onMove: function (x, y) { // パネルにマウスポインタを置くと呼び出され続ける
        if (!Edit.isStarted) {
            var p = this.prop;
            if (!this.NAS.hover && x >= p.x && y >= p.y && x <= p.x + p.width && y <= p.y + p.height) {
                this.NAS.hover = true;
                this.NAS.repaint();
            }
            if (this.NAS.hover && (x < p.x || y < p.y || x > p.x + p.width || y > p.y + p.height)) {
                this.NAS.hover = false;
                this.NAS.repaint();
            }
        }
    },
    onLeave: function () { // パネルからマウスポインタが離れた時に呼び出される
        if (!Menu.isShown) {
            this.NAS.hover = false;
            this.NAS.repaint();
        }
    },
    onPaint: function (gr) { // 描画イベントが発生した時に呼び出される
        if (!Edit.isStarted)
            this.NAS.onPaint(gr);
    }
};
